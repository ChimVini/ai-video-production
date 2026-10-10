import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { NODE_SUBTYPES } from '../../utils/helpers';
import { NODE_TYPE_COLORS } from './canvasUtils';

/**
 * NodePalette — left sidebar with draggable node-type buttons.
 * Grouped by category: DATA, PROCESS, OUTPUT.
 */

const GROUPS = [
  {
    type: 'DATA',
    label: 'Data / Resources',
    subtypes: Object.entries(NODE_SUBTYPES).filter(([, v]) => v.type === 'DATA'),
  },
  {
    type: 'PROCESS',
    label: 'Process',
    subtypes: Object.entries(NODE_SUBTYPES).filter(([, v]) => v.type === 'PROCESS'),
  },
  {
    type: 'OUTPUT',
    label: 'Output',
    subtypes: Object.entries(NODE_SUBTYPES).filter(([, v]) => v.type === 'OUTPUT'),
  },
];

export default function NodePalette({ onAddNode, collapsed, onToggle }) {
  const [expanded, setExpanded] = useState({ DATA: true, PROCESS: true, OUTPUT: true });

  const toggle = (type) => setExpanded(prev => ({ ...prev, [type]: !prev[type] }));

  if (collapsed) {
    return (
      <div className="w-10 bg-s-2 border-r border-s-6/30 flex flex-col items-center pt-3 shrink-0">
        <button onClick={onToggle} className="p-2 rounded-lg hover:bg-s-4 text-t-4 hover:text-t-2 transition-colors"
          title="Expand palette">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="w-52 bg-s-2 border-r border-s-6/30 flex flex-col shrink-0 h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-s-6/30 shrink-0">
        <span className="text-[10px] font-semibold text-t-3 uppercase tracking-wider">Node Palette</span>
        <button onClick={onToggle} className="p-1 rounded-md hover:bg-s-4 text-t-4 hover:text-t-2 transition-colors">
          <ChevronDown className="w-3.5 h-3.5 rotate-90" />
        </button>
      </div>

      {/* Groups */}
      <div className="flex-1 overflow-y-auto py-1">
        {GROUPS.map(group => {
          const colors = NODE_TYPE_COLORS[group.type];
          const isExpanded = expanded[group.type];

          return (
            <div key={group.type} className="mb-0.5">
              {/* Group header */}
              <button
                onClick={() => toggle(group.type)}
                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-s-4/40 transition-colors text-left"
              >
                <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: colors.accent }} />
                <span className="text-[11px] font-medium text-t-2 flex-1">{group.label}</span>
                {isExpanded
                  ? <ChevronDown className="w-3 h-3 text-t-4" />
                  : <ChevronRight className="w-3 h-3 text-t-4" />
                }
              </button>

              {/* Subtypes */}
              {isExpanded && (
                <div className="px-2 pb-1 space-y-0.5">
                  {group.subtypes.map(([key, info]) => (
                    <button
                      key={key}
                      onClick={() => onAddNode(group.type, key)}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left
                        hover:bg-s-4/50 transition-colors group"
                      title={`Add ${info.label} node`}
                    >
                      <span className="text-sm flex-shrink-0 w-5 text-center">{info.icon}</span>
                      <span className="text-[11px] text-t-3 group-hover:text-t-1 truncate">{info.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Hint */}
      <div className="px-3 py-2 border-t border-s-6/30 shrink-0">
        <p className="text-[9px] text-t-4 leading-relaxed">
          Click a node type to add it to the canvas. DATA nodes will prompt for a resource.
        </p>
      </div>
    </div>
  );
}
