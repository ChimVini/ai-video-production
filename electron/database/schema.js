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
-- SYSTEM 1: CHARACTER DEVELOPMENT
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
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- ============================================
-- SYSTEM 1: WORLD DEVELOPMENT
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
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
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
-- RESOURCE / RESEARCH LIBRARY
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
-- NODE WORKSPACE: NODES
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
-- NODE WORKSPACE: TODOS (recursive hierarchy)
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
-- NODE WORKSPACE: NOTES
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
-- NODE WORKSPACE: CONNECTIONS (graph edges)
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
-- INDEXES
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
`;

module.exports = { schema };
