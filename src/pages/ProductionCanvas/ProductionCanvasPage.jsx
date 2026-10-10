import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Plus, Save, Play, ChevronRight, ZoomIn, ZoomOut, Maximize2,
  Trash2, Workflow, ArrowLeft, MoreHorizontal
} from 'lucide-react';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import WorkflowNode from './WorkflowNode';
import ConnectionLine from './ConnectionLine';
import NodePalette from './NodePalette';
import NodeInspector from './NodeInspector';
import WorkflowRunPanel from './WorkflowRunPanel';
import ResourcePicker from '../ResourceLibrary/ResourcePicker';
import { getNodeDimensions, NODE_TYPE_COLORS, DRAG_THRESHOLD, DBL_CLICK_MS, buildConnectionPath } from './canvasUtils';
import { NODE_SUBTYPES, parseJson } from '../../utils/helpers';

const api = window.api;

/* ═══════════════════════════════════════════════
   SVG coordinate helper
   ═══════════════════════════════════════════════ */
function screenToSVG(svg, cx, cy) {
  const pt = svg.createSVGPoint();
  pt.x = cx; pt.y = cy;
  return pt.matrixTransform(svg.getScreenCTM().inverse());
}

/* ═══════════════════════════════════════════════
   Main Production Canvas
   ═══════════════════════════════════════════════ */
