// Kegiatan GTM per proyek: unggah foto (staging Cloudinary), hapus, verifikasi (simpan permanen), tolak
const fs = require('fs');
const path = require('path');
const prisma = require('../lib/prisma');
const AppError = require('../utils/AppError');
const { BACKEND_ROOT } = require('../config/paths');
const { uploadToCloudinary, deleteFromCloudinary } = require('../lib/cloudinary');
const { saveVerifiedPhotoToLocal } = require('./photoStorage.service');

// Dipindah dari handler server.js baris 971-1094
async function createActivity({ body, file, user }) {
  const { projectName, branchName, type, planDate, namaOutlet, namaBumdes, kodeSf, keterangan } = body;
  console.log(`[Activity POST] project: ${projectName}, type: ${type}, namaOutlet: ${namaOutlet}, namaBumdes: ${namaBumdes}, planDate: ${planDate}`);

  // Security Check: USER can only update their assigned branch
  if (user && user.role === 'USER' && user.branchName !== branchName) {
    throw new AppError(403, { error: `Akses ditolak. Anda hanya berhak memodifikasi data di branch ${user.branchName}.` });
  }

  // Find the Project by name + branch
  const branch = await prisma.branch.findUnique({ where: { name: branchName } });
  if (!branch) {
    throw new AppError(404, { error: 'Branch tidak ditemukan' });
  }

  const project = await prisma.project.findFirst({
    where: { name: projectName, branchId: branch.id }
  });

  if (!project) {
    throw new AppError(404, { error: 'Proyek tidak ditemukan' });
  }

  // Cek apakah ada foto kegiatan sebelumnya yang masih berstatus 'upload' (menunggu verifikasi)
  const existingPending = await prisma.projectActivityPhoto.findFirst({
    where: {
      projectId: project.id,
      type: type,
      status: 'upload'
    }
  });

  if (existingPending) {
    throw new AppError(400, { error: 'Foto kegiatan sebelumnya masih menunggu verifikasi Admin. Anda hanya dapat menambahkan foto baru jika kegiatan sebelumnya telah terverifikasi.' });
  }

  // Validasi input wajib per kegiatan GTM
  if (type === 'branding_outlet') {
    if (!namaOutlet || !namaOutlet.trim() || !file) {
      throw new AppError(400, { error: 'Upload Branding Downline/Outlet wajib memasukkan Nama Outlet dan Foto bukti.' });
    }
  } else if (type === 'open_table' || type === 'tsel_menyapa') {
    if (!planDate || !file) {
      throw new AppError(400, { error: 'Upload kegiatan ini wajib memasukkan Tanggal dan Foto bukti.' });
    }
  } else if (type === 'bumdes') {
    if (!namaBumdes || !namaBumdes.trim() || !file) {
      throw new AppError(400, { error: 'Upload Kerjasama BUMDes wajib memasukkan Nama BUMDES dan Foto bukti.' });
    }
  } else if (type === 'rekrutmen_sf') {
    const sfVal = kodeSf || keterangan;
    if (!file && (!sfVal || !sfVal.trim())) {
      throw new AppError(400, { error: 'Rekrutmen SF AKAMSI wajib memasukkan setidaknya Kode SF atau Foto bukti.' });
    }
  }

  let photoUrl = null;
  if (file) {
    console.log('☁️ Uploading photo to Cloudinary staging...');
    const cldRes = await uploadToCloudinary(file.buffer, 'gtm_staging');
    photoUrl = cldRes.secure_url;
    console.log('✅ Cloudinary Staging URL:', photoUrl);
  }

  const effectiveKeterangan = keterangan || namaBumdes || namaOutlet || kodeSf || null;
  const effectivePlanDate = planDate ? new Date(planDate) : null;

  // Simpan ke ProjectActivityPhoto
  const photoData = {
    projectId: project.id,
    type: type,
    status: 'upload',
    photoUrl: photoUrl,
    planDate: effectivePlanDate,
    namaOutlet: namaOutlet || null,
    kodeSf: kodeSf || keterangan || null,
    keterangan: effectiveKeterangan,
    userId: user?.id || undefined
  };
  if (namaBumdes) {
    photoData.namaBumdes = namaBumdes;
  }

  let activityPhoto;
  try {
    activityPhoto = await prisma.projectActivityPhoto.create({ data: photoData });
  } catch (dbErr) {
    // Jika kolom namaBumdes belum ada di database fisik (belum db push / migrate), fallback tanpa kolom namaBumdes (tersimpan di keterangan)
    if (photoData.namaBumdes && (dbErr.message?.includes('namaBumdes') || dbErr.code === 'P2021' || dbErr.code === 'P2002')) {
      delete photoData.namaBumdes;
      activityPhoto = await prisma.projectActivityPhoto.create({ data: photoData });
    } else {
      throw dbErr;
    }
  }

  // Sinkronkan juga ke ProjectActivity
  await prisma.projectActivity.upsert({
    where: { projectId_type: { projectId: project.id, type: type } },
    update: {
      status: 'upload',
      photoUrl: photoUrl || undefined,
      planDate: effectivePlanDate || undefined,
      keterangan: effectiveKeterangan || undefined,
      userId: user?.id || undefined
    },
    create: {
      projectId: project.id,
      type: type,
      status: 'upload',
      photoUrl: photoUrl,
      planDate: effectivePlanDate,
      keterangan: effectiveKeterangan,
      userId: user?.id || undefined
    }
  });

  return ({ success: true, activityPhoto });
}

