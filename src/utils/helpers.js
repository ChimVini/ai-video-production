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
  // Workflow status
  ready: 'badge-blue',
  running: 'badge-cyan',
  // Workflow node status
  pending: 'badge-gray',
  error: 'badge-red',
  skipped: 'badge-gray',
  // Workflow run status
  validating: 'badge-yellow',
  failed: 'badge-red',
  cancelled: 'badge-gray',
  // Review status
  needs_revision: 'badge-yellow',
  // Resource catalog status
  locked: 'badge-purple',
  // Dependency statuses
  current: 'badge-green',
  needs_review: 'badge-yellow',
  outdated: 'badge-red',
  broken: 'badge-red',
  // Continuity statuses
  passed: 'badge-green',
  waived: 'badge-gray',
  consistent: 'badge-green',
  intentional_change: 'badge-blue',
  unverified: 'badge-gray',
  // Validation statuses
  warning: 'badge-yellow',
  // Data confidence
  confirmed: 'badge-green',
  derived: 'badge-blue',
  ai_proposal: 'badge-purple',
  override: 'badge-yellow',
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

// ── Workflow & Production Canvas constants ────────────

export const RESOURCE_TYPES = [
  { value: 'CHARACTER', label: 'Character', icon: '👤', sourceSystem: 'CHARACTER_SYSTEM' },
  { value: 'CHARACTER_VARIANT', label: 'Character Variant', icon: '👥', sourceSystem: 'CHARACTER_SYSTEM' },
  { value: 'SCENE', label: 'Scene', icon: '🎬', sourceSystem: 'CONTENT_SYSTEM' },
  { value: 'WORLD', label: 'World', icon: '🌍', sourceSystem: 'CONTEXT_SYSTEM' },
  { value: 'LOCATION', label: 'Location', icon: '📍', sourceSystem: 'CONTEXT_SYSTEM' },
  { value: 'ENVIRONMENT', label: 'Environment', icon: '🏞', sourceSystem: 'CONTEXT_SYSTEM' },
  { value: 'VISUAL_ASSET', label: 'Visual Asset', icon: '🎨', sourceSystem: 'CHARACTER_SYSTEM' },
  { value: 'STORY', label: 'Story', icon: '📖', sourceSystem: 'CONTENT_SYSTEM' },
  { value: 'EPISODE', label: 'Episode', icon: '📺', sourceSystem: 'CONTENT_SYSTEM' },
  { value: 'PROMPT_TEMPLATE', label: 'Prompt Template', icon: '✦', sourceSystem: 'CONTENT_SYSTEM' },
];

export const SOURCE_SYSTEMS = [
  { value: 'CONTENT_SYSTEM', label: 'Content (System 1)' },
  { value: 'CHARACTER_SYSTEM', label: 'Character (System 2)' },
  { value: 'CONTEXT_SYSTEM', label: 'Context (System 3)' },
];

export const NODE_TYPES = {
  DATA: { label: 'Data / Resource', color: 'accent', shape: 'rounded' },
  PROCESS: { label: 'Process', color: 'cyan', shape: 'hexagonal' },
  OUTPUT: { label: 'Output', color: 'green', shape: 'diamond' },
};

export const NODE_SUBTYPES = {
  // DATA nodes
  character: { type: 'DATA', label: 'Character', icon: '👤' },
  character_ref: { type: 'DATA', label: 'Character Reference', icon: '🖼' },
  character_variant: { type: 'DATA', label: 'Character Variant', icon: '👥' },
  character_state: { type: 'DATA', label: 'Character State', icon: '🔄' },
  scene: { type: 'DATA', label: 'Scene', icon: '🎬' },
  script: { type: 'DATA', label: 'Script', icon: '📄' },
  world: { type: 'DATA', label: 'World', icon: '🌍' },
  location: { type: 'DATA', label: 'Location', icon: '📍' },
  environment: { type: 'DATA', label: 'Environment', icon: '🏞' },
  visual_asset: { type: 'DATA', label: 'Visual Asset', icon: '🎨' },
  reference_image: { type: 'DATA', label: 'Reference Image', icon: '🖼' },
  prompt_template: { type: 'DATA', label: 'Prompt Template', icon: '✦' },
  // PROCESS nodes
  compose_scene: { type: 'PROCESS', label: 'Compose Scene', icon: '⚡' },
  build_prompt: { type: 'PROCESS', label: 'Build Prompt', icon: '📝' },
  generate_video: { type: 'PROCESS', label: 'Generate Video', icon: '🎥' },
  generate_image: { type: 'PROCESS', label: 'Generate Image', icon: '🖼' },
  modify_video: { type: 'PROCESS', label: 'Modify Video', icon: '✂️' },
  modify_image: { type: 'PROCESS', label: 'Modify Image', icon: '🖌' },
  compare: { type: 'PROCESS', label: 'Compare', icon: '⚖' },
  review_node: { type: 'PROCESS', label: 'Review', icon: '✅' },
  // OUTPUT nodes
  generated_video: { type: 'OUTPUT', label: 'Generated Video', icon: '🎥' },
  generated_image: { type: 'OUTPUT', label: 'Generated Image', icon: '🖼' },
  final_clip: { type: 'OUTPUT', label: 'Final Clip', icon: '🎞' },
  review_result: { type: 'OUTPUT', label: 'Review Result', icon: '📋' },
};

