// Data dashboard: seluruh branch → proyek → ODP & status kegiatan (bentuk respons sesuai kebutuhan frontend)
const fs = require('fs');
const path = require('path');
const prisma = require('../lib/prisma');
const { BACKEND_ROOT } = require('../config/paths');
const { getOdpCoords } = require('../utils/geo');
const { resolveOdpStatus } = require('../utils/odpStatus');
const { getBranchPerformance, getRegionalPerformance } = require('./performance.service');

// Dipindah dari handler server.js baris 828-955
async function getDashboardData() {
  const [branches, branchPerformance] = await Promise.all([
    prisma.branch.findMany({
      include: {
        projects: {
          include: {
            odps: true,
            activities: true,
            photos: {
              orderBy: { createdAt: 'asc' }
            }
          }
        }
      }
    }),
    getBranchPerformance()
  ]);
  // Angka resmi OCC BRANCH & GAP WOW dari Excel (materialized view BranchPerformance, sumber: tabel ReportedMetric)
  const performanceByBranch = new Map(branchPerformance.map(row => [row.branchId, row]));

  // Transform data to match what the frontend expects (Return all projects for Dashboard & typeDesign support)
  const formattedBranches = branches.map(b => ({
    name: b.name,
    occRate: performanceByBranch.get(b.id)?.reportedOccRate ?? null,   // Nilai OCC BRANCH langsung dari Excel (0.0 - 1.0)
    gapWoW: performanceByBranch.get(b.id)?.reportedGapWoW ?? null,     // Nilai GAP WOW dari Excel
    projects: b.projects.map(p => {
      // Pre-kalkulasi total per proyek
      const usedTotal = p.odps.reduce((s, o) => s + o.used, 0);
      const avaiTotal = p.odps.reduce((s, o) => s + o.avai, 0);
      const totalPort = p.odps.reduce((s, o) => s + o.total, 0);
      const occRate = totalPort > 0 ? Math.round((usedTotal / totalPort) * 1000) / 10 : 0;
      const odpCount = p.odps.length;
      const isPriority = odpCount > 1 && occRate < 35;
      const typeDesign = p.typeDesign || 'Greenfield';

      const actTypes = ['tsel_menyapa', 'branding_outlet', 'bumdes', 'rekrutmen_sf', 'open_table'];
      const formattedActivities = actTypes.map(actKey => {
        let typePhotos = (p.photos || []).filter(ph => ph.type === actKey);
        const legacyAct = (p.activities || []).find(a => a.type === actKey);

        // Jika ada data di ProjectActivity tapi belum ada di ProjectActivityPhoto
        if (legacyAct && legacyAct.status && legacyAct.status !== 'belum' && (legacyAct.photoUrl || legacyAct.planDate || legacyAct.keterangan || legacyAct.kodeSf)) {
          if (typePhotos.length === 0) {
            typePhotos.push({
              id: legacyAct.id,
              type: actKey,
              status: legacyAct.status || 'upload',
              photoUrl: legacyAct.photoUrl,
              planDate: legacyAct.planDate,
              keterangan: legacyAct.keterangan,
              createdAt: legacyAct.createdAt || new Date()
            });
          }
        }

        // Cek keberadaan file fisik untuk foto lokal (/uploads/...)
        const validPhotos = typePhotos.map(ph => {
          let photoUrl = ph.photoUrl;
          let status = ph.status;
          if (photoUrl && photoUrl.startsWith('/uploads/')) {
            const localFilePath = path.join(BACKEND_ROOT, decodeURIComponent(photoUrl));
            if (!fs.existsSync(localFilePath)) {
              console.log(`⚠️ [File Checker] File foto lokal hilang dari disk untuk proyek "${p.name}" (${actKey}): ${photoUrl}`);
              photoUrl = null;
              status = 'belum';
            }
          }
          return { ...ph, photoUrl, status };
        }).filter(ph => ph.photoUrl || ph.planDate || ph.keterangan || ph.kodeSf || ph.namaOutlet || ph.namaBumdes);

        // Hitung overall status kegiatan
        let overallStatus = 'belum';
        if (validPhotos.some(ph => ph.status === 'upload')) {
          overallStatus = 'upload';
        } else if (validPhotos.some(ph => ph.status === 'verified')) {
          overallStatus = 'verified';
        }

        const latestPhoto = validPhotos[validPhotos.length - 1];

        return {
          id: legacyAct?.id || actKey,
          type: actKey,
          status: overallStatus,
          photos: validPhotos,
          photoUrl: latestPhoto?.photoUrl || null,
          planDate: latestPhoto?.planDate || null,
          namaOutlet: latestPhoto?.namaOutlet || null,
          namaBumdes: latestPhoto?.namaBumdes || (latestPhoto?.type === 'bumdes' ? latestPhoto?.keterangan : null),
          kodeSf: latestPhoto?.kodeSf || latestPhoto?.keterangan || null,
          keterangan: latestPhoto?.keterangan || null
        };
      });

      return {
        name: p.name,
        branchName: b.name,
        wok: p.wok,
        typeDesign,
        isPriority,
        usedTotal,
        avaiTotal,
        totalPort,
        occRate,
        odpCount,
        odps: p.odps.map(o => {
          const coords = getOdpCoords(o.odp, b.name, o.lat, o.lon);
          const occStatus = resolveOdpStatus(o);

          return {
            odp: o.odp,
            avai: o.avai,
            used: o.used,
            total: o.total,
            lat: coords.lat,
            lon: coords.lon,
            occStatus: occStatus
          };
        }),
        activities: formattedActivities
      };
    })
  }));

  return (formattedBranches);
}

// Ringkasan Jateng DIY (KPI dashboard): waktu import dari ImportMeta + angka resmi baris ringkasan Excel
// (materialized view RegionalPerformance). Bentuk respons sama seperti sebelum normalisasi.
async function getImportMeta() {
  const [meta, region] = await Promise.all([
    prisma.importMeta.findUnique({ where: { key: 'jateng_diy_summary' } }),
    getRegionalPerformance()
  ]);
  if (!meta) return {};
  return {
    id: meta.id,
    key: meta.key,
    occRate: region?.reportedOccRate ?? null,
    available: region?.reportedAvailable ?? null,
    used: region?.reportedUsed ?? null,
    total: region?.reportedTotal ?? null,
    gapWoW: region?.reportedGapWoW ?? null,
    updatedAt: meta.updatedAt
  };
}

// Metrik performa branch & regional dari materialized view (hasil hitung dari data ODP + angka resmi Excel)
async function getPerformanceSummary() {
  const [region, branches] = await Promise.all([getRegionalPerformance(), getBranchPerformance()]);
  return { region, branches };
}

module.exports = { getDashboardData, getImportMeta, getPerformanceSummary };
