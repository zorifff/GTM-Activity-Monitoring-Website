-- Fase 4: koordinat ODP sebagai geometri PostGIS + indeks GiST, normalisasi angka ringkasan, materialized view
-- metrik performa branch & regional. Satu migrasi = satu transaksi: gagal di langkah mana pun → tidak ada yang berubah.

-- ─── 1. PostGIS ───────────────────────────────────────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS postgis;

-- ─── 2. Koordinat ODP → GEOMETRY(Point, 4326) ─────────────────────────────────────────────────────────────────
-- "location" menjadi sumber koordinat. lat/lon dipertahankan sebagai generated column (turunan, hanya-baca)
-- sehingga pembaca lama (/api/data, frontend) tidak berubah. Tanpa UPDATE massal (urutan fisik baris tetap):
--   a) location dibuat sebagai generated column dari lat/lon (tabel ditulis ulang sekali),
--   b) DROP EXPRESSION → location menjadi kolom biasa yang menyimpan nilainya,
--   c) lat/lon lama dihapus lalu dibuat ulang sebagai turunan location.
-- ST_MakePoint(x = longitude, y = latitude); NULL tetap NULL (fungsi STRICT).
ALTER TABLE "Odp" ADD COLUMN "location" geometry(Point, 4326)
  GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint("lon", "lat"), 4326)) STORED;
ALTER TABLE "Odp" ALTER COLUMN "location" DROP EXPRESSION;
ALTER TABLE "Odp" DROP COLUMN "lat", DROP COLUMN "lon";
ALTER TABLE "Odp"
  ADD COLUMN "lat" DOUBLE PRECISION GENERATED ALWAYS AS (ST_Y("location")) STORED,
  ADD COLUMN "lon" DOUBLE PRECISION GENERATED ALWAYS AS (ST_X("location")) STORED;

-- Indeks spasial GiST: query radius (ST_DWithin) & bounding box (&&) dievaluasi di level database
CREATE INDEX "Odp_location_idx" ON "Odp" USING GIST ("location");

-- Indeks foreign key yang belum ada (join Branch → Project → Odp di materialized view & penghapusan proyek)
CREATE INDEX "Odp_projectId_idx" ON "Odp"("projectId");
CREATE INDEX "Project_branchId_idx" ON "Project"("branchId");

-- ─── 3. Angka resmi dari Excel → satu tabel ───────────────────────────────────────────────────────────────────
-- Sebelumnya tersebar di Branch (occRate, gapWoW) & ImportMeta (occRate, available, used, total, gapWoW).
-- Angka hasil hitung dari data ODP tidak lagi disimpan — tersedia di materialized view (langkah 4).
-- scope: 'region' (ringkasan Jateng DIY) atau 'branch:<id>'.
CREATE TABLE "ReportedMetric" (
    "id" SERIAL NOT NULL,
    "scope" TEXT NOT NULL,
    "branchId" INTEGER,
    "occRate" DOUBLE PRECISION,
    "gapWoW" DOUBLE PRECISION,
    "available" INTEGER,
    "used" INTEGER,
    "total" INTEGER,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReportedMetric_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ReportedMetric_scope_check" CHECK (
      ("scope" = 'region' AND "branchId" IS NULL) OR ("branchId" IS NOT NULL AND "scope" = 'branch:' || "branchId")
    )
);
CREATE UNIQUE INDEX "ReportedMetric_scope_key" ON "ReportedMetric"("scope");
CREATE UNIQUE INDEX "ReportedMetric_branchId_key" ON "ReportedMetric"("branchId");
ALTER TABLE "ReportedMetric" ADD CONSTRAINT "ReportedMetric_branchId_fkey"
  FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Pindahkan nilai yang sudah ada (hanya yang terisi)
INSERT INTO "ReportedMetric" ("scope", "branchId", "occRate", "gapWoW", "updatedAt")
SELECT 'branch:' || "id", "id", "occRate", "gapWoW", CURRENT_TIMESTAMP
FROM "Branch"
WHERE "occRate" IS NOT NULL OR "gapWoW" IS NOT NULL;

