import React, { useState, useEffect } from 'react';
import { Plus, Library, Trash2, Edit3, Search, ExternalLink } from 'lucide-react';
import PageHeader from '../../components/Layout/PageHeader';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import EmptyState from '../../components/common/EmptyState';
import { RESOURCE_CATEGORIES } from '../../utils/helpers';

const api = window.api;

export default function ResourcesPage() {
  const [resources, setResources] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [filterCat, setFilterCat] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => { load(); }, [filterCat]);

  async function load() {
    const filters = filterCat !== 'all' ? { category: filterCat } : {};
    setResources(await api.getResources(filters));
  }

  async function handleDelete() {
    await api.deleteResource(deleting.id);
    setDeleting(null);
    load();
  }

  const filtered = search
    ? resources.filter(r => r.name.toLowerCase().includes(search.toLowerCase()) || r.description.toLowerCase().includes(search.toLowerCase()))
    : resources;

  const catLabel = (cat) => RESOURCE_CATEGORIES.find(c => c.value === cat)?.label || cat;

  const catColors = {
    prompt_template: 'bg-accent-600/20 text-accent-400',
    technique: 'bg-emerald-600/20 text-emerald-400',
    visual_style: 'bg-purple-600/20 text-purple-400',
    camera: 'bg-amber-600/20 text-amber-400',
    lighting: 'bg-yellow-600/20 text-yellow-400',
    storytelling: 'bg-cyan-600/20 text-cyan-400',
    character_ref: 'bg-pink-600/20 text-pink-400',
    ai_tool: 'bg-rose-600/20 text-rose-400',
    reference: 'bg-s-5/60 text-t-4',
    other: 'bg-s-4 text-t-4',
  };

  return (
    <div className="w-full">
      <PageHeader
        title="Resource Library"
        subtitle="Research & reference materials across all projects"
        actions={
          <button className="btn-primary flex items-center gap-2" onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4" /> Add Resource
          </button>
        }
      />

      <div className="flex items-center gap-3 mb-5">
        <div className="relative flex-1 max-w-xs">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-t-4" />
          <input className="input pl-9" placeholder="Search resources..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-1 flex-wrap">
          <button onClick={() => setFilterCat('all')} className={filterCat === 'all' ? 'chip-active' : 'chip-default'}>All</button>
          {RESOURCE_CATEGORIES.map((c) => (
            <button key={c.value} onClick={() => setFilterCat(c.value)} className={filterCat === c.value ? 'chip-active' : 'chip-default'}>
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Library} title="No resources yet" description="Add prompts, techniques, references, and more to your library." />
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {filtered.map((res) => (
            <div key={res.id} className="card">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={`badge ${catColors[res.category] || 'badge-gray'}`}>{catLabel(res.category)}</span>
                  <h3 className="text-sm font-medium text-t-1">{res.name}</h3>
                </div>
                <div className="flex items-center gap-1">
                  {res.source_url && (
                    <a href={res.source_url} target="_blank" rel="noreferrer" className="btn-ghost" onClick={(e) => e.stopPropagation()}>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                  <button className="btn-icon" onClick={() => setEditing(res)}><Edit3 className="w-3.5 h-3.5" /></button>
                  <button className="btn-icon text-red-400" onClick={() => setDeleting(res)}><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
              {res.description && <p className="text-xs text-t-3 mb-1">{res.description}</p>}
              {res.content && (
                <div className="mt-2 p-2.5 bg-s-0 rounded-xl border border-s-6/30">
                  <p className="text-xs text-t-2 font-mono line-clamp-4 whitespace-pre-wrap">{res.content}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <ResourceModal
        isOpen={showCreate || !!editing}
        onClose={() => { setShowCreate(false); setEditing(null); }}
        resource={editing}
        onSaved={() => { setShowCreate(false); setEditing(null); load(); }}
      />
      <ConfirmDialog isOpen={!!deleting} onClose={() => setDeleting(null)} onConfirm={handleDelete} title="Delete Resource" message={`Delete "${deleting?.name}"?`} />
    </div>
  );
}

function ResourceModal({ isOpen, onClose, resource, onSaved }) {
  const [form, setForm] = useState({
    category: 'prompt_template', name: '', description: '', content: '', tags: '[]', source_url: '',
  });

  useEffect(() => {
    if (resource) {
      setForm({
        category: resource.category, name: resource.name, description: resource.description || '',
        content: resource.content || '', tags: resource.tags || '[]', source_url: resource.source_url || '',
      });
    } else {
      setForm({ category: 'prompt_template', name: '', description: '', content: '', tags: '[]', source_url: '' });
    }
  }, [resource, isOpen]);

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) return;
    if (resource) await api.updateResource(resource.id, form);
    else await api.createResource(form);
    onSaved();
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={resource ? 'Edit Resource' : 'New Resource'} wide>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Name</label>
            <input className="input" value={form.name} onChange={(e) => set('name', e.target.value)} autoFocus />
          </div>
          <div>
            <label className="label">Category</label>
            <select className="select w-full" value={form.category} onChange={(e) => set('category', e.target.value)}>
              {RESOURCE_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="label">Description</label>
          <input className="input" value={form.description} onChange={(e) => set('description', e.target.value)} />
        </div>
        <div>
          <label className="label">Content</label>
          <textarea className="textarea font-mono text-xs" value={form.content} onChange={(e) => set('content', e.target.value)} rows={6} placeholder="Prompt template, technique details, notes..." />
        </div>
        <div>
          <label className="label">Source URL</label>
          <input className="input" value={form.source_url} onChange={(e) => set('source_url', e.target.value)} placeholder="https://..." />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary">{resource ? 'Save' : 'Create'}</button>
        </div>
      </form>
    </Modal>
  );
}
