import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Save, Copy, ChevronLeft, ChevronRight,
  Camera, Move, Clock, FileText, Sparkles, CheckCircle2,
  XCircle, AlertCircle
} from 'lucide-react';
import PageHeader from '../../components/Layout/PageHeader';
import StatusBadge from '../../components/common/StatusBadge';
import { SHOT_DURATIONS, formatStatus } from '../../utils/helpers';

const api = window.api;

const SHOT_STATUSES = ['draft', 'prompt_ready', 'generating', 'generated', 'review', 'approved', 'rejected', 'final'];

export default function ShotWorkspace() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [shot, setShot] = useState(null);
  const [scene, setScene] = useState(null);
  const [siblings, setSiblings] = useState([]);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const [form, setForm] = useState({});

  useEffect(() => { load(); }, [id]);

  async function load() {
    const s = await api.getShot(id);
    if (!s) return;
    setShot(s);
    setForm({
      description: s.description || '',
      script_line: s.script_line || '',
      duration: s.duration || 6,
      camera_angle: s.camera_angle || '',
      camera_movement: s.camera_movement || '',
      motion_description: s.motion_description || '',
      environment_ref: s.environment_ref || '',
      prompt: s.prompt || '',
      negative_prompt: s.negative_prompt || '',
      ai_tool: s.ai_tool || '',
      ai_output_url: s.ai_output_url || '',
      review_notes: s.review_notes || '',
      status: s.status,
    });

    const sc = await api.getScene(s.scene_id);
    setScene(sc);
    const allShots = await api.getShots(s.scene_id);
    setSiblings(allShots.sort((a, b) => a.shot_number - b.shot_number));
  }

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  async function handleSave() {
    setSaving(true);
    await api.updateShot(id, form);
    setSaving(false);
    setShot(prev => ({ ...prev, ...form }));
  }

  async function copyPrompt() {
    if (form.prompt) {
      await navigator.clipboard?.writeText(form.prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  function goToShot(direction) {
    const idx = siblings.findIndex(s => s.id === id);
    const target = siblings[idx + direction];
    if (target) navigate(`/production/shot/${target.id}`);
  }

  if (!shot) return <div className="text-t-4">Loading...</div>;

  const currentIdx = siblings.findIndex(s => s.id === id);

  return (
    <div className="max-w-5xl">
      {/* Navigation */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => navigate('/production')} className="btn-ghost flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Production
        </button>
        <div className="flex items-center gap-2">
          <button className="btn-icon" disabled={currentIdx <= 0} onClick={() => goToShot(-1)}>
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs text-t-3">Shot {currentIdx + 1} / {siblings.length}</span>
          <button className="btn-icon" disabled={currentIdx >= siblings.length - 1} onClick={() => goToShot(1)}>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <PageHeader
        title={`Shot ${String(shot.shot_number).padStart(2, '0')}`}
        subtitle={scene ? `Scene ${String(scene.scene_number).padStart(2, '0')} — ${scene.title || scene.location || ''}` : ''}
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge status={form.status} />
            <button className="btn-primary flex items-center gap-2" onClick={handleSave} disabled={saving}>
              <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-3 gap-5">
        {/* Left column — Shot details */}
        <div className="col-span-2 space-y-4">
          {/* Description & Script */}
          <div className="card">
            <h3 className="text-2xs font-semibold text-t-3 uppercase tracking-[0.12em] mb-3 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" /> Script & Description
            </h3>
            <div className="space-y-3">
              <div>
                <label className="label">Shot Description</label>
                <textarea className="textarea" value={form.description} onChange={(e) => set('description', e.target.value)} rows={3} placeholder="What happens in this shot..." />
              </div>
              <div>
                <label className="label">Script / Dialogue Line</label>
                <textarea className="textarea" value={form.script_line} onChange={(e) => set('script_line', e.target.value)} rows={2} placeholder="Dialogue or narration for this shot..." />
              </div>
            </div>
          </div>

          {/* Camera & Motion */}
          <div className="card">
            <h3 className="text-2xs font-semibold text-t-3 uppercase tracking-[0.12em] mb-3 flex items-center gap-1.5">
              <Camera className="w-3.5 h-3.5" /> Camera & Motion
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Camera Angle</label>
                <input className="input" value={form.camera_angle} onChange={(e) => set('camera_angle', e.target.value)} placeholder="Close-up, Wide, Over-shoulder..." />
              </div>
              <div>
                <label className="label">Camera Movement</label>
                <input className="input" value={form.camera_movement} onChange={(e) => set('camera_movement', e.target.value)} placeholder="Pan, Dolly, Static, Orbit..." />
              </div>
            </div>
            <div className="mt-3">
              <label className="label">Motion Description</label>
              <textarea className="textarea" value={form.motion_description} onChange={(e) => set('motion_description', e.target.value)} rows={2} placeholder="Describe character/object motion in the shot..." />
            </div>
          </div>

          {/* AI Prompt */}
          <div className="card-accent">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-2xs font-semibold text-accent-400 uppercase tracking-[0.12em] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> AI Generation
              </h3>
              <button className="btn-ghost text-xs flex items-center gap-1" onClick={copyPrompt}>
                <Copy className="w-3 h-3" /> {copied ? 'Copied!' : 'Copy Prompt'}
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="label">Prompt</label>
                <textarea className="textarea font-mono text-xs" value={form.prompt} onChange={(e) => set('prompt', e.target.value)} rows={5} placeholder="Full AI generation prompt for this shot..." />
              </div>
              <div>
                <label className="label">Negative Prompt</label>
                <textarea className="textarea font-mono text-xs" value={form.negative_prompt} onChange={(e) => set('negative_prompt', e.target.value)} rows={2} placeholder="What to avoid..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">AI Tool</label>
                  <input className="input" value={form.ai_tool} onChange={(e) => set('ai_tool', e.target.value)} placeholder="Runway, Kling, Pika..." />
                </div>
                <div>
                  <label className="label">Output URL / Path</label>
                  <input className="input" value={form.ai_output_url} onChange={(e) => set('ai_output_url', e.target.value)} placeholder="Link or path to generated clip" />
                </div>
              </div>
            </div>
          </div>

          {/* Review */}
          <div className="card">
            <h3 className="text-2xs font-semibold text-t-3 uppercase tracking-[0.12em] mb-3">Review Notes</h3>
            <textarea className="textarea" value={form.review_notes} onChange={(e) => set('review_notes', e.target.value)} rows={3} placeholder="Notes from review: what needs to change, what's good..." />
          </div>
        </div>

        {/* Right column — Status & metadata */}
        <div className="space-y-4">
          {/* Duration */}
          <div className="card">
            <h3 className="text-2xs font-semibold text-t-3 uppercase tracking-[0.12em] mb-3 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" /> Duration
            </h3>
            <div className="flex gap-2">
              {SHOT_DURATIONS.map((d) => (
                <button
                  key={d}
                  onClick={() => set('duration', d)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-mono font-medium transition-all duration-200 ${
                    form.duration === d
                      ? 'bg-accent-600 text-white shadow-glow-sm'
                      : 'bg-s-4/60 text-t-3 hover:text-t-1'
                  }`}
                >
                  {d}s
                </button>
              ))}
            </div>
          </div>

          {/* Status */}
          <div className="card">
            <h3 className="text-2xs font-semibold text-t-3 uppercase tracking-[0.12em] mb-3">Status</h3>
            <div className="space-y-1">
              {SHOT_STATUSES.map((s) => (
                <button
                  key={s}
                  onClick={() => set('status', s)}
                  className={`w-full text-left px-3 py-1.5 rounded-xl text-xs transition-all duration-200 flex items-center gap-2 ${
                    form.status === s
                      ? 'bg-accent-600/15 text-accent-400 font-medium'
                      : 'text-t-3 hover:bg-s-4/50'
                  }`}
                >
                  {s === 'final' && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                  {s === 'rejected' && <XCircle className="w-3 h-3 text-red-400" />}
                  {s === 'review' && <AlertCircle className="w-3 h-3 text-amber-400" />}
                  {formatStatus(s)}
                </button>
              ))}
            </div>
          </div>

          {/* Environment ref */}
          <div className="card">
            <h3 className="text-2xs font-semibold text-t-3 uppercase tracking-[0.12em] mb-3">Environment</h3>
            <input className="input" value={form.environment_ref} onChange={(e) => set('environment_ref', e.target.value)} placeholder="Reference to visual asset..." />
          </div>

          {/* Shot navigation */}
          <div className="card">
            <h3 className="text-2xs font-semibold text-t-3 uppercase tracking-[0.12em] mb-3">Shots in Scene</h3>
            <div className="space-y-1">
              {siblings.map((s) => (
                <button
                  key={s.id}
                  onClick={() => navigate(`/production/shot/${s.id}`)}
                  className={`w-full text-left px-3 py-1.5 rounded-xl text-xs transition-all duration-200 flex items-center justify-between ${
                    s.id === id ? 'bg-accent-600/15 text-accent-400' : 'text-t-3 hover:bg-s-4/50'
                  }`}
                >
                  <span>Shot {String(s.shot_number).padStart(2, '0')} · {s.duration}s</span>
                  <StatusBadge status={s.status} />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
