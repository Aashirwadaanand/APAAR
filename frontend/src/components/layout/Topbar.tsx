import React, { useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { RefreshCw, Sliders } from 'lucide-react';

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
  const [isRefreshing, setIsRefreshing] = useState(false);

  const currentTitle = routeTitles[location.pathname] || 'Enrolment Integrity';

  const handleManualRefresh = () => {
    setIsRefreshing(true);
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

      {/* Header Actions */}
      <div className="flex items-center gap-3">

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
