/**
 * Canvas SVG utilities — reusable edge-point calculation, node sizing,
 * and viewBox transform logic extracted from the original NodeCanvasPage.
 */

// ── Node sizing by type ────────────────────────
export const NODE_DIMENSIONS = {
  DATA:    { w: 160, h: 72, rx: 14 },
  PROCESS: { w: 180, h: 80, rx: 8 },
  OUTPUT:  { w: 160, h: 72, rx: 20 },
};

export function getNodeDimensions(nodeType) {
  return NODE_DIMENSIONS[nodeType] || NODE_DIMENSIONS.DATA;
}

// ── Edge-point calculator ──────────────────────
// Find where a line from center exits the node's bounding rect
export function getEdgePoint(cx, cy, hw, hh, targetX, targetY) {
  const dx = targetX - cx, dy = targetY - cy;
  if (dx === 0 && dy === 0) return { x: cx, y: cy + hh };
  const absDx = Math.abs(dx), absDy = Math.abs(dy);
  if (absDx * hh > absDy * hw) {
    const sign = dx > 0 ? 1 : -1;
    return { x: cx + hw * sign, y: cy + (dy / absDx) * hw };
  } else {
    const sign = dy > 0 ? 1 : -1;
    return { x: cx + (dx / absDy) * hh, y: cy + hh * sign };
  }
}

// ── Node type visual config ────────────────────
export const NODE_TYPE_COLORS = {
  DATA: {
    fill: 'rgba(139,92,246,0.12)',
    stroke: 'rgba(139,92,246,0.45)',
    selectedFill: 'rgba(139,92,246,0.22)',
    selectedStroke: 'rgba(139,92,246,0.7)',
    accent: '#8b5cf6',
    label: '#c4b5fd',
  },
  PROCESS: {
    fill: 'rgba(34,211,238,0.10)',
    stroke: 'rgba(34,211,238,0.40)',
    selectedFill: 'rgba(34,211,238,0.20)',
    selectedStroke: 'rgba(34,211,238,0.65)',
    accent: '#22d3ee',
    label: '#a5f3fc',
  },
  OUTPUT: {
    fill: 'rgba(34,197,94,0.10)',
    stroke: 'rgba(34,197,94,0.40)',
    selectedFill: 'rgba(34,197,94,0.20)',
    selectedStroke: 'rgba(34,197,94,0.65)',
    accent: '#22c55e',
    label: '#bbf7d0',
  },
};

// ── Port positions for connection drawing ──────
// Returns an array of port positions relative to node center
export function getInputPorts(nodeType, hw, hh) {
  // Inputs on the left side
  return [{ x: -hw, y: 0, side: 'left' }];
}

export function getOutputPorts(nodeType, hw, hh) {
  // Outputs on the right side
  return [{ x: hw, y: 0, side: 'right' }];
}

// ── Connection path builder ────────────────────
export function buildConnectionPath(fromX, fromY, toX, toY) {
  // Horizontal bezier curve for left-to-right flow
  const dx = Math.abs(toX - fromX);
  const cpOffset = Math.max(dx * 0.4, 40);
  return `M${fromX},${fromY} C${fromX + cpOffset},${fromY} ${toX - cpOffset},${toY} ${toX},${toY}`;
}

// ── Drag threshold ─────────────────────────────
export const DRAG_THRESHOLD = 5;
export const DBL_CLICK_MS = 350;
