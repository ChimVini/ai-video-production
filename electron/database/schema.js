const schema = `
-- ============================================
-- PROJECTS — top-level container
-- ============================================
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  type TEXT NOT NULL CHECK(type IN ('single', 'short_series', 'long_series')),
  production_status TEXT DEFAULT 'idea' CHECK(production_status IN (
    'idea', 'development', 'visual_development', 'planning', 'generation', 'editing', 'completed'
  )),
  publishing_status TEXT DEFAULT 'not_published' CHECK(publishing_status IN (
    'not_published', 'scheduled', 'published', 'archived'
  )),
  thumbnail TEXT DEFAULT '',
  tags TEXT DEFAULT '[]',
  -- Extended project config fields (Spec 1 §6.1)
  target_audience TEXT DEFAULT '',
  language TEXT DEFAULT '',
  culture TEXT DEFAULT '',
  genre TEXT DEFAULT '',
  emotion_tone TEXT DEFAULT '',
  content_style TEXT DEFAULT '',
  production_mode TEXT DEFAULT 'reference' CHECK(production_mode IN ('reference', 'shot_controlled')),
  ai_creativity_level TEXT DEFAULT 'balanced' CHECK(ai_creativity_level IN ('strict', 'balanced', 'creative')),
  quality_criteria TEXT DEFAULT '{}',
  target_duration INTEGER DEFAULT 0,
  target_platform TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- ============================================
-- PROJECT BRIEFS — structured project brief (Spec 1 §6.1)
-- ============================================
CREATE TABLE IF NOT EXISTS project_briefs (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  idea TEXT DEFAULT '',
  objectives TEXT DEFAULT '',
  constraints TEXT DEFAULT '',
  content_architecture TEXT DEFAULT '',
  pacing TEXT DEFAULT '',
  key_points TEXT DEFAULT '[]',
  duration_allocation TEXT DEFAULT '{}',
  status TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'in_progress', 'review', 'approved')),
  version TEXT DEFAULT '1.0',
  version_notes TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- ============================================
-- SYSTEM 1: STORY DEVELOPMENT
-- ============================================
CREATE TABLE IF NOT EXISTS stories (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  plot TEXT DEFAULT '',
  theme TEXT DEFAULT '',
  conflict TEXT DEFAULT '',
  resolution TEXT DEFAULT '',
  structure TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  status TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'in_progress', 'review', 'approved')),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- ============================================
-- SYSTEM 2: CHARACTER DEVELOPMENT
-- ============================================
CREATE TABLE IF NOT EXISTS characters (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT DEFAULT '' CHECK(role IN ('', 'protagonist', 'antagonist', 'supporting', 'minor', 'extra')),
  personality TEXT DEFAULT '',
  background TEXT DEFAULT '',
  motivation TEXT DEFAULT '',
  arc TEXT DEFAULT '',
  relationships TEXT DEFAULT '[]',
  physical_description TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  status TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'in_progress', 'review', 'approved')),
  version TEXT DEFAULT '1.0',
  version_notes TEXT DEFAULT '',
  locked INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- ============================================
-- CHARACTER VARIANTS — intentional character variations (Spec 1 §7.2)
-- costume changes, age versions, alternate forms
-- ============================================
CREATE TABLE IF NOT EXISTS character_variants (
  id TEXT PRIMARY KEY,
  character_id TEXT NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  variant_type TEXT DEFAULT 'costume' CHECK(variant_type IN (
    'costume', 'age', 'form', 'expression_set', 'injury', 'custom'
  )),
  description TEXT DEFAULT '',
  differences TEXT DEFAULT '{}',
  preserved_attributes TEXT DEFAULT '[]',
  reference_images TEXT DEFAULT '[]',
  prompt_notes TEXT DEFAULT '',
  status TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'in_progress', 'review', 'approved')),
  version TEXT DEFAULT '1.0',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- ============================================
-- SYSTEM 3: WORLD DEVELOPMENT
-- ============================================
CREATE TABLE IF NOT EXISTS worlds (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  rules TEXT DEFAULT '',
  locations TEXT DEFAULT '[]',
  time_period TEXT DEFAULT '',
  atmosphere TEXT DEFAULT '',
  key_elements TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  status TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'in_progress', 'review', 'approved')),
  version TEXT DEFAULT '1.0',
  version_notes TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- ============================================
-- LOCATIONS — physical places within a world (Spec 1 §8.1)
-- spatial layout, landmarks, fixed objects
-- ============================================
CREATE TABLE IF NOT EXISTS locations (
  id TEXT PRIMARY KEY,
  world_id TEXT NOT NULL REFERENCES worlds(id) ON DELETE CASCADE,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  location_type TEXT DEFAULT '' CHECK(location_type IN (
    '', 'interior', 'exterior', 'mixed'
  )),
  spatial_layout TEXT DEFAULT '',
  landmarks TEXT DEFAULT '[]',
  fixed_objects TEXT DEFAULT '[]',
  entry_points TEXT DEFAULT '[]',
  reference_images TEXT DEFAULT '[]',
  prompt_notes TEXT DEFAULT '',
  status TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'in_progress', 'review', 'approved')),
  version TEXT DEFAULT '1.0',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- ============================================
-- ENVIRONMENTS — visual/atmospheric properties of a location (Spec 1 §8.1)
-- architecture, materials, colors, lighting, weather, atmosphere
-- ============================================
CREATE TABLE IF NOT EXISTS environments (
  id TEXT PRIMARY KEY,
  location_id TEXT NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  architecture TEXT DEFAULT '',
  materials TEXT DEFAULT '',
  color_palette TEXT DEFAULT '',
  lighting TEXT DEFAULT '',
  weather TEXT DEFAULT '',
  atmosphere TEXT DEFAULT '',
  time_of_day TEXT DEFAULT '',
  visual_direction TEXT DEFAULT '',
  reference_images TEXT DEFAULT '[]',
  prompt_notes TEXT DEFAULT '',
  status TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'in_progress', 'review', 'approved')),
  version TEXT DEFAULT '1.0',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- ============================================
-- CONTEXT STATES — scene-specific environment state (Spec 1 §8.1)
-- what the environment looks like at a specific moment in the story
-- ============================================
CREATE TABLE IF NOT EXISTS context_states (
  id TEXT PRIMARY KEY,
  environment_id TEXT NOT NULL REFERENCES environments(id) ON DELETE CASCADE,
  scene_id TEXT REFERENCES scenes(id) ON DELETE SET NULL,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  time_of_day TEXT DEFAULT '',
  weather_condition TEXT DEFAULT '',
  lighting_condition TEXT DEFAULT '',
  objects_present TEXT DEFAULT '[]',
  objects_changed TEXT DEFAULT '[]',
  atmosphere_override TEXT DEFAULT '',
  state_description TEXT DEFAULT '',
  state_type TEXT DEFAULT 'temporary' CHECK(state_type IN ('temporary', 'permanent')),
  previous_state_id TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- ============================================
-- EPISODES (for series)
-- ============================================
CREATE TABLE IF NOT EXISTS episodes (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  episode_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  synopsis TEXT DEFAULT '',
  production_status TEXT DEFAULT 'idea' CHECK(production_status IN (
    'idea', 'development', 'visual_development', 'planning', 'generation', 'editing', 'completed'
  )),
  publishing_status TEXT DEFAULT 'not_published' CHECK(publishing_status IN (
    'not_published', 'scheduled', 'published', 'archived'
  )),
  notes TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- ============================================
-- SYSTEM 2: VISUAL ASSETS
-- ============================================
CREATE TABLE IF NOT EXISTS visual_assets (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK(category IN (
    'character_design', 'environment', 'architecture', 'prop', 'costume', 'color_palette', 'style_guide'
  )),
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  reference_entity_id TEXT DEFAULT '',
  reference_entity_type TEXT DEFAULT '',
  tags TEXT DEFAULT '[]',
  image_paths TEXT DEFAULT '[]',
  prompt_used TEXT DEFAULT '',
  style_notes TEXT DEFAULT '',
  status TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'in_progress', 'review', 'approved')),
  version TEXT DEFAULT '1.0',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- ============================================
-- SYSTEM 3: SCENES
-- ============================================
CREATE TABLE IF NOT EXISTS scenes (
  id TEXT PRIMARY KEY,
  episode_id TEXT REFERENCES episodes(id) ON DELETE CASCADE,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  scene_number INTEGER NOT NULL,
  title TEXT DEFAULT '',
  location TEXT DEFAULT '',
  characters TEXT DEFAULT '[]',
  description TEXT DEFAULT '',
  action TEXT DEFAULT '',
  dialogue TEXT DEFAULT '',
  emotion TEXT DEFAULT '',
  camera_notes TEXT DEFAULT '',
  lighting TEXT DEFAULT '',
  sound TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  status TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'planned', 'in_production', 'completed')),
  version TEXT DEFAULT '1.0',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- ============================================
-- SYSTEM 3: SHOTS / CLIPS
-- ============================================
CREATE TABLE IF NOT EXISTS shots (
  id TEXT PRIMARY KEY,
  scene_id TEXT NOT NULL REFERENCES scenes(id) ON DELETE CASCADE,
  shot_number INTEGER NOT NULL,
  duration INTEGER NOT NULL DEFAULT 6 CHECK(duration IN (4, 6, 8, 10)),
  description TEXT DEFAULT '',
  script_line TEXT DEFAULT '',
  character_ids TEXT DEFAULT '[]',
  environment_ref TEXT DEFAULT '',
  camera_angle TEXT DEFAULT '',
  camera_movement TEXT DEFAULT '',
  motion_description TEXT DEFAULT '',
  prompt TEXT DEFAULT '',
  negative_prompt TEXT DEFAULT '',
  ai_tool TEXT DEFAULT '',
  ai_output_path TEXT DEFAULT '',
  ai_output_url TEXT DEFAULT '',
  review_notes TEXT DEFAULT '',
  status TEXT DEFAULT 'draft' CHECK(status IN (
    'draft', 'prompt_ready', 'generating', 'generated', 'review', 'approved', 'rejected', 'final'
  )),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- ============================================
-- PROMPT TEMPLATES — structured, reusable prompt templates (Spec 1 §5)
-- versioned, with input fields, constraints, and owning system
-- ============================================
CREATE TABLE IF NOT EXISTS prompt_templates (
  id TEXT PRIMARY KEY,
  project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  purpose TEXT DEFAULT '' CHECK(purpose IN (
    '', 'design', 'generation', 'transformation', 'validation', 'production', 'repair'
  )),
  owning_system TEXT DEFAULT '' CHECK(owning_system IN (
    '', 'CONTENT_SYSTEM', 'CHARACTER_SYSTEM', 'CONTEXT_SYSTEM', 'WORKSPACE'
  )),
  template_body TEXT DEFAULT '',
  input_fields TEXT DEFAULT '[]',
  optional_fields TEXT DEFAULT '[]',
  constraints TEXT DEFAULT '[]',
  preservation_rules TEXT DEFAULT '[]',
  output_format TEXT DEFAULT '',
  compatible_models TEXT DEFAULT '[]',
  tags TEXT DEFAULT '[]',
  is_global INTEGER DEFAULT 0,
  status TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'in_progress', 'review', 'approved')),
  version TEXT DEFAULT '1.0',
  version_notes TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- ============================================
-- RESOURCE / RESEARCH LIBRARY (legacy — kept for backward compatibility)
-- ============================================
CREATE TABLE IF NOT EXISTS resources (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL CHECK(category IN (
    'prompt_template', 'technique', 'visual_style', 'camera', 'lighting',
    'storytelling', 'character_ref', 'ai_tool', 'reference', 'other'
  )),
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  content TEXT DEFAULT '',
  tags TEXT DEFAULT '[]',
  source_url TEXT DEFAULT '',
  image_path TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- ============================================
-- NODE WORKSPACE: NODES (legacy — kept for backward compatibility)
-- ============================================
CREATE TABLE IF NOT EXISTS workspace_nodes (
  id TEXT PRIMARY KEY,
  parent_id TEXT DEFAULT NULL REFERENCES workspace_nodes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  pos_x REAL DEFAULT 0,
  pos_y REAL DEFAULT 0,
  color TEXT DEFAULT '',
  collapsed INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- ============================================
-- NODE WORKSPACE: TODOS (legacy — kept for backward compatibility)
-- ============================================
CREATE TABLE IF NOT EXISTS node_todos (
  id TEXT PRIMARY KEY,
  node_id TEXT NOT NULL REFERENCES workspace_nodes(id) ON DELETE CASCADE,
  parent_todo_id TEXT DEFAULT NULL REFERENCES node_todos(id) ON DELETE CASCADE,
  content TEXT NOT NULL DEFAULT '',
  completed INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- ============================================
-- NODE WORKSPACE: NOTES (legacy — kept for backward compatibility)
-- ============================================
CREATE TABLE IF NOT EXISTS node_notes (
  id TEXT PRIMARY KEY,
  node_id TEXT NOT NULL REFERENCES workspace_nodes(id) ON DELETE CASCADE,
  content TEXT NOT NULL DEFAULT '',
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- ============================================
-- NODE WORKSPACE: CONNECTIONS (legacy — kept for backward compatibility)
-- ============================================
CREATE TABLE IF NOT EXISTS node_connections (
  id TEXT PRIMARY KEY,
  source_node_id TEXT NOT NULL REFERENCES workspace_nodes(id) ON DELETE CASCADE,
  target_node_id TEXT NOT NULL REFERENCES workspace_nodes(id) ON DELETE CASCADE,
  label TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(source_node_id, target_node_id)
);

-- ============================================
-- RESOURCE CATALOG: indexes resources from Systems 1-3
-- Extended with new resource types (CHARACTER_VARIANT, ENVIRONMENT)
-- ============================================
CREATE TABLE IF NOT EXISTS resource_catalog (
  id TEXT PRIMARY KEY,
  resource_type TEXT NOT NULL CHECK(resource_type IN (
    'CHARACTER', 'CHARACTER_VARIANT', 'SCENE', 'WORLD', 'LOCATION',
    'ENVIRONMENT', 'VISUAL_ASSET', 'STORY', 'EPISODE', 'PROMPT_TEMPLATE'
  )),
  source_system TEXT NOT NULL CHECK(source_system IN (
    'CONTENT_SYSTEM', 'CHARACTER_SYSTEM', 'CONTEXT_SYSTEM'
  )),
  source_id TEXT NOT NULL,
  version_id TEXT DEFAULT '',
  variant_id TEXT DEFAULT '',
  name TEXT NOT NULL,
  thumbnail TEXT DEFAULT '',
  status TEXT DEFAULT 'draft' CHECK(status IN (
    'draft', 'review', 'approved', 'locked', 'archived'
  )),
  tags TEXT DEFAULT '[]',
  metadata TEXT DEFAULT '{}',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- ============================================
-- WORKFLOWS: saved workflow definitions
-- ============================================
CREATE TABLE IF NOT EXISTS workflows (
  id TEXT PRIMARY KEY,
  project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  is_template INTEGER DEFAULT 0,
  status TEXT DEFAULT 'draft' CHECK(status IN (
    'draft', 'ready', 'running', 'completed', 'archived'
  )),
  metadata TEXT DEFAULT '{}',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- ============================================
-- WORKFLOW NODES: typed nodes in a workflow
-- ============================================
CREATE TABLE IF NOT EXISTS workflow_nodes (
  id TEXT PRIMARY KEY,
  workflow_id TEXT NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  node_type TEXT NOT NULL CHECK(node_type IN ('DATA', 'PROCESS', 'OUTPUT')),
  node_subtype TEXT NOT NULL,
  label TEXT NOT NULL,
  position_x REAL DEFAULT 0,
  position_y REAL DEFAULT 0,
  config TEXT DEFAULT '{}',
  resource_ref TEXT DEFAULT '{}',
  status TEXT DEFAULT 'pending' CHECK(status IN (
    'pending', 'ready', 'running', 'completed', 'error', 'skipped'
  )),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- ============================================
-- WORKFLOW CONNECTIONS: typed edges between nodes
-- ============================================
CREATE TABLE IF NOT EXISTS workflow_connections (
  id TEXT PRIMARY KEY,
  workflow_id TEXT NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  source_node_id TEXT NOT NULL REFERENCES workflow_nodes(id) ON DELETE CASCADE,
  target_node_id TEXT NOT NULL REFERENCES workflow_nodes(id) ON DELETE CASCADE,
  data_type TEXT DEFAULT '',
  input_role TEXT DEFAULT '',
  required INTEGER DEFAULT 1,
  config TEXT DEFAULT '{}',
  created_at TEXT DEFAULT (datetime('now'))
);

-- ============================================
-- WORKFLOW RUNS: execution records
-- ============================================
CREATE TABLE IF NOT EXISTS workflow_runs (
  id TEXT PRIMARY KEY,
  workflow_id TEXT NOT NULL REFERENCES workflows(id),
  status TEXT DEFAULT 'pending' CHECK(status IN (
    'pending', 'validating', 'running', 'completed', 'failed', 'cancelled'
  )),
  input_snapshot TEXT DEFAULT '{}',
  started_at TEXT,
  completed_at TEXT,
  error TEXT DEFAULT '',
  metadata TEXT DEFAULT '{}',
  created_at TEXT DEFAULT (datetime('now'))
);

-- ============================================
-- GENERATION ATTEMPTS: immutable generation records
-- ============================================
CREATE TABLE IF NOT EXISTS generation_attempts (
  id TEXT PRIMARY KEY,
  workflow_run_id TEXT REFERENCES workflow_runs(id),
  workflow_node_id TEXT REFERENCES workflow_nodes(id),
  scene_id TEXT,
  attempt_number INTEGER NOT NULL DEFAULT 1,
  input_snapshot TEXT NOT NULL DEFAULT '{}',
  prompt TEXT DEFAULT '',
  negative_prompt TEXT DEFAULT '',
  provider_id TEXT,
  provider_params TEXT DEFAULT '{}',
  output_url TEXT DEFAULT '',
  output_metadata TEXT DEFAULT '{}',
  status TEXT DEFAULT 'generating' CHECK(status IN (
    'generating', 'generated', 'review', 'approved', 'rejected', 'failed', 'error'
  )),
  error TEXT DEFAULT '',
  previous_attempt_id TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  completed_at TEXT
);

-- ============================================
-- REVIEWS: review records for generation outputs
-- ============================================
CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY,
  generation_attempt_id TEXT NOT NULL REFERENCES generation_attempts(id) ON DELETE CASCADE,
  review_type TEXT NOT NULL CHECK(review_type IN ('character', 'context', 'production')),
  aspect TEXT DEFAULT '',
  status TEXT DEFAULT 'pending' CHECK(status IN (
    'pending', 'approved', 'rejected', 'needs_revision'
  )),
  notes TEXT DEFAULT '',
  reviewer TEXT DEFAULT 'user',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- ============================================
-- FEEDBACK: structured feedback on generations
-- ============================================
CREATE TABLE IF NOT EXISTS feedback (
  id TEXT PRIMARY KEY,
  generation_attempt_id TEXT NOT NULL REFERENCES generation_attempts(id) ON DELETE CASCADE,
  feedback_type TEXT NOT NULL CHECK(feedback_type IN ('issue', 'note', 'lesson', 'next_action')),
  content TEXT NOT NULL DEFAULT '',
  target_aspect TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now'))
);

-- ============================================
-- PROVIDER CONFIGS: external AI video provider settings
-- ============================================
CREATE TABLE IF NOT EXISTS provider_configs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  provider_type TEXT NOT NULL CHECK(provider_type IN (
    'rest_api', 'sdk', 'mcp', 'webhook', 'manual', 'google_veo'
  )),
  endpoint TEXT DEFAULT '',
  capabilities TEXT DEFAULT '[]',
  default_params TEXT DEFAULT '{}',
  auth_config TEXT DEFAULT '{}',
  status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive', 'error')),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- ============================================
-- CHARACTER STATES: state tracking across scenes
-- ============================================
CREATE TABLE IF NOT EXISTS character_states (
  id TEXT PRIMARY KEY,
  character_id TEXT NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  scene_id TEXT REFERENCES scenes(id) ON DELETE SET NULL,
  state_description TEXT NOT NULL DEFAULT '',
  state_type TEXT DEFAULT 'temporary' CHECK(state_type IN ('temporary', 'permanent')),
  attributes TEXT DEFAULT '{}',
  previous_state_id TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- ============================================
-- DEPENDENCY RECORDS: impact/dependency tracking (Spec 1 §9)
-- tracks relationships between entities for change propagation
-- ============================================
CREATE TABLE IF NOT EXISTS dependency_records (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  source_entity_type TEXT NOT NULL,
  source_entity_id TEXT NOT NULL,
  dependent_entity_type TEXT NOT NULL,
  dependent_entity_id TEXT NOT NULL,
  dependency_type TEXT DEFAULT 'reference' CHECK(dependency_type IN (
    'reference', 'derived', 'state_transfer', 'spatial', 'continuity'
  )),
  impact_level TEXT DEFAULT 'medium' CHECK(impact_level IN ('low', 'medium', 'high', 'critical')),
  status TEXT DEFAULT 'current' CHECK(status IN ('current', 'needs_review', 'outdated', 'broken')),
  last_validated_at TEXT,
  notes TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- ============================================
-- EXECUTION SNAPSHOTS: immutable RUN-xxx records (Spec 2 §3.C)
-- freezes ALL inputs when Generate is pressed
-- ============================================
CREATE TABLE IF NOT EXISTS execution_snapshots (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  workflow_run_id TEXT REFERENCES workflow_runs(id),
  scene_id TEXT REFERENCES scenes(id),
  shot_id TEXT REFERENCES shots(id),
  snapshot_type TEXT DEFAULT 'generation' CHECK(snapshot_type IN (
    'generation', 'validation', 'review', 'regeneration'
  )),
  frozen_prompt TEXT DEFAULT '',
  frozen_negative_prompt TEXT DEFAULT '',
  frozen_character_states TEXT DEFAULT '{}',
  frozen_context_states TEXT DEFAULT '{}',
  frozen_spatial_data TEXT DEFAULT '{}',
  frozen_resource_versions TEXT DEFAULT '{}',
  frozen_provider_config TEXT DEFAULT '{}',
  frozen_prompt_template_id TEXT,
  frozen_prompt_template_version TEXT DEFAULT '',
  production_mode TEXT DEFAULT 'reference',
  gate_validation_result TEXT DEFAULT '{}',
  created_at TEXT DEFAULT (datetime('now'))
);

-- ============================================
-- SPATIAL CONTINUITY: tracks spatial positions across shots (Spec 1 §8.3)
-- door/window positions, character positions, camera axis
-- ============================================
CREATE TABLE IF NOT EXISTS spatial_continuity (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  scene_id TEXT NOT NULL REFERENCES scenes(id) ON DELETE CASCADE,
  shot_id TEXT REFERENCES shots(id),
  element_type TEXT NOT NULL CHECK(element_type IN (
    'character_position', 'object_position', 'door_window',
    'camera_axis', 'lighting_source', 'prop'
  )),
  element_ref_id TEXT DEFAULT '',
  element_name TEXT DEFAULT '',
  position_data TEXT DEFAULT '{}',
  orientation TEXT DEFAULT '',
  frame_of_reference TEXT DEFAULT '',
  previous_shot_id TEXT,
  continuity_status TEXT DEFAULT 'consistent' CHECK(continuity_status IN (
    'consistent', 'intentional_change', 'error', 'unverified'
  )),
  notes TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- ============================================
-- CONTINUITY LEDGER: logs continuity checks (Spec 2 §3.E)
-- records consistency verification between consecutive shots
-- ============================================
CREATE TABLE IF NOT EXISTS continuity_ledger (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  scene_id TEXT NOT NULL REFERENCES scenes(id) ON DELETE CASCADE,
  shot_a_id TEXT NOT NULL REFERENCES shots(id),
  shot_b_id TEXT NOT NULL REFERENCES shots(id),
  check_type TEXT NOT NULL CHECK(check_type IN (
    'character_appearance', 'character_position', 'environment_state',
    'lighting', 'prop_placement', 'camera_direction', 'time_continuity'
  )),
  status TEXT DEFAULT 'pending' CHECK(status IN (
    'pending', 'passed', 'failed', 'waived'
  )),
  details TEXT DEFAULT '',
  auto_detected INTEGER DEFAULT 0,
  resolved_at TEXT,
  resolved_by TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now'))
);

-- ============================================
-- VALIDATION RESULTS: multi-level validation (Spec 1 §12)
-- project, script, scene, character, context, shot, output
-- ============================================
CREATE TABLE IF NOT EXISTS validation_results (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  validation_level TEXT NOT NULL CHECK(validation_level IN (
    'project', 'script', 'scene', 'character', 'context', 'shot', 'output'
  )),
  target_entity_type TEXT NOT NULL,
  target_entity_id TEXT NOT NULL,
  validation_type TEXT DEFAULT 'auto' CHECK(validation_type IN (
    'auto', 'manual', 'ai_assisted'
  )),
  status TEXT DEFAULT 'pending' CHECK(status IN (
    'pending', 'passed', 'warning', 'failed', 'skipped'
  )),
  data_confidence TEXT DEFAULT 'confirmed' CHECK(data_confidence IN (
    'confirmed', 'derived', 'ai_proposal', 'override'
  )),
  issues TEXT DEFAULT '[]',
  warnings TEXT DEFAULT '[]',
  metadata TEXT DEFAULT '{}',
  validated_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- ============================================
-- INDEXES — Original tables
-- ============================================
CREATE INDEX IF NOT EXISTS idx_stories_project ON stories(project_id);
CREATE INDEX IF NOT EXISTS idx_characters_project ON characters(project_id);
CREATE INDEX IF NOT EXISTS idx_worlds_project ON worlds(project_id);
CREATE INDEX IF NOT EXISTS idx_episodes_project ON episodes(project_id);
CREATE INDEX IF NOT EXISTS idx_visual_assets_project ON visual_assets(project_id);
CREATE INDEX IF NOT EXISTS idx_scenes_episode ON scenes(episode_id);
CREATE INDEX IF NOT EXISTS idx_scenes_project ON scenes(project_id);
CREATE INDEX IF NOT EXISTS idx_shots_scene ON shots(scene_id);
CREATE INDEX IF NOT EXISTS idx_resources_category ON resources(category);
CREATE INDEX IF NOT EXISTS idx_workspace_nodes_parent ON workspace_nodes(parent_id);
CREATE INDEX IF NOT EXISTS idx_node_todos_node ON node_todos(node_id);
CREATE INDEX IF NOT EXISTS idx_node_todos_parent ON node_todos(parent_todo_id);
CREATE INDEX IF NOT EXISTS idx_node_notes_node ON node_notes(node_id);
CREATE INDEX IF NOT EXISTS idx_node_connections_source ON node_connections(source_node_id);
CREATE INDEX IF NOT EXISTS idx_node_connections_target ON node_connections(target_node_id);

-- ============================================
-- INDEXES — New tables (Phase A1 additions)
-- ============================================
CREATE INDEX IF NOT EXISTS idx_project_briefs_project ON project_briefs(project_id);
CREATE INDEX IF NOT EXISTS idx_character_variants_character ON character_variants(character_id);
CREATE INDEX IF NOT EXISTS idx_character_variants_project ON character_variants(project_id);
CREATE INDEX IF NOT EXISTS idx_locations_world ON locations(world_id);
CREATE INDEX IF NOT EXISTS idx_locations_project ON locations(project_id);
CREATE INDEX IF NOT EXISTS idx_environments_location ON environments(location_id);
CREATE INDEX IF NOT EXISTS idx_environments_project ON environments(project_id);
CREATE INDEX IF NOT EXISTS idx_context_states_environment ON context_states(environment_id);
CREATE INDEX IF NOT EXISTS idx_context_states_scene ON context_states(scene_id);
CREATE INDEX IF NOT EXISTS idx_context_states_project ON context_states(project_id);
CREATE INDEX IF NOT EXISTS idx_prompt_templates_project ON prompt_templates(project_id);
CREATE INDEX IF NOT EXISTS idx_prompt_templates_purpose ON prompt_templates(purpose);
CREATE INDEX IF NOT EXISTS idx_prompt_templates_system ON prompt_templates(owning_system);

-- ============================================
-- INDEXES — Workspace & catalog tables
-- ============================================
CREATE INDEX IF NOT EXISTS idx_resource_catalog_type ON resource_catalog(resource_type);
CREATE INDEX IF NOT EXISTS idx_resource_catalog_source ON resource_catalog(source_system, source_id);
CREATE INDEX IF NOT EXISTS idx_resource_catalog_status ON resource_catalog(status);
CREATE INDEX IF NOT EXISTS idx_workflows_project ON workflows(project_id);
CREATE INDEX IF NOT EXISTS idx_workflows_status ON workflows(status);
CREATE INDEX IF NOT EXISTS idx_workflow_nodes_workflow ON workflow_nodes(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_nodes_type ON workflow_nodes(node_type);
CREATE INDEX IF NOT EXISTS idx_workflow_connections_workflow ON workflow_connections(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_connections_source ON workflow_connections(source_node_id);
CREATE INDEX IF NOT EXISTS idx_workflow_connections_target ON workflow_connections(target_node_id);
CREATE INDEX IF NOT EXISTS idx_workflow_runs_workflow ON workflow_runs(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_runs_status ON workflow_runs(status);
CREATE INDEX IF NOT EXISTS idx_generation_attempts_run ON generation_attempts(workflow_run_id);
CREATE INDEX IF NOT EXISTS idx_generation_attempts_node ON generation_attempts(workflow_node_id);
CREATE INDEX IF NOT EXISTS idx_generation_attempts_scene ON generation_attempts(scene_id);
CREATE INDEX IF NOT EXISTS idx_generation_attempts_status ON generation_attempts(status);
CREATE INDEX IF NOT EXISTS idx_reviews_attempt ON reviews(generation_attempt_id);
CREATE INDEX IF NOT EXISTS idx_reviews_type ON reviews(review_type);
CREATE INDEX IF NOT EXISTS idx_feedback_attempt ON feedback(generation_attempt_id);
CREATE INDEX IF NOT EXISTS idx_provider_configs_type ON provider_configs(provider_type);
CREATE INDEX IF NOT EXISTS idx_character_states_character ON character_states(character_id);
CREATE INDEX IF NOT EXISTS idx_character_states_scene ON character_states(scene_id);

-- ============================================
-- INDEXES — Dependency, snapshot & continuity tables
-- ============================================
CREATE INDEX IF NOT EXISTS idx_dependency_records_project ON dependency_records(project_id);
CREATE INDEX IF NOT EXISTS idx_dependency_records_source ON dependency_records(source_entity_type, source_entity_id);
CREATE INDEX IF NOT EXISTS idx_dependency_records_dependent ON dependency_records(dependent_entity_type, dependent_entity_id);
CREATE INDEX IF NOT EXISTS idx_dependency_records_status ON dependency_records(status);
CREATE INDEX IF NOT EXISTS idx_execution_snapshots_project ON execution_snapshots(project_id);
CREATE INDEX IF NOT EXISTS idx_execution_snapshots_run ON execution_snapshots(workflow_run_id);
CREATE INDEX IF NOT EXISTS idx_execution_snapshots_shot ON execution_snapshots(shot_id);
CREATE INDEX IF NOT EXISTS idx_spatial_continuity_project ON spatial_continuity(project_id);
CREATE INDEX IF NOT EXISTS idx_spatial_continuity_scene ON spatial_continuity(scene_id);
CREATE INDEX IF NOT EXISTS idx_spatial_continuity_shot ON spatial_continuity(shot_id);
CREATE INDEX IF NOT EXISTS idx_continuity_ledger_project ON continuity_ledger(project_id);
CREATE INDEX IF NOT EXISTS idx_continuity_ledger_scene ON continuity_ledger(scene_id);
CREATE INDEX IF NOT EXISTS idx_continuity_ledger_shots ON continuity_ledger(shot_a_id, shot_b_id);
CREATE INDEX IF NOT EXISTS idx_validation_results_project ON validation_results(project_id);
CREATE INDEX IF NOT EXISTS idx_validation_results_target ON validation_results(target_entity_type, target_entity_id);
CREATE INDEX IF NOT EXISTS idx_validation_results_level ON validation_results(validation_level);
CREATE INDEX IF NOT EXISTS idx_validation_results_status ON validation_results(status);
`;

