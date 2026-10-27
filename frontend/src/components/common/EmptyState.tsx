import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { Inbox } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon = Inbox,
  title,
  description,
  actionText,
  onAction,
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="p-3 bg-surface-secondary text-institutional-muted rounded-full mb-3">
        <Icon className="w-8 h-8" />
      </div>
      <h3 className="text-sm font-semibold text-institutional-main mb-1">{title}</h3>
      <p className="text-xs text-institutional-muted max-w-sm mb-4">{description}</p>
      {actionText && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="px-3.5 py-1.5 text-xs font-medium text-white bg-institutional-primary bg-institutional-primary-hover rounded-lg transition-colors"
        >
          {actionText}
        </button>
      )}
    </div>
  );
};
