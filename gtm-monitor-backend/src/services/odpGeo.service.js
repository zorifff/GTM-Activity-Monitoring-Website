// ODP + koordinat PostGIS. Kolom "location" (GEOMETRY(Point, 4326)) tidak dapat ditulis lewat Prisma Client (tipe
// Unsupported) dan lat/lon adalah generated column, jadi penulisan massal & query spasial memakai SQL langsung.
// Penulisan menerima `client` = tx dari prisma.$transaction agar menjadi bagian transaksi import.
const crypto = require('crypto');
const prisma = require('../lib/prisma');
const { resolveOdpStatus } = require('../utils/odpStatus');

const BATCH_SIZE = 1000;
const MAX_RADIUS_METERS = 50 * 1000;
const MAX_RESULTS = 2000;

const chunks = (rows, size = BATCH_SIZE) => {
  const out = [];
  for (let i = 0; i < rows.length; i += size) out.push(rows.slice(i, i + size));
  return out;
};
const coord = (value) => (typeof value === 'number' && Number.isFinite(value) ? value : null);

// Insert massal ODP baru. Duplikat (nama ODP / id sudah ada) dilewati, sama seperti createMany({ skipDuplicates: true }).
// rows: { odp, avai, used, total, lat, lon, occStatus, projectId } — location dibentuk dari lat/lon (x = lon, y = lat)
async function insertOdps(client, rows, onBatch = () => {}) {
  for (const [index, batch] of chunks(rows).entries()) {
    onBatch(index * BATCH_SIZE);
    await client.$executeRaw`
      INSERT INTO "Odp" ("id", "odp", "avai", "used", "total", "location", "occStatus", "projectId")
      SELECT v."id", v."odp", v."avai", v."used", v."total",
             ST_SetSRID(ST_MakePoint(v."lon", v."lat"), 4326), v."occStatus", v."projectId"
      FROM unnest(
        ${batch.map(() => crypto.randomUUID())}::text[], ${batch.map(r => r.odp)}::text[],
        ${batch.map(r => r.avai)}::int[], ${batch.map(r => r.used)}::int[], ${batch.map(r => r.total)}::int[],
        ${batch.map(r => coord(r.lat))}::float8[], ${batch.map(r => coord(r.lon))}::float8[],
        ${batch.map(r => r.occStatus ?? null)}::text[], ${batch.map(r => r.projectId)}::text[]
      ) AS v("id", "odp", "avai", "used", "total", "lat", "lon", "occStatus", "projectId")
      ON CONFLICT DO NOTHING`;
  }
}

// Update massal ODP yang berubah (satu statement per 1000 baris, bukan satu request per ODP).
// rows: { id, avai, used, total, projectId, lat?, lon?, occStatus? } — koordinat & occStatus hanya diganti bila diisi.
async function updateOdps(client, rows, onBatch = () => {}) {
  for (const [index, batch] of chunks(rows).entries()) {
    onBatch(index * BATCH_SIZE);
    await client.$executeRaw`
      UPDATE "Odp" AS o SET
        "avai" = v."avai", "used" = v."used", "total" = v."total", "projectId" = v."projectId",
        "location" = CASE WHEN v."hasCoords" THEN ST_SetSRID(ST_MakePoint(v."lon", v."lat"), 4326) ELSE o."location" END,
        "occStatus" = COALESCE(v."occStatus", o."occStatus")
      FROM unnest(
        ${batch.map(r => r.id)}::text[],
        ${batch.map(r => r.avai)}::int[], ${batch.map(r => r.used)}::int[], ${batch.map(r => r.total)}::int[],
        ${batch.map(r => r.projectId)}::text[], ${batch.map(r => r.lat !== undefined)}::boolean[],
        ${batch.map(r => coord(r.lat))}::float8[], ${batch.map(r => coord(r.lon))}::float8[],
        ${batch.map(r => r.occStatus || null)}::text[]
      ) AS v("id", "avai", "used", "total", "projectId", "hasCoords", "lat", "lon", "occStatus")
      WHERE o."id" = v."id"`;
  }
}

const toResult = (row) => ({
  odp: row.odp,
  project: row.project,
  wok: row.wok,
  branch: row.branch,
  lat: row.lat,
  lon: row.lon,
  avai: row.avai,
  used: row.used,
  total: row.total,
  occStatus: resolveOdpStatus(row),
  ...(row.distanceM !== undefined ? { distanceM: Math.round(row.distanceM * 10) / 10 } : {})
});

// ODP dalam radius (meter, jarak sebenarnya di permukaan bumi) dari satu titik, urut dari yang terdekat.
// Saringan awal "&&" kotak derajat memakai indeks GiST "Odp_location_idx"; ST_DWithin geography memastikan jarak akurat.
async function findOdpsNearby({ lat, lon, radiusMeters, limit = 200 }) {
  const radius = Math.min(radiusMeters, MAX_RADIUS_METERS);
  // 1° lintang ≥ 110.574 km; 1° bujur = 111.320 km × cos(lintang). Margin 1% agar kotak selalu memuat lingkaran.
  const dLat = (radius / 110574) * 1.01;
  const dLon = (radius / (111320 * Math.max(Math.cos((lat * Math.PI) / 180), 0.01))) * 1.01;
  const take = Math.min(limit, MAX_RESULTS);
  const rows = await prisma.$queryRaw`
    WITH c AS (SELECT ST_SetSRID(ST_MakePoint(${lon}::float8, ${lat}::float8), 4326) AS g)
    SELECT o."odp", o."lat", o."lon", o."avai", o."used", o."total", o."occStatus",
           p."name" AS "project", p."wok", b."name" AS "branch",
           ST_Distance(o."location"::geography, c.g::geography) AS "distanceM"
    FROM "Odp" o
    JOIN "Project" p ON p."id" = o."projectId"
    JOIN "Branch" b ON b."id" = p."branchId"
    CROSS JOIN c
    WHERE o."location" && ST_Expand(c.g, ${dLon}::float8, ${dLat}::float8)
      AND ST_DWithin(o."location"::geography, c.g::geography, ${radius}::float8)
    ORDER BY "distanceM", o."odp"
    LIMIT ${take + 1}`;
  return { count: Math.min(rows.length, take), truncated: rows.length > take, radiusMeters: radius, odps: rows.slice(0, take).map(toResult) };
}

// ODP di dalam kotak batas wilayah (bounding box) — operator "&&" memakai indeks GiST
async function findOdpsInBounds({ minLat, minLon, maxLat, maxLon, limit = 500 }) {
  const take = Math.min(limit, MAX_RESULTS);
  const rows = await prisma.$queryRaw`
    SELECT o."odp", o."lat", o."lon", o."avai", o."used", o."total", o."occStatus",
           p."name" AS "project", p."wok", b."name" AS "branch"
    FROM "Odp" o
    JOIN "Project" p ON p."id" = o."projectId"
    JOIN "Branch" b ON b."id" = p."branchId"
    WHERE o."location" && ST_MakeEnvelope(${minLon}::float8, ${minLat}::float8, ${maxLon}::float8, ${maxLat}::float8, 4326)
    ORDER BY b."name", p."name", o."odp"
    LIMIT ${take + 1}`;
  return { count: Math.min(rows.length, take), truncated: rows.length > take, odps: rows.slice(0, take).map(toResult) };
}

module.exports = { insertOdps, updateOdps, findOdpsNearby, findOdpsInBounds, MAX_RADIUS_METERS, MAX_RESULTS };
