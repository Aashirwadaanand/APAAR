import React, { useEffect, useState } from 'react';
import {
  FileSpreadsheet,
  Download,
  Building2,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Printer,
} from 'lucide-react';
import { api } from '../services/api';
import type { Institution } from '../types';
import { useToast } from '../context/ToastContext';

export const ReportsPage: React.FC = () => {
  const { showToast } = useToast();

  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [selectedInst, setSelectedInst] = useState<string>('');
  const [exportingStudents, setExportingStudents] = useState<boolean>(false);
  const [exportingCases, setExportingCases] = useState<boolean>(false);
  const [lastExport, setLastExport] = useState<{ name: string; timestamp: string; rows?: number } | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  useEffect(() => {
    api.getInstitutions()
      .then(setInstitutions)
      .catch(() => {});
  }, []);

  const handleExportStudentsCsv = async () => {
    try {
      setExportingStudents(true);
      setExportError(null);

      const url = api.getExportStudentsCsvUrl(selectedInst || undefined);
      const res = await fetch(url);

      if (!res.ok) {
        throw new Error(`Export failed with HTTP ${res.status}: ${res.statusText}`);
      }

      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      const fileName = selectedInst
        ? `students_export_${selectedInst.toLowerCase()}.csv`
        : 'students_export_all_institutions.csv';
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);

      setLastExport({
        name: fileName,
        timestamp: new Date().toLocaleTimeString(),
      });

      showToast(`Student compliance roster downloaded: ${fileName}`, 'success', 'CSV Export');
    } catch (err: any) {
      setExportError(err.message || 'Failed to download student CSV export');
      showToast(err.message || 'Export error occurred', 'error');
    } finally {
      setExportingStudents(false);
    }
  };

  const handleExportCasesCsv = async () => {
    try {
      setExportingCases(true);
      setExportError(null);

      const cases = await api.getIntegrityCases({
        institution_id: selectedInst || undefined,
      });

      if (cases.length === 0) {
        showToast('No integrity cases found for the selected institution filter.', 'info');
        setExportingCases(false);
        return;
      }

      // Generate CSV content
      const headers = ['id', 'case_type', 'severity', 'status', 'institution_id', 'student_id', 'summary', 'created_at', 'resolution_note'];
      const rows = cases.map((c) => [
        c.id,
        c.case_type,
        c.severity,
        c.status,
        c.institution_id || '',
        c.student_id || '',
        `"${(c.summary || '').replace(/"/g, '""')}"`,
        c.created_at,
        `"${(c.resolution_note || '').replace(/"/g, '""')}"`,
      ]);

      const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      const fileName = `integrity_cases_export_${selectedInst ? selectedInst.toLowerCase() : 'all'}.csv`;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);

      setLastExport({
        name: fileName,
        timestamp: new Date().toLocaleTimeString(),
        rows: cases.length,
      });

      showToast(`Exported ${cases.length} integrity cases to ${fileName}`, 'success');
    } catch (err: any) {
      setExportError(err.message || 'Failed to export cases CSV');
      showToast(err.message || 'Export error occurred', 'error');
    } finally {
      setExportingCases(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-surface border border-institutional rounded-xl p-4 card-padded shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-institutional-main">Compliance Reports & CSV Export</h2>
          <p className="text-xs text-institutional-muted mt-0.5">
            Download authorized regulatory rosters, integrity audit findings, and reconciliation dossiers.
          </p>
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          className="px-3.5 py-2 text-xs font-medium border border-institutional rounded-lg hover:bg-surface-secondary text-institutional-main transition-colors inline-flex items-center gap-1.5"
        >
          <Printer className="w-3.5 h-3.5" /> Print Summary
        </button>
      </div>

      {/* Target Institution Filter */}
      <div className="bg-surface border border-institutional rounded-xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-institutional-primary shrink-0" />
          <span className="font-semibold text-institutional-main">Scope Export by Institution:</span>
        </div>
        <select
          value={selectedInst}
          onChange={(e) => setSelectedInst(e.target.value)}
          className="p-2 bg-surface-secondary border border-institutional rounded-lg text-institutional-main focus:outline-none min-w-[260px]"
        >
          <option value="">All Institutions (Consolidated)</option>
          {institutions.map((i) => (
            <option key={i.id} value={i.id}>
              {i.institution_name} ({i.institution_code})
            </option>
          ))}
        </select>
      </div>

      {/* Error state */}
      {exportError && (
        <div className="p-3.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl text-xs text-red-900 dark:text-red-200 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
          <div>
            <span className="font-bold">Export Service Error: </span>
            {exportError}
          </div>
        </div>
      )}

      {/* Export Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Student Roster Export */}
        <div className="bg-surface border border-institutional rounded-xl p-5 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-lg bg-surface-secondary text-institutional-primary">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-institutional-main">Institutional Student Roster</h3>
                <span className="text-[11px] font-mono text-institutional-muted">Format: standard compliance .csv</span>
              </div>
            </div>
            <p className="text-xs text-institutional-muted mt-3 leading-relaxed">
              Generates compliant CSV file populated with student roll numbers, registered APAAR identifiers, enrollment
              statuses, verification outcomes, and data quality scores. Suitable for AICTE portal uploads.
            </p>
          </div>

          <div className="pt-3 border-t border-institutional flex items-center justify-between">
            <span className="text-[11px] text-institutional-muted">Live database stream</span>
            <button
              type="button"
              onClick={handleExportStudentsCsv}
              disabled={exportingStudents}
              className="px-4 py-2 bg-institutional-primary bg-institutional-primary-hover text-white rounded-lg font-medium text-xs transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {exportingStudents ? (
                <span className="w-3.5 h-3.5 border-2 border-white/50 border-t-white rounded-full animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              Download Students CSV
            </button>
          </div>
        </div>

        {/* Integrity Cases Export */}
        <div className="bg-surface border border-institutional rounded-xl p-5 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-lg bg-surface-secondary text-institutional-primary">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-institutional-main">Integrity Cases & Triage Log</h3>
                <span className="text-[11px] font-mono text-institutional-muted">Format: audited compliance .csv</span>
              </div>
            </div>
            <p className="text-xs text-institutional-muted mt-3 leading-relaxed">
              Exports all recorded discrepancy cases, anomaly categories, affected student and institution references,
              triage resolutions, and officer justification notes for regulatory audits.
            </p>
          </div>

          <div className="pt-3 border-t border-institutional flex items-center justify-between">
            <span className="text-[11px] text-institutional-muted">Audited decisions</span>
            <button
              type="button"
              onClick={handleExportCasesCsv}
              disabled={exportingCases}
              className="px-4 py-2 bg-institutional-primary bg-institutional-primary-hover text-white rounded-lg font-medium text-xs transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {exportingCases ? (
                <span className="w-3.5 h-3.5 border-2 border-white/50 border-t-white rounded-full animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              Download Cases CSV
            </button>
          </div>
        </div>
      </div>

      {/* Export Status & History Banner */}
      {lastExport && (
        <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 text-xs text-emerald-900 dark:text-emerald-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <div>
              <span className="font-bold">Last Successful Export: </span>
              <span className="font-mono">{lastExport.name}</span>
              {lastExport.rows !== undefined && ` (${lastExport.rows} records)`}
            </div>
          </div>
          <span className="text-[11px] text-emerald-700 dark:text-emerald-300 font-mono">
            {lastExport.timestamp}
          </span>
        </div>
      )}
    </div>
  );
};
