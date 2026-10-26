import { useState, useMemo } from 'react';
import { computeStats } from '../utils';

// Tab "Monitoring & Verifikasi Proyek": LOP prioritas, filter branch / status / pencarian & statistik terkait
export function useAdminMonitoring(branches) {
  const priorityBranches = useMemo(() => {
    return (branches || []).map(b => ({
      ...b,
      projects: (b.projects || []).filter(p => {
        const isPriority = p.isPriority ?? (p.odpCount > 1 && p.occRate < 35);
        const isGreenfield = (p.typeDesign || 'Greenfield') === 'Greenfield';
        return isPriority && isGreenfield;
      })
    })).filter(b => b.projects && b.projects.length > 0);
  }, [branches]);

  const totalProjects = useMemo(() => priorityBranches.reduce((s, b) => s + (b.projects?.length || 0), 0), [priorityBranches]);

  // Monitoring Filters States
  const [selectedBranch, setSelectedBranch] = useState('Semua Branch');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'need_review' | 'verified' | 'pending'
  const [isBranchDropdownOpen, setIsBranchDropdownOpen] = useState(false);
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);

  // Filter Branches and Projects for Monitoring Tab
  const filteredBranches = useMemo(() => {
    if (selectedBranch === 'Semua Branch') return priorityBranches;
    return priorityBranches.filter(b => b.name === selectedBranch);
  }, [priorityBranches, selectedBranch]);

  // Dynamic KPI stats recalculated based on the selected branch filter
  const stats = useMemo(() => computeStats(filteredBranches), [filteredBranches]);

  // Hitung jumlah proyek per status filter (Semua, Menunggu Verifikasi, Sudah Terverifikasi, Belum Dikerjakan)
  const statusCounts = useMemo(() => {
    let needReviewCount = 0;
    let verifiedCount = 0;
    let pendingCount = 0;
    let totalCount = 0;

    filteredBranches.forEach(b => {
      (b.projects || []).forEach(p => {
        totalCount++;
        const acts = p.activities || [];
        if (acts.some(a => a.status === 'upload')) {
          needReviewCount++;
        } else if (acts.some(a => a.status === 'verified')) {
          verifiedCount++;
        } else if (acts.length === 0 || acts.every(a => a.status === 'belum')) {
          pendingCount++;
        }
      });
    });

    return {
      all: totalCount,
      need_review: needReviewCount,
      verified: verifiedCount,
      pending: pendingCount
    };
  }, [filteredBranches]);

  const branchesWithFilteredProjects = useMemo(() => {
    const s = search.toLowerCase();
    return filteredBranches.map(b => {
      let projs = (b.projects || []).filter(p => 
        !s || 
        p.name.toLowerCase().includes(s) || 
        (p.wok && p.wok.toLowerCase().includes(s)) ||
        (p.odps && p.odps.some(o => o.odp && o.odp.toLowerCase().includes(s)))
      );

      // Apply status filter
      if (statusFilter === 'need_review') {
        projs = projs.filter(p => p.activities?.some(a => a.status === 'upload'));
      } else if (statusFilter === 'verified') {
        projs = projs.filter(p => p.activities?.some(a => a.status === 'verified'));
      } else if (statusFilter === 'pending') {
        projs = projs.filter(p => !p.activities || p.activities.length === 0 || p.activities.every(a => a.status === 'belum'));
      }

      return { ...b, projects: projs };
    }).filter(b => b.projects.length > 0);
  }, [filteredBranches, search, statusFilter]);

  const allProjectsMultiBranch = useMemo(() => {
    return branchesWithFilteredProjects.flatMap(b => b.projects.map(p => ({ ...p, branchName: b.name })));
  }, [branchesWithFilteredProjects]);

  return {
    priorityBranches, totalProjects,
    selectedBranch, setSelectedBranch, search, setSearch, statusFilter, setStatusFilter,
    isBranchDropdownOpen, setIsBranchDropdownOpen, isStatusDropdownOpen, setIsStatusDropdownOpen,
    filteredBranches, stats, statusCounts, branchesWithFilteredProjects, allProjectsMultiBranch
  };
}
