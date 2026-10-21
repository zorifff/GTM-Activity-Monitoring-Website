const multer = require('multer');

// Memory Storage for Photo Uploads (Staging ke Cloudinary sebelum terverifikasi)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // Maksimal 10 MB per foto
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/') || /\.(jpg|jpeg|png|webp)$/i.test(file.originalname)) {
      cb(null, true);
    } else {
      cb(Object.assign(new Error('Hanya file gambar (.jpg, .jpeg, .png, .webp) yang diperbolehkan!'), { status: 400 }));
    }
  }
});

// Multer memory storage for Excel ODP files (.xlsx, .xls, .csv)
const excelUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (/\.(xlsx|xls|csv)$/i.test(file.originalname) || (file.mimetype && (file.mimetype.includes('spreadsheet') || file.mimetype.includes('excel') || file.mimetype.includes('csv')))) {
      cb(null, true);
    } else {
      cb(new Error('Hanya file Excel/CSV (.xlsx, .xls, .csv) yang diperbolehkan!'));
    }
  }
});

// Multer memory storage for Program Tracking Image files (.jpg, .png, .jpeg, .webp)
const programImageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (/\.(jpg|jpeg|png|webp)$/i.test(file.originalname) || (file.mimetype && file.mimetype.startsWith('image/'))) {
      cb(null, true);
    } else {
      cb(new Error('Hanya file gambar (.jpg, .jpeg, .png, .webp) yang diperbolehkan untuk tracking program!'));
    }
  }
});

// Multer memory storage for Tsel One Pairing Excel files (.xlsx, .xls, .csv)
const pairingUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (/\.(xlsx|xls|csv)$/i.test(file.originalname) || (file.mimetype && (file.mimetype.includes('spreadsheet') || file.mimetype.includes('excel') || file.mimetype.includes('csv')))) {
      cb(null, true);
    } else {
      cb(new Error('Hanya file Excel/CSV (.xlsx, .xls, .csv) yang diperbolehkan untuk data Tsel One Pairing!'));
    }
  }
});

// Jalankan multer.single(field) sebagai middleware; kegagalan multer → 400 dengan pesan yang sama seperti sebelumnya
const uploadSingle = (multerInstance, field, logLabel, fallbackMessage) => (req, res, next) => {
  multerInstance.single(field)(req, res, (err) => {
    if (err) {
      console.error(`Multer Error in ${logLabel}:`, err.message);
      return res.status(400).json({ error: err.message || fallbackMessage }); // pesan input aman: penolakan file dari fileFilter/multer
    }
    next();
  });
};

module.exports = { multer, upload, excelUpload, programImageUpload, pairingUpload, uploadSingle };
