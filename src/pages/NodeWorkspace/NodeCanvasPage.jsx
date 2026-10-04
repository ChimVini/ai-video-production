import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Trash2, Network, X, ChevronRight, ChevronDown,
  ZoomIn, ZoomOut, ListTodo, StickyNote, GitBranch, Minus,
  MessageSquare, Edit3
} from 'lucide-react';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import FloatingTodoNote from './FloatingTodoNote';
import Breadcrumb from './Breadcrumb';

const api = window.api;

/* ═══════════════════════════════════════════════
   Node sizing — depth-based, with optional custom scale
   ═══════════════════════════════════════════════ */
const DEPTH_SCALES = [1, 0.78, 0.62, 0.52, 0.44, 0.38];
function getNodeSize(depth, customScale = 1) {
  const s = DEPTH_SCALES[Math.min(depth, DEPTH_SCALES.length - 1)] * customScale;
  return {
    w: Math.max(Math.round(180 * s), 64),
    h: Math.max(Math.round(88 * s), 32),
    fs: Math.max(Math.round(13 * s), 7),
    sub: Math.max(Math.round(10 * s), 6),
    rx: Math.max(Math.round(14 * s), 5),
  };
}

/* ═══════════════════════════════════════════════
   Crown badge for root nodes
   ═══════════════════════════════════════════════ */
function CrownBadge({ halfH }) {
  const s = 14;
  return (
    <g transform={`translate(0, ${-halfH - s - 2})`}>
      <polygon
        points={`${-s},${s*0.35} ${-s*0.6},${-s*0.5} ${-s*0.2},${s*0.05} 0,${-s*0.7} ${s*0.2},${s*0.05} ${s*0.6},${-s*0.5} ${s},${s*0.35} ${s*0.8},${s*0.6} ${-s*0.8},${s*0.6}`}
        fill="#fbbf24" stroke="#f59e0b" strokeWidth={0.7} strokeLinejoin="round"
      />
      {/* Gems on crown tips */}
      <circle cx={-s*0.6} cy={-s*0.4} r={1.5} fill="#ef4444" />
      <circle cx={0} cy={-s*0.6} r={1.8} fill="#3b82f6" />
      <circle cx={s*0.6} cy={-s*0.4} r={1.5} fill="#22c55e" />
    </g>
  );
}

/* ═══════════════════════════════════════════════
   Force-directed layout — runs in real-time
   Enhanced: size-aware repulsion, overlap avoidance,
   adaptive rest lengths
   ═══════════════════════════════════════════════ */
