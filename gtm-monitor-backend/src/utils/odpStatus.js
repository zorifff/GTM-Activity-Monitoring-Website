// Status okupansi ODP: warna dari Excel (occStatus) bila ada, selain itu dihitung dari port terpakai.
// Aturan yang sama dipakai materialized view "BranchPerformance" (lihat migrasi 20261026120000).
function resolveOdpStatus(odp) {
  const pct = odp.total > 0 ? odp.used / odp.total : 0;
  const calcStatus = odp.used === 0 ? 'BLACK' : pct < 0.25 ? 'GREEN' : pct < 0.50 ? 'YELLOW' : pct < 0.75 ? 'ORANGE' : 'RED';
  return odp.occStatus ? odp.occStatus.toUpperCase() : calcStatus;
}

module.exports = { resolveOdpStatus };
