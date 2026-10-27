import React, { useEffect, useState } from 'react';
import {
  Building2,
  Plus,
  RefreshCw,
  Info,
  AlertTriangle,
  ShieldAlert,
  ChevronRight,
  X,
} from 'lucide-react';
import { api } from '../services/api';
import type { Institution, InstitutionIntakeComparison } from '../types';
import { SideDrawer } from '../components/common/SideDrawer';
import { useToast } from '../context/ToastContext';

export const InstitutionsPage: React.FC = () => {
  const { showToast } = useToast();

  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [intakeStats, setIntakeStats] = useState<Record<string, InstitutionIntakeComparison>>({});
  const [loading, setLoading] = useState(true);

  // Detail drawer
  const [selectedInst, setSelectedInst] = useState<Institution | null>(null);

  // Add Institution Modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    institution_code: '',
    institution_name: '',
    approved_intake: 60,
    programme: 'Computer Engineering & Technology',
    academic_year: '2025-2026',
    state: 'Maharashtra',
    district: 'Pune',
  });
  const [isSaving, setIsSaving] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [insts, summary] = await Promise.all([
        api.getInstitutions(),
        api.getDashboardSummary().catch(() => null),
      ]);

      setInstitutions(insts);

      if (summary?.institution_intake_comparison) {
        const statsMap: Record<string, InstitutionIntakeComparison> = {};
        for (const item of summary.institution_intake_comparison) {
          statsMap[item.institution_id] = item;
        }
        setIntakeStats(statsMap);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to load institutions', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateInstitution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.institution_code.trim() || !formData.institution_name.trim()) {
      showToast('Institution code and name are required.', 'warning');
      return;
    }

    try {
      setIsSaving(true);
      const res = await api.createInstitution(formData);
      showToast(`Institution node ${res.institution_name} registered successfully.`, 'success');
      setCreateModalOpen(false);
      setFormData({
        institution_code: '',
        institution_name: '',
        approved_intake: 60,
        programme: 'Computer Engineering & Technology',
        academic_year: '2025-2026',
        state: 'Maharashtra',
        district: 'Pune',
      });
      fetchData();
    } catch (err: any) {
      showToast(err.message || 'Failed to create institution node', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-surface border border-institutional rounded-xl p-4 card-padded shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-institutional-main">Institutions & Intake Reconciliation</h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-surface-secondary text-institutional-muted font-mono font-semibold">
              {institutions.length} Nodes
            </span>
          </div>
          <p className="text-xs text-institutional-muted mt-0.5">
            Registered AICTE autonomous institutions with approved capacity limits and reported enrollment reconciliation.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchData}
            title="Refresh"
            className="p-2 rounded border border-institutional text-institutional-muted hover:text-institutional-main hover:bg-surface-secondary"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            type="button"
            onClick={() => setCreateModalOpen(true)}
            className="px-3.5 py-2 text-xs font-medium text-white bg-institutional-primary bg-institutional-primary-hover rounded-lg transition-colors inline-flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" /> Register Institution
          </button>
        </div>
      </div>

      {/* Mandatory Regulatory Disclaimer */}
      <div className="p-3.5 px-4 bg-surface-secondary/50 border border-institutional rounded-xl text-xs flex items-start gap-3">
        <Info className="w-4 h-4 text-institutional-muted mt-0.5 shrink-0" />
        <div className="text-institutional-muted">
          <strong className="text-institutional-main font-semibold">Capacity Verification Disclaimer:</strong> Configured intake
          figures reflect institutional administrative ceilings recorded during platform registration. These figures are not
          independently validated in real time against a live central government approval database and represent self-reported regulatory benchmarks.
        </div>
      </div>

      {/* Institution Cards / Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {loading
          ? Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-56 bg-surface border border-institutional rounded-xl animate-pulse" />
            ))
          : institutions.map((inst) => {
              const stats = intakeStats[inst.id];
              const enrolled = stats?.enrolled_count ?? 0;
              const approved = inst.approved_intake;
              const percent = approved > 0 ? Math.round((enrolled / approved) * 100) : 0;
              const isExceeded = enrolled > approved;

              return (
                <div
                  key={inst.id}
                  className="bg-surface border border-institutional rounded-xl p-5 shadow-xs flex flex-col justify-between hover:border-institutional-strong transition-colors"
                >
                  <div>
                    {/* Header with code */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-surface-secondary text-institutional-primary">
                          <Building2 className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="font-mono text-[11px] text-institutional-muted block">
                            {inst.institution_code}
                          </span>
                          <h3 className="font-bold text-sm text-institutional-main leading-tight line-clamp-1">
                            {inst.institution_name}
                          </h3>
                        </div>
                      </div>
                      {isExceeded ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold badge-danger shrink-0">
                          Over Capacity
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium badge-verified shrink-0">
                          Normal
                        </span>
                      )}
                    </div>

                    {/* Programme & Academic Year */}
                    <div className="mt-3 text-xs text-institutional-muted">
                      <div>
                        Programme: <span className="font-medium text-institutional-main">{inst.programme}</span>
                      </div>
                      <div>
                        Academic Session: <span className="font-medium text-institutional-main">{inst.academic_year}</span>
                      </div>
                    </div>

                    {/* Intake Progress Reconciliation */}
                    <div className="mt-4 pt-3 border-t border-institutional space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-institutional-muted">Enrolment Progress</span>
                        <span className="font-semibold text-institutional-main">
                          {enrolled} / {approved} ({percent}%)
                        </span>
                      </div>
                      <div className="w-full bg-surface-secondary rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-2 rounded-full transition-all duration-300 ${
                            isExceeded ? 'bg-red-600' : 'bg-institutional-primary'
                          }`}
                          style={{ width: `${Math.min(100, percent)}%` }}
                        />
                      </div>
                      {isExceeded && (
                        <p className="text-[11px] text-red-600 font-medium">
                          Intake ceiling exceeded by {enrolled - approved} seats.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Footer actions */}
                  <div className="mt-4 pt-3 border-t border-institutional flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 text-institutional-muted">
                      <ShieldAlert className="w-3.5 h-3.5" />
                      <span>{stats?.open_cases ?? 0} Open Cases</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedInst(inst)}
                      className="text-xs font-semibold text-institutional-primary hover:underline flex items-center gap-1"
                    >
                      Reconciliation Details <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
      </div>

      {/* Institution Details Drawer */}
      <SideDrawer
        isOpen={!!selectedInst}
        onClose={() => setSelectedInst(null)}
        title={selectedInst?.institution_name || 'Institution Node'}
        subtitle={`AICTE Code: ${selectedInst?.institution_code || ''}`}
      >
        {selectedInst && (
          <div className="space-y-6 text-xs">
            {/* Header Status */}
            <div className="p-4 bg-surface-secondary/60 border border-institutional rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-institutional-muted uppercase text-[10px] tracking-wider">
                  Registration Node State
                </span>
                <span className="px-2 py-0.5 rounded-full text-xs font-medium badge-verified">
                  {selectedInst.status}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-institutional">
                <div>
                  <span className="text-institutional-muted block">Internal Node ID</span>
                  <span className="font-mono font-bold text-institutional-main">{selectedInst.id}</span>
                </div>
                <div>
                  <span className="text-institutional-muted block">Location</span>
                  <span className="text-institutional-main">
                    {selectedInst.district || 'Pune'}, {selectedInst.state || 'Maharashtra'}
                  </span>
                </div>
              </div>
            </div>

            {/* Reconciliation Breakdown */}
            <div className="space-y-3">
              <h4 className="font-bold text-institutional-main text-sm">Capacity Reconciliation Breakdown</h4>
              <div className="grid grid-cols-2 gap-4 bg-surface border border-institutional rounded-xl p-4">
                <div>
                  <span className="text-institutional-muted block">Configured Approved Intake</span>
                  <span className="text-xl font-bold text-institutional-main">{selectedInst.approved_intake}</span>
                  <span className="text-[10px] text-institutional-muted block mt-0.5">Authorized regulatory limit</span>
                </div>
                <div>
                  <span className="text-institutional-muted block">Reported Student Enrollment</span>
                  <span className="text-xl font-bold text-institutional-primary">
                    {intakeStats[selectedInst.id]?.enrolled_count ?? 0}
                  </span>
                  <span className="text-[10px] text-institutional-muted block mt-0.5">Active registry records</span>
                </div>
              </div>

              {intakeStats[selectedInst.id]?.status === 'EXCEEDED' && (
                <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-lg text-red-900 dark:text-red-200">
                  <div className="flex items-center gap-1.5 font-bold mb-1">
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                    <span>Intake Cap Exceeded</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    This institution reports {intakeStats[selectedInst.id].over_by} student enrollments in excess of its
                    configured ceiling. An automated integrity finding has been filed in the Review Queue.
                  </p>
                </div>
              )}
            </div>

            {/* Academic Programmes */}
            <div className="space-y-2 pt-3 border-t border-institutional">
              <h4 className="font-bold text-institutional-main text-sm">Reporting Programme Details</h4>
              <div className="p-3 bg-surface-secondary/40 border border-institutional rounded-lg space-y-1">
                <div className="flex justify-between">
                  <span className="text-institutional-muted">Department/Programme:</span>
                  <span className="font-semibold text-institutional-main">{selectedInst.programme}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-institutional-muted">Academic Session:</span>
                  <span className="font-semibold text-institutional-main">{selectedInst.academic_year}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </SideDrawer>

      {/* Add Institution Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-surface border border-institutional rounded-xl shadow-xl max-w-lg w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-institutional">
              <div>
                <h3 className="text-base font-bold text-institutional-main">Register Institution Node</h3>
                <p className="text-xs text-institutional-muted">Add participating AICTE institution to integrity platform.</p>
              </div>
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                className="p-1 text-institutional-muted hover:text-institutional-main"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateInstitution} className="space-y-4 mt-4 text-xs">
              <div>
                <label className="block text-institutional-muted font-medium mb-1">AICTE Institution Code *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 1-998877665"
                  value={formData.institution_code}
                  onChange={(e) => setFormData({ ...formData, institution_code: e.target.value })}
                  className="w-full p-2 bg-surface-secondary border border-institutional rounded-lg text-institutional-main font-mono"
                />
              </div>

              <div>
                <label className="block text-institutional-muted font-medium mb-1">Institution Legal Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Modern Institute of Engineering"
                  value={formData.institution_name}
                  onChange={(e) => setFormData({ ...formData, institution_name: e.target.value })}
                  className="w-full p-2 bg-surface-secondary border border-institutional rounded-lg text-institutional-main"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-institutional-muted font-medium mb-1">Configured Intake Cap *</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={formData.approved_intake}
                    onChange={(e) => setFormData({ ...formData, approved_intake: parseInt(e.target.value) || 60 })}
                    className="w-full p-2 bg-surface-secondary border border-institutional rounded-lg text-institutional-main"
                  />
                </div>
                <div>
                  <label className="block text-institutional-muted font-medium mb-1">Academic Year</label>
                  <input
                    type="text"
                    value={formData.academic_year}
                    onChange={(e) => setFormData({ ...formData, academic_year: e.target.value })}
                    className="w-full p-2 bg-surface-secondary border border-institutional rounded-lg text-institutional-main"
                  />
                </div>
              </div>

              <div>
                <label className="block text-institutional-muted font-medium mb-1">Primary Programme</label>
                <input
                  type="text"
                  value={formData.programme}
                  onChange={(e) => setFormData({ ...formData, programme: e.target.value })}
                  className="w-full p-2 bg-surface-secondary border border-institutional rounded-lg text-institutional-main"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-institutional-muted font-medium mb-1">State</label>
                  <input
                    type="text"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="w-full p-2 bg-surface-secondary border border-institutional rounded-lg text-institutional-main"
                  />
                </div>
                <div>
                  <label className="block text-institutional-muted font-medium mb-1">District</label>
                  <input
                    type="text"
                    value={formData.district}
                    onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                    className="w-full p-2 bg-surface-secondary border border-institutional rounded-lg text-institutional-main"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-institutional flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 border border-institutional rounded-lg text-institutional-main hover:bg-surface-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 bg-institutional-primary bg-institutional-primary-hover text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isSaving && (
                    <span className="w-3.5 h-3.5 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                  )}
                  Register Node
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
