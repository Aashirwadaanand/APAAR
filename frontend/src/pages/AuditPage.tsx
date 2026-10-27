import React, { useEffect, useState } from 'react';
import {
  Search,
  RefreshCw,
  Shield,
} from 'lucide-react';
import { api } from '../services/api';
import type { AuditEvent } from '../types';
import { SideDrawer } from '../components/common/SideDrawer';
import { TableSkeleton } from '../components/common/TableSkeleton';
import { EmptyState } from '../components/common/EmptyState';
import { useToast } from '../context/ToastContext';

export const AuditPage: React.FC = () => {
  const { showToast } = useToast();

  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');

  // Selected event for side drawer inspection
  const [selectedEvent, setSelectedEvent] = useState<AuditEvent | null>(null);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const data = await api.getAuditEvents({
        entity_type: entityFilter || undefined,
        action: actionFilter || undefined,
        limit: 100,
      });
      setEvents(data);
    } catch (err: any) {
      showToast(err.message || 'Failed to fetch audit events', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [entityFilter, actionFilter]);

  const isDemoEvent = (evt: AuditEvent) => {
    const actor = (evt.actor_label || '').toLowerCase();
    const action = (evt.action || '').toLowerCase();
    return (
      actor.includes('seeder') ||
      actor.includes('synthetic') ||
      action.includes('seeded') ||
      evt.entity_type === 'System'
    );
  };

  const filteredEvents = events.filter((evt) => {
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchAction = evt.action.toLowerCase().includes(q);
      const matchActor = (evt.actor_label || '').toLowerCase().includes(q);
      const matchEntity = (evt.entity_type || '').toLowerCase().includes(q);
      const matchDetails = (evt.details_json || '').toLowerCase().includes(q);
      if (!matchAction && !matchActor && !matchEntity && !matchDetails) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-surface border border-institutional rounded-xl p-4 card-padded shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-institutional-main">Immutable Audit Trail</h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-surface-secondary text-institutional-muted font-mono font-semibold">
              {filteredEvents.length} Ledger Events
            </span>
          </div>
          <p className="text-xs text-institutional-muted mt-0.5">
            Chronological, immutable event ledger recording admissions, integrity scans, resolutions, and verification runs.
          </p>
        </div>
        <button
          type="button"
          onClick={fetchEvents}
          className="px-3.5 py-2 text-xs font-medium border border-institutional rounded-lg hover:bg-surface-secondary text-institutional-main transition-colors inline-flex items-center gap-1.5"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh Trail
        </button>
      </div>

      {/* Persistent Note on Synthetic Demo Audit Events */}
      <div className="p-3.5 px-4 bg-surface-secondary/50 border border-institutional rounded-xl text-xs flex items-start gap-3">
        <Shield className="w-4 h-4 text-institutional-primary mt-0.5 shrink-0" />
        <div className="text-institutional-muted">
          <strong className="text-institutional-main font-semibold">Ledger Authenticity Labeling:</strong> In accordance with
          regulatory integrity standards, baseline demonstration records are explicitly tagged as{' '}
          <span className="px-1.5 py-0.2 rounded font-mono font-bold text-[10px] bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
            SEEDED DEMO EVENT
          </span>
          . Actions performed during this interactive session are recorded with live timestamps and actual UI actor roles.
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="bg-surface border border-institutional rounded-xl p-3.5 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-institutional-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by action, actor, entity ID, or details..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-surface-secondary border border-institutional rounded-lg focus:outline-none focus:border-institutional-primary text-institutional-main"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Entity Type Filter */}
          <select
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
            className="py-1.5 px-2.5 text-xs bg-surface-secondary border border-institutional rounded-lg text-institutional-main focus:outline-none"
          >
            <option value="">All Entities</option>
            <option value="Student">Student</option>
            <option value="IntegrityCase">IntegrityCase</option>
            <option value="Institution">Institution</option>
            <option value="VerificationRun">VerificationRun</option>
            <option value="System">System</option>
          </select>

          {/* Action Filter */}
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="py-1.5 px-2.5 text-xs bg-surface-secondary border border-institutional rounded-lg text-institutional-main focus:outline-none"
          >
            <option value="">All Actions</option>
            <option value="STUDENT_ENROLLED">STUDENT_ENROLLED</option>
            <option value="STUDENT_UPDATED">STUDENT_UPDATED</option>
            <option value="CSV_IMPORT_EXECUTED">CSV_IMPORT_EXECUTED</option>
            <option value="INTEGRITY_SCAN_EXECUTED">INTEGRITY_SCAN_EXECUTED</option>
            <option value="INTEGRITY_CASE_RESOLVED">INTEGRITY_CASE_RESOLVED</option>
            <option value="VERIFICATION_RUN_EXECUTED">VERIFICATION_RUN_EXECUTED</option>
            <option value="INSTITUTION_REGISTERED">INSTITUTION_REGISTERED</option>
            <option value="EXPORT_CSV_DOWNLOADED">EXPORT_CSV_DOWNLOADED</option>
            <option value="DATABASE_SEEDED">DATABASE_SEEDED</option>
          </select>
        </div>
      </div>

      {/* Main Ledger Table */}
      <div className="bg-surface border border-institutional rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <TableSkeleton rows={8} columns={5} />
          ) : filteredEvents.length === 0 ? (
            <EmptyState
              title="No audit events matched"
              description="No ledger transactions correspond to your search and filter criteria."
            />
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-secondary/70 text-institutional-muted uppercase font-semibold text-[11px] border-b border-institutional">
                <tr>
                  <th className="py-2.5 px-4">Event ID & Time</th>
                  <th className="py-2.5 px-4">Action</th>
                  <th className="py-2.5 px-4">Actor / Origin</th>
                  <th className="py-2.5 px-4">Affected Entity</th>
                  <th className="py-2.5 px-4 text-center">Event Classification</th>
                  <th className="py-2.5 px-4 text-right">Payload</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-institutional">
                {filteredEvents.map((evt) => {
                  const demo = isDemoEvent(evt);
                  return (
                    <tr key={evt.id} className="hover:bg-surface-hover transition-colors">
                      <td className="py-3 px-4 font-mono text-[11px]">
                        <span className="font-semibold text-institutional-primary block">#{evt.id}</span>
                        <span className="text-institutional-muted text-[10px]">
                          {new Date(evt.created_at).toLocaleString()}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono font-semibold text-institutional-main">
                        {evt.action}
                      </td>
                      <td className="py-3 px-4 text-institutional-muted">
                        <span className="font-medium text-institutional-main block">{evt.actor_label}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-medium text-institutional-main block">{evt.entity_type}</span>
                        <span className="font-mono text-[10px] text-institutional-muted block">
                          ID: {evt.entity_id || 'Global'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {demo ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                            SEEDED DEMO
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800">
                            LIVE ACTION
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedEvent(evt)}
                          className="px-2.5 py-1 text-xs text-institutional-primary hover:bg-surface-secondary rounded font-medium"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* SideDrawer for Audit Inspection */}
      <SideDrawer
        isOpen={!!selectedEvent}
        onClose={() => setSelectedEvent(null)}
        title={`Audit Event #${selectedEvent?.id || ''}`}
        subtitle={`Action: ${selectedEvent?.action || ''}`}
      >
        {selectedEvent && (
          <div className="space-y-5 text-xs">
            {/* Classification */}
            <div className="p-3.5 bg-surface-secondary/60 border border-institutional rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-semibold text-institutional-muted block">
                  Classification
                </span>
                <span className="font-bold text-sm text-institutional-main">
                  {isDemoEvent(selectedEvent) ? 'Seeded Baseline Simulation' : 'Live Platform Transaction'}
                </span>
              </div>
              <div>
                <span className="font-mono text-xs text-institutional-muted">
                  {new Date(selectedEvent.created_at).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Actor & Entity */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-surface border border-institutional rounded-lg">
                <span className="text-institutional-muted block uppercase text-[10px] font-semibold">Actor / Officer</span>
                <span className="font-bold text-institutional-main text-sm block mt-0.5">{selectedEvent.actor_label}</span>
              </div>
              <div className="p-3 bg-surface border border-institutional rounded-lg">
                <span className="text-institutional-muted block uppercase text-[10px] font-semibold">Affected Entity</span>
                <span className="font-bold text-institutional-main text-sm block mt-0.5">
                  {selectedEvent.entity_type} ({selectedEvent.entity_id || 'Global'})
                </span>
              </div>
            </div>

            {/* Event Details JSON */}
            <div>
              <span className="text-[11px] text-institutional-muted font-semibold uppercase block mb-1">
                Event Details Payload
              </span>
              <pre className="p-3.5 bg-surface-secondary/90 border border-institutional rounded-lg font-mono text-[11px] text-institutional-main overflow-x-auto whitespace-pre-wrap leading-relaxed">
                {(() => {
                  try {
                    return JSON.stringify(JSON.parse(selectedEvent.details_json), null, 2);
                  } catch {
                    return selectedEvent.details_json || '{}';
                  }
                })()}
              </pre>
            </div>
          </div>
        )}
      </SideDrawer>
    </div>
  );
};
