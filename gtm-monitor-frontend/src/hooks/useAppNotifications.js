import { useMemo } from 'react';
import { ACT_TYPES } from '../utils';

/**
 * Hook untuk menghitung dan mengelompokkan notifikasi aktivitas:
 * - Admin: seluruh aktivitas yang berstatus 'upload' / menunggu verifikasi di semua branch.
 * - User (Akun Branch): aktivitas yang telah disetujui ('verified') oleh admin KHUSUS pada branch milik user.
 */
export function useAppNotifications(branches, user, isAdmin) {
  return useMemo(() => {
    if (!user) {
      return { notifications: [], count: 0 };
    }

    const items = [];

    if (isAdmin) {
      // ─── ADMIN: Menampilkan kegiatan yang diunggah & menunggu verifikasi ───
      (branches || []).forEach((b) => {
        (b.projects || []).forEach((p) => {
          (p.activities || []).forEach((a) => {
            const hasUploadStatus = a.status === 'upload' || a.status === 'need_review' || a.status === 'pending';
            const uploadPhotos = Array.isArray(a.photos) ? a.photos.filter((ph) => ph.status === 'upload' || ph.status === 'need_review') : [];

            if (hasUploadStatus || uploadPhotos.length > 0) {
              const actMeta = ACT_TYPES.find((t) => t.key === a.type);
              const actLabel = actMeta?.label || a.type;
              const latestPhoto = uploadPhotos[uploadPhotos.length - 1];
              const timestamp = latestPhoto?.createdAt || latestPhoto?.updatedAt || a.updatedAt || a.createdAt || latestPhoto?.planDate;

              items.push({
                id: `admin-${b.name}-${p.name}-${a.type}`,
                branchName: b.name,
                projectName: p.name,
                wok: p.wok,
                actType: a.type,
                actLabel,
                status: 'upload',
                title: actLabel,
                timestamp
              });
            }
          });
        });
      });
    } else if (user.role === 'USER' && user.branchName) {
      // ─── USER: Menampilkan kegiatan yang telah disetujui admin pada branch user tersebut saja ───
      const userBranchNormalized = user.branchName.trim().toUpperCase();
      const targetBranch = (branches || []).find((b) => b.name?.trim().toUpperCase() === userBranchNormalized);

      if (targetBranch) {
        (targetBranch.projects || []).forEach((p) => {
          (p.activities || []).forEach((a) => {
            const isVerified = a.status === 'verified';
            const verifiedPhotos = Array.isArray(a.photos) ? a.photos.filter((ph) => ph.status === 'verified') : [];

            if (isVerified || verifiedPhotos.length > 0) {
              const actMeta = ACT_TYPES.find((t) => t.key === a.type);
              const actLabel = actMeta?.label || a.type;
              const latestPhoto = verifiedPhotos[verifiedPhotos.length - 1];
              const timestamp = latestPhoto?.updatedAt || latestPhoto?.createdAt || a.updatedAt || a.createdAt || latestPhoto?.planDate;

              items.push({
                id: `user-${targetBranch.name}-${p.name}-${a.type}`,
                branchName: targetBranch.name,
                projectName: p.name,
                wok: p.wok,
                actType: a.type,
                actLabel,
                status: 'verified',
                title: actLabel,
                timestamp
              });
            }
          });
        });
      }
    }

    // Urutkan dari notifikasi dengan timestamp terbaru jika tersedia
    items.sort((x, y) => {
      const tx = x.timestamp ? new Date(x.timestamp).getTime() : 0;
      const ty = y.timestamp ? new Date(y.timestamp).getTime() : 0;
      return ty - tx;
    });

    return {
      notifications: items,
      count: items.length
    };
  }, [branches, user, isAdmin]);
}

