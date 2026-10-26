const odpGeo = require('../services/odpGeo.service');
const asyncHandler = require('../utils/asyncHandler');

// GET /api/odps/nearby?lat=&lon=&radius=&limit= — ODP dalam radius (meter) dari satu titik, urut dari yang terdekat
const getNearby = asyncHandler(async (req, res) => {
  const { lat, lon, radius, limit } = req.query;
  res.json(await odpGeo.findOdpsNearby({ lat, lon, radiusMeters: radius, limit }));
}, 'Gagal mencari ODP di sekitar lokasi');

// GET /api/odps/within?minLat=&minLon=&maxLat=&maxLon=&limit= — ODP di dalam kotak batas wilayah
const getWithin = asyncHandler(async (req, res) => {
  const { minLat, minLon, maxLat, maxLon, limit } = req.query;
  res.json(await odpGeo.findOdpsInBounds({ minLat, minLon, maxLat, maxLon, limit }));
}, 'Gagal mencari ODP di dalam wilayah');

module.exports = { getNearby, getWithin };