// Helper: Find Project robustly by projectId, exact name, or fuzzy name
async function findProjectHelper(body) {
  const { projectId, projectName, branchName } = body || {};

  // 1. By ID first if provided
  if (projectId) {
    const p = await prisma.project.findUnique({ where: { id: projectId } }).catch(() => null);
    if (p) return p;
  }

  const cleanBName = (branchName || '').trim();
  const cleanPName = (projectName || '').trim();

  let branch = null;
  if (cleanBName) {
    branch = await prisma.branch.findUnique({ where: { name: cleanBName } }).catch(() => null);
    if (!branch) {
      branch = await prisma.branch.findFirst({
        where: { name: { equals: cleanBName, mode: 'insensitive' } }
      }).catch(() => null);
    }
  }

  // 2. By Branch ID + Name
  if (branch && cleanPName) {
    let p = await prisma.project.findFirst({
      where: { name: cleanPName, branchId: branch.id }
    }).catch(() => null);
    if (p) return p;

    p = await prisma.project.findFirst({
      where: { name: { equals: cleanPName, mode: 'insensitive' }, branchId: branch.id }
    }).catch(() => null);
    if (p) return p;
  }

  // 3. By Name alone
  if (cleanPName) {
    let p = await prisma.project.findFirst({
      where: { name: cleanPName }
    }).catch(() => null);
    if (p) return p;

    p = await prisma.project.findFirst({
      where: { name: { equals: cleanPName, mode: 'insensitive' } }
    }).catch(() => null);
    if (p) return p;

    // 4. Fuzzy match (strip symbols / punctuation differences)
    const simplified = cleanPName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    if (simplified) {
      const allProjects = await prisma.project.findMany({ select: { id: true, name: true, branchId: true } }).catch(() => []);
      const matched = allProjects.find(item => item.name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() === simplified);
      if (matched) {
        return await prisma.project.findUnique({ where: { id: matched.id } }).catch(() => null);
      }
    }
  }

  return null;
}

