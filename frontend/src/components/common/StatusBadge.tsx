import React from 'react';

interface StatusBadgeProps {
  status: string;
  type?: 'verification' | 'severity' | 'case_status' | 'enrollment';
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  type = 'verification',
  size = 'sm',
}) => {
  const s = (status || '').toUpperCase();
  const padding = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  let badgeClass = 'badge-unverified';
  let label = status;

  if (type === 'verification') {
    if (s.includes('VERIFIED')) {
      badgeClass = 'badge-verified';
      label = status === 'Verified_Simulated' ? 'Verified (Simulated)' : 'Verified';
    } else if (s.includes('SANDBOX')) {
      badgeClass = 'badge-simulated';
      label = 'In Sandbox';
    } else if (s.includes('FLAGGED') || s.includes('CONFLICT')) {
      badgeClass = 'badge-warning';
      label = 'Flagged';
    } else if (s.includes('REJECTED')) {
      badgeClass = 'badge-danger';
      label = 'Rejected';
    } else {
      badgeClass = 'badge-unverified';
      label = 'Unverified';
    }
  } else if (type === 'severity') {
    if (s === 'CRITICAL') {
      badgeClass = 'badge-danger';
    } else if (s === 'WARNING') {
      badgeClass = 'badge-warning';
    } else {
      badgeClass = 'badge-simulated';
    }
  } else if (type === 'case_status') {
    if (s === 'OPEN') {
      badgeClass = 'badge-warning';
    } else if (s === 'RESOLVED') {
      badgeClass = 'badge-verified';
    } else if (s === 'DISMISSED') {
      badgeClass = 'badge-unverified';
    } else {
      badgeClass = 'badge-simulated';
    }
  } else if (type === 'enrollment') {
    if (s === 'ACTIVE') {
      badgeClass = 'badge-verified';
    } else if (s === 'SUSPENDED') {
      badgeClass = 'badge-danger';
    } else {
      badgeClass = 'badge-unverified';
    }
  }

  return (
    <span className={`inline-flex items-center font-medium rounded-full ${padding} ${badgeClass}`}>
      {label}
    </span>
  );
};
