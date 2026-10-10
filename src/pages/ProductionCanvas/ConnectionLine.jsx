import React from 'react';
import { getNodeDimensions, NODE_TYPE_COLORS, getEdgePoint, buildConnectionPath } from './canvasUtils';

/**
 * ConnectionLine — renders a bezier connection between two workflow nodes.
 * Uses horizontal flow (left→right) with data type label.
 */
export default function ConnectionLine({ connection, fromNode, toNode, fromPos, toPos, isSelected, onClick }) {
  if (!fromPos || !toPos || !fromNode || !toNode) return null;

  const fromDim = getNodeDimensions(fromNode.node_type);
  const toDim = getNodeDimensions(toNode.node_type);
  const fromHW = fromDim.w / 2, fromHH = fromDim.h / 2;
  const toHW = toDim.w / 2, toHH = toDim.h / 2;

  // Output port (right side) of source
  const startX = fromPos.x + fromHW;
  const startY = fromPos.y;

  // Input port (left side) of target
  const endX = toPos.x - toHW;
  const endY = toPos.y;

  const path = buildConnectionPath(startX, startY, endX, endY);

  // Arrow head
  const arrowLen = 8;
  const angle = Math.atan2(endY - (endY), endX - (endX - 40));

  // Color based on source type
  const colors = NODE_TYPE_COLORS[fromNode.node_type] || NODE_TYPE_COLORS.DATA;
  const lineColor = isSelected ? colors.accent : colors.stroke;
  const lineWidth = isSelected ? 2.5 : 1.5;

  // Data type label position (midpoint)
  const midX = (startX + endX) / 2;
  const midY = (startY + endY) / 2;

  const isRequired = connection.required;

  return (
    <g onClick={onClick} style={{ cursor: 'pointer' }}>
      {/* Hit area — wider invisible path for easier clicking */}
      <path d={path} fill="none" stroke="transparent" strokeWidth={12} />

      {/* Visible line */}
      <path d={path} fill="none" stroke={lineColor} strokeWidth={lineWidth}
        strokeDasharray={isRequired ? 'none' : '6 4'}
        opacity={isSelected ? 1 : 0.6}
      />

      {/* Arrow head at end */}
      <polygon
        points={`${endX},${endY} ${endX - arrowLen},${endY - arrowLen * 0.45} ${endX - arrowLen},${endY + arrowLen * 0.45}`}
        fill={lineColor} opacity={isSelected ? 1 : 0.6}
      />

      {/* Data type label (if set) */}
      {connection.data_type && (
        <g transform={`translate(${midX}, ${midY})`}>
          <rect x={-30} y={-9} width={60} height={18} rx={4}
            fill="rgba(24,24,30,0.92)" stroke={lineColor} strokeWidth={0.5} />
          <text x={0} y={4} textAnchor="middle"
            fill="#a0a0b0" fontSize={8} fontFamily="JetBrains Mono,monospace">
            {connection.data_type.length > 10 ? connection.data_type.slice(0, 9) + '…' : connection.data_type}
          </text>
        </g>
      )}
    </g>
  );
}