// Dipindah dari handler server.js baris 1159-1261
async function deleteActivityPhoto({ body, user }) {
  const { type, photoId } = body;
  const project = await findProjectHelper(body);
  if (!project) throw new AppError(404, { success: false, message: `Proyek "${body.projectName || body.projectId}" tidak ditemukan.` });

  // User Branch Access Check (Validate against project.branchId)
  if (user && user.role === 'USER' && user.branchName) {
    const userBranch = await prisma.branch.findFirst({
      where: { name: { equals: user.branchName, mode: 'insensitive' } }
    }).catch(() => null);

    if (userBranch && project.branchId !== userBranch.id) {
      throw new AppError(403, { success: false, message: `Akses ditolak. Anda hanya berhak memodifikasi data di branch ${user.branchName}.` });
    }
  }

  let targetPhoto = null;
  if (photoId && typeof photoId === 'string' && photoId.length > 15) {
    targetPhoto = await prisma.projectActivityPhoto.findUnique({ where: { id: photoId } }).catch(() => null);
  }
  if (!targetPhoto) {
    targetPhoto = await prisma.projectActivityPhoto.findFirst({
      where: { projectId: project.id, type: type },
      orderBy: { createdAt: 'desc' }
    }).catch(() => null);
  }

  if (targetPhoto) {
    if (targetPhoto.photoUrl) {
      if (targetPhoto.photoUrl.includes('res.cloudinary.com')) {
        await deleteFromCloudinary(targetPhoto.photoUrl).catch(err => console.error('Cloudinary error:', err.message));
      } else if (targetPhoto.photoUrl.startsWith('/uploads/') || targetPhoto.photoUrl.startsWith('/database foto/') || targetPhoto.photoUrl.startsWith('/database%20foto/')) {
        const localP = path.join(BACKEND_ROOT, decodeURIComponent(targetPhoto.photoUrl));
        if (fs.existsSync(localP)) {
          await fs.promises.unlink(localP).catch(err => console.error('Unlink error:', err.message));
        }
      }
    }
    await prisma.projectActivityPhoto.delete({ where: { id: targetPhoto.id } }).catch(() => null);
  }

  // Check remaining photos
  const remainingPhotos = await prisma.projectActivityPhoto.findMany({
    where: { projectId: project.id, type: type }
  }).catch(() => []);

  if (remainingPhotos.length > 0) {
    let newStatus = 'belum';
    if (remainingPhotos.some(p => p.status === 'upload')) {
      newStatus = 'upload';
    } else if (remainingPhotos.some(p => p.status === 'verified')) {
      newStatus = 'verified';
    }

    const latest = remainingPhotos[remainingPhotos.length - 1];
    await prisma.projectActivity.updateMany({
      where: { projectId: project.id, type: type },
      data: {
        status: newStatus,
        photoUrl: latest?.photoUrl || null,
        planDate: latest?.planDate || null,
        keterangan: latest?.keterangan || null
      }
    }).catch(() => null);
  } else {
    // Clear physical photo from ProjectActivity if legacy record
    const legacyAct = await prisma.projectActivity.findFirst({
      where: { projectId: project.id, type: type }
    }).catch(() => null);

    if (legacyAct && legacyAct.photoUrl) {
      if (legacyAct.photoUrl.includes('res.cloudinary.com')) {
        await deleteFromCloudinary(legacyAct.photoUrl).catch(err => console.error('Cloudinary error:', err.message));
      } else if (legacyAct.photoUrl.startsWith('/uploads/') || legacyAct.photoUrl.startsWith('/database foto/') || legacyAct.photoUrl.startsWith('/database%20foto/')) {
        const localP = path.join(BACKEND_ROOT, decodeURIComponent(legacyAct.photoUrl));
        if (fs.existsSync(localP)) {
          await fs.promises.unlink(localP).catch(err => console.error('Unlink error:', err.message));
        }
      }
    }

    await prisma.projectActivityPhoto.deleteMany({
      where: { projectId: project.id, type: type }
    }).catch(() => null);

    await prisma.projectActivity.updateMany({
      where: { projectId: project.id, type: type },
      data: {
        status: 'belum',
        photoUrl: null,
        planDate: null,
        keterangan: null
      }
    }).catch(() => null);
  }

  return ({ success: true, message: 'Foto / kegiatan berhasil dihapus.' });
}

