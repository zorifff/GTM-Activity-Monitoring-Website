require('../config/env');
const cloudinary = require('cloudinary');

// ─── CLOUDINARY CONFIGURATION (STAGING FOR UNVERIFIED PHOTOS) ───
// Kredensial Cloudinary WAJIB diisi lewat file .env (lihat .env.example)
const missingCloudinaryEnv = ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET']
  .filter(key => !process.env[key]);
if (missingCloudinaryEnv.length > 0) {
  console.warn(`⚠️ [Cloudinary] Variabel .env belum diisi: ${missingCloudinaryEnv.join(', ')}. Upload foto & gambar program akan gagal.`);
}
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Helper: Upload buffer photo to Cloudinary staging
const uploadToCloudinary = (fileBuffer, folder = 'gtm_staging') => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.v2.uploader.upload_stream(
      { folder: folder, resource_type: 'image' },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    uploadStream.end(fileBuffer);
  });
};

// Helper: Delete photo from Cloudinary
const deleteFromCloudinary = async (urlOrPublicId) => {
  if (!urlOrPublicId) return;
  try {
    let publicId = urlOrPublicId;
    if (urlOrPublicId.includes('res.cloudinary.com')) {
      const parts = urlOrPublicId.split('/upload/');
      if (parts[1]) {
        const pathAndExt = parts[1].replace(/^v\d+\//, '');
        publicId = pathAndExt.substring(0, pathAndExt.lastIndexOf('.'));
      }
    }
    if (publicId && !publicId.startsWith('/')) {
      console.log('🧹 [Cloudinary Cleanup] Destroying publicId:', publicId);
      await cloudinary.v2.uploader.destroy(publicId);
    }
  } catch (err) {
    console.error('⚠️ [Cloudinary Destroy Error]:', err.message);
  }
};

module.exports = { cloudinary, uploadToCloudinary, deleteFromCloudinary };
