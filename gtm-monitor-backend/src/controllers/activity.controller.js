const activityService = require('../services/activity.service');
const asyncHandler = require('../utils/asyncHandler');

// POST /api/activities — unggah/isi kegiatan proyek (foto ke staging Cloudinary)
const createActivity = asyncHandler(async (req, res) => {
  res.json(await activityService.createActivity({ body: req.body, file: req.file, user: req.user }));
}, 'Gagal menyimpan kegiatan');

// POST /api/activities/delete-photo
const deleteActivityPhoto = asyncHandler(async (req, res) => {
  res.json(await activityService.deleteActivityPhoto({ body: req.body, user: req.user }));
}, 'Gagal menghapus foto kegiatan.');

// POST /api/verify (Admin)
const verifyActivity = asyncHandler(async (req, res) => {
  res.json(await activityService.verifyActivity({ body: req.body }));
}, 'Gagal memverifikasi activity.');

// POST /api/reject (Admin)
const rejectActivity = asyncHandler(async (req, res) => {
  res.json(await activityService.rejectActivity({ body: req.body }));
}, 'Gagal menolak verifikasi activity.');

module.exports = { createActivity, deleteActivityPhoto, verifyActivity, rejectActivity };
