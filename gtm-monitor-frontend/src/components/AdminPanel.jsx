import { useState, memo } from 'react';
import ReviewModal from './ReviewModal';
import AdminKpiGrid from './admin/AdminKpiGrid';
import AdminActionHubCard from './admin/AdminActionHubCard';
import OdpImportModal from './admin/OdpImportModal';
import PairingImportModal from './admin/PairingImportModal';
import ProgramUploadModal from './admin/ProgramUploadModal';
import ProgramDeleteModal from './admin/ProgramDeleteModal';
import DeleteProgramConfirmModal from './admin/DeleteProgramConfirmModal';
import UploadGuideModal from './admin/UploadGuideModal';
import { useAdminMonitoring } from '../hooks/useAdminMonitoring';
import { useProjectReviewModal } from '../hooks/useProjectReviewModal';
import { useOdpImport } from '../hooks/useOdpImport';
import { usePairingImport } from '../hooks/usePairingImport';
import { useProgramUpload } from '../hooks/useProgramUpload';
import { useProgramDelete } from '../hooks/useProgramDelete';

// Control Panel Admin: KPI + Pusat Pembaruan Database 1 Segmen dengan Dialog Pop-up
const AdminPanel = memo(function AdminPanel({ branches = [], onUpdate, verifyActivity, rejectActivity, deletePhoto }) {
  const [activeModal, setActiveModal] = useState(null); // 'odp' | 'pairing' | 'program' | 'delete' | null
  const [activeInfoModal, setActiveInfoModal] = useState(null); // 'program' | 'odp' | 'pairing' | null

  const monitoring = useAdminMonitoring(branches);
  const { modalData, closeModal } = useProjectReviewModal(branches);
  const odpImport = useOdpImport({ onUpdate });
  const pairingImport = usePairingImport();
  const programUpload = useProgramUpload();
  const programDelete = useProgramDelete();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', animation: 'fadeIn 0.3s ease-in-out' }}>
      {/* 4 KPI Summary Cards matching Dashboard & Activity style */}
      <AdminKpiGrid priorityBranches={monitoring.priorityBranches} stats={monitoring.stats} totalProjects={monitoring.totalProjects} />

      {/* 1 Segmen Terpadu Pusat Pembaruan Database & Program */}
      <AdminActionHubCard
        onOpenModal={(type) => setActiveModal(type)}
      />

      {/* Dialog Pop-up Upload & Kelola Data */}
      <OdpImportModal
        isOpen={activeModal === 'odp'}
        onClose={() => setActiveModal(null)}
        {...odpImport}
        setActiveInfoModal={setActiveInfoModal}
      />

      <PairingImportModal
        isOpen={activeModal === 'pairing'}
        onClose={() => setActiveModal(null)}
        {...pairingImport}
        setActiveInfoModal={setActiveInfoModal}
      />

      <ProgramUploadModal
        isOpen={activeModal === 'program'}
        onClose={() => setActiveModal(null)}
        {...programUpload}
        setActiveInfoModal={setActiveInfoModal}
      />

      <ProgramDeleteModal
        isOpen={activeModal === 'delete'}
        onClose={() => setActiveModal(null)}
        {...programDelete}
      />

      {/* Dialog Konfirmasi Hapus Program */}
      {programDelete.showDeleteConfirmModal && (
        <DeleteProgramConfirmModal {...programDelete} />
      )}

      {/* Review Modal Kegiatan */}
      <ReviewModal
        modalData={modalData}
        closeModal={closeModal}
        verifyActivity={verifyActivity}
        rejectActivity={rejectActivity}
        deletePhoto={deletePhoto}
      />

      {/* Panduan Upload Modal */}
      {activeInfoModal && (
        <UploadGuideModal activeInfoModal={activeInfoModal} setActiveInfoModal={setActiveInfoModal} />
      )}
    </div>
  );
});

export default AdminPanel;
