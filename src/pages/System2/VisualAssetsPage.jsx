import React, { useState, useEffect } from 'react';
import { Plus, Palette, Trash2, Edit3, Image } from 'lucide-react';
import PageHeader from '../../components/Layout/PageHeader';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import StatusBadge from '../../components/common/StatusBadge';
import EmptyState from '../../components/common/EmptyState';
import { VISUAL_ASSET_CATEGORIES } from '../../utils/helpers';

const api = window.api;

export default function VisualAssetsPage() {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [assets, setAssets] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [filterCat, setFilterCat] = useState('all');

  useEffect(() => { loadProjects(); }, []);
  useEffect(() => { if (selectedProject) loadAssets(); }, [selectedProject]);

  async function loadProjects() {
    const data = await api.getProjects();
    setProjects(data);
    if (data.length > 0) setSelectedProject(data[0].id);
  }
  async function loadAssets() {
    setAssets(await api.getVisualAssets(selectedProject));
  }
  async function handleDelete() {
    await api.deleteVisualAsset(deleting.id);
    setDeleting(null);
    loadAssets();
  }

  const filtered = filterCat === 'all' ? assets : assets.filter(a => a.category === filterCat);
  const catLabel = (cat) => VISUAL_ASSET_CATEGORIES.find(c => c.value === cat)?.label || cat;

  const catColors = {
    character_design: 'bg-accent-600/20 text-accent-400',
    environment: 'bg-emerald-600/20 text-emerald-400',
    architecture: 'bg-amber-600/20 text-amber-400',
    prop: 'bg-purple-600/20 text-purple-400',
    costume: 'bg-pink-600/20 text-pink-400',
    color_palette: 'bg-cyan-600/20 text-cyan-400',
    style_guide: 'bg-rose-600/20 text-rose-400',
  };

  return (
    <div className="max-w-5xl">
      <PageHeader
        title="Visual Assets"
        subtitle="System 2 — Character Design, Environments, Architecture"
        actions={
          <button className="btn-primary flex items-center gap-2" onClick={() => setShowCreate(true)} disabled={!selectedProject}>
            <Plus className="w-4 h-4" /> New Asset
          </button>
        }
      />

      <div className="flex items-center gap-3 mb-5">
        <select className="select" value={selectedProject} onChange={(e) => setSelectedProject(e.target.value)}>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <div className="flex gap-1 flex-wrap">
          <button onClick={() => setFilterCat('all')} className={filterCat === 'all' ? 'chip-active' : 'chip-default'}>All</button>
          {VISUAL_ASSET_CATEGORIES.map((c) => (
            <button key={c.value} onClick={() => setFilterCat(c.value)} className={filterCat === c.value ? 'chip-active' : 'chip-default'}>
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Palette} title="No visual assets yet" description="Create character designs, environments, and other visual assets." />
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {filtered.map((asset) => (
            <div key={asset.id} className="card">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${catColors[asset.category] || 'bg-s-4 text-t-4'}`}>
                    <Image className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-t-1">{asset.name}</h3>
                    <span className="text-[10px] text-t-4">{catLabel(asset.category)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <StatusBadge status={asset.status} />
                  <button className="btn-icon" onClick={() => setEditing(asset)}><Edit3 className="w-3.5 h-3.5" /></button>
                  <button className="btn-icon text-red-400" onClick={() => setDeleting(asset)}><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
              {asset.description && <p className="text-xs text-t-3 mb-2">{asset.description}</p>}
              {asset.style_notes && <p className="text-xs text-t-4 italic">{asset.style_notes}</p>}
              {asset.prompt_used && (
                <div className="mt-2 p-2.5 bg-s-0 rounded-xl border border-s-6/30">
                  <span className="text-2xs text-t-4 block mb-0.5">Prompt Used</span>
                  <p className="text-xs text-t-2 font-mono">{asset.prompt_used}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <AssetModal
        isOpen={showCreate || !!editing}
        onClose={() => { setShowCreate(false); setEditing(null); }}
        projectId={selectedProject}
        asset={editing}
        onSaved={() => { setShowCreate(false); setEditing(null); loadAssets(); }}
      />
      <ConfirmDialog isOpen={!!deleting} onClose={() => setDeleting(null)} onConfirm={handleDelete} title="Delete Asset" message={`Delete "${deleting?.name}"?`} />
    </div>
  );
}

function AssetModal({ isOpen, onClose, projectId, asset, onSaved }) {
  const [form, setForm] = useState({
    category: 'character_design', name: '', description: '', tags: '[]',
    prompt_used: '', style_notes: '', status: 'draft',
  });

  useEffect(() => {
    if (asset) {
      setForm({
        category: asset.category, name: asset.name, description: asset.description || '',
        tags: asset.tags || '[]', prompt_used: asset.prompt_used || '',
        style_notes: asset.style_notes || '', status: asset.status,
      });
    } else {
      setForm({ category: 'character_design', name: '', description: '', tags: '[]', prompt_used: '', style_notes: '', status: 'draft' });
    }
  }, [asset, isOpen]);

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) return;
    if (asset) await api.updateVisualAsset(asset.id, form);
    else await api.createVisualAsset({ ...form, project_id: projectId });
    onSaved();
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={asset ? 'Edit Visual Asset' : 'New Visual Asset'} wide>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="label">Name</label>
            <input className="input" value={form.name} onChange={(e) => set('name', e.target.value)} autoFocus />
          </div>
          <div>
            <label className="label">Category</label>
            <select className="select w-full" value={form.category} onChange={(e) => set('category', e.target.value)}>
              {VISUAL_ASSET_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Status</label>
            <select className="select w-full" value={form.status} onChange={(e) => set('status', e.target.value)}>
              {['draft', 'in_progress', 'review', 'approved'].map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="label">Description</label>
          <textarea className="textarea" value={form.description} onChange={(e) => set('description', e.target.value)} rows={3} />
        </div>
        <div>
          <label className="label">Prompt Used (for reference)</label>
          <textarea className="textarea font-mono text-xs" value={form.prompt_used} onChange={(e) => set('prompt_used', e.target.value)} rows={3} />
        </div>
        <div>
          <label className="label">Style Notes</label>
          <textarea className="textarea" value={form.style_notes} onChange={(e) => set('style_notes', e.target.value)} rows={2} />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary">{asset ? 'Save' : 'Create'}</button>
        </div>
      </form>
    </Modal>
  );
}
