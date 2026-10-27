import React, { useEffect, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Database, RefreshCw, Sliders, Shield } from 'lucide-react';
import { api } from '../../services/api';

const routeTitles: Record<string, string> = {
  '/': 'Overview',
  '/students': 'Student Registry',
  '/cases': 'Integrity Cases',
  '/sandbox': 'Verification Sandbox',
  '/institutions': 'Institutions & Intake',
  '/audit': 'Audit Trail',
  '/reports': 'Compliance Reports & Export',
  '/settings': 'System & Appearance Settings',
};

interface TopbarProps {
  onRefresh?: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({ onRefresh }) => {
  const location = useLocation();
  const [dbStatus, setDbStatus] = useState<'checking' | 'connected' | 'error'>('checking');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const currentTitle = routeTitles[location.pathname] || 'Enrolment Integrity';

  const checkConnection = async () => {
    try {
      await api.getHealth();
      setDbStatus('connected');
    } catch {
      setDbStatus('error');
    }
  };

  useEffect(() => {
    checkConnection();
    const interval = setInterval(checkConnection, 45000);
    return () => clearInterval(interval);
  }, []);

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    checkConnection();
    if (onRefresh) onRefresh();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  return (
    <header className="h-15 bg-surface border-b border-institutional px-6 flex items-center justify-between shrink-0">
      {/* Breadcrumbs & Title */}
      <div className="flex items-center gap-3">
        <div className="flex items-center text-xs text-institutional-muted">
          <span>Enrolment Integrity</span>
          <span className="mx-2 text-institutional-muted/60">/</span>
          <span className="font-semibold text-institutional-main">{currentTitle}</span>
        </div>
      </div>

      {/* Persistent Environment Label and Actions */}
      <div className="flex items-center gap-3">
        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-amber-900 dark:text-amber-200 text-xs">
          <Shield className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <span className="font-medium">DEMO ENVIRONMENT · SYNTHETIC DATA</span>
        </div>

        {/* Database Status Indicator */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-surface-secondary border border-institutional rounded text-xs font-mono text-institutional-main">
          <Database className="w-3.5 h-3.5 text-institutional-muted" />
          <span className="text-institutional-muted">DB:</span>
          {dbStatus === 'connected' ? (
            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> SQLite
            </span>
          ) : dbStatus === 'checking' ? (
            <span className="text-amber-600">Checking...</span>
          ) : (
            <span className="text-red-600 font-semibold">Offline</span>
          )}
        </div>

        {/* Refresh Action */}
        <button
          type="button"
          onClick={handleManualRefresh}
          title="Refresh Data"
          className="p-1.5 rounded border border-institutional text-institutional-muted hover:text-institutional-primary hover:bg-surface-secondary transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
        </button>

        {/* Settings Shortcut */}
        <Link
          to="/settings"
          title="Appearance & Settings"
          className="p-1.5 rounded border border-institutional text-institutional-muted hover:text-institutional-primary hover:bg-surface-secondary transition-colors"
        >
          <Sliders className="w-3.5 h-3.5" />
        </Link>
      </div>
    </header>
  );
};
