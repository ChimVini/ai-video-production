import React, { useState, useEffect } from 'react';
import {
  Link2, ChevronDown, ChevronRight, CheckCircle, AlertTriangle,
  XCircle, Clock, Plus, MapPin, Eye, Camera, Sun, Package, Compass
} from 'lucide-react';
import PageHeader from '../../components/Layout/PageHeader';
import EmptyState from '../../components/common/EmptyState';
import { CONTINUITY_CHECK_TYPES, SPATIAL_ELEMENT_TYPES, formatDate } from '../../utils/helpers';

const api = window.api;

const STATUS_CONFIG = {
  pending:  { icon: Clock, color: 'text-yellow-400', bg: 'bg-yellow-500/15' },
  passed:   { icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/15' },
  failed:   { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/15' },
  waived:   { icon: Eye, color: 'text-t-4', bg: 'bg-s-4' },
};

const SPATIAL_ICONS = {
  character_position: MapPin,
  object_position: Package,
  door_window: Compass,
  camera_axis: Camera,
  lighting_source: Sun,
  prop: Package,
};

export default function ContinuityPage() {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [scenes, setScenes] = useState([]);
  const [selectedScene, setSelectedScene] = useState('');
  const [tab, setTab] = useState('ledger'); // ledger | spatial
  const [ledger, setLedger] = useState([]);
  const [spatial, setSpatial] = useState([]);
  const [summary, setSummary] = useState(null);
  const [showCreateLedger, setShowCreateLedger] = useState(false);
  const [showCreateSpatial, setShowCreateSpatial] = useState(false);

  useEffect(() => { loadProjects(); }, []);
  useEffect(() => { if (selectedProject) loadScenes(); }, [selectedProject]);
  useEffect(() => { if (selectedScene) loadData(); }, [selectedScene, tab]);

  async function loadProjects() {
    const data = await api.getProjects();
    setProjects(data);
    if (data.length > 0) setSelectedProject(data[0].id);
  }

  async function loadScenes() {
    const data = await api.getScenes(selectedProject);
    setScenes(data);
    if (data.length > 0) setSelectedScene(data[0].id);
  }

  async function loadData() {
    if (tab === 'ledger') {
      const [l, s] = await Promise.all([
        api.getContinuityLedger(selectedProject, selectedScene),
        api.getContinuityLedgerSummary(selectedProject, selectedScene),
      ]);
      setLedger(l);
      setSummary(s);
    } else {
      const sp = await api.getSpatialContinuity(selectedProject, selectedScene);
      setSpatial(sp);
    }
  }

  async function handleStatusUpdate(id, newStatus) {
    await api.updateContinuityStatus(id, {
      status: newStatus,
      resolved_at: newStatus === 'passed' || newStatus === 'waived' ? new Date().toISOString() : null,
      resolved_by: newStatus === 'passed' || newStatus === 'waived' ? 'user' : '',
    });
    loadData();
  }

  async function handleDeleteSpatial(id) {
    await api.deleteSpatialContinuity(id);
    loadData();
  }

  return (
    <div className="w-full">
      <PageHeader
        title="Continuity Management"
        subtitle="Track visual and spatial continuity between consecutive shots"
      />

      {/* Filters */}
      <div className="flex items-center gap-3 mb-5">
        <select className="select" value={selectedProject} onChange={(e) => setSelectedProject(e.target.value)}>
          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select className="select" value={selectedScene} onChange={(e) => setSelectedScene(e.target.value)}>
          {scenes.map(s => <option key={s.id} value={s.id}>Scene {s.scene_number} — {s.title || s.description?.slice(0, 30) || 'Untitled'}</option>)}
        </select>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 border-b border-s-5/30">
        <button
          className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors ${
            tab === 'ledger' ? 'border-accent-500 text-accent-400' : 'border-transparent text-t-4 hover:text-t-2'
          }`}
          onClick={() => setTab('ledger')}
        >
          <Link2 className="w-3.5 h-3.5 inline mr-1.5" />
          Continuity Ledger
        </button>
        <button
          className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors ${
            tab === 'spatial' ? 'border-accent-500 text-accent-400' : 'border-transparent text-t-4 hover:text-t-2'
          }`}
          onClick={() => setTab('spatial')}
        >
          <MapPin className="w-3.5 h-3.5 inline mr-1.5" />
          Spatial Continuity
        </button>
      </div>

      {/* Summary cards for ledger */}
      {tab === 'ledger' && summary && (
        <div className="grid grid-cols-4 gap-3 mb-5">
          {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
            const count = summary.find(s => s.status === key)?.count || 0;
            return (
              <div key={key} className="card flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg ${cfg.bg} flex items-center justify-center`}>
                  <cfg.icon className={`w-4 h-4 ${cfg.color}`} />
                </div>
                <div>
                  <div className="text-lg font-bold text-t-1">{count}</div>
                  <div className="text-2xs text-t-4 capitalize">{key}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Ledger tab content */}
      {tab === 'ledger' && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-t-2">Shot-to-Shot Checks</h3>
            <button className="btn-primary text-xs flex items-center gap-1.5" onClick={() => setShowCreateLedger(true)} disabled={!selectedScene}>
              <Plus className="w-3.5 h-3.5" /> New Check
            </button>
          </div>

          {ledger.length === 0 ? (
            <EmptyState icon={Link2} title="No continuity checks" description="Add checks to track consistency between consecutive shots." />
          ) : (
            <div className="space-y-2">
              {ledger.map(entry => {
                const cfg = STATUS_CONFIG[entry.status] || STATUS_CONFIG.pending;
                const checkType = CONTINUITY_CHECK_TYPES.find(t => t.value === entry.check_type);
                return (
                  <div key={entry.id} className="card">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <cfg.icon className={`w-4 h-4 ${cfg.color}`} />
                        <div>
                          <div className="text-xs font-medium text-t-1">
                            Shot {entry.shot_a_number || '?'} → Shot {entry.shot_b_number || '?'}
                          </div>
                          <div className="text-2xs text-t-4">
                            {checkType?.label || entry.check_type}
                            {entry.auto_detected ? ' (auto)' : ' (manual)'}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`badge ${cfg.bg} ${cfg.color} text-[10px]`}>{entry.status}</span>
                        {entry.status === 'pending' && (
                          <>
                            <button className="btn-ghost text-2xs text-green-400" onClick={() => handleStatusUpdate(entry.id, 'passed')}>Pass</button>
                            <button className="btn-ghost text-2xs text-red-400" onClick={() => handleStatusUpdate(entry.id, 'failed')}>Fail</button>
                          </>
                        )}
                        {entry.status === 'failed' && (
                          <button className="btn-ghost text-2xs text-t-3" onClick={() => handleStatusUpdate(entry.id, 'waived')}>Waive</button>
                        )}
                      </div>
                    </div>
                    {entry.details && <p className="text-2xs text-t-3 mt-1.5 ml-7">{entry.details}</p>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Spatial tab content */}
      {tab === 'spatial' && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-t-2">Spatial Element Tracking</h3>
            <button className="btn-primary text-xs flex items-center gap-1.5" onClick={() => setShowCreateSpatial(true)} disabled={!selectedScene}>
              <Plus className="w-3.5 h-3.5" /> Track Element
            </button>
          </div>

          {spatial.length === 0 ? (
            <EmptyState icon={MapPin} title="No spatial data" description="Track positions of characters, objects, and camera across shots." />
          ) : (
            <div className="space-y-2">
              {spatial.map(sp => {
                const IconComp = SPATIAL_ICONS[sp.element_type] || MapPin;
                const typeInfo = SPATIAL_ELEMENT_TYPES.find(t => t.value === sp.element_type);
                const csColor = sp.continuity_status === 'consistent' ? 'text-green-400' :
                  sp.continuity_status === 'intentional_change' ? 'text-accent-400' :
                  sp.continuity_status === 'error' ? 'text-red-400' : 'text-t-4';
                let posData;
                try { posData = JSON.parse(sp.position_data); } catch { posData = sp.position_data; }
                return (
                  <div key={sp.id} className="card">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <IconComp className="w-4 h-4 text-accent-400" />
                        <div>
                          <div className="text-xs font-medium text-t-1">{sp.element_name}</div>
                          <div className="text-2xs text-t-4">{typeInfo?.label || sp.element_type}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-2xs font-medium ${csColor}`}>{sp.continuity_status}</span>
                        <button className="btn-icon text-red-400" onClick={() => handleDeleteSpatial(sp.id)}>
                          <XCircle className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    {posData && (
                      <div className="text-2xs text-t-3 mt-1.5 ml-7 font-mono">
                        {typeof posData === 'object' ? JSON.stringify(posData) : posData}
                      </div>
                    )}
                    {sp.notes && <p className="text-2xs text-t-4 mt-1 ml-7 italic">{sp.notes}</p>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Create Ledger Entry Modal */}
      {showCreateLedger && (
        <CreateLedgerModal
          projectId={selectedProject}
          sceneId={selectedScene}
          onClose={() => setShowCreateLedger(false)}
          onCreated={() => { setShowCreateLedger(false); loadData(); }}
        />
      )}

      {/* Create Spatial Entry Modal */}
      {showCreateSpatial && (
        <CreateSpatialModal
          projectId={selectedProject}
          sceneId={selectedScene}
          onClose={() => setShowCreateSpatial(false)}
          onCreated={() => { setShowCreateSpatial(false); loadData(); }}
        />
      )}
    </div>
  );
}

/* ---- Create Ledger Modal ---- */
function CreateLedgerModal({ projectId, sceneId, onClose, onCreated }) {
  const [shots, setShots] = useState([]);
  const [form, setForm] = useState({ shot_a_id: '', shot_b_id: '', check_type: 'character_appearance', details: '' });

  useEffect(() => {
    api.getShots(sceneId).then(setShots);
  }, [sceneId]);

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.shot_a_id || !form.shot_b_id) return;
    await api.createContinuityEntry({
      project_id: projectId,
      scene_id: sceneId,
      ...form,
      status: 'pending',
      auto_detected: 0,
    });
    onCreated();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="card w-full max-w-md">
        <h3 className="text-sm font-semibold text-t-1 mb-3">New Continuity Check</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Shot A</label>
              <select className="select w-full" value={form.shot_a_id} onChange={(e) => set('shot_a_id', e.target.value)}>
                <option value="">Select...</option>
                {shots.map(s => <option key={s.id} value={s.id}>Shot {s.shot_number}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Shot B</label>
              <select className="select w-full" value={form.shot_b_id} onChange={(e) => set('shot_b_id', e.target.value)}>
                <option value="">Select...</option>
                {shots.map(s => <option key={s.id} value={s.id}>Shot {s.shot_number}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="label">Check Type</label>
            <select className="select w-full" value={form.check_type} onChange={(e) => set('check_type', e.target.value)}>
              {CONTINUITY_CHECK_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Details</label>
            <textarea className="textarea" value={form.details} onChange={(e) => set('details', e.target.value)} rows={2} placeholder="Describe what to check..." />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary">Create</button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ---- Create Spatial Modal ---- */
function CreateSpatialModal({ projectId, sceneId, onClose, onCreated }) {
  const [shots, setShots] = useState([]);
  const [form, setForm] = useState({
    shot_id: '', element_type: 'character_position', element_name: '',
    position_data: '{}', orientation: '', frame_of_reference: '',
    previous_shot_id: '', continuity_status: 'unverified', notes: '',
  });

  useEffect(() => {
    api.getShots(sceneId).then(setShots);
  }, [sceneId]);

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.shot_id || !form.element_name) return;
    await api.createSpatialContinuity({
      project_id: projectId,
      scene_id: sceneId,
      ...form,
    });
    onCreated();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="card w-full max-w-md">
        <h3 className="text-sm font-semibold text-t-1 mb-3">Track Spatial Element</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Shot</label>
              <select className="select w-full" value={form.shot_id} onChange={(e) => set('shot_id', e.target.value)}>
                <option value="">Select...</option>
                {shots.map(s => <option key={s.id} value={s.id}>Shot {s.shot_number}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Element Type</label>
              <select className="select w-full" value={form.element_type} onChange={(e) => set('element_type', e.target.value)}>
                {SPATIAL_ELEMENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="label">Element Name</label>
            <input className="input" value={form.element_name} onChange={(e) => set('element_name', e.target.value)} placeholder="e.g. Character A, Desk, Camera" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Position Data (JSON)</label>
              <input className="input font-mono text-xs" value={form.position_data} onChange={(e) => set('position_data', e.target.value)} placeholder='{"x": 0, "y": 0}' />
            </div>
            <div>
              <label className="label">Orientation</label>
              <input className="input" value={form.orientation} onChange={(e) => set('orientation', e.target.value)} placeholder="e.g. facing left" />
            </div>
          </div>
          <div>
            <label className="label">Continuity Status</label>
            <select className="select w-full" value={form.continuity_status} onChange={(e) => set('continuity_status', e.target.value)}>
              {['unverified', 'consistent', 'intentional_change', 'error'].map(s =>
                <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
              )}
            </select>
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea className="textarea" value={form.notes} onChange={(e) => set('notes', e.target.value)} rows={2} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary">Create</button>
          </div>
        </form>
      </div>
    </div>
  );
}