function useForceLayout(nodeSizesRef) {
  const nodesRef = useRef([]);
  const pcLinksRef = useRef([]);   // parent-child
  const uLinksRef = useRef([]);    // user connections
  const posRef = useRef({});
  const velRef = useRef({});
  const dragRef = useRef(null);
  const frameRef = useRef(null);
  const [positions, setPositions] = useState({});

  function syncNodes(nodes) {
    nodesRef.current = nodes;
    const pos = posRef.current;
    const vel = velRef.current;
    nodes.forEach((n, i) => {
      if (!pos[n.id]) {
        const angle = (i / Math.max(nodes.length, 1)) * Math.PI * 2;
        const r = 140 + nodes.length * 22;
        pos[n.id] = { x: n.pos_x || Math.cos(angle) * r, y: n.pos_y || Math.sin(angle) * r };
        vel[n.id] = { x: 0, y: 0 };
      }
    });
    const ids = new Set(nodes.map(n => n.id));
    Object.keys(pos).forEach(id => { if (!ids.has(id)) { delete pos[id]; delete vel[id]; } });
    start();
  }

  function syncLinks(pcLinks, uLinks) {
    pcLinksRef.current = pcLinks;
    uLinksRef.current = uLinks;
  }

  const tick = useCallback(() => {
    const pos = posRef.current;
    const vel = velRef.current;
    const nodes = nodesRef.current;
    const ids = Object.keys(pos);
    if (ids.length === 0) { frameRef.current = null; return; }

    // Build a quick lookup for node data
    const nodeMap = {};
    nodes.forEach(n => { nodeMap[n.id] = n; });

    const forces = {};
    ids.forEach(id => { forces[id] = { x: 0, y: 0 }; });

    // Get node bounding size for overlap-aware repulsion
    const sizes = nodeSizesRef?.current || {};
    function getHalfSize(id) {
      const n = nodeMap[id];
      const s = sizes[id] || (n ? getNodeSize(n._depth || 0) : getNodeSize(0));
      return { hw: s.w / 2, hh: s.h / 2 };
    }

    // Size-aware repulsion between all nodes
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const a = pos[ids[i]], b = pos[ids[j]];
        if (!a || !b) continue;
        let dx = (b.x - a.x) || 0.1, dy = (b.y - a.y) || 0.1;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;

        // Calculate minimum safe distance based on node sizes
        const sA = getHalfSize(ids[i]), sB = getHalfSize(ids[j]);
        const minDist = Math.max(sA.hw + sB.hw, sA.hh + sB.hh) + 30; // 30px padding

        // Strong repulsion with size-aware minimum
        let force;
        if (dist < minDist) {
          // Extra strong push when overlapping
          force = 8000 / (dist * dist) + (minDist - dist) * 0.8;
        } else {
          force = 8000 / (dist * dist);
        }

        const fx = (dx / dist) * force, fy = (dy / dist) * force;
        forces[ids[i]].x -= fx; forces[ids[i]].y -= fy;
        forces[ids[j]].x += fx; forces[ids[j]].y += fy;
      }
    }

    // Parent-child attraction (adaptive rest length based on node sizes)
    pcLinksRef.current.forEach(({ source, target }) => {
      const a = pos[source], b = pos[target];
      if (!a || !b) return;
      let dx = b.x - a.x, dy = b.y - a.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      // Adaptive rest length: bigger nodes need more space
      const sA = getHalfSize(source), sB = getHalfSize(target);
      const restLen = sA.hh + sB.hh + 80; // natural spacing
      const force = (dist - restLen) * 0.05;
      const fx = (dx / dist) * force, fy = (dy / dist) * force;
      forces[source].x += fx; forces[source].y += fy;
      forces[target].x -= fx; forces[target].y -= fy;
      // Children below parents (hierarchy bias)
      if (b.y < a.y + 50) {
        forces[target].y += 0.8;
        forces[source].y -= 0.3;
      }
    });

    // User connections (weaker, longer, also adaptive)
    uLinksRef.current.forEach(({ source, target }) => {
      const a = pos[source], b = pos[target];
      if (!a || !b) return;
      let dx = b.x - a.x, dy = b.y - a.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const sA = getHalfSize(source), sB = getHalfSize(target);
      const restLen = sA.hw + sB.hw + 140;
      const force = (dist - restLen) * 0.012;
      const fx = (dx / dist) * force, fy = (dy / dist) * force;
      forces[source].x += fx; forces[source].y += fy;
      forces[target].x -= fx; forces[target].y -= fy;
    });

    // Central gravity (gentle)
    ids.forEach(id => {
      forces[id].x -= pos[id].x * 0.0015;
      forces[id].y -= pos[id].y * 0.0015;
    });

    // Apply forces (skip dragged node)
    let totalMovement = 0;
    ids.forEach(id => {
      if (dragRef.current === id) return;
      vel[id] = vel[id] || { x: 0, y: 0 };
      vel[id].x = (vel[id].x + forces[id].x) * 0.58;
      vel[id].y = (vel[id].y + forces[id].y) * 0.58;
      // Clamp velocity to prevent explosion
      const maxV = 15;
      vel[id].x = Math.max(-maxV, Math.min(maxV, vel[id].x));
      vel[id].y = Math.max(-maxV, Math.min(maxV, vel[id].y));
      pos[id].x += vel[id].x;
      pos[id].y += vel[id].y;
      totalMovement += Math.abs(vel[id].x) + Math.abs(vel[id].y);
    });

    setPositions({ ...pos });

    if (totalMovement > 0.25 || dragRef.current) {
      frameRef.current = requestAnimationFrame(tick);
    } else {
      frameRef.current = null;
    }
  }, []);

  const start = useCallback(() => {
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    frameRef.current = requestAnimationFrame(tick);
  }, [tick]);

  const stop = useCallback(() => {
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
  }, []);

  useEffect(() => () => stop(), [stop]);

  return { positions, posRef, velRef, dragRef, start, stop, syncNodes, syncLinks };
}

/* ═══════════════════════════════════════════════
   Tree auto-layout calculator
   Arranges each root tree side-by-side horizontally
   (left to right) with proper spacing
   ═══════════════════════════════════════════════ */
function calculateTreeLayout(nodes) {
  const pos = {};
  const roots = nodes.filter(n => !n.parent_id);
  const LEVEL_H = 160;
  const NODE_H_SPACING = 220; // horizontal space per leaf node
  const TREE_GAP = 120;       // gap between root trees

  // Build children lookup for fast access
  const childrenOf = {};
  nodes.forEach(n => {
    if (n.parent_id) {
      if (!childrenOf[n.parent_id]) childrenOf[n.parent_id] = [];
      childrenOf[n.parent_id].push(n);
    }
  });

  function subtreeLeafCount(id) {
    const kids = childrenOf[id] || [];
    if (kids.length === 0) return 1;
    return kids.reduce((s, c) => s + subtreeLeafCount(c.id), 0);
  }

  function layoutSubtree(id, x, y, width) {
    pos[id] = { x, y };
    const kids = childrenOf[id] || [];
    if (kids.length === 0) return;
    const totalLeaves = kids.reduce((s, c) => s + subtreeLeafCount(c.id), 0);
    let cx = x - width / 2;
    kids.forEach(child => {
      const cw = (subtreeLeafCount(child.id) / totalLeaves) * width;
      layoutSubtree(child.id, cx + cw / 2, y + LEVEL_H, cw);
      cx += cw;
    });
  }

  // Calculate each root tree's width, then place them left to right
  const treeWidths = roots.map(r => {
    const leaves = subtreeLeafCount(r.id);
    return Math.max(leaves * NODE_H_SPACING, NODE_H_SPACING);
  });

  const totalWidth = treeWidths.reduce((s, w) => s + w, 0) + Math.max(0, roots.length - 1) * TREE_GAP;
  let cursorX = -totalWidth / 2;

  roots.forEach((r, i) => {
    const tw = treeWidths[i];
    const centerX = cursorX + tw / 2;
    layoutSubtree(r.id, centerX, -200, tw);
    cursorX += tw + TREE_GAP;
  });

  return pos;
}

