import { useState, memo } from 'react';
import ReviewModal from './ReviewModal';
import AdminHeader from './admin/AdminHeader';
import AdminKpiGrid from './admin/AdminKpiGrid';
import AdminTabs from './admin/AdminTabs';
import MonitoringTab from './admin/MonitoringTab';
import ProgramUploadCard from './admin/ProgramUploadCard';
import OdpImportCard from './admin/OdpImportCard';
import PairingImportCard from './admin/PairingImportCard';
import ProgramDeleteCard from './admin/ProgramDeleteCard';
import DeleteProgramConfirmModal from './admin/DeleteProgramConfirmModal';
import ExportRekapModal from './admin/ExportRekapModal';
import UploadGuideModal from './admin/UploadGuideModal';
import { useAdminMonitoring } from '../hooks/useAdminMonitoring';
import { useProjectReviewModal } from '../hooks/useProjectReviewModal';
import { useOdpImport } from '../hooks/useOdpImport';
import { usePairingImport } from '../hooks/usePairingImport';
import { useProgramUpload } from '../hooks/useProgramUpload';
import { useProgramDelete } from '../hooks/useProgramDelete';
import { useRekapExcelExport } from '../hooks/useRekapExcelExport';

// Control Panel Admin: KPI, tab Monitoring & Verifikasi Proyek, tab Update Data Mingguan (program, ODP, pairing).
// Modal sengaja dirender di level ini (bukan di dalam kartu) agar posisi fixed-nya sama seperti sebelumnya.
const AdminPanel = memo(function AdminPanel({ branches = [], onUpdate, verifyActivity, rejectActivity, uploadPhoto, deletePhoto }) {
  const [activeTab, setActiveTab] = useState('monitoring'); // 'monitoring' | 'excel'
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [activeInfoModal, setActiveInfoModal] = useState(null); // 'program' | 'odp' | 'pairing' | null

  const monitoring = useAdminMonitoring(branches);
  const { modalData, openModal, closeModal } = useProjectReviewModal(branches);
  const odpImport = useOdpImport({ onUpdate });
  const pairingImport = usePairingImport();
  const programUpload = useProgramUpload();
  const programDelete = useProgramDelete();
  const handleExportRekapExcel = useRekapExcelExport(branches);

  return (
    <div style={{ animation: 'fadeIn 0.3s ease-in-out' }}>
      <AdminHeader />
      <AdminKpiGrid priorityBranches={monitoring.priorityBranches} stats={monitoring.stats} totalProjects={monitoring.totalProjects} />
      <AdminTabs activeTab={activeTab} setActiveTab={setActiveTab} stats={monitoring.stats} setIsExportModalOpen={setIsExportModalOpen} />

      {activeTab === 'monitoring' && (
        <MonitoringTab {...monitoring} openModal={openModal} uploadPhoto={uploadPhoto} />
      )}

      {/* ─── TAB 2: UPDATE DATABASE MINGGUAN (EXCEL) ─── */}
      {activeTab === 'excel' && (
        <div className="fade-in">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px', alignItems: 'stretch' }}>
            <ProgramUploadCard {...programUpload} setActiveInfoModal={setActiveInfoModal} />
            <OdpImportCard {...odpImport} setActiveInfoModal={setActiveInfoModal} />
            <PairingImportCard {...pairingImport} setActiveInfoModal={setActiveInfoModal} />
            <ProgramDeleteCard {...programDelete} />
          </div>
        </div>
      )}

      {programDelete.showDeleteConfirmModal && (
        <DeleteProgramConfirmModal {...programDelete} />
      )}

      {/* Review Modal */}
      <ReviewModal modalData={modalData} closeModal={closeModal} verifyActivity={verifyActivity} rejectActivity={rejectActivity} deletePhoto={deletePhoto} />

      {isExportModalOpen && (
        <ExportRekapModal setIsExportModalOpen={setIsExportModalOpen} handleExportRekapExcel={handleExportRekapExcel} />
      )}
      {activeInfoModal && (
        <UploadGuideModal activeInfoModal={activeInfoModal} setActiveInfoModal={setActiveInfoModal} />
      )}
    </div>
  );
});

export default AdminPanel;
