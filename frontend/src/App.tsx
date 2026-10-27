import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppearanceProvider } from './context/AppearanceContext';
import { ToastProvider } from './context/ToastContext';
import { AppLayout } from './components/layout/AppLayout';
import { OverviewPage } from './pages/OverviewPage';
import { StudentsPage } from './pages/StudentsPage';
import { CasesPage } from './pages/CasesPage';
import { SandboxPage } from './pages/SandboxPage';
import { InstitutionsPage } from './pages/InstitutionsPage';
import { AuditPage } from './pages/AuditPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';

export const App: React.FC = () => {
  return (
    <AppearanceProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<AppLayout />}>
              <Route index element={<OverviewPage />} />
              <Route path="students" element={<StudentsPage />} />
              <Route path="cases" element={<CasesPage />} />
              <Route path="sandbox" element={<SandboxPage />} />
              <Route path="institutions" element={<InstitutionsPage />} />
              <Route path="audit" element={<AuditPage />} />
              <Route path="reports" element={<ReportsPage />} />
              <Route path="settings" element={<SettingsPage />} />
              {/* Backward compatibility redirects */}
              <Route path="quality" element={<Navigate to="/cases" replace />} />
              <Route path="duplicates" element={<Navigate to="/cases" replace />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AppearanceProvider>
  );
};

export default App;