/* ═══════════════════════════════════════════════
   SVG Canvas Node
   ═══════════════════════════════════════════════ */
function CanvasNode({ node, pos, size, isSelected, onMouseDown }) {
  const { w, h, fs, sub, rx } = size;
  const hw = w / 2, hh = h / 2;
  const isRoot = !node.parent_id;
  const maxChars = Math.floor(w / (fs * 0.55));

  return (
    <g transform={`translate(${pos.x}, ${pos.y})`} onMouseDown={onMouseDown} style={{ cursor: 'grab' }}>
      {isRoot && <CrownBadge halfH={hh} />}

      {/* Body */}
      <rect x={-hw} y={-hh} width={w} height={h} rx={rx}
        fill={isSelected ? 'rgba(139,92,246,0.18)' : 'rgba(24,24,30,0.96)'}
        stroke={isSelected ? 'rgba(139,92,246,0.6)' : 'rgba(55,55,66,0.45)'}
        strokeWidth={isSelected ? 2 : 1} />
      {/* Color strip */}
      {node.color && <rect x={-hw} y={-hh} width={3.5} height={h} rx={1.5} fill={node.color} />}
      {/* Depth indicator strip */}
      {!node.color && node._depth > 0 && (
        <rect x={-hw} y={-hh} width={3} height={h} rx={1.5}
          fill={`hsl(${260 - node._depth * 30}, 60%, ${55 - node._depth * 5}%)`} opacity={0.6} />
      )}

      {/* Name */}
      <text x={0} y={h > 50 ? -4 : 1} textAnchor="middle"
        fill="#f0f0f4" fontSize={fs} fontWeight={600} fontFamily="Inter,sans-serif">
        {node.name.length > maxChars ? node.name.slice(0, maxChars - 1) + '…' : node.name}
      </text>

      {/* Stats row */}
      {h > 45 && (
        <text x={0} y={hh - sub - 1} textAnchor="middle"
          fill="#6e6e7e" fontSize={sub} fontFamily="Inter,sans-serif">
          {node._todoCount > 0 ? `✓${node._todoCompleted}/${node._todoCount}` : ''}
          {node._todoCount > 0 && node._noteCount > 0 ? '  ' : ''}
          {node._noteCount > 0 ? `✎${node._noteCount}` : ''}
          {node._childCount > 0 ? `  ▼${node._childCount}` : ''}
        </text>
      )}
    </g>
  );
}

/* ═══════════════════════════════════════════════
   Edge-point calculator — find where a line from
   center exits the node's bounding rect
   ═══════════════════════════════════════════════ */
function getEdgePoint(cx, cy, hw, hh, targetX, targetY) {
  const dx = targetX - cx, dy = targetY - cy;
  if (dx === 0 && dy === 0) return { x: cx, y: cy + hh };
  const absDx = Math.abs(dx), absDy = Math.abs(dy);
  // Which edge does the line hit first?
  if (absDx * hh > absDy * hw) {
    // Hits left or right edge
    const sign = dx > 0 ? 1 : -1;
    return { x: cx + hw * sign, y: cy + (dy / absDx) * hw };
  } else {
    // Hits top or bottom edge
    const sign = dy > 0 ? 1 : -1;
    return { x: cx + (dx / absDy) * hh, y: cy + hh * sign };
  }
}

/* ═══════════════════════════════════════════════
   Connection lines — connect at block edges
   ═══════════════════════════════════════════════ */
function ParentChildLine({ from, to, fromSize, toSize }) {
  if (!from || !to) return null;
  const fhw = fromSize.w / 2, fhh = fromSize.h / 2;
  const thw = toSize.w / 2, thh = toSize.h / 2;
  // Start from parent edge toward child, end at child edge toward parent
  const start = getEdgePoint(from.x, from.y, fhw, fhh, to.x, to.y);
  const end = getEdgePoint(to.x, to.y, thw, thh, from.x, from.y);
  // Smooth bezier curve
  const midY = (start.y + end.y) / 2;
  return (
    <path
      d={`M${start.x},${start.y} C${start.x},${midY} ${end.x},${midY} ${end.x},${end.y}`}
      fill="none" stroke="rgba(90,90,110,0.28)" strokeWidth={1.5} />
  );
}

