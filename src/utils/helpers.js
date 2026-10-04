export const STATUS_COLORS = {
  // Production status
  idea: 'badge-gray',
  development: 'badge-blue',
  visual_development: 'badge-purple',
  planning: 'badge-yellow',
  generation: 'badge-cyan',
  editing: 'badge-yellow',
  completed: 'badge-green',
  // Publishing status
  not_published: 'badge-gray',
  scheduled: 'badge-yellow',
  published: 'badge-green',
  archived: 'badge-red',
  // Generic
  draft: 'badge-gray',
  in_progress: 'badge-purple',
  review: 'badge-yellow',
  approved: 'badge-green',
  // Shot status
  prompt_ready: 'badge-blue',
  generating: 'badge-cyan',
  generated: 'badge-yellow',
  rejected: 'badge-red',
  final: 'badge-green',
  planned: 'badge-blue',
  in_production: 'badge-purple',
};

// Dot colors for shot timeline
export const SHOT_DOT_COLORS = {
  draft: 'bg-t-4',
  prompt_ready: 'bg-blue-400',
  generating: 'bg-cyan-400 animate-pulse',
  generated: 'bg-amber-400',
  review: 'bg-amber-400',
  approved: 'bg-emerald-400',
  rejected: 'bg-red-400',
  final: 'bg-emerald-400',
};

// Shot timeline block colors
export const SHOT_BLOCK_COLORS = {
  draft: 'bg-s-6',
  prompt_ready: 'bg-blue-500/70',
  generating: 'bg-cyan-400/70 animate-shimmer',
  generated: 'bg-amber-500/70',
  review: 'bg-amber-500/70',
  approved: 'bg-emerald-500/70',
  rejected: 'bg-red-500/70',
  final: 'bg-gradient-to-r from-accent-600 to-accent-400',
};

export const PROJECT_TYPES = {
  single: 'Video đơn',
  short_series: 'Series ngắn',
  long_series: 'Series dài',
};

export const PROJECT_TYPE_ICONS = {
  single: '◆',
  short_series: '◈',
  long_series: '❖',
};

export const PRODUCTION_STATUSES = [
  'idea', 'development', 'visual_development', 'planning', 'generation', 'editing', 'completed',
];

export const SHOT_DURATIONS = [4, 6, 8, 10];

export const RESOURCE_CATEGORIES = [
  { value: 'prompt_template', label: 'Prompt Template', icon: '✦' },
  { value: 'technique', label: 'Technique', icon: '⚙' },
  { value: 'visual_style', label: 'Visual Style', icon: '◎' },
  { value: 'camera', label: 'Camera', icon: '📷' },
  { value: 'lighting', label: 'Lighting', icon: '💡' },
  { value: 'storytelling', label: 'Storytelling', icon: '📖' },
  { value: 'character_ref', label: 'Character Ref', icon: '👤' },
  { value: 'ai_tool', label: 'AI Tool', icon: '🤖' },
  { value: 'reference', label: 'Reference', icon: '🔗' },
  { value: 'other', label: 'Other', icon: '•' },
];

export const VISUAL_ASSET_CATEGORIES = [
  { value: 'character_design', label: 'Character Design' },
  { value: 'environment', label: 'Environment' },
  { value: 'architecture', label: 'Architecture' },
  { value: 'prop', label: 'Prop' },
  { value: 'costume', label: 'Costume' },
  { value: 'color_palette', label: 'Color Palette' },
  { value: 'style_guide', label: 'Style Guide' },
];

export function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function formatStatus(status) {
  return status?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || '';
}

export function parseJson(str, fallback = []) {
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}

export function getProgressPercent(shots) {
  if (!shots || shots.length === 0) return 0;
  return Math.round((shots.filter(s => s.status === 'final').length / shots.length) * 100);
}
