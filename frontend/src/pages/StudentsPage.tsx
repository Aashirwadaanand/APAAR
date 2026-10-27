import React, { useEffect, useState } from 'react';
import {
  Search,
  Plus,
  Upload,
  Eye,
  EyeOff,
  RefreshCw,
  Edit2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  X,
  CheckCircle2,
} from 'lucide-react';
import { api } from '../services/api';
import type {
  Student,
  Institution,
  CsvPreviewResponse,
  CsvImportCommitResponse,
} from '../types';
import { SideDrawer } from '../components/common/SideDrawer';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { StatusBadge } from '../components/common/StatusBadge';
import { TableSkeleton } from '../components/common/TableSkeleton';
import { EmptyState } from '../components/common/EmptyState';
import { useToast } from '../context/ToastContext';

export const StudentsPage: React.FC = () => {
  const { showToast } = useToast();

  // State
  const [students, setStudents] = useState<Student[]>([]);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 15;

  // Filters
  const [search, setSearch] = useState('');
  const [selectedInst, setSelectedInst] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  // Sensitive ID masking toggle (store set of unmasked student IDs)
  const [unmaskedIds, setUnmaskedIds] = useState<Set<number>>(new Set());

  // Detail Drawer
  const [detailStudent, setDetailStudent] = useState<Student | null>(null);

  // Create / Edit Modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [formData, setFormData] = useState({
    institution_id: 'AICTE-1-432890123',
    institution_student_id: '',
    full_name: '',
    date_of_birth: '',
    programme: 'Computer Engineering',
    academic_year: '2025-2026',
    apaar_id: '',
    enrollment_status: 'Active',
    email: '',
    mobile: '',
  });
  const [formSaving, setFormSaving] = useState(false);

  // CSV Import Modal & Flow
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importInstId, setImportInstId] = useState('AICTE-1-432890123');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewData, setPreviewData] = useState<CsvPreviewResponse | null>(null);
  const [confirmImportOpen, setConfirmImportOpen] = useState(false);
  const [committingImport, setCommittingImport] = useState(false);
  const [importSummary, setImportSummary] = useState<CsvImportCommitResponse | null>(null);

  // Load institutions once
  useEffect(() => {
    api.getInstitutions()
      .then((data) => {
        setInstitutions(data);
        if (data.length > 0 && !formData.institution_id) {
          setFormData((f) => ({ ...f, institution_id: data[0].id }));
        }
      })
      .catch(() => {});
  }, []);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const res = await api.getStudents({
        page,
        page_size: pageSize,
        institution_id: selectedInst || undefined,
        status: selectedStatus || undefined,
        search: search || undefined,
      });
      setStudents(res.items);
      setTotalCount(res.total);
    } catch (err: any) {
      showToast(err.message || 'Failed to fetch student records', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [page, selectedInst, selectedStatus]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchStudents();
  };

  const toggleMask = (id: number) => {
    setUnmaskedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const maskApaarId = (apaar: string | null | undefined, id: number) => {
    if (!apaar) return '—';
    if (unmaskedIds.has(id)) return apaar;
    if (apaar.length >= 4) {
      return `•••• •••• ${apaar.slice(-4)}`;
    }
    return '••••••••••••';
  };

  // Open Create Form
  const openCreateModal = () => {
    setEditingStudent(null);
    setFormData({
      institution_id: selectedInst || institutions[0]?.id || 'AICTE-1-432890123',
      institution_student_id: '',
      full_name: '',
      date_of_birth: '',
      programme: 'Computer Engineering',
      academic_year: '2025-2026',
      apaar_id: '',
      enrollment_status: 'Active',
      email: '',
      mobile: '',
    });
    setEditModalOpen(true);
  };

  // Open Edit Form
  const openEditModal = (student: Student) => {
    setEditingStudent(student);
    setFormData({
      institution_id: student.institution_id,
      institution_student_id: student.institution_student_id,
      full_name: student.full_name,
      date_of_birth: student.date_of_birth ? String(student.date_of_birth).substring(0, 10) : '',
      programme: student.programme || 'Engineering',
      academic_year: student.academic_year || '2025-2026',
      apaar_id: student.apaar_id || '',
      enrollment_status: student.enrollment_status || 'Active',
      email: student.email || '',
      mobile: student.mobile || '',
    });
    setEditModalOpen(true);
  };

  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.institution_student_id.trim() || !formData.full_name.trim()) {
      showToast('Student ID and Full Name are mandatory.', 'warning');
      return;
    }

    try {
      setFormSaving(true);
      if (editingStudent) {
        await api.updateStudent(editingStudent.id, {
          institution_student_id: formData.institution_student_id,
          full_name: formData.full_name,
          date_of_birth: formData.date_of_birth || null,
          programme: formData.programme,
          academic_year: formData.academic_year,
          apaar_id: formData.apaar_id || null,
          enrollment_status: formData.enrollment_status,
          email: formData.email,
          mobile: formData.mobile,
        });
        showToast('Student record updated successfully.', 'success');
      } else {
        await api.createStudent({
          institution_id: formData.institution_id,
          institution_student_id: formData.institution_student_id,
          full_name: formData.full_name,
          date_of_birth: formData.date_of_birth || null,
          programme: formData.programme,
          academic_year: formData.academic_year,
          apaar_id: formData.apaar_id || null,
          enrollment_status: formData.enrollment_status,
          email: formData.email,
          mobile: formData.mobile,
        });
        showToast('New student enrolled successfully.', 'success');
      }
      setEditModalOpen(false);
      fetchStudents();
    } catch (err: any) {
      showToast(err.message || 'Failed to save student record.', 'error');
    } finally {
      setFormSaving(false);
    }
  };

  // CSV Import handlers
  const handlePreviewUpload = async () => {
    if (!importFile) {
      showToast('Please select a .csv file to preview.', 'warning');
      return;
    }

    try {
      setPreviewLoading(true);
      const res = await api.previewCsvImport(importFile, importInstId);
      setPreviewData(res);
      setImportSummary(null);
    } catch (err: any) {
      showToast(err.message || 'CSV parse and validation failed.', 'error');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleExecuteCommit = async () => {
    if (!previewData || !previewData.all_valid_records.length) return;

    try {
      setCommittingImport(true);
      const res = await api.confirmCsvImport(previewData.all_valid_records, previewData.institution_id);
      setImportSummary(res);
      setConfirmImportOpen(false);
      setPreviewData(null);
      setImportFile(null);
      showToast(`Import completed: ${res.imported_count} records imported.`, 'success');
      fetchStudents();
    } catch (err: any) {
      showToast(err.message || 'Failed to execute import commit.', 'error');
    } finally {
      setCommittingImport(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  return (
    <div className="space-y-6">
      {/* Header with Search and Actions */}
      <div className="bg-surface border border-institutional rounded-xl p-4 card-padded shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-institutional-main">Student Registry</h2>
          <p className="text-xs text-institutional-muted">
            Institutional enrollment repository with APAAR verification lifecycle and masking.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            id="csv-import-btn"
            onClick={() => {
              setImportModalOpen(true);
              setPreviewData(null);
              setImportSummary(null);
              setImportFile(null);
            }}
            className="px-3.5 py-2 text-xs font-medium text-institutional-main bg-surface-secondary hover:bg-surface-secondary/80 border border-institutional rounded-lg transition-colors inline-flex items-center gap-1.5"
          >
            <Upload className="w-3.5 h-3.5" /> CSV Import
          </button>
          <button
            type="button"
            id="enrol-student-btn"
            onClick={openCreateModal}
            className="px-3.5 py-2 text-xs font-medium text-white bg-institutional-primary bg-institutional-primary-hover rounded-lg transition-colors inline-flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" /> Enrol Student
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-surface border border-institutional rounded-xl p-3.5 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="flex-1 min-w-[240px] flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-institutional-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by student name, roll ID, or APAAR..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-surface-secondary border border-institutional rounded-lg focus:outline-none focus:border-institutional-primary text-institutional-main"
            />
          </div>
          <button
            type="submit"
            className="px-3 py-1.5 text-xs font-medium bg-institutional-primary text-white rounded-lg hover:bg-institutional-primary-hover transition-colors"
          >
            Search
          </button>
        </form>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Institution Filter */}
          <select
            value={selectedInst}
            onChange={(e) => {
              setSelectedInst(e.target.value);
              setPage(1);
            }}
            className="py-1.5 px-2.5 text-xs bg-surface-secondary border border-institutional rounded-lg text-institutional-main focus:outline-none"
          >
            <option value="">All Institutions</option>
            {institutions.map((inst) => (
              <option key={inst.id} value={inst.id}>
                {inst.institution_name}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value);
              setPage(1);
            }}
            className="py-1.5 px-2.5 text-xs bg-surface-secondary border border-institutional rounded-lg text-institutional-main focus:outline-none"
          >
            <option value="">All Enrollment Statuses</option>
            <option value="Active">Active</option>
            <option value="Suspended">Suspended</option>
            <option value="Graduated">Graduated</option>
            <option value="Transferred">Transferred</option>
          </select>

          <button
            type="button"
            onClick={fetchStudents}
            title="Refresh table"
            className="p-1.5 rounded border border-institutional text-institutional-muted hover:text-institutional-main hover:bg-surface-secondary transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Student Registry Table */}
      <div className="bg-surface border border-institutional rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <TableSkeleton rows={8} columns={6} />
          ) : students.length === 0 ? (
            <EmptyState
              title="No student records found"
              description="No registered students matched your current filter criteria."
              actionText="Add Student"
              onAction={openCreateModal}
            />
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-secondary/70 text-institutional-muted uppercase font-semibold text-[11px] border-b border-institutional">
                <tr>
                  <th className="py-2.5 px-4">Student ID / Roll</th>
                  <th className="py-2.5 px-4">Full Name</th>
                  <th className="py-2.5 px-4">Programme & Year</th>
                  <th className="py-2.5 px-4">APAAR Identifier</th>
                  <th className="py-2.5 px-4 text-center">Enrollment</th>
                  <th className="py-2.5 px-4 text-center">Verification</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-institutional">
                {students.map((s) => (
                  <tr key={s.id} className="hover:bg-surface-hover transition-colors">
                    <td className="py-3 px-4 font-mono font-semibold text-institutional-main">
                      {s.institution_student_id}
                    </td>
                    <td className="py-3 px-4">
                      <button
                        type="button"
                        onClick={() => setDetailStudent(s)}
                        className="font-semibold text-institutional-primary hover:underline text-left block"
                      >
                        {s.full_name}
                      </button>
                      <span className="text-[11px] text-institutional-muted block">{s.email || '—'}</span>
                    </td>
                    <td className="py-3 px-4 text-institutional-muted">
                      <span className="font-medium text-institutional-main block">{s.programme}</span>
                      <span className="text-[11px] block">{s.academic_year}</span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5 font-mono">
                        <span className="text-institutional-main">{maskApaarId(s.apaar_id, s.id)}</span>
                        {s.apaar_id && (
                          <button
                            type="button"
                            onClick={() => toggleMask(s.id)}
                            title={unmaskedIds.has(s.id) ? 'Mask APAAR ID' : 'Reveal APAAR ID'}
                            className="p-1 text-institutional-muted hover:text-institutional-main rounded"
                          >
                            {unmaskedIds.has(s.id) ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <StatusBadge status={s.enrollment_status} type="enrollment" />
                    </td>
                    <td className="py-3 px-4 text-center">
                      <StatusBadge status={s.verification_status} type="verification" />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setDetailStudent(s)}
                          className="px-2 py-1 text-xs text-institutional-primary hover:bg-surface-secondary rounded"
                        >
                          View
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditModal(s)}
                          className="p-1 text-institutional-muted hover:text-institutional-primary rounded hover:bg-surface-secondary"
                          title="Edit Student"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination Bar */}
        <div className="px-4 py-3 border-t border-institutional flex items-center justify-between bg-surface-secondary/30 text-xs">
          <div className="text-institutional-muted">
            Showing <span className="font-semibold text-institutional-main">{students.length}</span> of{' '}
            <span className="font-semibold text-institutional-main">{totalCount}</span> student records
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-2.5 py-1 text-xs border border-institutional rounded-md text-institutional-main hover:bg-surface-secondary transition-colors disabled:opacity-40"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="text-institutional-muted">
              Page <span className="font-semibold text-institutional-main">{page}</span> of {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-2.5 py-1 text-xs border border-institutional rounded-md text-institutional-main hover:bg-surface-secondary transition-colors disabled:opacity-40"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Student Detail Drawer */}
      <SideDrawer
        isOpen={!!detailStudent}
        onClose={() => setDetailStudent(null)}
        title={detailStudent?.full_name || 'Student Profile'}
        subtitle={`Roll ID: ${detailStudent?.institution_student_id || '—'}`}
      >
        {detailStudent && (
          <div className="space-y-6 text-xs">
            {/* Identity Status Card */}
            <div className="bg-surface-secondary/60 border border-institutional rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-institutional-muted uppercase font-semibold text-[10px] tracking-wider">
                  Verification Lifecycle
                </span>
                <StatusBadge status={detailStudent.verification_status} type="verification" size="md" />
              </div>
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-institutional">
                <div>
                  <span className="text-institutional-muted block">Data Quality Score</span>
                  <span className="text-sm font-bold text-institutional-main">{detailStudent.quality_score}%</span>
                </div>
                <div>
                  <span className="text-institutional-muted block">Enrollment Status</span>
                  <StatusBadge status={detailStudent.enrollment_status} type="enrollment" />
                </div>
              </div>
            </div>

            {/* Demographics */}
            <div className="space-y-3">
              <h4 className="font-bold text-institutional-main text-sm">Student Demographics</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-institutional-muted block">Full Name</span>
                  <span className="font-semibold text-institutional-main text-sm">{detailStudent.full_name}</span>
                </div>
                <div>
                  <span className="text-institutional-muted block">Date of Birth</span>
                  <span className="text-institutional-main">{detailStudent.date_of_birth ? String(detailStudent.date_of_birth).substring(0, 10) : '—'}</span>
                </div>
                <div>
                  <span className="text-institutional-muted block">Email Address</span>
                  <span className="text-institutional-main font-mono">{detailStudent.email || '—'}</span>
                </div>
                <div>
                  <span className="text-institutional-muted block">Mobile Number</span>
                  <span className="text-institutional-main font-mono">{detailStudent.mobile || '—'}</span>
                </div>
              </div>
            </div>

            {/* Academic Information */}
            <div className="space-y-3 pt-4 border-t border-institutional">
              <h4 className="font-bold text-institutional-main text-sm">Academic Affiliation</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-institutional-muted block">Institution Node</span>
                  <span className="font-mono text-institutional-main font-medium">{detailStudent.institution_id}</span>
                </div>
                <div>
                  <span className="text-institutional-muted block">Academic Year</span>
                  <span className="text-institutional-main">{detailStudent.academic_year}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-institutional-muted block">Programme / Branch</span>
                  <span className="text-institutional-main font-medium">{detailStudent.programme}</span>
                </div>
              </div>
            </div>

            {/* Identity Identifiers (Masked with eye control) */}
            <div className="space-y-3 pt-4 border-t border-institutional">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-institutional-main text-sm">National Identifiers</h4>
                <button
                  type="button"
                  onClick={() => toggleMask(detailStudent.id)}
                  className="text-xs text-institutional-primary hover:underline flex items-center gap-1"
                >
                  {unmaskedIds.has(detailStudent.id) ? (
                    <>
                      <EyeOff className="w-3.5 h-3.5" /> Mask Sensitive ID
                    </>
                  ) : (
                    <>
                      <Eye className="w-3.5 h-3.5" /> Reveal Full ID
                    </>
                  )}
                </button>
              </div>
              <div className="bg-surface-secondary/40 border border-institutional rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <span className="text-institutional-muted font-medium">APAAR ID</span>
                  <span className="font-mono font-semibold text-institutional-main text-sm">
                    {maskApaarId(detailStudent.apaar_id, detailStudent.id)}
                  </span>
                </div>
                <p className="text-[10px] text-institutional-muted mt-2">
                  Permanent academic account registry identifier. Complies with Verhoeff check-digit specification.
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-4 border-t border-institutional flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  const s = detailStudent;
                  setDetailStudent(null);
                  openEditModal(s);
                }}
                className="px-3.5 py-1.5 font-medium border border-institutional rounded-lg hover:bg-surface-secondary text-institutional-main transition-colors"
              >
                Edit Record
              </button>
            </div>
          </div>
        )}
      </SideDrawer>

      {/* Create / Edit Student Modal */}
      {editModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-surface border border-institutional rounded-xl shadow-xl max-w-lg w-full p-6 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-institutional">
              <div>
                <h3 className="text-base font-bold text-institutional-main">
                  {editingStudent ? 'Edit Student Enrollment' : 'Enrol New Student'}
                </h3>
                <p className="text-xs text-institutional-muted">
                  Institutional record adhering to AICTE and APAAR data schemas.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditModalOpen(false)}
                className="p-1 rounded text-institutional-muted hover:text-institutional-main"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveStudent} className="space-y-4 mt-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-institutional-muted font-medium mb-1">Institution</label>
                  <select
                    disabled={!!editingStudent}
                    value={formData.institution_id}
                    onChange={(e) => setFormData({ ...formData, institution_id: e.target.value })}
                    className="w-full p-2 bg-surface-secondary border border-institutional rounded-lg text-institutional-main focus:outline-none"
                  >
                    {institutions.map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.institution_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-institutional-muted font-medium mb-1">Student / Roll ID *</label>
                  <input
                    type="text"
                    required
                    value={formData.institution_student_id}
                    onChange={(e) => setFormData({ ...formData, institution_student_id: e.target.value })}
                    placeholder="e.g. APX-2025-0199"
                    className="w-full p-2 bg-surface-secondary border border-institutional rounded-lg text-institutional-main focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-institutional-muted font-medium mb-1">Full Student Name *</label>
                <input
                  type="text"
                  required
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  placeholder="Official legal name as in academic credentials"
                  className="w-full p-2 bg-surface-secondary border border-institutional rounded-lg text-institutional-main focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-institutional-muted font-medium mb-1">Date of Birth</label>
                  <input
                    type="date"
                    value={formData.date_of_birth}
                    onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                    className="w-full p-2 bg-surface-secondary border border-institutional rounded-lg text-institutional-main focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-institutional-muted font-medium mb-1">Academic Year</label>
                  <input
                    type="text"
                    value={formData.academic_year}
                    onChange={(e) => setFormData({ ...formData, academic_year: e.target.value })}
                    placeholder="2025-2026"
                    className="w-full p-2 bg-surface-secondary border border-institutional rounded-lg text-institutional-main focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-institutional-muted font-medium mb-1">Programme / Course</label>
                  <input
                    type="text"
                    value={formData.programme}
                    onChange={(e) => setFormData({ ...formData, programme: e.target.value })}
                    placeholder="e.g. Computer Engineering"
                    className="w-full p-2 bg-surface-secondary border border-institutional rounded-lg text-institutional-main focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-institutional-muted font-medium mb-1">Enrollment Status</label>
                  <select
                    value={formData.enrollment_status}
                    onChange={(e) => setFormData({ ...formData, enrollment_status: e.target.value })}
                    className="w-full p-2 bg-surface-secondary border border-institutional rounded-lg text-institutional-main focus:outline-none"
                  >
                    <option value="Active">Active</option>
                    <option value="Suspended">Suspended</option>
                    <option value="Graduated">Graduated</option>
                    <option value="Transferred">Transferred</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-institutional-muted font-medium mb-1">
                  APAAR ID (12 digits, optional at entry)
                </label>
                <input
                  type="text"
                  maxLength={12}
                  value={formData.apaar_id}
                  onChange={(e) => setFormData({ ...formData, apaar_id: e.target.value.replace(/\D/g, '') })}
                  placeholder="e.g. 910000000018"
                  className="w-full p-2 bg-surface-secondary border border-institutional rounded-lg text-institutional-main focus:outline-none font-mono tracking-widest"
                />
                <p className="text-[10px] text-institutional-muted mt-1">
                  Validated against Verhoeff checksum algorithm. Leave empty if identifier not yet generated.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-institutional-muted font-medium mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="student@institute.edu"
                    className="w-full p-2 bg-surface-secondary border border-institutional rounded-lg text-institutional-main focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-institutional-muted font-medium mb-1">Mobile</label>
                  <input
                    type="text"
                    value={formData.mobile}
                    onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                    placeholder="9800000000"
                    className="w-full p-2 bg-surface-secondary border border-institutional rounded-lg text-institutional-main focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-institutional flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-4 py-2 border border-institutional rounded-lg hover:bg-surface-secondary text-institutional-main transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSaving}
                  className="px-4 py-2 font-medium bg-institutional-primary bg-institutional-primary-hover text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {formSaving && (
                    <span className="w-3.5 h-3.5 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                  )}
                  {editingStudent ? 'Save Changes' : 'Confirm Enrollment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSV Import Modal (Two-Phase Preview & Commitment) */}
      {importModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-surface border border-institutional rounded-xl shadow-xl max-w-3xl w-full p-6 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-institutional">
              <div>
                <h3 className="text-base font-bold text-institutional-main">Batch Student Onboarding (CSV)</h3>
                <p className="text-xs text-institutional-muted">
                  Upload student roster with column aliasing, duplicate collision checking, and dry-run preview.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setImportModalOpen(false)}
                className="p-1 rounded text-institutional-muted hover:text-institutional-main"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Step 1: Upload & Institution Selection */}
            {!previewData && !importSummary && (
              <div className="space-y-4 mt-4 text-xs">
                <div>
                  <label className="block text-institutional-muted font-medium mb-1">Target Institution</label>
                  <select
                    value={importInstId}
                    onChange={(e) => setImportInstId(e.target.value)}
                    className="w-full p-2 bg-surface-secondary border border-institutional rounded-lg text-institutional-main focus:outline-none"
                  >
                    {institutions.map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.institution_name} ({i.institution_code})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="border-2 border-dashed border-institutional rounded-xl p-8 text-center bg-surface-secondary/30">
                  <Upload className="w-8 h-8 text-institutional-muted mx-auto mb-2" />
                  <p className="text-xs font-semibold text-institutional-main">
                    {importFile ? importFile.name : 'Select or drag CSV file here'}
                  </p>
                  <p className="text-[11px] text-institutional-muted mt-1">
                    Supports columns: roll_number / id, full_name, apaar_id, programme, academic_year, date_of_birth
                  </p>
                  <input
                    id="csv-file-input"
                    type="file"
                    accept=".csv,text/csv"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setImportFile(e.target.files[0]);
                      }
                    }}
                    className="mt-4 text-xs text-institutional-muted file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-institutional-primary file:text-white hover:file:cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-institutional">
                  <button
                    type="button"
                    onClick={() => setImportModalOpen(false)}
                    className="px-4 py-2 border border-institutional rounded-lg hover:bg-surface-secondary text-institutional-main"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    id="preview-csv-btn"
                    onClick={handlePreviewUpload}
                    disabled={!importFile || previewLoading}
                    className="px-4 py-2 bg-institutional-primary bg-institutional-primary-hover text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {previewLoading && (
                      <span className="w-3.5 h-3.5 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                    )}
                    Inspect & Preview CSV
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Preview Results & Row Errors */}
            {previewData && (
              <div className="space-y-4 mt-4 text-xs">
                {/* Metric Summary */}
                <div className="grid grid-cols-4 gap-3 bg-surface-secondary/60 border border-institutional rounded-xl p-3">
                  <div>
                    <span className="text-institutional-muted block">Rows Evaluated</span>
                    <span className="text-sm font-bold text-institutional-main">{previewData.total_rows_evaluated}</span>
                  </div>
                  <div>
                    <span className="text-institutional-muted block">Valid for Import</span>
                    <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                      {previewData.valid_rows_count}
                    </span>
                  </div>
                  <div>
                    <span className="text-institutional-muted block">Rows with Errors</span>
                    <span className={`text-sm font-bold ${previewData.invalid_rows_count > 0 ? 'text-red-600' : 'text-institutional-main'}`}>
                      {previewData.invalid_rows_count}
                    </span>
                  </div>
                  <div>
                    <span className="text-institutional-muted block">Duplicates Detected</span>
                    <span className="text-sm font-bold text-amber-600">{previewData.duplicate_count}</span>
                  </div>
                </div>

                {/* Row-Level Errors List */}
                {previewData.errors && previewData.errors.length > 0 && (
                  <div className="border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 rounded-xl p-3">
                    <div className="flex items-center gap-1.5 font-bold text-red-900 dark:text-red-200 mb-2">
                      <AlertTriangle className="w-4 h-4 text-red-600" />
                      <span>Validation Errors ({previewData.errors.length})</span>
                    </div>
                    <div className="max-h-36 overflow-y-auto space-y-1">
                      {previewData.errors.map((err, i) => (
                        <div key={i} className="text-[11px] text-red-800 dark:text-red-300 flex items-start gap-2">
                          <span className="font-mono font-semibold bg-red-100 dark:bg-red-900 px-1 rounded">
                            Row {err.row}
                          </span>
                          <span>
                            Field <strong>{err.field}</strong>: {err.error}{' '}
                            {err.value && <span className="opacity-75">("{err.value}")</span>}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Valid Records Preview Table */}
                <div>
                  <h4 className="font-bold text-institutional-main mb-2">
                    Sample Valid Records ({previewData.preview_records.length} shown)
                  </h4>
                  <div className="border border-institutional rounded-lg overflow-x-auto max-h-48 overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-surface-secondary text-institutional-muted uppercase font-semibold text-[10px]">
                        <tr>
                          <th className="py-2 px-3">Row</th>
                          <th className="py-2 px-3">Student ID</th>
                          <th className="py-2 px-3">Full Name</th>
                          <th className="py-2 px-3">APAAR ID</th>
                          <th className="py-2 px-3">Programme</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-institutional">
                        {previewData.preview_records.map((r) => (
                          <tr key={r.row_number}>
                            <td className="py-1.5 px-3 font-mono">{r.row_number}</td>
                            <td className="py-1.5 px-3 font-mono font-semibold">{r.institution_student_id}</td>
                            <td className="py-1.5 px-3 font-medium">{r.full_name}</td>
                            <td className="py-1.5 px-3 font-mono">{r.apaar_id || '—'}</td>
                            <td className="py-1.5 px-3">{r.programme}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-institutional">
                  <button
                    type="button"
                    onClick={() => setPreviewData(null)}
                    className="px-3.5 py-1.5 border border-institutional rounded-lg text-institutional-main hover:bg-surface-secondary"
                  >
                    Back to File Select
                  </button>
                  <button
                    type="button"
                    id="proceed-import-btn"
                    disabled={!previewData.can_import}
                    onClick={() => setConfirmImportOpen(true)}
                    className="px-4 py-2 bg-institutional-primary bg-institutional-primary-hover text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Proceed to Import ({previewData.valid_rows_count} records)
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Success Summary */}
            {importSummary && (
              <div className="space-y-4 mt-4 text-xs text-center py-6">
                <div className="p-3 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 rounded-full w-fit mx-auto">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h4 className="text-base font-bold text-institutional-main">Import Execution Completed</h4>
                <p className="text-xs text-institutional-muted max-w-md mx-auto">{importSummary.message}</p>
                <div className="flex justify-center gap-3 pt-4">
                  <button
                    type="button"
                    id="done-import-btn"
                    onClick={() => setImportModalOpen(false)}
                    className="px-4 py-2 bg-institutional-primary text-white rounded-lg font-medium"
                  >
                    Done & Refresh Registry
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Confirmation Dialog before Commit */}
      <ConfirmDialog
        isOpen={confirmImportOpen}
        title="Confirm Batch Student Import"
        message={`Are you sure you want to commit ${previewData?.valid_rows_count || 0} valid student records into institution node '${previewData?.institution_id}'? This will write to the database and generate an audit log.`}
        confirmText="Commit Import"
        cancelText="Review Again"
        variant="primary"
        isLoading={committingImport}
        onConfirm={handleExecuteCommit}
        onCancel={() => setConfirmImportOpen(false)}
      />
    </div>
  );
};