// Migration SQL for existing databases that already have the old schema
// These ALTER statements add columns/tables — errors ignored per-statement for idempotency
const migrations = `
-- Version tracking migrations (original)
ALTER TABLE characters ADD COLUMN version TEXT DEFAULT '1.0';
ALTER TABLE characters ADD COLUMN version_notes TEXT DEFAULT '';
ALTER TABLE characters ADD COLUMN locked INTEGER DEFAULT 0;
ALTER TABLE worlds ADD COLUMN version TEXT DEFAULT '1.0';
ALTER TABLE worlds ADD COLUMN version_notes TEXT DEFAULT '';
ALTER TABLE scenes ADD COLUMN version TEXT DEFAULT '1.0';
ALTER TABLE visual_assets ADD COLUMN version TEXT DEFAULT '1.0';

-- Phase A1: Extended project config fields
ALTER TABLE projects ADD COLUMN target_audience TEXT DEFAULT '';
ALTER TABLE projects ADD COLUMN language TEXT DEFAULT '';
ALTER TABLE projects ADD COLUMN culture TEXT DEFAULT '';
ALTER TABLE projects ADD COLUMN genre TEXT DEFAULT '';
ALTER TABLE projects ADD COLUMN emotion_tone TEXT DEFAULT '';
ALTER TABLE projects ADD COLUMN content_style TEXT DEFAULT '';
ALTER TABLE projects ADD COLUMN production_mode TEXT DEFAULT 'reference';
ALTER TABLE projects ADD COLUMN ai_creativity_level TEXT DEFAULT 'balanced';
ALTER TABLE projects ADD COLUMN quality_criteria TEXT DEFAULT '{}';
ALTER TABLE projects ADD COLUMN target_duration INTEGER DEFAULT 0;
ALTER TABLE projects ADD COLUMN target_platform TEXT DEFAULT '';

-- Phase A1: Provider auth_config column
ALTER TABLE provider_configs ADD COLUMN auth_config TEXT DEFAULT '{}';

-- Phase B: Reviews reject_reason for Spec 1 §10
ALTER TABLE reviews ADD COLUMN reject_reason TEXT DEFAULT '';

-- Phase B: Generation attempts link to execution snapshot
ALTER TABLE generation_attempts ADD COLUMN snapshot_id TEXT DEFAULT '';

-- Phase B: Shots spatial data
ALTER TABLE shots ADD COLUMN spatial_data TEXT DEFAULT '{}';

-- Phase B: Data confidence classification on key tables
ALTER TABLE characters ADD COLUMN data_confidence TEXT DEFAULT 'confirmed';
ALTER TABLE worlds ADD COLUMN data_confidence TEXT DEFAULT 'confirmed';
ALTER TABLE scenes ADD COLUMN data_confidence TEXT DEFAULT 'confirmed';
ALTER TABLE shots ADD COLUMN data_confidence TEXT DEFAULT 'confirmed';
ALTER TABLE prompt_templates ADD COLUMN data_confidence TEXT DEFAULT 'confirmed';
`;

module.exports = { schema, migrations };
