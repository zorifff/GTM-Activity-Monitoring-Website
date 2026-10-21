// Koordinat ODP: pakai koordinat dari Excel bila ada, jika tidak buat koordinat stabil di sekitar pusat branch
const BRANCH_COORDS = {
  MAGELANG: { lat: -7.4797, lon: 110.2177 },
  PEKALONGAN: { lat: -6.8886, lon: 109.6753 },
  PURWOKERTO: { lat: -7.4245, lon: 109.2302 },
  SEMARANG: { lat: -7.0051, lon: 110.4381 },
  SURAKARTA: { lat: -7.5755, lon: 110.8243 },
  YOGYAKARTA: { lat: -7.7956, lon: 110.3695 }
};

function getOdpCoords(odpName, branchName, existingLat, existingLon) {
  if (typeof existingLat === 'number' && typeof existingLon === 'number' && !isNaN(existingLat) && !isNaN(existingLon)) {
    return { lat: existingLat, lon: existingLon };
  }
  const base = BRANCH_COORDS[branchName?.toString().trim().toUpperCase()] || { lat: -7.25, lon: 110.0 };
  let h = 0;
  for (let i = 0; i < (odpName || '').length; i++) {
    h = ((h << 5) - h) + odpName.charCodeAt(i);
    h |= 0;
  }
  const abs = Math.abs(h);
  const latOffset = ((abs % 1000) - 500) * 0.0003;
  const lonOffset = (((abs / 1000) | 0) % 1000 - 500) * 0.0003;
  return { lat: base.lat + latOffset, lon: base.lon + lonOffset };
}

module.exports = { BRANCH_COORDS, getOdpCoords };