function UserConnectionLine({ from, to, fromSize, toSize }) {
  if (!from || !to) return null;
  const fhw = fromSize.w / 2, fhh = fromSize.h / 2;
  const thw = toSize.w / 2, thh = toSize.h / 2;
  const start = getEdgePoint(from.x, from.y, fhw, fhh, to.x, to.y);
  const end = getEdgePoint(to.x, to.y, thw, thh, from.x, from.y);
  const dx = end.x - start.x, dy = end.y - start.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < 2) return null;
  const angle = Math.atan2(dy, dx);
  const al = 7;
  // Pull arrow tip back slightly so it sits on the edge
  const ex = end.x - Math.cos(angle) * 2, ey = end.y - Math.sin(angle) * 2;
  return (
    <g>
      <line x1={start.x} y1={start.y} x2={ex} y2={ey}
        stroke="rgba(139,92,246,0.3)" strokeWidth={1.2} strokeDasharray="5 4" />
      <polygon
        points={`${end.x},${end.y} ${end.x - al * Math.cos(angle - 0.4)},${end.y - al * Math.sin(angle - 0.4)} ${end.x - al * Math.cos(angle + 0.4)},${end.y - al * Math.sin(angle + 0.4)}`}
        fill="rgba(139,92,246,0.45)" />
    </g>
  );
}

/* ═══════════════════════════════════════════════
   Note label — centered text connected to node
   via a thin line, no border/block
   ═══════════════════════════════════════════════ */
function NoteLabel({ nodePos, nodeSize, label, onEdit }) {
  if (!nodePos || !label) return null;
  const { w, h } = nodeSize;
  // Position the label to the right of the node
  const offsetX = w / 2 + 60;
  const offsetY = -20;
  const labelX = nodePos.x + offsetX;
  const labelY = nodePos.y + offsetY;

  // Connection line from node edge to label
  const edgeStart = getEdgePoint(nodePos.x, nodePos.y, w / 2, h / 2, labelX, labelY);

  // Measure rough text width
  const textLen = Math.min(label.length, 30);
  const fontSize = 11;
  const approxW = textLen * fontSize * 0.55;

  return (
    <g style={{ cursor: 'pointer' }} onClick={onEdit}>
      {/* Thin connection line */}
      <line x1={edgeStart.x} y1={edgeStart.y} x2={labelX} y2={labelY}
        stroke="rgba(139,92,246,0.25)" strokeWidth={1} strokeDasharray="3 3" />
      {/* Small dot at connection point */}
      <circle cx={edgeStart.x} cy={edgeStart.y} r={2.5} fill="rgba(139,92,246,0.4)" />
      {/* Label text — centered, no border */}
      <text x={labelX} y={labelY + 1} textAnchor="middle"
        fill="rgba(200,200,220,0.85)" fontSize={fontSize} fontFamily="Inter,sans-serif"
        fontStyle="italic" fontWeight={400}>
        {label.length > 30 ? label.slice(0, 29) + '…' : label}
      </text>
    </g>
  );
}

/* ═══════════════════════════════════════════════
   Node management panel (right sidebar)
   ═══════════════════════════════════════════════ */
