import React from 'react';
import {
  Sliders,
  Palette,
  Sun,
  Moon,
  Laptop,
  Check,
  RotateCcw,
  Layout,
  Maximize2,
  ZapOff,
} from 'lucide-react';
import { useAppearance } from '../context/AppearanceContext';
import { useToast } from '../context/ToastContext';
import type { ThemeMode, AccentColor, DensityMode, DashboardLayoutMode } from '../types';

export const SettingsPage: React.FC = () => {
  const { settings, updateSettings } = useAppearance();
  const { showToast } = useToast();

  const handleResetDefaults = () => {
    updateSettings({
      theme: 'light',
      accent: 'forest',
      density: 'comfortable',
      sidebarCollapsed: false,
      dashboardLayout: 'standard',
      reducedMotion: false,
    });
    showToast('Appearance settings reset to default values.', 'info');
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="bg-surface border border-institutional rounded-xl p-4 card-padded shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-institutional-main">Appearance & System Settings</h2>
          <p className="text-xs text-institutional-muted mt-0.5">
            Configure visual themes, accessibility density, accent palettes, and dashboard layout preferences.
          </p>
        </div>
        <button
          type="button"
          onClick={handleResetDefaults}
          className="px-3.5 py-2 text-xs font-medium border border-institutional rounded-lg hover:bg-surface-secondary text-institutional-main transition-colors inline-flex items-center gap-1.5"
        >
          <RotateCcw className="w-3.5 h-3.5" /> Reset to Defaults
        </button>
      </div>

      {/* Settings Grid */}
      <div className="space-y-5 text-xs">
        {/* 1. Theme Mode */}
        <div className="bg-surface border border-institutional rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-bold text-institutional-main flex items-center gap-2">
                <Sun className="w-4 h-4 text-institutional-primary" />
                Color Theme
              </h3>
              <p className="text-xs text-institutional-muted">
                Select interface luminance mode. Preserves institutional contrast requirements.
              </p>
            </div>
            <span className="font-mono text-[11px] text-institutional-muted capitalize">{settings.theme}</span>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[
              { id: 'light' as ThemeMode, label: 'Light Mode', icon: Sun, desc: 'Warm neutral canvas #F7F7F2' },
              { id: 'dark' as ThemeMode, label: 'Dark Mode', icon: Moon, desc: 'High-contrast slate dark #111613' },
              { id: 'system' as ThemeMode, label: 'System Default', icon: Laptop, desc: 'Syncs with OS preferences' },
            ].map((option) => {
              const Icon = option.icon;
              const isSelected = settings.theme === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => {
                    updateSettings({ theme: option.id });
                    showToast(`Theme changed to ${option.label}`, 'info');
                  }}
                  className={`p-3.5 rounded-xl border text-left transition-all ${
                    isSelected
                      ? 'border-institutional-primary bg-institutional-selected/50 shadow-xs'
                      : 'border-institutional hover:bg-surface-secondary'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <Icon className="w-4 h-4 text-institutional-primary" />
                    {isSelected && <Check className="w-3.5 h-3.5 text-institutional-primary" />}
                  </div>
                  <div className="font-semibold text-institutional-main text-xs">{option.label}</div>
                  <p className="text-[11px] text-institutional-muted mt-0.5">{option.desc}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Institutional Accent Palette */}
        <div className="bg-surface border border-institutional rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-bold text-institutional-main flex items-center gap-2">
                <Palette className="w-4 h-4 text-institutional-primary" />
                Accent Color Palette
              </h3>
              <p className="text-xs text-institutional-muted">
                Applied to primary actions, navigation active states, and focus rings.
              </p>
            </div>
            <span className="font-mono text-[11px] text-institutional-muted capitalize">{settings.accent}</span>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[
              {
                id: 'forest' as AccentColor,
                label: 'Forest Green',
                color: '#245C48',
                desc: 'Standard AICTE compliance green',
              },
              {
                id: 'slate' as AccentColor,
                label: 'Slate Blue',
                color: '#2563EB',
                desc: 'Executive technical deep blue',
              },
              {
                id: 'terracotta' as AccentColor,
                label: 'Terracotta',
                color: '#C2410C',
                desc: 'Academic warm earthen terracotta',
              },
            ].map((option) => {
              const isSelected = settings.accent === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => {
                    updateSettings({ accent: option.id });
                    showToast(`Accent palette updated to ${option.label}`, 'info');
                  }}
                  className={`p-3.5 rounded-xl border text-left transition-all ${
                    isSelected
                      ? 'border-institutional-primary bg-institutional-selected/50 shadow-xs'
                      : 'border-institutional hover:bg-surface-secondary'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className="w-5 h-5 rounded-full shadow-inner inline-block"
                      style={{ backgroundColor: option.color }}
                    />
                    {isSelected && <Check className="w-3.5 h-3.5 text-institutional-primary" />}
                  </div>
                  <div className="font-semibold text-institutional-main text-xs">{option.label}</div>
                  <p className="text-[11px] text-institutional-muted mt-0.5">{option.desc}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. Table and Layout Density */}
        <div className="bg-surface border border-institutional rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-bold text-institutional-main flex items-center gap-2">
                <Sliders className="w-4 h-4 text-institutional-primary" />
                Table & Content Density
              </h3>
              <p className="text-xs text-institutional-muted">
                Adjust row padding and cell heights for high-throughput roster auditing.
              </p>
            </div>
            <span className="font-mono text-[11px] text-institutional-muted capitalize">{settings.density}</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              {
                id: 'comfortable' as DensityMode,
                label: 'Comfortable Density',
                desc: 'Spacious padding (12px py) for standard laptop review',
              },
              {
                id: 'compact' as DensityMode,
                label: 'Compact Density',
                desc: 'Condensed rows (6px py) for dense multi-record comparisons',
              },
            ].map((option) => {
              const isSelected = settings.density === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => {
                    updateSettings({ density: option.id });
                    showToast(`Density set to ${option.label}`, 'info');
                  }}
                  className={`p-3.5 rounded-xl border text-left transition-all ${
                    isSelected
                      ? 'border-institutional-primary bg-institutional-selected/50 shadow-xs'
                      : 'border-institutional hover:bg-surface-secondary'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-institutional-main text-xs">{option.label}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-institutional-primary" />}
                  </div>
                  <p className="text-[11px] text-institutional-muted">{option.desc}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* 4. Sidebar State */}
        <div className="bg-surface border border-institutional rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-bold text-institutional-main flex items-center gap-2">
                <Maximize2 className="w-4 h-4 text-institutional-primary" />
                Sidebar Navigation Layout
              </h3>
              <p className="text-xs text-institutional-muted">
                Keep the navigation sidebar persistently expanded or collapsed to icon rail.
              </p>
            </div>
            <span className="font-mono text-[11px] text-institutional-muted">
              {settings.sidebarCollapsed ? 'Collapsed' : 'Expanded'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => updateSettings({ sidebarCollapsed: false })}
              className={`p-3.5 rounded-xl border text-left transition-all ${
                !settings.sidebarCollapsed
                  ? 'border-institutional-primary bg-institutional-selected/50 shadow-xs'
                  : 'border-institutional hover:bg-surface-secondary'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-institutional-main text-xs">Expanded Sidebar (Default)</span>
                {!settings.sidebarCollapsed && <Check className="w-3.5 h-3.5 text-institutional-primary" />}
              </div>
              <p className="text-[11px] text-institutional-muted">Full navigation labels and institutional node badges</p>
            </button>

            <button
              type="button"
              onClick={() => updateSettings({ sidebarCollapsed: true })}
              className={`p-3.5 rounded-xl border text-left transition-all ${
                settings.sidebarCollapsed
                  ? 'border-institutional-primary bg-institutional-selected/50 shadow-xs'
                  : 'border-institutional hover:bg-surface-secondary'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-institutional-main text-xs">Collapsed Icon Rail</span>
                {settings.sidebarCollapsed && <Check className="w-3.5 h-3.5 text-institutional-primary" />}
              </div>
              <p className="text-[11px] text-institutional-muted">Maximizes horizontal workspace for wide data tables</p>
            </button>
          </div>
        </div>

        {/* 5. Dashboard Layout Arrangement */}
        <div className="bg-surface border border-institutional rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-bold text-institutional-main flex items-center gap-2">
                <Layout className="w-4 h-4 text-institutional-primary" />
                Overview Dashboard Layout
              </h3>
              <p className="text-xs text-institutional-muted">
                Rearranges real live widgets on the overview screen depending on institutional role.
              </p>
            </div>
            <span className="font-mono text-[11px] text-institutional-muted capitalize">{settings.dashboardLayout}</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              {
                id: 'standard' as DashboardLayoutMode,
                label: 'Standard Overview',
                desc: 'Balanced view prioritizing enrollment capacity reconciliation above case queues',
              },
              {
                id: 'compliance' as DashboardLayoutMode,
                label: 'Compliance-Focused',
                desc: 'Auditor prioritization: places open integrity findings and severity distributions at top',
              },
            ].map((option) => {
              const isSelected = settings.dashboardLayout === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => {
                    updateSettings({ dashboardLayout: option.id });
                    showToast(`Dashboard layout set to ${option.label}`, 'info');
                  }}
                  className={`p-3.5 rounded-xl border text-left transition-all ${
                    isSelected
                      ? 'border-institutional-primary bg-institutional-selected/50 shadow-xs'
                      : 'border-institutional hover:bg-surface-secondary'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-institutional-main text-xs">{option.label}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-institutional-primary" />}
                  </div>
                  <p className="text-[11px] text-institutional-muted">{option.desc}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* 6. Reduced Motion Accessibility */}
        <div className="bg-surface border border-institutional rounded-xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-institutional-main flex items-center gap-2">
              <ZapOff className="w-4 h-4 text-institutional-primary" />
              Reduced Motion
            </h3>
            <p className="text-xs text-institutional-muted mt-0.5">
              Disables all decorative transitions, modal zooms, and slide animations for accessibility.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              const next = !settings.reducedMotion;
              updateSettings({ reducedMotion: next });
              showToast(`Reduced motion ${next ? 'enabled' : 'disabled'}`, 'info');
            }}
            className={`px-4 py-2 rounded-lg font-semibold text-xs border transition-colors ${
              settings.reducedMotion
                ? 'bg-institutional-primary text-white border-institutional-primary'
                : 'bg-surface-secondary border-institutional text-institutional-muted hover:text-institutional-main'
            }`}
          >
            {settings.reducedMotion ? 'Enabled (No Motion)' : 'Disabled (Standard)'}
          </button>
        </div>
      </div>
    </div>
  );
};