// Dipindah dari handler server.js baris 1264-1334
async function verifyActivity({ body }) {
  const { type, photoId } = body;
  const project = await findProjectHelper(body);
  if (!project) throw new AppError(404, { success: false, message: `Proyek "${body.projectName || body.projectId}" tidak ditemukan.` });

  let targetPhoto = null;
  if (photoId && typeof photoId === 'string' && photoId.length > 15) {
    targetPhoto = await prisma.projectActivityPhoto.findUnique({ where: { id: photoId } }).catch(() => null);
  }
  if (!targetPhoto) {
    targetPhoto = await prisma.projectActivityPhoto.findFirst({
      where: { projectId: project.id, type: type, status: 'upload' },
      orderBy: { createdAt: 'desc' }
    }).catch(() => null);
  }

  let finalPhotoUrl = targetPhoto?.photoUrl;

  // Automatically download verified photo from Cloudinary Staging to structured local disk directory
  if (targetPhoto && targetPhoto.photoUrl && targetPhoto.photoUrl.includes('res.cloudinary.com')) {
    const dateToUse = targetPhoto.planDate || targetPhoto.createdAt;
    const bObj = await prisma.branch.findUnique({ where: { id: project.branchId } }).catch(() => null);
    finalPhotoUrl = await saveVerifiedPhotoToLocal(
      targetPhoto.photoUrl,
      bObj?.name || body.branchName,
      project.wok,
      project.name,
      type,
      dateToUse
    );
  } else if (targetPhoto && targetPhoto.photoUrl && (targetPhoto.photoUrl.startsWith('/uploads/') || targetPhoto.photoUrl.startsWith('/database foto/') || targetPhoto.photoUrl.startsWith('/database%20foto/'))) {
    finalPhotoUrl = targetPhoto.photoUrl;
  }

  if (targetPhoto) {
    await prisma.projectActivityPhoto.update({
      where: { id: targetPhoto.id },
      data: {
        status: 'verified',
        photoUrl: finalPhotoUrl || targetPhoto.photoUrl
      }
    });
  }

  const remainingPending = await prisma.projectActivityPhoto.count({
    where: { projectId: project.id, type: type, status: 'upload' }
  });

  const newStatus = remainingPending > 0 ? 'upload' : 'verified';

  const activity = await prisma.projectActivity.upsert({
    where: { projectId_type: { projectId: project.id, type: type } },
    update: {
      status: newStatus,
      photoUrl: finalPhotoUrl || targetPhoto?.photoUrl || undefined
    },
    create: {
      projectId: project.id,
      type: type,
      status: newStatus,
      photoUrl: finalPhotoUrl || targetPhoto?.photoUrl || null
    }
  });

  return ({ success: true, activity });
}

