import React from 'react';
import { NODE_SUBTYPES } from '../../utils/helpers';
import { getNodeDimensions, NODE_TYPE_COLORS, getOutputPorts, getInputPorts } from './canvasUtils';

/**
 * SVG Workflow Node — renders a typed node on the production canvas.
 * Different visual styles for DATA (rounded), PROCESS (chamfered), OUTPUT (pill).
 */
export default function WorkflowNode({ node, pos, isSelected, onMouseDown, showPorts, onPortMouseDown, onPortMouseUp, onMouseEnter, onMouseLeave }) {
  const { w, h, rx } = getNodeDimensions(node.node_type);
  const colors = NODE_TYPE_COLORS[node.node_type] || NODE_TYPE_COLORS.DATA;
  const subtypeInfo = NODE_SUBTYPES[node.node_subtype] || { icon: '•', label: node.node_subtype };
  const hw = w / 2, hh = h / 2;
  const maxChars = Math.floor(w / 8);
  const truncLabel = node.label.length > maxChars ? node.label.slice(0, maxChars - 1) + '...' : node.label;

  const fill = isSelected ? colors.selectedFill : colors.fill;
  const stroke = isSelected ? colors.selectedStroke : colors.stroke;
  const strokeWidth = isSelected ? 2 : 1;

  // Input/output ports
  const inputPorts = getInputPorts(node.node_type, hw, hh);
  const outputPorts = getOutputPorts(node.node_type, hw, hh);

  return (
    <g transform={`translate(${pos.x}, ${pos.y})`} onMouseDown={onMouseDown}
      onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}
      style={{ cursor: 'grab' }}>
      {/* Node body */}
      {node.node_type === 'PROCESS' ? (
        // Chamfered rectangle for PROCESS nodes
        <polygon
          points={`${-hw + 10},${-hh} ${hw - 10},${-hh} ${hw},${-hh + 10} ${hw},${hh - 10} ${hw - 10},${hh} ${-hw + 10},${hh} ${-hw},${hh - 10} ${-hw},${-hh + 10}`}
          fill={fill} stroke={stroke} strokeWidth={strokeWidth}
        />
      ) : (
        // Rounded rect for DATA and OUTPUT nodes
        <rect x={-hw} y={-hh} width={w} height={h} rx={node.node_type === 'OUTPUT' ? h / 2 : rx}
          fill={fill} stroke={stroke} strokeWidth={strokeWidth}
        />
      )}

      {/* Type indicator strip */}
      <rect x={-hw + 1} y={-hh + 1} width={4} height={h - 2} rx={2}
        fill={colors.accent} opacity={0.6} />

      {/* Icon */}
      <text x={-hw + 14} y={-2} textAnchor="start"
        fill={colors.label} fontSize={16} fontFamily="Inter,sans-serif">
        {subtypeInfo.icon}
      </text>

      {/* Label */}
      <text x={-hw + 32} y={-3} textAnchor="start"
        fill="#f0f0f4" fontSize={12} fontWeight={600} fontFamily="Inter,sans-serif">
        {truncLabel}
      </text>

      {/* Subtype label */}
      <text x={-hw + 32} y={12} textAnchor="start"
        fill="#6e6e7e" fontSize={10} fontFamily="Inter,sans-serif">
        {subtypeInfo.label}
      </text>

      {/* Status dot */}
      {node.status && node.status !== 'pending' && (
        <circle cx={hw - 12} cy={-hh + 12} r={4}
          fill={
            node.status === 'completed' ? '#22c55e' :
            node.status === 'running' ? '#22d3ee' :
            node.status === 'error' ? '#ef4444' :
            node.status === 'ready' ? '#3b82f6' :
            '#6b7280'
          }
          className={node.status === 'running' ? 'animate-pulse' : ''}
        />
      )}

      {/* Ports — shown on hover or when connecting */}
      {showPorts && (
        <>
          {/* Input ports (left side) */}
          {inputPorts.map((port, i) => (
            <g key={`in-${i}`}
              onMouseUp={(e) => onPortMouseUp?.(e, node.id, 'input', i)}
            >
              <circle cx={port.x} cy={port.y} r={6}
                fill="rgba(24,24,30,0.9)" stroke={colors.accent} strokeWidth={1.5}
                style={{ cursor: 'crosshair' }}
              />
              <circle cx={port.x} cy={port.y} r={2.5}
                fill={colors.accent}
              />
            </g>
          ))}
          {/* Output ports (right side) */}
          {outputPorts.map((port, i) => (
            <g key={`out-${i}`}
              onMouseDown={(e) => {
                e.stopPropagation();
                onPortMouseDown?.(e, node.id, 'output', i);
              }}
            >
              <circle cx={port.x} cy={port.y} r={6}
                fill="rgba(24,24,30,0.9)" stroke={colors.accent} strokeWidth={1.5}
                style={{ cursor: 'crosshair' }}
              />
              <circle cx={port.x} cy={port.y} r={2.5}
                fill={colors.accent}
              />
            </g>
          ))}
        </>
      )}
    </g>
  );
}
