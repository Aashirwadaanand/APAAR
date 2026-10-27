import React, { useEffect, useState } from 'react';
import {
  ShieldAlert,
  Search,
  CheckCircle2,
  Play,
  RefreshCw,
  ExternalLink,
  Info,
} from 'lucide-react';
import { api } from '../services/api';
import type { IntegrityCase, Institution } from '../types';
import { SideDrawer } from '../components/common/SideDrawer';
import { StatusBadge } from '../components/common/StatusBadge';
import { TableSkeleton } from '../components/common/TableSkeleton';
import { EmptyState } from '../components/common/EmptyState';
import { useToast } from '../context/ToastContext';
import { Link } from 'react-router-dom';

const RULE_EXPLANATIONS: Record<string, string> = {
  DUPLICATE_APAAR_CROSS_INSTITUTION:
    'Rule IE-001: The same 12-digit APAAR identifier was submitted by two different autonomous institutions during overlapping academic sessions.',
  DUPLICATE_APAAR_INTRA_INSTITUTION:
    'Rule IE-002: Multiple distinct student registration numbers within the same institution node were linked to an identical APAAR identifier.',
  INTAKE_EXCEEDED:
    'Rule IE-003: Current active student enrollment for this programme exceeds the AICTE-approved institutional intake allocation.',
  INVALID_APAAR_SYNTAX:
    'Rule IE-004: The identifier failed Verhoeff checksum algorithm verification or exhibited illegal character patterns / repeated sequences.',
  MISSING_REQUIRED_FIELDS:
    'Rule IE-005: Student record lacks mandatory regulatory fields required for national registry synchronization.',
  DEMOGRAPHIC_CONFLICT:
    'Rule IE-006: Identifiers match an existing registry profile, but declared birth date or primary student name deviates beyond permissible phonetic threshold.',
};

