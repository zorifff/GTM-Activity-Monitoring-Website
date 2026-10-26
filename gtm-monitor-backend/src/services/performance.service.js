// Metrik performa branch & regional dari materialized view (dibuat oleh migrasi 20261026120000):
//   "BranchPerformance"   → per branch: jumlah proyek/ODP, port used/avai/total, OCC, ODP per status, angka resmi Excel
//   "RegionalPerformance" → agregasi seluruh branch (Jateng DIY) + angka resmi baris ringkasan Excel
// Di-refresh di dalam transaksi import ODP (data & ringkasan berubah bersamaan) dan terjadwal oleh worker.
const prisma = require('../lib/prisma');

// Urutan wajib: RegionalPerformance dihitung dari BranchPerformance
const PERFORMANCE_VIEWS = ['BranchPerformance', 'RegionalPerformance'];

// client = prisma atau tx (di dalam prisma.$transaction → refresh ikut batal bila transaksi gagal).
// CONCURRENTLY: pembaca dashboard tidak terblokir selama refresh.
async function refreshPerformanceViews(client = prisma) {
  for (const view of PERFORMANCE_VIEWS) {
    await client.$executeRawUnsafe(`REFRESH MATERIALIZED VIEW CONCURRENTLY "${view}"`);
  }
}

function getBranchPerformance(client = prisma) {
  return client.$queryRaw`SELECT * FROM "BranchPerformance" ORDER BY "branchName"`;
}

async function getRegionalPerformance(client = prisma) {
  const [row] = await client.$queryRaw`SELECT * FROM "RegionalPerformance"`;
  return row || null;
}

module.exports = { PERFORMANCE_VIEWS, refreshPerformanceViews, getBranchPerformance, getRegionalPerformance };