export const WORKFLOW_STATUSES = ['draft', 'ready', 'running', 'completed', 'archived'];

export const WORKFLOW_RUN_STATUSES = ['pending', 'validating', 'running', 'completed', 'failed', 'cancelled'];

export const GENERATION_STATUSES = ['generating', 'generated', 'review', 'approved', 'rejected', 'failed', 'error'];

export const REVIEW_TYPES = [
  { value: 'character', label: 'Character Review' },
  { value: 'context', label: 'Context Review' },
  { value: 'production', label: 'Production Review' },
];

export const REVIEW_STATUSES = ['pending', 'approved', 'rejected', 'needs_revision'];

export const FEEDBACK_TYPES = [
  { value: 'issue', label: 'Issue' },
  { value: 'note', label: 'Note' },
  { value: 'lesson', label: 'Lesson Learned' },
  { value: 'next_action', label: 'Next Action' },
];

export const PROVIDER_TYPES = [
  { value: 'rest_api', label: 'REST API' },
  { value: 'sdk', label: 'SDK' },
  { value: 'mcp', label: 'MCP' },
  { value: 'webhook', label: 'Webhook' },
  { value: 'manual', label: 'Manual' },
  { value: 'google_veo', label: 'Google Veo' },
];

export const PROVIDER_CAPABILITIES = [
  'text_to_video',
  'image_to_video',
  'video_to_video',
  'text_to_image',
  'image_to_image',
  'upscale',
  'inpaint',
  'outpaint',
];

// ── Project config constants (Phase A1) ────────────

export const PRODUCTION_MODES = [
  { value: 'reference', label: 'Reference-driven', description: 'Fast mode for short content, entertainment videos' },
  { value: 'shot_controlled', label: 'Shot-controlled', description: 'Precise mode for films, ads, story-driven content' },
];

export const AI_CREATIVITY_LEVELS = [
  { value: 'strict', label: 'Strict', description: 'AI follows references exactly, minimal creative freedom' },
  { value: 'balanced', label: 'Balanced', description: 'AI can add minor details within guidelines' },
  { value: 'creative', label: 'Creative', description: 'AI can freely interpret within broad constraints' },
];

export const CHARACTER_VARIANT_TYPES = [
  { value: 'costume', label: 'Costume Change' },
  { value: 'age', label: 'Age Version' },
  { value: 'form', label: 'Alternate Form' },
  { value: 'expression_set', label: 'Expression Set' },
  { value: 'injury', label: 'Injury / Damage' },
  { value: 'custom', label: 'Custom' },
];

export const LOCATION_TYPES = [
  { value: '', label: 'Unspecified' },
  { value: 'interior', label: 'Interior' },
  { value: 'exterior', label: 'Exterior' },
  { value: 'mixed', label: 'Mixed' },
];

export const PROMPT_PURPOSES = [
  { value: '', label: 'General' },
  { value: 'design', label: 'Design' },
  { value: 'generation', label: 'Generation' },
  { value: 'transformation', label: 'Transformation' },
  { value: 'validation', label: 'Validation' },
  { value: 'production', label: 'Production' },
  { value: 'repair', label: 'Repair / Regeneration' },
];

export const PROMPT_OWNING_SYSTEMS = [
  { value: '', label: 'None' },
  { value: 'CONTENT_SYSTEM', label: 'Content (System 1)' },
  { value: 'CHARACTER_SYSTEM', label: 'Character (System 2)' },
  { value: 'CONTEXT_SYSTEM', label: 'Context (System 3)' },
  { value: 'WORKSPACE', label: 'Workspace (System 4)' },
];

// ── Impact/Dependency Tracking (Spec 1 §9) ─────────