export const CasesPage: React.FC = () => {
  const { showToast } = useToast();

  const [cases, setCases] = useState<IntegrityCase[]>([]);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [loading, setLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('OPEN');
  const [instFilter, setInstFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  // Drawer & Resolution Modal
  const [selectedCase, setSelectedCase] = useState<IntegrityCase | null>(null);
  const [resolveModalOpen, setResolveModalOpen] = useState(false);
  const [resolvingCase, setResolvingCase] = useState<IntegrityCase | null>(null);
  const [resolutionStatus, setResolutionStatus] = useState<'RESOLVED' | 'DISMISSED'>('RESOLVED');
  const [resolutionNote, setResolutionNote] = useState('');
  const [submittingResolution, setSubmittingResolution] = useState(false);

  const fetchCases = async () => {
    try {
      setLoading(true);
      const data = await api.getIntegrityCases({
        severity: severityFilter || undefined,
        status: statusFilter || undefined,
        institution_id: instFilter || undefined,
      });
      setCases(data);
    } catch (err: any) {
      showToast(err.message || 'Failed to load integrity cases', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    api.getInstitutions()
      .then(setInstitutions)
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchCases();
  }, [severityFilter, statusFilter, instFilter]);

  const handleRunScan = async () => {
    try {
      setIsScanning(true);
      const res = await api.runIntegrityScan();
      showToast(
        `Integrity scan executed: ${res.findings_count} findings (${res.new_cases_created} new cases created, ${res.existing_cases_updated} updated).`,
        'success'
      );
      fetchCases();
    } catch (err: any) {
      showToast(err.message || 'Scan execution failed', 'error');
    } finally {
      setIsScanning(false);
    }
  };

  const openResolveModal = (c: IntegrityCase, defaultStatus: 'RESOLVED' | 'DISMISSED' = 'RESOLVED') => {
    setResolvingCase(c);
    setResolutionStatus(defaultStatus);
    setResolutionNote('');
    setResolveModalOpen(true);
  };

  const handleConfirmResolve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvingCase) return;
    if (!resolutionNote.trim()) {
      showToast('A documented resolution justification note is required by regulatory audit policy.', 'warning');
      return;
    }

    try {
      setSubmittingResolution(true);
      const updated = await api.resolveIntegrityCase(resolvingCase.id, {
        resolution_note: resolutionNote.trim(),
        status: resolutionStatus,
      });

      showToast(`Case #${updated.id} marked as ${updated.status}.`, 'success');
      setResolveModalOpen(false);

      // Update in local state and drawer if currently inspected
      setCases((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      if (selectedCase && selectedCase.id === updated.id) {
        setSelectedCase(updated);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to resolve case', 'error');
    } finally {
      setSubmittingResolution(false);
    }
  };

  // Filter cases by search and type
  const filteredCases = cases.filter((c) => {
    if (typeFilter && c.case_type !== typeFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchSummary = c.summary.toLowerCase().includes(q);
      const matchType = c.case_type.toLowerCase().includes(q);
      const matchId = String(c.id).includes(q);
      const matchInst = (c.institution_id || '').toLowerCase().includes(q);
      if (!matchSummary && !matchType && !matchId && !matchInst) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-surface border border-institutional rounded-xl p-4 card-padded shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-institutional-main">Integrity Cases & Resolution</h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-surface-secondary text-institutional-muted font-mono font-semibold">
              {filteredCases.length} Cases
            </span>
          </div>
          <p className="text-xs text-institutional-muted mt-0.5">
            Triage discrepancies, cross-institution duplicate enrolments, and intake limit exceptions with audited justification.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRunScan}
            disabled={isScanning}
            className="px-3.5 py-2 text-xs font-medium text-white bg-institutional-primary bg-institutional-primary-hover rounded-lg transition-colors inline-flex items-center gap-1.5 disabled:opacity-50"
          >
            {isScanning ? (
              <span className="w-3.5 h-3.5 border-2 border-white/50 border-t-white rounded-full animate-spin" />
            ) : (
              <Play className="w-3.5 h-3.5" />
            )}
            Run Integrity Scan
          </button>
        </div>
      </div>

      {/* Mandatory Regulatory Notice Banner */}
      <div className="bg-surface border border-institutional rounded-xl p-3.5 px-4 text-xs flex items-start gap-2.5 bg-surface-secondary/40">
        <Info className="w-4 h-4 text-institutional-primary mt-0.5 shrink-0" />
        <div className="text-institutional-muted">
          <strong className="text-institutional-main font-semibold">Regulatory Integrity Notice:</strong> Anomaly findings
          indicate demographic conflicts, multiple active institution registrations, or intake ceiling overages flagged for administrative investigation.
          Findings strictly represent technical data discrepancies and must not be construed as confirmed fraudulent conduct until formal institutional inquiry is concluded.
        </div>
      </div>

      {/* Filter and Search Toolbar */}
      <div className="bg-surface border border-institutional rounded-xl p-3.5 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-institutional-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by case ID, summary, or institution..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-surface-secondary border border-institutional rounded-lg focus:outline-none focus:border-institutional-primary text-institutional-main"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="py-1.5 px-2.5 text-xs bg-surface-secondary border border-institutional rounded-lg text-institutional-main focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="OPEN">Open Cases</option>
            <option value="RESOLVED">Resolved Cases</option>
            <option value="DISMISSED">Dismissed Cases</option>
          </select>

          {/* Severity Filter */}
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="py-1.5 px-2.5 text-xs bg-surface-secondary border border-institutional rounded-lg text-institutional-main focus:outline-none"
          >
            <option value="">All Severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="WARNING">Warning</option>
            <option value="INFO">Info</option>
          </select>

          {/* Institution Filter */}
          <select
            value={instFilter}
            onChange={(e) => setInstFilter(e.target.value)}
            className="py-1.5 px-2.5 text-xs bg-surface-secondary border border-institutional rounded-lg text-institutional-main focus:outline-none"
          >
            <option value="">All Institutions</option>
            {institutions.map((i) => (
              <option key={i.id} value={i.id}>
                {i.institution_name}
              </option>
            ))}
          </select>

          {/* Case Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="py-1.5 px-2.5 text-xs bg-surface-secondary border border-institutional rounded-lg text-institutional-main focus:outline-none"
          >
            <option value="">All Anomaly Types</option>
            <option value="DUPLICATE_APAAR_CROSS_INSTITUTION">Cross-Institution Duplicate</option>
            <option value="DUPLICATE_APAAR_INTRA_INSTITUTION">Intra-Institution Duplicate</option>
            <option value="INTAKE_EXCEEDED">Intake Capacity Exceeded</option>
            <option value="INVALID_APAAR_SYNTAX">Invalid APAAR Syntax</option>
            <option value="MISSING_REQUIRED_FIELDS">Missing Required Fields</option>
            <option value="DEMOGRAPHIC_CONFLICT">Demographic Conflict</option>
          </select>

          <button
            type="button"
            onClick={fetchCases}
            title="Refresh list"
            className="p-1.5 rounded border border-institutional text-institutional-muted hover:text-institutional-main hover:bg-surface-secondary"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-surface border border-institutional rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <TableSkeleton rows={8} columns={6} />
          ) : filteredCases.length === 0 ? (
            <EmptyState
              title="No integrity cases match your filter"
              description="No anomaly cases found. Run an integrity scan to evaluate student records against regulatory rules."
              actionText="Run Integrity Scan"
              onAction={handleRunScan}
            />
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-secondary/70 text-institutional-muted uppercase font-semibold text-[11px] border-b border-institutional">
                <tr>
                  <th className="py-2.5 px-4">Case ID</th>
                  <th className="py-2.5 px-4">Severity</th>
                  <th className="py-2.5 px-4">Anomaly Type</th>
                  <th className="py-2.5 px-4">Institution / Entity</th>
                  <th className="py-2.5 px-4">Summary</th>
                  <th className="py-2.5 px-4 text-center">Status</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-institutional">
                {filteredCases.map((c) => (
                  <tr key={c.id} className="hover:bg-surface-hover transition-colors">
                    <td className="py-3 px-4 font-mono font-semibold text-institutional-primary">
                      #{c.id}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={c.severity} type="severity" />
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-institutional-muted">
                      {c.case_type}
                    </td>
                    <td className="py-3 px-4 text-institutional-muted font-medium">
                      {c.institution_id || 'Cross-Platform'}
                    </td>
                    <td className="py-3 px-4 text-institutional-main max-w-sm truncate" title={c.summary}>
                      {c.summary}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <StatusBadge status={c.status} type="case_status" />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedCase(c)}
                          className="px-2 py-1 text-xs text-institutional-primary hover:bg-surface-secondary rounded font-medium"
                        >
                          Details
                        </button>
                        {c.status === 'OPEN' && (
                          <button
                            type="button"
                            onClick={() => openResolveModal(c, 'RESOLVED')}
                            className="px-2.5 py-1 text-xs font-semibold bg-institutional-primary bg-institutional-primary-hover text-white rounded transition-colors"
                          >
                            Resolve
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Case Details Drawer */}
      <SideDrawer
        isOpen={!!selectedCase}
        onClose={() => setSelectedCase(null)}
        title={`Integrity Case #${selectedCase?.id || ''}`}
        subtitle={`Type: ${selectedCase?.case_type || ''}`}
        widthClass="max-w-2xl"
      >
        {selectedCase && (
          <div className="space-y-6 text-xs">
            {/* Status & Severity Bar */}
            <div className="flex items-center justify-between p-3.5 bg-surface-secondary/60 border border-institutional rounded-xl">
              <div className="flex items-center gap-2">
                <span className="text-institutional-muted font-semibold">Severity:</span>
                <StatusBadge status={selectedCase.severity} type="severity" size="md" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-institutional-muted font-semibold">Status:</span>
                <StatusBadge status={selectedCase.status} type="case_status" size="md" />
              </div>
            </div>

            {/* Rule Explanation */}
            <div className="bg-surface-secondary/40 border border-institutional rounded-xl p-4 space-y-1.5">
              <h4 className="font-bold text-institutional-main text-xs uppercase tracking-wider flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-institutional-primary" />
                Detection Rule Specification
              </h4>
              <p className="text-institutional-muted leading-relaxed">
                {RULE_EXPLANATIONS[selectedCase.case_type] ||
                  'Automated integrity constraint violation detected during deterministic record scanning.'}
              </p>
            </div>

            {/* Summary & Recommended Action */}
            <div className="space-y-3">
              <div>
                <span className="text-institutional-muted block uppercase font-semibold text-[10px]">Case Summary</span>
                <p className="text-sm font-semibold text-institutional-main mt-0.5 leading-snug">
                  {selectedCase.summary}
                </p>
              </div>
              <div>
                <span className="text-institutional-muted block uppercase font-semibold text-[10px]">
                  Recommended Compliance Action
                </span>
                <p className="text-xs text-institutional-main mt-0.5 bg-surface-secondary p-3 rounded-lg border border-institutional leading-relaxed">
                  {selectedCase.recommended_action}
                </p>
              </div>
            </div>

            {/* Associated Records */}
            <div className="grid grid-cols-2 gap-3 pt-4 border-t border-institutional">
              <div>
                <span className="text-institutional-muted block">Associated Institution</span>
                <span className="font-mono text-institutional-main font-semibold">
                  {selectedCase.institution_id || 'Global / Multiple'}
                </span>
              </div>
              <div>
                <span className="text-institutional-muted block">Associated Student ID</span>
                {selectedCase.student_id ? (
                  <Link
                    to={`/students?search=${selectedCase.student_id}`}
                    className="font-mono text-institutional-primary hover:underline font-semibold flex items-center gap-1"
                  >
                    Student #{selectedCase.student_id} <ExternalLink className="w-3 h-3" />
                  </Link>
                ) : (
                  <span className="text-institutional-muted">Batch / Multi-record finding</span>
                )}
              </div>
            </div>

            {/* Supporting Evidence JSON */}
            <div className="space-y-1.5 pt-4 border-t border-institutional">
              <span className="text-institutional-muted font-semibold uppercase text-[10px]">
                Supporting Evidence & Attributes
              </span>
              <pre className="p-3 bg-surface-secondary/90 border border-institutional rounded-lg font-mono text-[11px] text-institutional-main overflow-x-auto whitespace-pre-wrap">
                {(() => {
                  try {
                    return JSON.stringify(JSON.parse(selectedCase.evidence_json), null, 2);
                  } catch {
                    return selectedCase.evidence_json || '{}';
                  }
                })()}
              </pre>
            </div>

            {/* Decision History (if resolved or dismissed) */}
            {selectedCase.status !== 'OPEN' && (
              <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-200 font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Audited Decision Log</span>
                </div>
                <div className="text-[11px] text-emerald-900 dark:text-emerald-100">
                  <span className="font-semibold">Resolution Note: </span>
                  {selectedCase.resolution_note || 'Resolved by compliance reviewer.'}
                </div>
                {selectedCase.resolved_at && (
                  <div className="text-[10px] text-emerald-700 dark:text-emerald-300">
                    Timestamp: {new Date(selectedCase.resolved_at).toLocaleString()}
                  </div>
                )}
              </div>
            )}

            {/* Drawer Actions */}
            <div className="pt-4 border-t border-institutional flex items-center justify-end gap-2">
              {selectedCase.status === 'OPEN' && (
                <>
                  <button
                    type="button"
                    onClick={() => openResolveModal(selectedCase, 'DISMISSED')}
                    className="px-3 py-1.5 text-xs font-medium border border-institutional rounded-lg hover:bg-surface-secondary text-institutional-main"
                  >
                    Dismiss Finding
                  </button>
                  <button
                    type="button"
                    onClick={() => openResolveModal(selectedCase, 'RESOLVED')}
                    className="px-4 py-1.5 text-xs font-semibold bg-institutional-primary bg-institutional-primary-hover text-white rounded-lg transition-colors"
                  >
                    Resolve Case
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </SideDrawer>

      {/* Resolution Modal with Mandatory Note */}
      {resolveModalOpen && resolvingCase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-surface border border-institutional rounded-xl shadow-xl max-w-lg w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-institutional">
              <div>
                <h3 className="text-base font-bold text-institutional-main">
                  {resolutionStatus === 'RESOLVED' ? 'Resolve Integrity Case' : 'Dismiss Finding'}
                </h3>
                <p className="text-xs text-institutional-muted">
                  Case #{resolvingCase.id} ({resolvingCase.case_type})
                </p>
              </div>
            </div>

            <form onSubmit={handleConfirmResolve} className="space-y-4 mt-4 text-xs">
              <div>
                <label className="block text-institutional-muted font-medium mb-1">Action Disposition</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setResolutionStatus('RESOLVED')}
                    className={`py-2 px-3 rounded-lg border text-center font-medium transition-colors ${
                      resolutionStatus === 'RESOLVED'
                        ? 'bg-institutional-selected border-institutional-primary text-institutional-primary font-bold'
                        : 'border-institutional hover:bg-surface-secondary text-institutional-main'
                    }`}
                  >
                    Mark as Resolved
                  </button>
                  <button
                    type="button"
                    onClick={() => setResolutionStatus('DISMISSED')}
                    className={`py-2 px-3 rounded-lg border text-center font-medium transition-colors ${
                      resolutionStatus === 'DISMISSED'
                        ? 'bg-surface-secondary border-institutional font-bold text-institutional-main'
                        : 'border-institutional hover:bg-surface-secondary text-institutional-muted'
                    }`}
                  >
                    Dismiss / False Positive
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-institutional-muted font-medium mb-1">
                  Required Resolution Note & Audit Justification *
                </label>
                <textarea
                  required
                  rows={4}
                  value={resolutionNote}
                  onChange={(e) => setResolutionNote(e.target.value)}
                  placeholder="Detail institutional inquiry outcome, corrected student attributes, or formal clearance justification..."
                  className="w-full p-2.5 bg-surface-secondary border border-institutional rounded-lg text-institutional-main focus:outline-none text-xs leading-relaxed"
                />
                <p className="text-[10px] text-institutional-muted mt-1">
                  Under AICTE regulations, all integrity resolutions are permanently logged to the immutable audit ledger.
                </p>
              </div>

              <div className="pt-3 border-t border-institutional flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setResolveModalOpen(false)}
                  disabled={submittingResolution}
                  className="px-4 py-2 border border-institutional rounded-lg hover:bg-surface-secondary text-institutional-main"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingResolution || !resolutionNote.trim()}
                  className="px-4 py-2 bg-institutional-primary bg-institutional-primary-hover text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {submittingResolution && (
                    <span className="w-3.5 h-3.5 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                  )}
                  Save Audit & Decision
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
