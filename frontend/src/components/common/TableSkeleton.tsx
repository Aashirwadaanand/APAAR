import React from 'react';

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
}

export const TableSkeleton: React.FC<TableSkeletonProps> = ({ rows = 5, columns = 6 }) => {
  return (
    <div className="w-full animate-pulse divide-y divide-institutional">
      {Array.from({ length: rows }).map((_, rIdx) => (
        <div key={rIdx} className="flex items-center gap-4 py-3.5 px-4">
          {Array.from({ length: columns }).map((_, cIdx) => (
            <div
              key={cIdx}
              className={`h-4 bg-surface-secondary rounded ${
                cIdx === 0 ? 'w-16' : cIdx === 1 ? 'w-44' : 'flex-1'
              }`}
            />
          ))}
        </div>
      ))}
    </div>
  );
};
