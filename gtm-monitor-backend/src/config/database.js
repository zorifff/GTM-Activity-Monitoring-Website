// Konfigurasi pool terpadu untuk DATABASE_URL (parameter yang sudah tertulis di URL tidak diubah):
// - pgbouncer=true    : tanpa prepared statement bernama — wajib di PgBouncer mode transaction (host Neon "-pooler")
// - connection_limit  : koneksi maksimal Prisma per proses (API & worker masing-masing) → lonjakan beban mengantre di
//                       pool, bukan membuka koneksi baru ke database
// - pool_timeout      : detik maksimal menunggu koneksi kosong sebelum query dianggap gagal
const { DB_CONNECTION_LIMIT, DB_POOL_TIMEOUT_SEC } = require('./env');

function buildDatasourceUrl(rawUrl, { connectionLimit = DB_CONNECTION_LIMIT, poolTimeoutSec = DB_POOL_TIMEOUT_SEC } = {}) {
  const url = new URL(rawUrl);
  const pooled = url.hostname.includes('-pooler') || url.searchParams.get('pgbouncer') === 'true';
  if (pooled && !url.searchParams.has('pgbouncer')) url.searchParams.set('pgbouncer', 'true');
  if (!url.searchParams.has('connection_limit')) url.searchParams.set('connection_limit', String(connectionLimit));
  if (!url.searchParams.has('pool_timeout')) url.searchParams.set('pool_timeout', String(poolTimeoutSec));
  return { url: url.toString(), pooled };
}

module.exports = { buildDatasourceUrl };