export const DEPENDENCY_TYPES = [
  { value: 'reference', label: 'Reference', description: 'Entity references data from source' },
  { value: 'derived', label: 'Derived', description: 'Entity is derived/computed from source' },
  { value: 'state_transfer', label: 'State Transfer', description: 'Character/environment state flows between scenes' },
  { value: 'spatial', label: 'Spatial', description: 'Spatial continuity constraint' },
  { value: 'continuity', label: 'Continuity', description: 'Visual/temporal continuity dependency' },
];

export const DEPENDENCY_STATUSES = [
  { value: 'current', label: 'Current', color: 'text-emerald-400' },
  { value: 'needs_review', label: 'Needs Review', color: 'text-amber-400' },
  { value: 'outdated', label: 'Outdated', color: 'text-red-400' },
  { value: 'broken', label: 'Broken', color: 'text-red-500' },
];

export const IMPACT_LEVELS = [
  { value: 'low', label: 'Low', color: 'text-t-3' },
  { value: 'medium', label: 'Medium', color: 'text-amber-400' },
  { value: 'high', label: 'High', color: 'text-orange-400' },
  { value: 'critical', label: 'Critical', color: 'text-red-400' },
];

// ── Reject Reasons for Review (Spec 1 §10) ─────────

export const REJECT_REASONS = [
  { value: 'face_inconsistency', label: 'Face Inconsistency' },
  { value: 'camera_motion', label: 'Camera Motion Issue' },
  { value: 'physics_artifact', label: 'Physics Artifact' },
  { value: 'environment_error', label: 'Environment Error' },
  { value: 'lighting_mismatch', label: 'Lighting Mismatch' },
  { value: 'continuity_break', label: 'Continuity Break' },
  { value: 'prompt_mismatch', label: 'Doesn\'t Match Prompt' },
  { value: 'quality_low', label: 'Low Quality' },
  { value: 'other', label: 'Other' },
];

// ── Data Confidence (Spec 1 §12) ────────────────────

export const DATA_CONFIDENCE_LEVELS = [
  { value: 'confirmed', label: 'Confirmed', icon: '✓', description: 'Human-verified data' },
  { value: 'derived', label: 'Derived', icon: '→', description: 'Computed from other confirmed data' },
  { value: 'ai_proposal', label: 'AI Proposal', icon: '✦', description: 'AI-generated, awaiting review' },
  { value: 'override', label: 'Override', icon: '⚡', description: 'Manually overridden value' },
];

// ── Validation Levels (Spec 1 §12) ──────────────────

export const VALIDATION_LEVELS = [
  { value: 'project', label: 'Project Level' },
  { value: 'script', label: 'Script Level' },
  { value: 'scene', label: 'Scene Level' },
  { value: 'character', label: 'Character Level' },
  { value: 'context', label: 'Context Level' },
  { value: 'shot', label: 'Shot Level' },
  { value: 'output', label: 'Output Level' },
];

// ── Spatial Element Types (Spec 1 §8.3) ─────────────

export const SPATIAL_ELEMENT_TYPES = [
  { value: 'character_position', label: 'Character Position', icon: '👤' },
  { value: 'object_position', label: 'Object Position', icon: '📦' },
  { value: 'door_window', label: 'Door/Window', icon: '🚪' },
  { value: 'camera_axis', label: 'Camera Axis', icon: '🎥' },
  { value: 'lighting_source', label: 'Lighting Source', icon: '💡' },
  { value: 'prop', label: 'Prop', icon: '🎭' },
];

// ── Continuity Check Types (Spec 2 §3.E) ────────────

export const CONTINUITY_CHECK_TYPES = [
  { value: 'character_appearance', label: 'Character Appearance' },
  { value: 'character_position', label: 'Character Position' },
  { value: 'environment_state', label: 'Environment State' },
  { value: 'lighting', label: 'Lighting' },
  { value: 'prop_placement', label: 'Prop Placement' },
  { value: 'camera_direction', label: 'Camera Direction' },
  { value: 'time_continuity', label: 'Time Continuity' },
];

// ── Execution Snapshot Types (Spec 2 §3.C) ──────────

export const SNAPSHOT_TYPES = [
  { value: 'generation', label: 'Generation' },
  { value: 'validation', label: 'Validation' },
  { value: 'review', label: 'Review' },
  { value: 'regeneration', label: 'Regeneration' },
];

// ── Entity type display labels ──────────────────────

export const ENTITY_TYPE_LABELS = {
  character: 'Character',
  character_variant: 'Character Variant',
  scene: 'Scene',
  shot: 'Shot',
  world: 'World',
  location: 'Location',
  environment: 'Environment',
  visual_asset: 'Visual Asset',
  story: 'Story',
  episode: 'Episode',
  prompt_template: 'Prompt Template',
  context_state: 'Context State',
  character_state: 'Character State',
};