export default function ProductionCanvasPage() {
  const navigate = useNavigate();
  const { workflowId } = useParams();

  // ── Core state ──────────────────────────────
  const [workflow, setWorkflow] = useState(null);
  const [nodes, setNodes] = useState([]);
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);

  // ── Selection & UI ─────────────────────────
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [selectedConnectionId, setSelectedConnectionId] = useState(null);
  const [showInspector, setShowInspector] = useState(false);
  const [paletteCollapsed, setPaletteCollapsed] = useState(false);
  const [showDeleteNode, setShowDeleteNode] = useState(false);
  const [showDeleteConn, setShowDeleteConn] = useState(false);
  const [showResourcePicker, setShowResourcePicker] = useState(false);
  const [pendingNodeType, setPendingNodeType] = useState(null); // { type, subtype } for after resource pick
  const [showRunPanel, setShowRunPanel] = useState(false);

  // ── Canvas state ───────────────────────────
  const svgRef = useRef(null);
  const [viewBox, setViewBox] = useState({ x: -600, y: -400, w: 1200, h: 800 });
  const viewBoxRef = useRef(viewBox);
  viewBoxRef.current = viewBox;
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0, vx: 0, vy: 0 });

  // ── Node positions (stored in node.position_x/position_y, kept in local state for smooth drag) ──
  const [positions, setPositions] = useState({});

  // ── Connection drawing state ───────────────
  const [drawing, setDrawing] = useState(null); // { fromNodeId, fromPortType, fromPortIdx, mouseX, mouseY }

  // ── Hover state (which node shows ports) ───
  const [hoveredNodeId, setHoveredNodeId] = useState(null);

  // ── Double-click tracker ───────────────────
  const lastClickRef = useRef({ id: null, time: 0 });

  // ═══════════════════════════════════════════
  //  Data loading
  // ═══════════════════════════════════════════
  const loadWorkflow = useCallback(async () => {
    if (!workflowId) { setLoading(false); return; }
    try {
      const wf = await api.getWorkflow(workflowId);
      setWorkflow(wf);
      const wfNodes = await api.getWorkflowNodes(workflowId);
      setNodes(wfNodes);
      // Build position map
      const posMap = {};
      wfNodes.forEach(n => { posMap[n.id] = { x: n.position_x || 0, y: n.position_y || 0 }; });
      setPositions(posMap);
      const wfConns = await api.getWorkflowConnections(workflowId);
      setConnections(wfConns);
    } catch (err) {
      console.error('Failed to load workflow:', err);
    }
    setLoading(false);
  }, [workflowId]);

  useEffect(() => { loadWorkflow(); }, [loadWorkflow]);

  // ═══════════════════════════════════════════
  //  Pan & Zoom
  // ═══════════════════════════════════════════
  function handlePanStart(e) {
    // Only pan on background clicks
    if (e.target !== svgRef.current && !e.target.classList.contains('canvas-bg')) return;
    setIsPanning(true);
    setSelectedNodeId(null);
    setSelectedConnectionId(null);
    setShowInspector(false);
    panStart.current = { x: e.clientX, y: e.clientY, vx: viewBox.x, vy: viewBox.y };
  }

  function handlePanMove(e) {
    if (!isPanning && !drawing) return;
    if (isPanning) {
      const scale = viewBox.w / svgRef.current.clientWidth;
      setViewBox(prev => ({
        ...prev,
        x: panStart.current.vx - (e.clientX - panStart.current.x) * scale,
        y: panStart.current.vy - (e.clientY - panStart.current.y) * scale,
      }));
    }
    if (drawing) {
      const svgPt = screenToSVG(svgRef.current, e.clientX, e.clientY);
      setDrawing(prev => ({ ...prev, mouseX: svgPt.x, mouseY: svgPt.y }));
    }
  }

  function handlePanEnd() {
    setIsPanning(false);
    if (drawing) {
      // Dropped on background — cancel connection drawing
      setDrawing(null);
    }
  }

  // Zoom via non-passive wheel
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    function onWheel(e) {
      e.preventDefault();
      const factor = e.deltaY > 0 ? 1.08 : 0.92;
      const prev = viewBoxRef.current;
      const nw = prev.w * factor, nh = prev.h * factor;
      if (nw < 200 || nw > 10000) return;
      // Zoom toward mouse position
      const rect = svg.getBoundingClientRect();
      const mx = (e.clientX - rect.left) / rect.width;
      const my = (e.clientY - rect.top) / rect.height;
      setViewBox({
        x: prev.x + (prev.w - nw) * mx,
        y: prev.y + (prev.h - nh) * my,
        w: nw,
        h: nh,
      });
    }
    svg.addEventListener('wheel', onWheel, { passive: false });
    return () => svg.removeEventListener('wheel', onWheel);
  }, []);

  // ═══════════════════════════════════════════
  //  Node drag
  // ═══════════════════════════════════════════
  function handleNodeMouseDown(nodeId, e) {
    e.preventDefault();
    e.stopPropagation();
    const svg = svgRef.current;
    const startX = e.clientX, startY = e.clientY;
    const startSVG = screenToSVG(svg, startX, startY);
    const startPos = { ...(positions[nodeId] || { x: 0, y: 0 }) };
    let isDragging = false;

    function onMove(me) {
      const delta = Math.abs(me.clientX - startX) + Math.abs(me.clientY - startY);
      if (!isDragging && delta > DRAG_THRESHOLD) isDragging = true;
      if (isDragging) {
        const cur = screenToSVG(svg, me.clientX, me.clientY);
        setPositions(prev => ({
          ...prev,
          [nodeId]: {
            x: startPos.x + (cur.x - startSVG.x),
            y: startPos.y + (cur.y - startSVG.y),
          },
        }));
      }
    }

    function onUp() {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      if (isDragging) {
        // Persist position
        const p = positions[nodeId] || startPos;
        api.updateWorkflowNode(nodeId, { position_x: Math.round(p.x), position_y: Math.round(p.y) });
      } else {
        // Click detection
        const now = Date.now();
        const last = lastClickRef.current;
        if (last.id === nodeId && (now - last.time) < DBL_CLICK_MS) {
          // Double-click — open inspector
          lastClickRef.current = { id: null, time: 0 };
          setSelectedNodeId(nodeId);
          setShowInspector(true);
        } else {
          // Single click — toggle select
          lastClickRef.current = { id: nodeId, time: now };
          setSelectedNodeId(prev => {
            const newId = prev === nodeId ? null : nodeId;
            setShowInspector(!!newId);
            setSelectedConnectionId(null);
            return newId;
          });
        }
      }
    }

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }

  // ═══════════════════════════════════════════
  //  Connection drawing (port interactions)
  // ═══════════════════════════════════════════
  function handlePortMouseDown(e, nodeId, portType, portIdx) {
    e.stopPropagation();
    if (portType !== 'output') return;
    const svg = svgRef.current;
    const pos = positions[nodeId] || { x: 0, y: 0 };
    const dim = getNodeDimensions(nodes.find(n => n.id === nodeId)?.node_type || 'DATA');
    const startX = pos.x + dim.w / 2;
    const startY = pos.y;
    setDrawing({ fromNodeId: nodeId, fromPortType: portType, fromPortIdx: portIdx, mouseX: startX, mouseY: startY });
  }

  function handlePortMouseUp(e, nodeId, portType, portIdx) {
    e.stopPropagation();
    if (!drawing || portType !== 'input') return;
    if (drawing.fromNodeId === nodeId) { setDrawing(null); return; } // No self-connections

    // Check if connection already exists
    const exists = connections.some(c =>
      c.source_node_id === drawing.fromNodeId && c.target_node_id === nodeId
    );
    if (!exists) {
      createConnection(drawing.fromNodeId, nodeId);
    }
    setDrawing(null);
  }

  async function createConnection(sourceId, targetId) {
    try {
      await api.createWorkflowConnection({
        workflow_id: workflowId,
        source_node_id: sourceId,
        target_node_id: targetId,
        data_type: 'default',
        required: 1,
      });
      const wfConns = await api.getWorkflowConnections(workflowId);
      setConnections(wfConns);
    } catch (err) {
      console.error('Failed to create connection:', err);
    }
  }

  // ═══════════════════════════════════════════
  //  Node CRUD
  // ═══════════════════════════════════════════
  function handleAddNode(nodeType, nodeSubtype) {
    if (nodeType === 'DATA') {
      // Open resource picker first
      setPendingNodeType({ type: nodeType, subtype: nodeSubtype });
      setShowResourcePicker(true);
    } else {
      // PROCESS / OUTPUT — create directly
      doCreateNode(nodeType, nodeSubtype);
    }
  }

  function handleResourceSelected(entry) {
    if (!pendingNodeType) return;
    doCreateNode(pendingNodeType.type, pendingNodeType.subtype, entry);
    setPendingNodeType(null);
  }

  async function doCreateNode(nodeType, nodeSubtype, resourceEntry = null) {
    const subtypeInfo = NODE_SUBTYPES[nodeSubtype] || { label: nodeSubtype };
    // Place new node near center of current viewport
    const cx = viewBox.x + viewBox.w / 2 + (Math.random() * 100 - 50);
    const cy = viewBox.y + viewBox.h / 2 + (Math.random() * 100 - 50);

    const nodeData = {
      workflow_id: workflowId,
      node_type: nodeType,
      node_subtype: nodeSubtype,
      label: resourceEntry ? resourceEntry.name : subtypeInfo.label,
      position_x: Math.round(cx),
      position_y: Math.round(cy),
      config: '{}',
      resource_ref: resourceEntry ? JSON.stringify({
        catalogId: resourceEntry.id,
        name: resourceEntry.name,
        type: resourceEntry.resource_type,
        sourceSystem: resourceEntry.source_system,
        sourceId: resourceEntry.source_id,
        versionId: resourceEntry.version_id,
      }) : null,
      status: 'pending',
    };

    try {
      const created = await api.createWorkflowNode(nodeData);
      setNodes(prev => [...prev, created]);
      setPositions(prev => ({ ...prev, [created.id]: { x: nodeData.position_x, y: nodeData.position_y } }));
      // Select the new node
      setSelectedNodeId(created.id);
      setShowInspector(true);
    } catch (err) {
      console.error('Failed to create node:', err);
    }
  }

  async function handleUpdateNode(updates) {
    if (!selectedNodeId) return;
    try {
      await api.updateWorkflowNode(selectedNodeId, updates);
      setNodes(prev => prev.map(n => n.id === selectedNodeId ? { ...n, ...updates } : n));
    } catch (err) {
      console.error('Failed to update node:', err);
    }
  }

  async function handleDeleteNode() {
    if (!selectedNodeId) return;
    try {
      await api.deleteWorkflowNode(selectedNodeId);
      setNodes(prev => prev.filter(n => n.id !== selectedNodeId));
      setConnections(prev => prev.filter(c => c.source_node_id !== selectedNodeId && c.target_node_id !== selectedNodeId));
      setPositions(prev => { const p = { ...prev }; delete p[selectedNodeId]; return p; });
      setSelectedNodeId(null);
      setShowInspector(false);
    } catch (err) {
      console.error('Failed to delete node:', err);
    }
    setShowDeleteNode(false);
  }

  // ── Node status update (from run panel) ────
  function handleNodeStatusChange(nodeId, status) {
    setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, status } : n));
  }

  // ── Connection CRUD ────────────────────────
  function handleConnectionClick(connId) {
    setSelectedConnectionId(prev => prev === connId ? null : connId);
    setSelectedNodeId(null);
    setShowInspector(false);
  }

  async function handleDeleteConnection() {
    if (!selectedConnectionId) return;
    try {
      await api.deleteWorkflowConnection(selectedConnectionId);
      setConnections(prev => prev.filter(c => c.id !== selectedConnectionId));
      setSelectedConnectionId(null);
    } catch (err) {
      console.error('Failed to delete connection:', err);
    }
    setShowDeleteConn(false);
  }

  // ═══════════════════════════════════════════
  //  Zoom controls
  // ═══════════════════════════════════════════
  function zoomIn() {
    setViewBox(prev => {
      const nw = prev.w * 0.85, nh = prev.h * 0.85;
      return { x: prev.x + (prev.w - nw) / 2, y: prev.y + (prev.h - nh) / 2, w: nw, h: nh };
    });
  }
  function zoomOut() {
    setViewBox(prev => {
      const nw = prev.w * 1.18, nh = prev.h * 1.18;
      if (nw > 10000) return prev;
      return { x: prev.x + (prev.w - nw) / 2, y: prev.y + (prev.h - nh) / 2, w: nw, h: nh };
    });
  }
  function fitToContent() {
    if (nodes.length === 0) return;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    nodes.forEach(n => {
      const p = positions[n.id] || { x: 0, y: 0 };
      const dim = getNodeDimensions(n.node_type);
      minX = Math.min(minX, p.x - dim.w / 2);
      minY = Math.min(minY, p.y - dim.h / 2);
      maxX = Math.max(maxX, p.x + dim.w / 2);
      maxY = Math.max(maxY, p.y + dim.h / 2);
    });
    const pad = 100;
    setViewBox({ x: minX - pad, y: minY - pad, w: maxX - minX + pad * 2, h: maxY - minY + pad * 2 });
  }

  // ═══════════════════════════════════════════
  //  Keyboard shortcuts
  // ═══════════════════════════════════════════
  useEffect(() => {
    function onKey(e) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedConnectionId) setShowDeleteConn(true);
        else if (selectedNodeId) setShowDeleteNode(true);
      }
      if (e.key === 'Escape') {
        setSelectedNodeId(null);
        setSelectedConnectionId(null);
        setShowInspector(false);
        setDrawing(null);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedNodeId, selectedConnectionId]);

  // ═══════════════════════════════════════════
  //  Derived
  // ═══════════════════════════════════════════
  const selectedNode = nodes.find(n => n.id === selectedNodeId);
  const existingResourceIds = useMemo(() =>
    nodes.filter(n => n.resource_ref).map(n => {
      const ref = parseJson(n.resource_ref, null);
      return ref?.catalogId;
    }).filter(Boolean),
    [nodes]
  );

  // ═══════════════════════════════════════════
  //  Render
  // ═══════════════════════════════════════════
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin w-6 h-6 border-2 border-accent-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!workflow) {
    return (
      <div className="flex items-center justify-center h-full text-t-4">
        <div className="text-center">
          <p className="text-sm">Workflow not found.</p>
          <button className="btn-primary mt-3 text-xs" onClick={() => navigate('/workflows')}>
            <ArrowLeft className="w-3.5 h-3.5 mr-1.5" /> Back to Workflows
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full -m-6">
      {/* Left — Node Palette */}
      <NodePalette
        onAddNode={handleAddNode}
        collapsed={paletteCollapsed}
        onToggle={() => setPaletteCollapsed(prev => !prev)}
      />

      {/* Center — Canvas */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-s-6/30 bg-s-2 shrink-0">
          <div className="flex items-center gap-2">
            <button onClick={() => navigate('/workflows')} className="p-1.5 rounded-md hover:bg-s-4 text-t-4 hover:text-t-2">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-1.5">
              <Workflow className="w-4 h-4 text-accent-400" />
              <span className="text-sm font-semibold text-t-1 truncate max-w-[200px]">{workflow.name}</span>
            </div>
            <span className="text-[10px] text-t-4 bg-s-4/60 px-2 py-0.5 rounded-full">
              {nodes.length} node{nodes.length !== 1 ? 's' : ''} · {connections.length} connection{connections.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={fitToContent} className="btn-ghost text-xs flex items-center gap-1" title="Fit to content">
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
            <button onClick={zoomIn} className="btn-ghost text-xs p-1.5" title="Zoom in">
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button onClick={zoomOut} className="btn-ghost text-xs p-1.5" title="Zoom out">
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <div className="w-px h-5 bg-s-6/30 mx-1" />
            {selectedConnectionId && (
              <button onClick={() => setShowDeleteConn(true)}
                className="btn-ghost text-xs text-red-400 flex items-center gap-1" title="Delete connection">
                <Trash2 className="w-3.5 h-3.5" /> Delete Link
              </button>
            )}
          </div>
        </div>

        {/* SVG Canvas */}
        <div className="flex-1 relative overflow-hidden bg-s-0">
          {/* Dot grid background */}
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(circle,rgba(255,255,255,0.5) 1px,transparent 1px)',
              backgroundSize: '40px 40px',
            }}
          />

          <svg
            ref={svgRef}
            className="w-full h-full relative"
            viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
            onMouseDown={handlePanStart}
            onMouseMove={handlePanMove}
            onMouseUp={handlePanEnd}
            onMouseLeave={handlePanEnd}
            style={{ cursor: isPanning ? 'grabbing' : drawing ? 'crosshair' : 'default' }}
          >
            {/* Background rect for hit testing */}
            <rect
              className="canvas-bg"
              x={viewBox.x} y={viewBox.y} width={viewBox.w} height={viewBox.h}
              fill="transparent"
            />

            {/* Connections */}
            {connections.map(c => {
              const fromNode = nodes.find(n => n.id === c.source_node_id);
              const toNode = nodes.find(n => n.id === c.target_node_id);
              return (
                <ConnectionLine
                  key={c.id}
                  connection={c}
                  fromNode={fromNode}
                  toNode={toNode}
                  fromPos={positions[c.source_node_id]}
                  toPos={positions[c.target_node_id]}
                  isSelected={selectedConnectionId === c.id}
                  onClick={() => handleConnectionClick(c.id)}
                />
              );
            })}

            {/* In-progress connection line */}
            {drawing && (() => {
              const fromPos = positions[drawing.fromNodeId];
              const fromNode = nodes.find(n => n.id === drawing.fromNodeId);
              if (!fromPos || !fromNode) return null;
              const dim = getNodeDimensions(fromNode.node_type);
              const startX = fromPos.x + dim.w / 2;
              const startY = fromPos.y;
              const path = buildConnectionPath(startX, startY, drawing.mouseX, drawing.mouseY);
              return (
                <path d={path} fill="none" stroke="rgba(139,92,246,0.5)" strokeWidth={1.5}
                  strokeDasharray="6 4" pointerEvents="none" />
              );
            })()}

            {/* Nodes */}
            {nodes.map(node => (
              <WorkflowNode
                key={node.id}
                node={node}
                pos={positions[node.id] || { x: 0, y: 0 }}
                isSelected={selectedNodeId === node.id}
                showPorts={hoveredNodeId === node.id || selectedNodeId === node.id || !!drawing}
                onMouseDown={e => handleNodeMouseDown(node.id, e)}
                onMouseEnter={() => setHoveredNodeId(node.id)}
                onMouseLeave={() => setHoveredNodeId(prev => prev === node.id ? null : prev)}
                onPortMouseDown={handlePortMouseDown}
                onPortMouseUp={handlePortMouseUp}
              />
            ))}

            {/* Empty state */}
            {nodes.length === 0 && (
              <text x={viewBox.x + viewBox.w / 2} y={viewBox.y + viewBox.h / 2}
                textAnchor="middle" fill="#5c5c6a" fontSize={14} fontFamily="Inter,sans-serif">
                Click a node type in the palette to start building your workflow.
              </text>
            )}
          </svg>

          {/* Node hover detection overlay (transparent, in DOM space) */}
          {/* We'll handle hover via onMouseEnter on the WorkflowNode's <g> */}
        </div>
      </div>

      {/* Right — Node Inspector */}
      {showInspector && selectedNode && (
        <NodeInspector
          node={selectedNode}
          connections={connections}
          allNodes={nodes}
          onClose={() => { setShowInspector(false); setSelectedNodeId(null); }}
          onUpdate={handleUpdateNode}
          onDelete={() => setShowDeleteNode(true)}
        />
      )}

      {/* Resource Picker modal */}
      <ResourcePicker
        isOpen={showResourcePicker}
        onClose={() => { setShowResourcePicker(false); setPendingNodeType(null); }}
        onSelect={handleResourceSelected}
        excludeIds={existingResourceIds}
      />

      {/* Delete node confirm */}
      <ConfirmDialog
        isOpen={showDeleteNode}
        onClose={() => setShowDeleteNode(false)}
        onConfirm={handleDeleteNode}
        title="Delete Node"
        message={`Delete "${selectedNode?.label}"? Its connections will also be removed. This cannot be undone.`}
      />

      {/* Delete connection confirm */}
      <ConfirmDialog
        isOpen={showDeleteConn}
        onClose={() => setShowDeleteConn(false)}
        onConfirm={handleDeleteConnection}
        title="Delete Connection"
        message="Delete this connection? This cannot be undone."
      />

      {/* Workflow Run Panel (bottom) */}
      <WorkflowRunPanel
        workflowId={workflowId}
        nodes={nodes}
        connections={connections}
        isOpen={showRunPanel}
        onToggle={() => setShowRunPanel(prev => !prev)}
        onNodeStatusChange={handleNodeStatusChange}
      />
    </div>
  );
}
