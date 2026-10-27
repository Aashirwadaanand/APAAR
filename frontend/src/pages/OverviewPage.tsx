import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Building2,
  ShieldAlert,
  Clock,
  AlertTriangle,
  History,
  Upload,
  Play,
  ArrowRight,
  RefreshCw,
  CheckCircle2,
  Info,
} from 'lucide-react';
import { api } from '../services/api';
import type { DashboardSummary } from '../types';
import { useAppearance } from '../context/AppearanceContext';
import { useToast } from '../context/ToastContext';
import { StatusBadge } from '../components/common/StatusBadge';

export const OverviewPage: React.FC = () => {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  const { settings } = useAppearance();
  const { showToast } = useToast();

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      setError(null);
      const summary = await api.getDashboardSummary();
      setData(summary);
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard summary from backend engine');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const handleRunScan = async () => {
    try {
      setIsScanning(true);
      const result = await api.runIntegrityScan();
      showToast(
        `Integrity scan complete: ${result.findings_count} findings (${result.new_cases_created} new cases created, ${result.existing_cases_updated} updated)`,
        'success',
        'Integrity Engine'
      );
      await fetchDashboard();
    } catch (err: any) {
      showToast(err.message || 'Failed to execute integrity scan', 'error', 'Scan Error');
    } finally {
      setIsScanning(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-24 bg-surface border border-institutional rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-32 bg-surface border border-institutional rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-64 bg-surface border border-institutional rounded-xl" />
          <div className="h-64 bg-surface border border-institutional rounded-xl" />
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="bg-surface border border-institutional rounded-xl p-8 text-center max-w-lg mx-auto">
        <div className="p-3 bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-400 rounded-full w-fit mx-auto mb-3">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h3 className="text-base font-semibold text-institutional-main mb-1">Backend Connection Notice</h3>
        <p className="text-xs text-institutional-muted mb-4">{error}</p>
        <button
          type="button"
          onClick={fetchDashboard}
          className="px-4 py-2 text-xs font-semibold bg-institutional-primary text-white rounded-lg hover:bg-institutional-primary-hover transition-colors inline-flex items-center gap-2"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Retry Connection
        </button>
      </div>
    );
  }

  const stats = data?.stats;
  const isComplianceLayout = settings.dashboardLayout === 'compliance';

  // Section 1: KPI Cards
  const kpiCards = (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {/* 1. Total Student Records */}
      <div className="bg-surface border border-institutional rounded-xl p-4 card-padded shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-institutional-muted uppercase tracking-wider">
            Total Student Records
          </span>
          <div className="p-2 rounded-lg bg-surface-secondary text-institutional-primary">
            <Users className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 text-2xl font-bold text-institutional-main">
          {stats?.total_students ?? 0}
        </div>
        <p className="mt-1 text-[11px] text-institutional-muted">
          Active roster records across institutions
        </p>
      </div>

      {/* 2. Institutions Represented */}
      <div className="bg-surface border border-institutional rounded-xl p-4 card-padded shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-institutional-muted uppercase tracking-wider">
            Institutions Represented
          </span>
          <div className="p-2 rounded-lg bg-surface-secondary text-institutional-primary">
            <Building2 className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 text-2xl font-bold text-institutional-main">
          {data?.institutions_count ?? 0}
        </div>
        <p className="mt-1 text-[11px] text-institutional-muted">
          AICTE-approved institutional nodes
        </p>
      </div>

      {/* 3. Open Integrity Cases */}
      <div className="bg-surface border border-institutional rounded-xl p-4 card-padded shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-institutional-muted uppercase tracking-wider">
            Open Integrity Cases
          </span>
          <div className={`p-2 rounded-lg ${data?.open_integrity_cases ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' : 'bg-surface-secondary text-institutional-primary'}`}>
            <ShieldAlert className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 text-2xl font-bold text-institutional-main">
          {data?.open_integrity_cases ?? 0}
        </div>
        <p className="mt-1 text-[11px] text-institutional-muted">
          Anomalies & intake limits pending action
        </p>
      </div>

      {/* 4. Records Requiring Review */}
      <div className="bg-surface border border-institutional rounded-xl p-4 card-padded shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-institutional-muted uppercase tracking-wider">
            Records Requiring Review
          </span>
          <div className="p-2 rounded-lg bg-surface-secondary text-institutional-primary">
            <Clock className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 text-2xl font-bold text-institutional-main">
          {data?.records_requiring_review ?? 0}
        </div>
        <p className="mt-1 text-[11px] text-institutional-muted">
          Unverified or flagged student entries
        </p>
      </div>

      {/* 5. Intake Exceptions */}
      <div className="bg-surface border border-institutional rounded-xl p-4 card-padded shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-institutional-muted uppercase tracking-wider">
            Intake Exceptions
          </span>
          <div className={`p-2 rounded-lg ${data?.intake_exceptions ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300' : 'bg-surface-secondary text-institutional-primary'}`}>
            <AlertTriangle className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 text-2xl font-bold text-institutional-main">
          {data?.intake_exceptions ?? 0}
        </div>
        <p className="mt-1 text-[11px] text-institutional-muted">
          Institutions exceeding approved seats
        </p>
      </div>

      {/* 6. Recent Audit Activity */}
      <div className="bg-surface border border-institutional rounded-xl p-4 card-padded shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-institutional-muted uppercase tracking-wider">
            Recent Audit Activity
          </span>
          <div className="p-2 rounded-lg bg-surface-secondary text-institutional-primary">
            <History className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 text-2xl font-bold text-institutional-main">
          {data?.recent_audit_events?.length ?? 0}
        </div>
        <p className="mt-1 text-[11px] text-institutional-muted">
          Recent immutable ledger entries
        </p>
      </div>
    </div>
  );

  // Quick Action Banner
  const actionBanner = (
    <div className="bg-surface border border-institutional rounded-xl p-4 md:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <h2 className="text-sm font-bold text-institutional-main">
            Institutional Operations & Compliance Actions
          </h2>
        </div>
        <p className="text-xs text-institutional-muted mt-1">
          Perform batch student import or trigger automated deterministic integrity scans across all institutional nodes.
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Link
          to="/students"
          className="px-3.5 py-2 text-xs font-medium text-institutional-main bg-surface-secondary hover:bg-surface-secondary/80 border border-institutional rounded-lg transition-colors inline-flex items-center gap-1.5"
        >
          <Upload className="w-3.5 h-3.5" /> Import Records
        </Link>
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
  );

  // Institution Intake Comparison Table
  const intakeTable = (
    <div className="bg-surface border border-institutional rounded-xl shadow-xs overflow-hidden">
      <div className="px-5 py-4 border-b border-institutional flex items-center justify-between bg-surface-secondary/40">
        <div>
          <h3 className="text-sm font-bold text-institutional-main">Institution Intake Reconciliation</h3>
          <p className="text-xs text-institutional-muted">
            Configured approved intake vs. current reported student enrolments.
          </p>
        </div>
        <Link
          to="/institutions"
          className="text-xs font-medium text-institutional-primary hover:underline inline-flex items-center gap-1"
        >
          View all <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-surface-secondary/70 text-institutional-muted uppercase font-semibold text-[11px] border-b border-institutional">
            <tr>
              <th className="py-2.5 px-4">Institution</th>
              <th className="py-2.5 px-4">Code</th>
              <th className="py-2.5 px-4 text-right">Approved Intake</th>
              <th className="py-2.5 px-4 text-right">Enrolled Count</th>
              <th className="py-2.5 px-4 text-center">Open Cases</th>
              <th className="py-2.5 px-4 text-center">Intake Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-institutional">
            {data?.institution_intake_comparison && data.institution_intake_comparison.length > 0 ? (
              data.institution_intake_comparison.map((item) => (
                <tr key={item.institution_id} className="hover:bg-surface-hover transition-colors">
                  <td className="py-3 px-4 font-medium text-institutional-main">{item.institution_name}</td>
                  <td className="py-3 px-4 font-mono text-institutional-muted">{item.institution_code}</td>
                  <td className="py-3 px-4 text-right text-institutional-muted">{item.approved_intake}</td>
                  <td className="py-3 px-4 text-right font-semibold text-institutional-main">
                    {item.enrolled_count}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {item.open_cases > 0 ? (
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200">
                        {item.open_cases}
                      </span>
                    ) : (
                      <span className="text-institutional-muted">0</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {item.status === 'EXCEEDED' ? (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold badge-danger">
                        Exceeded (+{item.over_by})
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-medium badge-verified">
                        Within Limit
                      </span>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="py-6 text-center text-institutional-muted text-xs">
                  No institution records found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="p-3 bg-surface-secondary/30 border-t border-institutional text-[11px] text-institutional-muted flex items-center gap-1.5">
        <Info className="w-3.5 h-3.5 text-institutional-muted shrink-0" />
        <span>Configured intake limits reflect institutional regulatory caps. Over-capacity requires AICTE clearance.</span>
      </div>
    </div>
  );

  // Open Cases by Severity & Type
  const casesBreakdown = (
    <div className="bg-surface border border-institutional rounded-xl p-5 shadow-xs flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between pb-3 border-b border-institutional">
          <div>
            <h3 className="text-sm font-bold text-institutional-main">Open Cases by Severity & Type</h3>
            <p className="text-xs text-institutional-muted">Distribution of active findings</p>
          </div>
          <Link
            to="/cases"
            className="text-xs font-medium text-institutional-primary hover:underline inline-flex items-center gap-1"
          >
            Review all <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {/* Severity bars */}
        <div className="mt-4 space-y-3">
          <div>
            <div className="flex justify-between text-xs font-medium mb-1">
              <span className="text-red-700 dark:text-red-400">Critical Findings</span>
              <span className="font-semibold text-institutional-main">{data?.cases_by_severity?.['CRITICAL'] || 0}</span>
            </div>
            <div className="w-full bg-surface-secondary rounded-full h-2 overflow-hidden">
              <div
                className="bg-red-600 h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${Math.min(100, ((data?.cases_by_severity?.['CRITICAL'] || 0) / Math.max(1, data?.open_integrity_cases || 1)) * 100)}%`,
                }}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs font-medium mb-1">
              <span className="text-amber-700 dark:text-amber-400">Warnings</span>
              <span className="font-semibold text-institutional-main">{data?.cases_by_severity?.['WARNING'] || 0}</span>
            </div>
            <div className="w-full bg-surface-secondary rounded-full h-2 overflow-hidden">
              <div
                className="bg-amber-500 h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${Math.min(100, ((data?.cases_by_severity?.['WARNING'] || 0) / Math.max(1, data?.open_integrity_cases || 1)) * 100)}%`,
                }}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs font-medium mb-1">
              <span className="text-blue-700 dark:text-blue-400">Informational</span>
              <span className="font-semibold text-institutional-main">{data?.cases_by_severity?.['INFO'] || 0}</span>
            </div>
            <div className="w-full bg-surface-secondary rounded-full h-2 overflow-hidden">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${Math.min(100, ((data?.cases_by_severity?.['INFO'] || 0) / Math.max(1, data?.open_integrity_cases || 1)) * 100)}%`,
                }}
              />
            </div>
          </div>
        </div>

        {/* Cases by type list */}
        <div className="mt-5 pt-4 border-t border-institutional">
          <h4 className="text-xs font-semibold text-institutional-muted uppercase tracking-wider mb-2">
            Top Anomaly Types
          </h4>
          <div className="space-y-1.5">
            {data?.cases_by_type && Object.keys(data.cases_by_type).length > 0 ? (
              Object.entries(data.cases_by_type).slice(0, 4).map(([type, count]) => (
                <div key={type} className="flex items-center justify-between text-xs py-1">
                  <span className="font-mono text-institutional-muted truncate max-w-[220px]" title={type}>
                    {type.replace(/_/g, ' ')}
                  </span>
                  <span className="font-semibold px-2 py-0.5 rounded bg-surface-secondary text-institutional-main text-[11px]">
                    {count}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs text-institutional-muted py-2">No active anomaly categories.</p>
            )}
          </div>
        </div>
      </div>

      <p className="mt-4 text-[11px] text-institutional-muted">
        Note: An anomaly flag indicates a data discrepancy requiring administrative review, not proven fraudulent activity.
      </p>
    </div>
  );

  // Recent Cases Table
  const recentCasesTable = (
    <div className="bg-surface border border-institutional rounded-xl shadow-xs overflow-hidden">
      <div className="px-5 py-4 border-b border-institutional flex items-center justify-between bg-surface-secondary/40">
        <div>
          <h3 className="text-sm font-bold text-institutional-main">Recent Integrity Cases</h3>
          <p className="text-xs text-institutional-muted">Latest detected cross-institutional and data anomalies.</p>
        </div>
        <Link
          to="/cases"
          className="text-xs font-medium text-institutional-primary hover:underline inline-flex items-center gap-1"
        >
          View all cases <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-surface-secondary/70 text-institutional-muted uppercase font-semibold text-[11px] border-b border-institutional">
            <tr>
              <th className="py-2.5 px-4">Case ID</th>
              <th className="py-2.5 px-4">Type</th>
              <th className="py-2.5 px-4">Severity</th>
              <th className="py-2.5 px-4">Status</th>
              <th className="py-2.5 px-4">Summary</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-institutional">
            {data?.recent_cases && data.recent_cases.length > 0 ? (
              data.recent_cases.map((c) => (
                <tr key={c.id} className="hover:bg-surface-hover transition-colors">
                  <td className="py-3 px-4 font-mono font-semibold text-institutional-primary">
                    <Link to="/cases" className="hover:underline">
                      #{c.id}
                    </Link>
                  </td>
                  <td className="py-3 px-4 font-mono text-[11px] text-institutional-muted">
                    {c.case_type}
                  </td>
                  <td className="py-3 px-4">
                    <StatusBadge status={c.severity} type="severity" />
                  </td>
                  <td className="py-3 px-4">
                    <StatusBadge status={c.status} type="case_status" />
                  </td>
                  <td className="py-3 px-4 text-institutional-main max-w-sm truncate" title={c.summary}>
                    {c.summary}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="py-6 text-center text-institutional-muted text-xs">
                  No integrity cases generated. Run a scan to evaluate records.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  // Recent Audit Events
  const recentAuditTable = (
    <div className="bg-surface border border-institutional rounded-xl shadow-xs overflow-hidden">
      <div className="px-5 py-4 border-b border-institutional flex items-center justify-between bg-surface-secondary/40">
        <div>
          <h3 className="text-sm font-bold text-institutional-main">Recent Audit Activity</h3>
          <p className="text-xs text-institutional-muted">Immutable ledger actions recorded by institutional actors.</p>
        </div>
        <Link
          to="/audit"
          className="text-xs font-medium text-institutional-primary hover:underline inline-flex items-center gap-1"
        >
          View audit trail <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
      <div className="divide-y divide-institutional">
        {data?.recent_audit_events && data.recent_audit_events.length > 0 ? (
          data.recent_audit_events.slice(0, 5).map((evt) => (
            <div key={evt.id} className="p-3.5 px-5 flex items-start justify-between gap-3 text-xs">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-institutional-main">{evt.action}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-secondary text-institutional-muted font-mono">
                    {evt.module}
                  </span>
                </div>
                <p className="text-institutional-muted mt-0.5">{evt.description}</p>
              </div>
              <div className="text-right shrink-0">
                <span className="text-[11px] font-medium text-institutional-main block">{evt.actor}</span>
                <span className="text-[10px] text-institutional-muted">
                  {new Date(evt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          ))
        ) : (
          <div className="p-6 text-center text-institutional-muted text-xs">No audit events logged.</div>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Quick Action Top Bar */}
      {actionBanner}

      {/* KPI Cards */}
      {kpiCards}

      {/* Layout Arrangement: Compliance-Focused vs Standard */}
      {isComplianceLayout ? (
        <>
          {/* Compliance prioritizes Cases and Reconciliation */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">{recentCasesTable}</div>
            <div className="lg:col-span-1">{casesBreakdown}</div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {intakeTable}
            {recentAuditTable}
          </div>
        </>
      ) : (
        <>
          {/* Standard layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">{intakeTable}</div>
            <div className="lg:col-span-1">{casesBreakdown}</div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {recentCasesTable}
            {recentAuditTable}
          </div>
        </>
      )}
    </div>
  );
};
