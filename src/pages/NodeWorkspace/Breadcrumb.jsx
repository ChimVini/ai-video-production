import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Network } from 'lucide-react';

/**
 * Breadcrumb for Node Workspace pages
 * items: [{ label, path?, icon? }]
 *   - last item is current (no link)
 *   - earlier items are clickable links
 */
export default function Breadcrumb({ items = [] }) {
  const navigate = useNavigate();

  return (
    <nav className="flex items-center gap-1 text-[11px] mb-3">
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <React.Fragment key={i}>
            {i > 0 && <ChevronRight className="w-3 h-3 text-t-4/50 shrink-0" />}
            {isLast ? (
              <span className="flex items-center gap-1.5 text-t-2 font-medium truncate max-w-[200px]">
                {item.icon && <span className="shrink-0">{item.icon}</span>}
                {item.label}
              </span>
            ) : (
              <button
                onClick={() => item.path && navigate(item.path)}
                className="flex items-center gap-1.5 text-t-4 hover:text-accent-400 transition-colors truncate max-w-[200px]">
                {item.icon && <span className="shrink-0">{item.icon}</span>}
                {item.label}
              </button>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
