// Rute kegiatan proyek & verifikasi (dipasang di /api)
const express = require('express');
const activity = require('../controllers/activity.controller');
const { authenticateToken, requireAdmin } = require('../middlewares/auth');
const { activityUploadLimiter } = require('../middlewares/rateLimiters');
const { upload } = require('../middlewares/uploads');
const { validate } = require('../middlewares/validate');
const { schemas } = require('../validation/schemas');

const router = express.Router();

router.post('/activities', authenticateToken, activityUploadLimiter, upload.single('photo'), validate(schemas.createActivity), activity.createActivity);
router.post('/activities/delete-photo', authenticateToken, validate(schemas.projectAction), activity.deleteActivityPhoto);
router.post('/verify', requireAdmin, validate(schemas.projectAction), activity.verifyActivity);
router.post('/reject', requireAdmin, validate(schemas.projectAction), activity.rejectActivity);

module.exports = router;