INSERT INTO "ReportedMetric" ("scope", "occRate", "gapWoW", "available", "used", "total", "updatedAt")
SELECT 'region', "occRate", "gapWoW", "available", "used", "total", "updatedAt"
FROM "ImportMeta"
WHERE "key" = 'jateng_diy_summary'
  AND ("occRate" IS NOT NULL OR "gapWoW" IS NOT NULL OR "available" IS NOT NULL OR "used" IS NOT NULL OR "total" IS NOT NULL);

ALTER TABLE "Branch" DROP COLUMN "occRate", DROP COLUMN "gapWoW";
-- ImportMeta kini hanya mencatat waktu import (updatedAt) per kunci
ALTER TABLE "ImportMeta" DROP COLUMN "occRate", DROP COLUMN "available", DROP COLUMN "used", DROP COLUMN "total", DROP COLUMN "gapWoW";

-- ─── 4. Materialized view metrik performa ─────────────────────────────────────────────────────────────────────
-- Di-refresh di dalam transaksi import ODP (src/services/performance.service.js) & terjadwal oleh worker.
-- Aturan status ODP & proyek prioritas sama persis dengan /api/data (src/services/data.service.js):
--   status   = occStatus dari Excel bila terisi, selain itu dari used/total (BLACK bila used = 0, <25% GREEN,
--              <50% YELLOW, <75% ORANGE, selebihnya RED)
--   prioritas = proyek dengan > 1 ODP dan OCC (persen, dibulatkan 1 desimal seperti Math.round) < 35
CREATE MATERIALIZED VIEW "BranchPerformance" AS
WITH odp_metrics AS (
  SELECT p."branchId", o."used", o."avai", o."total",
         COALESCE(NULLIF(UPPER(o."occStatus"), ''),
           CASE
             WHEN o."used" = 0 THEN 'BLACK'
             WHEN COALESCE(o."used"::float8 / NULLIF(o."total", 0), 0) < 0.25 THEN 'GREEN'
             WHEN COALESCE(o."used"::float8 / NULLIF(o."total", 0), 0) < 0.50 THEN 'YELLOW'
             WHEN COALESCE(o."used"::float8 / NULLIF(o."total", 0), 0) < 0.75 THEN 'ORANGE'
             ELSE 'RED'
           END) AS "status"
  FROM "Odp" o
  JOIN "Project" p ON p."id" = o."projectId"
),
project_metrics AS (
  SELECT p."branchId", COUNT(o."id") AS "odpCount",
         COALESCE(SUM(o."used"), 0) AS "used", COALESCE(SUM(o."total"), 0) AS "total"
  FROM "Project" p
  LEFT JOIN "Odp" o ON o."projectId" = p."id"
  GROUP BY p."id", p."branchId"
),
branch_projects AS (
  SELECT "branchId",
         COUNT(*) AS "projectCount",
         COUNT(*) FILTER (
           WHERE "odpCount" > 1
             AND (CASE WHEN "total" > 0 THEN floor("used"::float8 / "total" * 1000 + 0.5) / 10 ELSE 0 END) < 35
         ) AS "priorityProjectCount"
  FROM project_metrics
  GROUP BY "branchId"
),
branch_odps AS (
  SELECT "branchId",
         COUNT(*) AS "odpCount",
         SUM("used") AS "used", SUM("avai") AS "avai", SUM("total") AS "total",
         COUNT(*) FILTER (WHERE "status" = 'GREEN') AS "greenOdpCount",
         COUNT(*) FILTER (WHERE "status" = 'YELLOW') AS "yellowOdpCount",
         COUNT(*) FILTER (WHERE "status" = 'ORANGE') AS "orangeOdpCount",
         COUNT(*) FILTER (WHERE "status" = 'RED') AS "redOdpCount",
         COUNT(*) FILTER (WHERE "status" = 'BLACK') AS "blackOdpCount"
  FROM odp_metrics
  GROUP BY "branchId"
)
SELECT b."id" AS "branchId",
       b."name" AS "branchName",
       COALESCE(bp."projectCount", 0)::int AS "projectCount",
       COALESCE(bp."priorityProjectCount", 0)::int AS "priorityProjectCount",
       COALESCE(bo."odpCount", 0)::int AS "odpCount",
       COALESCE(bo."used", 0)::int AS "used",
       COALESCE(bo."avai", 0)::int AS "avai",
       COALESCE(bo."total", 0)::int AS "total",
       CASE WHEN bo."total" > 0 THEN bo."used"::float8 / bo."total" END AS "occRate",
       COALESCE(bo."greenOdpCount", 0)::int AS "greenOdpCount",
       COALESCE(bo."yellowOdpCount", 0)::int AS "yellowOdpCount",
       COALESCE(bo."orangeOdpCount", 0)::int AS "orangeOdpCount",
       COALESCE(bo."redOdpCount", 0)::int AS "redOdpCount",
       COALESCE(bo."blackOdpCount", 0)::int AS "blackOdpCount",
       rm."occRate" AS "reportedOccRate",
       rm."gapWoW" AS "reportedGapWoW",
       now() AS "refreshedAt"