function NodePanel({
  node, allNodes, onClose, onCreateChild, onDelete, onRename,
  onOpenWindow, onScaleChange, nodeScale, noteLabel, onNoteLabelChange
}) {
  const [editName, setEditName] = useState(node.name);
  const [isEditing, setIsEditing] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [childName, setChildName] = useState('');

  useEffect(() => { setEditName(node.name); setIsEditing(false); setShowCreate(false); }, [node.id]);

  const children = allNodes.filter(n => n.parent_id === node.id);

  function handleSave() {
    if (editName.trim() && editName.trim() !== node.name) onRename(editName.trim());
    setIsEditing(false);
  }

  return (
    <div className="w-72 bg-s-2 border-l border-s-6/30 flex flex-col shrink-0 h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-s-6/30 shrink-0">
        <div className="flex items-center gap-2">
          <Network className="w-4 h-4 text-accent-400" />
          <span className="text-[10px] font-semibold text-t-3 uppercase tracking-wider">Node Info</span>
        </div>
        <button onClick={onClose} className="p-1 rounded-md hover:bg-s-4 text-t-4 hover:text-t-2 transition-colors">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Name */}
        <div className="px-4 py-3 border-b border-s-6/20">
          {isEditing ? (
            <input className="input text-sm font-semibold" value={editName} autoFocus
              onChange={e => setEditName(e.target.value)}
              onBlur={handleSave}
              onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setIsEditing(false); }} />
          ) : (
            <h2 className="text-sm font-semibold text-t-1 cursor-pointer hover:text-accent-400 transition-colors"
              onClick={() => setIsEditing(true)}>{node.name}</h2>
          )}
          <div className="flex items-center gap-2 mt-1">
            {!node.parent_id && <span className="text-[10px] text-amber-400 font-medium">👑 Root</span>}
            {node._depth > 0 && <span className="text-[10px] text-t-4">Depth {node._depth}</span>}
          </div>
        </div>

        {/* Stats */}
        <div className="px-4 py-3 border-b border-s-6/20 grid grid-cols-3 gap-2">
          {[
            { val: node._todoCount || 0, label: 'Todos' },
            { val: node._noteCount || 0, label: 'Notes' },
            { val: node._childCount || 0, label: 'Children' },
          ].map(s => (
            <div key={s.label} className="text-center">
              <div className="text-base font-bold text-t-1">{s.val}</div>
              <div className="text-[9px] text-t-4 uppercase">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Size control */}
        <div className="px-4 py-3 border-b border-s-6/20">
          <label className="text-[10px] text-t-4 uppercase tracking-wider block mb-1.5">Node Size</label>
          <div className="flex items-center gap-2">
            <button className="p-1 rounded-md hover:bg-s-4 text-t-4 hover:text-t-2"
              onClick={() => onScaleChange(Math.max((nodeScale || 1) - 0.15, 0.35))}>
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <div className="flex-1 bg-s-4 rounded-full h-1.5 relative">
              <div className="bg-accent-500 rounded-full h-1.5 transition-all"
                style={{ width: `${Math.min(((nodeScale || 1) / 2) * 100, 100)}%` }} />
            </div>
            <button className="p-1 rounded-md hover:bg-s-4 text-t-4 hover:text-t-2"
              onClick={() => onScaleChange(Math.min((nodeScale || 1) + 0.15, 2.0))}>
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10px] text-t-4 w-9 text-right">{Math.round((nodeScale || 1) * 100)}%</span>
          </div>
        </div>

        {/* Note Label */}
        <div className="px-4 py-3 border-b border-s-6/20">
          <label className="text-[10px] text-t-4 uppercase tracking-wider block mb-1.5">
            <MessageSquare className="w-3 h-3 inline mr-1" />Note Label
          </label>
          <input className="input text-xs" value={noteLabel || ''}
            onChange={e => onNoteLabelChange(e.target.value)}
            placeholder="Add a short note label..." maxLength={60} />
          {noteLabel && (
            <button className="text-[10px] text-red-400 hover:text-red-300 mt-1.5"
              onClick={() => onNoteLabelChange('')}>Remove label</button>
          )}
        </div>

        {/* Actions */}
        <div className="px-4 py-3 border-b border-s-6/20 space-y-1.5">
          <button className="btn-ghost w-full text-xs flex items-center gap-2 justify-start py-2"
            onClick={() => onOpenWindow(node.id)}>
            <ListTodo className="w-3.5 h-3.5 text-accent-400" /> Open Todo / Notes
          </button>
          <button className="btn-ghost w-full text-xs flex items-center gap-2 justify-start py-2"
            onClick={() => setShowCreate(true)}>
            <Plus className="w-3.5 h-3.5 text-green-400" /> Add Child Node
          </button>
        </div>

        {/* Create child inline */}
        {showCreate && (
          <div className="px-4 py-3 border-b border-s-6/20 bg-s-3/50">
            <form onSubmit={e => {
              e.preventDefault();
              if (childName.trim()) { onCreateChild(childName.trim()); setChildName(''); setShowCreate(false); }
            }}>
              <label className="label text-[10px]">Child Node Name</label>
              <input className="input text-xs mt-1" value={childName}
                onChange={e => setChildName(e.target.value)}
                placeholder="e.g. Sub-task" autoFocus />
              <div className="flex justify-end gap-2 mt-2">
                <button type="button" className="btn-secondary text-[10px]"
                  onClick={() => setShowCreate(false)}>Cancel</button>
                <button type="submit" className="btn-primary text-[10px]"
                  disabled={!childName.trim()}>Create</button>
              </div>
            </form>
          </div>
        )}

        {/* Children list */}
        {children.length > 0 && (
          <div className="px-4 py-3 border-b border-s-6/20">
            <label className="text-[10px] text-t-4 uppercase tracking-wider block mb-2">Children</label>
            <div className="space-y-1">
              {children.map(c => (
                <div key={c.id} className="text-xs text-t-3 px-2 py-1.5 rounded-lg bg-s-4/30 flex items-center gap-1.5">
                  <ChevronRight className="w-3 h-3 text-t-4 shrink-0" />
                  <span className="truncate">{c.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Delete */}
      <div className="px-4 py-3 border-t border-s-6/30 shrink-0">
        <button className="btn-ghost w-full text-xs text-red-400 hover:text-red-300 flex items-center gap-2 justify-center py-2"
          onClick={onDelete}>
          <Trash2 className="w-3.5 h-3.5" /> Delete Node
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   Main Canvas Page
   ═══════════════════════════════════════════════ */
export default function NodeCanvasPage() {
  const navigate = useNavigate();
  const [allNodes, setAllNodes] = useState([]);
  const [connections, setConnections] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [showPanel, setShowPanel] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [nodeScales, setNodeScales] = useState({});
  const [openWindows, setOpenWindows] = useState([]);
  const [nodeLabels, setNodeLabels] = useState({});
  const svgRef = useRef(null);
  const [viewBox, setViewBox] = useState({ x: -600, y: -400, w: 1200, h: 800 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0, vx: 0, vy: 0 });
  const lastClickRef = useRef({ id: null, time: 0 });
  const nodeSizesRef = useRef({});

  const { positions, posRef, velRef, dragRef, start: startPhysics, stop: stopPhysics, syncNodes, syncLinks } =
    useForceLayout(nodeSizesRef);

  // Build links from data
  const parentChildLinks = useMemo(() =>
    allNodes.filter(n => n.parent_id).map(n => ({ source: n.parent_id, target: n.id })),
    [allNodes]
  );
  const userLinks = useMemo(() =>
    connections.map(c => ({ source: c.source_node_id, target: c.target_node_id })),
    [connections]
  );

  useEffect(() => { syncLinks(parentChildLinks, userLinks); }, [parentChildLinks, userLinks]);

  // ── Load ALL nodes recursively ────────────────
  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const roots = await api.getWorkspaceRootNodes();
    const all = [];

    async function loadRecursive(nodeList, depth) {
      for (const node of nodeList) {
        const [todos, notes, children] = await Promise.all([
          api.getNodeTodos(node.id),
          api.getNodeNotes(node.id),
          api.getWorkspaceChildren(node.id),
        ]);
        const rootTodos = todos.filter(t => !t.parent_todo_id);
        all.push({
          ...node,
          _depth: depth,
          _todoCount: rootTodos.length,
          _todoCompleted: rootTodos.filter(t => t.completed).length,
          _noteCount: notes.length,
          _childCount: children.length,
        });
        if (children.length > 0) await loadRecursive(children, depth + 1);
      }
    }

    await loadRecursive(roots, 0);
    setAllNodes(all);
    syncNodes(all);

    // Update nodeSizesRef for force layout
    const sizesMap = {};
    all.forEach(n => { sizesMap[n.id] = getNodeSize(n._depth, nodeScales[n.id]); });
    nodeSizesRef.current = sizesMap;

    // Load note labels from localStorage
    try {
      const stored = localStorage.getItem('node-canvas-labels');
      if (stored) setNodeLabels(JSON.parse(stored));
    } catch {}

    try {
      const conns = await api.getAllNodeConnections();
      setConnections(conns);
    } catch { setConnections([]); }
  }

  // ── SVG coordinate conversion ─────────────────
  function screenToSVG(svg, cx, cy) {
    const pt = svg.createSVGPoint();
    pt.x = cx; pt.y = cy;
    return pt.matrixTransform(svg.getScreenCTM().inverse());
  }

  // ── Node drag + click detection ───────────────
  const DRAG_THRESHOLD = 5;
  const DBL_CLICK_MS = 350;

  function handleNodeMouseDown(nodeId, e) {
    e.preventDefault();
    e.stopPropagation();
    const svg = svgRef.current;
    const startX = e.clientX, startY = e.clientY;
    const startSVG = screenToSVG(svg, startX, startY);
    const startPos = { ...(posRef.current[nodeId] || { x: 0, y: 0 }) };
    let isDragging = false;

    function onMove(me) {
      const delta = Math.abs(me.clientX - startX) + Math.abs(me.clientY - startY);
      if (!isDragging && delta > DRAG_THRESHOLD) {
        isDragging = true;
        dragRef.current = nodeId;
        startPhysics(); // force layout keeps running while dragging
      }
      if (isDragging) {
        const cur = screenToSVG(svg, me.clientX, me.clientY);
        posRef.current[nodeId] = {
          x: startPos.x + (cur.x - startSVG.x),
          y: startPos.y + (cur.y - startSVG.y),
        };
      }
    }

    function onUp() {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      if (isDragging) {
        dragRef.current = null;
        const p = posRef.current[nodeId];
        if (p) api.updateWorkspaceNode(nodeId, { pos_x: Math.round(p.x), pos_y: Math.round(p.y) });
      } else {
        // Click detection
        const now = Date.now();
        const last = lastClickRef.current;
        if (last.id === nodeId && (now - last.time) < DBL_CLICK_MS) {
          // Double-click → open floating window
          lastClickRef.current = { id: null, time: 0 };
          toggleWindow(nodeId);
        } else {
          // Single click → select + show panel
          lastClickRef.current = { id: nodeId, time: now };
          setSelectedId(prev => {
            const newId = prev === nodeId ? null : nodeId;
            setShowPanel(!!newId);
            return newId;
          });
        }
      }
    }

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }

  // ── Canvas pan ────────────────────────────────
  function handlePanStart(e) {
    if (e.target !== svgRef.current) return;
    setIsPanning(true);
    setSelectedId(null);
    setShowPanel(false);
    panStart.current = { x: e.clientX, y: e.clientY, vx: viewBox.x, vy: viewBox.y };
  }
  function handlePanMove(e) {
    if (!isPanning) return;
    const scale = viewBox.w / svgRef.current.clientWidth;
    setViewBox(prev => ({
      ...prev,
      x: panStart.current.vx - (e.clientX - panStart.current.x) * scale,
      y: panStart.current.vy - (e.clientY - panStart.current.y) * scale,
    }));
  }
  function handlePanEnd() { setIsPanning(false); }

  // ── Canvas zoom (non-passive listener to allow preventDefault) ──
  const viewBoxRef = useRef(viewBox);
  viewBoxRef.current = viewBox;

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    function onWheel(e) {
      e.preventDefault();
      const factor = e.deltaY > 0 ? 1.08 : 0.92;
      const prev = viewBoxRef.current;
      const nw = prev.w * factor, nh = prev.h * factor;
      if (nw < 200 || nw > 10000) return;
      setViewBox({ x: prev.x + (prev.w - nw) / 2, y: prev.y + (prev.h - nh) / 2, w: nw, h: nh });
    }
    svg.addEventListener('wheel', onWheel, { passive: false });
    return () => svg.removeEventListener('wheel', onWheel);
  }, []);

  // ── CRUD handlers ─────────────────────────────
  async function handleCreateRootNode(name) {
    await api.createWorkspaceNode({
      name, parent_id: null,
      pos_x: Math.round(Math.random() * 200 - 100),
      pos_y: Math.round(Math.random() * 200 - 100),
    });
    setShowCreate(false);
    loadData();
  }

  async function handleCreateChild(name) {
    if (!selectedId) return;
    const parent = posRef.current[selectedId] || { x: 0, y: 0 };
    await api.createWorkspaceNode({
      name, parent_id: selectedId,
      pos_x: Math.round(parent.x + (Math.random() * 80 - 40)),
      pos_y: Math.round(parent.y + 120 + Math.random() * 40),
    });
    loadData();
  }

  async function handleDeleteNode() {
    if (!selectedId) return;
    await api.deleteWorkspaceNode(selectedId);
    setSelectedId(null); setShowPanel(false); setShowDelete(false);
    setOpenWindows(prev => prev.filter(w => w.nodeId !== selectedId));
    loadData();
  }

  async function handleRename(name) {
    if (!selectedId) return;
    await api.updateWorkspaceNode(selectedId, { name });
    loadData();
  }

  // ── Note label management ───────────────────
  function handleNoteLabelChange(text) {
    if (!selectedId) return;
    setNodeLabels(prev => {
      const next = { ...prev };
      if (text) next[selectedId] = text;
      else delete next[selectedId];
      try { localStorage.setItem('node-canvas-labels', JSON.stringify(next)); } catch {}
      return next;
    });
  }

  // ── Floating windows ─────────────────────────
  function toggleWindow(nodeId) {
    setOpenWindows(prev => {
      const exists = prev.find(w => w.nodeId === nodeId);
      if (exists) return prev.filter(w => w.nodeId !== nodeId);
      return [...prev, { nodeId, minimized: false }];
    });
  }

  function minimizeWindow(nodeId) {
    setOpenWindows(prev => prev.map(w => w.nodeId === nodeId ? { ...w, minimized: !w.minimized } : w));
  }

  function closeWindow(nodeId) {
    setOpenWindows(prev => prev.filter(w => w.nodeId !== nodeId));
  }

  // ── Tree auto-layout ─────────────────────────
  function handleTreeLayout() {
    if (allNodes.length === 0) return;
    const treePos = calculateTreeLayout(allNodes);
    Object.entries(treePos).forEach(([id, p]) => {
      posRef.current[id] = { ...p };
      if (velRef.current[id]) velRef.current[id] = { x: 0, y: 0 };
      api.updateWorkspaceNode(id, { pos_x: Math.round(p.x), pos_y: Math.round(p.y) });
    });
    startPhysics();
  }

  // ── Node scale change ────────────────────────
  function handleNodeScaleChange(scale) {
    if (!selectedId) return;
    setNodeScales(prev => ({ ...prev, [selectedId]: scale }));
  }

  const selectedNode = allNodes.find(n => n.id === selectedId);

  return (
    <div className="flex h-full -m-6">
      <div className="flex-1 flex flex-col min-w-0">
        {/* ── Toolbar ─── */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-s-6/30 bg-s-2 shrink-0">
          <div className="flex items-center gap-2">
            <div className="flex items-center">
              <Breadcrumb items={[
                { label: 'Node Workspace', path: '/node-canvas', icon: <Network className="w-3 h-3" /> },
                { label: 'Canvas' },
              ]} />
            </div>
            <span className="text-[10px] text-t-4 bg-s-4/60 px-2 py-0.5 rounded-full ml-1">
              {allNodes.length} node{allNodes.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button className="btn-ghost text-xs flex items-center gap-1.5" onClick={handleTreeLayout}
              title="Auto-arrange nodes as top-down tree">
              <GitBranch className="w-3.5 h-3.5" /> Tree Layout
            </button>
            <button className="btn-primary text-xs flex items-center gap-1.5" onClick={() => setShowCreate(true)}>
              <Plus className="w-3.5 h-3.5" /> New Node
            </button>
          </div>
        </div>

        {/* ── Canvas ─── */}
        <div className="flex-1 relative overflow-hidden bg-s-0">
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
            style={{ backgroundImage: 'radial-gradient(circle,rgba(255,255,255,0.5) 1px,transparent 1px)', backgroundSize: '40px 40px' }} />
          <svg ref={svgRef} className="w-full h-full relative"
            viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
            onMouseDown={handlePanStart} onMouseMove={handlePanMove}
            onMouseUp={handlePanEnd} onMouseLeave={handlePanEnd}
            style={{ cursor: isPanning ? 'grabbing' : 'default' }}>

            {/* Parent-child lines — connect at block edges */}
            {allNodes.filter(n => n.parent_id).map(n => {
              const parentNode = allNodes.find(p => p.id === n.parent_id);
              return (
                <ParentChildLine key={`pc-${n.id}`}
                  from={positions[n.parent_id]} to={positions[n.id]}
                  fromSize={parentNode ? getNodeSize(parentNode._depth, nodeScales[parentNode.id]) : getNodeSize(0)}
                  toSize={getNodeSize(n._depth, nodeScales[n.id])} />
              );
            })}

            {/* User connection lines — connect at block edges */}
            {connections.map(c => {
              const srcNode = allNodes.find(n => n.id === c.source_node_id);
              const tgtNode = allNodes.find(n => n.id === c.target_node_id);
              return (
                <UserConnectionLine key={`uc-${c.id}`}
                  from={positions[c.source_node_id]} to={positions[c.target_node_id]}
                  fromSize={srcNode ? getNodeSize(srcNode._depth, nodeScales[srcNode.id]) : getNodeSize(0)}
                  toSize={tgtNode ? getNodeSize(tgtNode._depth, nodeScales[tgtNode.id]) : getNodeSize(0)} />
              );
            })}

            {/* Nodes — render deeper first so parents draw on top */}
            {[...allNodes].sort((a, b) => b._depth - a._depth).map(node => (
              <CanvasNode key={node.id} node={node}
                pos={positions[node.id] || { x: 0, y: 0 }}
                size={getNodeSize(node._depth, nodeScales[node.id])}
                isSelected={selectedId === node.id}
                onMouseDown={e => handleNodeMouseDown(node.id, e)} />
            ))}

            {/* Note labels — centered text connected via line */}
            {allNodes.map(node => {
              const label = nodeLabels[node.id];
              if (!label) return null;
              return (
                <NoteLabel key={`lbl-${node.id}`}
                  nodePos={positions[node.id]}
                  nodeSize={getNodeSize(node._depth, nodeScales[node.id])}
                  label={label}
                  onEdit={() => { setSelectedId(node.id); setShowPanel(true); }} />
              );
            })}

            {/* Empty state */}
            {allNodes.length === 0 && (
              <text x={0} y={0} textAnchor="middle" fill="#5c5c6a" fontSize={14} fontFamily="Inter,sans-serif">
                No nodes yet — click "New Node" to start.
              </text>
            )}
          </svg>
        </div>
      </div>

      {/* ── Node Panel (right sidebar) ─── */}
      {showPanel && selectedNode && (
        <NodePanel node={selectedNode} allNodes={allNodes}
          onClose={() => { setShowPanel(false); setSelectedId(null); }}
          onCreateChild={handleCreateChild}
          onDelete={() => setShowDelete(true)}
          onRename={handleRename}
          onOpenWindow={toggleWindow}
          onScaleChange={handleNodeScaleChange}
          nodeScale={nodeScales[selectedId]}
          noteLabel={nodeLabels[selectedId]}
          onNoteLabelChange={handleNoteLabelChange} />
      )}

      {/* ── Floating Todo/Note windows ─── */}
      <div className="fixed bottom-0 right-4 flex items-end gap-2 z-50 pointer-events-none">
        {openWindows.map(win => (
          <div key={win.nodeId} className="pointer-events-auto">
            <FloatingTodoNote nodeId={win.nodeId}
              minimized={win.minimized}
              onMinimize={() => minimizeWindow(win.nodeId)}
              onClose={() => closeWindow(win.nodeId)}
              onDataChange={loadData} />
          </div>
        ))}
      </div>

      {/* ── Create root node modal ─── */}
      <CreateNodeModal isOpen={showCreate} onClose={() => setShowCreate(false)} onCreated={handleCreateRootNode} />

      {/* ── Delete confirm ─── */}
      <ConfirmDialog isOpen={showDelete} onClose={() => setShowDelete(false)}
        onConfirm={handleDeleteNode} title="Delete Node"
        message={`Delete "${selectedNode?.name}" and all its children, todos & notes? This cannot be undone.`} />
    </div>
  );
}

/* ═══════════════════════════════════════════════
   Create node modal
   ═══════════════════════════════════════════════ */
function CreateNodeModal({ isOpen, onClose, onCreated }) {
  const [name, setName] = useState('');
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="New Root Node">
      <form onSubmit={e => { e.preventDefault(); if (name.trim()) { onCreated(name.trim()); setName(''); } }} className="space-y-4">
        <div>
          <label className="label">Node Name</label>
          <input className="input" value={name} onChange={e => setName(e.target.value)}
            placeholder="e.g. Build Script System" autoFocus />
          <p className="text-2xs text-t-4 mt-1.5">Root nodes appear at the top level with a 👑 crown.</p>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={!name.trim()}>Create</button>
        </div>
      </form>
    </Modal>
  );
}
