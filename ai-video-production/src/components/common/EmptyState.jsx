import React from 'react';

export default function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {Icon && (
        <div className="w-14 h-14 rounded-2xl bg-s-4/60 border border-s-6/30 flex items-center justify-center mb-4">
          <Icon className="w-6 h-6 text-t-4" />
        </div>
      )}
      <h3 className="text-sm font-medium text-t-2 mb-1">{title}</h3>
      {description && <p className="text-xs text-t-4 mb-4 max-w-xs">{description}</p>}
      {action}
    </div>
  );
}