// Dipindah dari handler server.js baris 1337-1482
async function rejectActivity({ body }) {
  const { type, photoId } = body;
  const project = await findProjectHelper(body);

  if (!project) {
    throw new AppError(404, { success: false, message: `Proyek "${body.projectName || body.projectId}" tidak ditemukan.` });
  }

  console.log(`🧹 [REJECT ACTION] Rejecting activity "${type}" (photoId: ${photoId || 'none'}) for project "${project.name}" (ID: ${project.id})`);

  let targetPhoto = null;
  if (photoId && typeof photoId === 'string' && photoId.length > 15) {
    targetPhoto = await prisma.projectActivityPhoto.findUnique({ where: { id: photoId } }).catch(() => null);
  }
  if (!targetPhoto) {
    // Fallback: target the newest pending photo, or newest photo
    targetPhoto = await prisma.projectActivityPhoto.findFirst({
      where: { projectId: project.id, type: type, status: 'upload' },
      orderBy: { createdAt: 'desc' }
    }).catch(() => null);
    if (!targetPhoto) {
      targetPhoto = await prisma.projectActivityPhoto.findFirst({
        where: { projectId: project.id, type: type },
        orderBy: { createdAt: 'desc' }
      }).catch(() => null);
    }
  }

  // 1. Physically delete target photo file if it exists
  if (targetPhoto && targetPhoto.photoUrl) {
    const pUrl = targetPhoto.photoUrl;
    if (pUrl.includes('res.cloudinary.com')) {
      console.log('🧹 [Reject] Destroying Cloudinary staging photo:', pUrl);
      await deleteFromCloudinary(pUrl).catch(err => console.error('Cloudinary cleanup warning:', err.message));
    } else if (pUrl.startsWith('/uploads/') || pUrl.startsWith('/database foto/') || pUrl.startsWith('/database%20foto/')) {
      const localP = path.join(BACKEND_ROOT, decodeURIComponent(pUrl));
      if (fs.existsSync(localP)) {
        console.log('🧹 [Reject] Unlinking local photo:', localP);
        await fs.promises.unlink(localP).catch(err => console.error('Unlink error:', err.message));
      }
    }
  }

  // 2. Delete the target photo record
  if (targetPhoto) {
    await prisma.projectActivityPhoto.delete({ where: { id: targetPhoto.id } }).catch(() => null);
  }

  // 3. Query remaining photos for this project & activity type
  const remainingPhotos = await prisma.projectActivityPhoto.findMany({
    where: { projectId: project.id, type: type },
    orderBy: { createdAt: 'asc' }
  }).catch(() => []);

  if (remainingPhotos.length > 0) {
    // Recalculate status based on remaining photos
    let newStatus = 'belum';
    if (remainingPhotos.some(p => p.status === 'upload')) {
      newStatus = 'upload';
    } else if (remainingPhotos.some(p => p.status === 'verified')) {
      newStatus = 'verified';
    }

    const latest = remainingPhotos[remainingPhotos.length - 1];
    const effectiveKeterangan = latest?.keterangan || latest?.namaBumdes || latest?.namaOutlet || latest?.kodeSf || null;

    await prisma.projectActivity.upsert({
      where: { projectId_type: { projectId: project.id, type: type } },
      update: {
        status: newStatus,
        photoUrl: latest?.photoUrl || null,
        planDate: latest?.planDate || null,
        keterangan: effectiveKeterangan,
        userId: latest?.userId || undefined
      },
      create: {
        projectId: project.id,
        type: type,
        status: newStatus,
        photoUrl: latest?.photoUrl || null,
        planDate: latest?.planDate || null,
        keterangan: effectiveKeterangan,
        userId: latest?.userId || undefined
      }
    });

    console.log(`✅ [Reject Success] Project "${project.name}" (${type}) remaining photos: ${remainingPhotos.length}, new status: ${newStatus}`);
    return ({
      success: true,
      message: 'Foto berhasil ditolak. Eviden kegiatan sebelumnya tetap aman.',
      status: newStatus,
      remainingCount: remainingPhotos.length
    });
  } else {
    // No remaining photos left (or was legacy record): clear legacy file if any and reset to 'belum'
    const legacyAct = await prisma.projectActivity.findFirst({
      where: { projectId: project.id, type: type }
    }).catch(() => null);

    if (legacyAct && legacyAct.photoUrl) {
      if (legacyAct.photoUrl.includes('res.cloudinary.com')) {
        await deleteFromCloudinary(legacyAct.photoUrl).catch(err => console.error('Cloudinary cleanup warning:', err.message));
      } else if (legacyAct.photoUrl.startsWith('/uploads/') || legacyAct.photoUrl.startsWith('/database foto/') || legacyAct.photoUrl.startsWith('/database%20foto/')) {
        const localP = path.join(BACKEND_ROOT, decodeURIComponent(legacyAct.photoUrl));
        if (fs.existsSync(localP)) {
          await fs.promises.unlink(localP).catch(err => console.error('Unlink error:', err.message));
        }
      }
    }

    await prisma.projectActivity.upsert({
      where: { projectId_type: { projectId: project.id, type: type } },
      update: {
        status: 'belum',
        photoUrl: null,
        planDate: null,
        actualDate: null,
        keterangan: null,
        userId: null
      },
      create: {
        projectId: project.id,
        type: type,
        status: 'belum',
        photoUrl: null,
        planDate: null,
        actualDate: null,
        keterangan: null,
        userId: null
      }
    });

    console.log(`✅ [Reject Success] Project "${project.name}" (${type}) no photos remaining, status reset to 'belum'`);
    return ({
      success: true,
      message: 'Verifikasi berhasil ditolak. Kegiatan dikembalikan ke status belum dikerjakan.',
      status: 'belum',
      remainingCount: 0
    });
  }
}

module.exports = { createActivity, findProjectHelper, deleteActivityPhoto, verifyActivity, rejectActivity };