FROM "Branch" b
LEFT JOIN branch_projects bp ON bp."branchId" = b."id"
LEFT JOIN branch_odps bo ON bo."branchId" = b."id"
LEFT JOIN "ReportedMetric" rm ON rm."branchId" = b."id";

-- Indeks unik = syarat REFRESH MATERIALIZED VIEW CONCURRENTLY (pembaca tidak terblokir saat refresh)
CREATE UNIQUE INDEX "BranchPerformance_branchId_key" ON "BranchPerformance"("branchId");

-- Regional (Jateng DIY): agregasi dari BranchPerformance → wajib di-refresh setelahnya
CREATE MATERIALIZED VIEW "RegionalPerformance" AS
SELECT 'region'::text AS "scope",
       COUNT(bp."branchId")::int AS "branchCount",
       COALESCE(SUM(bp."projectCount"), 0)::int AS "projectCount",
       COALESCE(SUM(bp."priorityProjectCount"), 0)::int AS "priorityProjectCount",
       COALESCE(SUM(bp."odpCount"), 0)::int AS "odpCount",
       COALESCE(SUM(bp."used"), 0)::int AS "used",
       COALESCE(SUM(bp."avai"), 0)::int AS "avai",
       COALESCE(SUM(bp."total"), 0)::int AS "total",
       CASE WHEN SUM(bp."total") > 0 THEN SUM(bp."used")::float8 / SUM(bp."total") END AS "occRate",
       COALESCE(SUM(bp."greenOdpCount"), 0)::int AS "greenOdpCount",
       COALESCE(SUM(bp."yellowOdpCount"), 0)::int AS "yellowOdpCount",
       COALESCE(SUM(bp."orangeOdpCount"), 0)::int AS "orangeOdpCount",
       COALESCE(SUM(bp."redOdpCount"), 0)::int AS "redOdpCount",
       COALESCE(SUM(bp."blackOdpCount"), 0)::int AS "blackOdpCount",
       (SELECT "occRate" FROM "ReportedMetric" WHERE "scope" = 'region') AS "reportedOccRate",
       (SELECT "gapWoW" FROM "ReportedMetric" WHERE "scope" = 'region') AS "reportedGapWoW",
       (SELECT "available" FROM "ReportedMetric" WHERE "scope" = 'region') AS "reportedAvailable",
       (SELECT "used" FROM "ReportedMetric" WHERE "scope" = 'region') AS "reportedUsed",
       (SELECT "total" FROM "ReportedMetric" WHERE "scope" = 'region') AS "reportedTotal",
       now() AS "refreshedAt"
FROM "BranchPerformance" bp;

CREATE UNIQUE INDEX "RegionalPerformance_scope_key" ON "RegionalPerformance"("scope");
