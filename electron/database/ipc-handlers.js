const { getDb } = require('./index.js');
const { v4: uuidv4 } = require('uuid');

function registerIpcHandlers(ipcMain) {
  const db = () => getDb();

  // ── PROJECTS ──────────────────────────────────
  ipcMain.handle('db:projects:list', () => {
    return db().prepare('SELECT * FROM projects ORDER BY updated_at DESC').all();
  });

  ipcMain.handle('db:projects:get', (_, id) => {
    return db().prepare('SELECT * FROM projects WHERE id = ?').get(id);
  });

  ipcMain.handle('db:projects:create', (_, data) => {
    const id = uuidv4();
    db().prepare(`
      INSERT INTO projects (id, name, description, type, tags)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, data.name, data.description || '', data.type, JSON.stringify(data.tags || []));
    return db().prepare('SELECT * FROM projects WHERE id = ?').get(id);
  });

  ipcMain.handle('db:projects:update', (_, id, data) => {
    const fields = [];
    const values = [];
    for (const [key, val] of Object.entries(data)) {
      if (key === 'id') continue;
      fields.push(`${key} = ?`);
      values.push(typeof val === 'object' ? JSON.stringify(val) : val);
    }
    fields.push("updated_at = datetime('now')");
    values.push(id);
    db().prepare(`UPDATE projects SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    return db().prepare('SELECT * FROM projects WHERE id = ?').get(id);
  });

  ipcMain.handle('db:projects:delete', (_, id) => {
    db().prepare('DELETE FROM projects WHERE id = ?').run(id);
    return { success: true };
  });

  // ── Generic CRUD factory ──────────────────────
  function registerCrud(ipcName, table, parentCol) {
    ipcMain.handle(`db:${ipcName}:list`, (_, parentId) => {
      if (parentCol && parentId) {
        return db().prepare(`SELECT * FROM ${table} WHERE ${parentCol} = ? ORDER BY created_at ASC`).all(parentId);
      }
      return db().prepare(`SELECT * FROM ${table} ORDER BY created_at DESC`).all();
    });

    ipcMain.handle(`db:${ipcName}:get`, (_, id) => {
      return db().prepare(`SELECT * FROM ${table} WHERE id = ?`).get(id);
    });

    ipcMain.handle(`db:${ipcName}:create`, (_, data) => {
      const id = uuidv4();
      const cols = ['id', ...Object.keys(data)];
      const placeholders = cols.map(() => '?').join(', ');
      const vals = [id, ...Object.values(data).map(v => v === null || v === undefined ? null : (typeof v === 'object' ? JSON.stringify(v) : v))];
      db().prepare(`INSERT INTO ${table} (${cols.join(', ')}) VALUES (${placeholders})`).run(...vals);
      return db().prepare(`SELECT * FROM ${table} WHERE id = ?`).get(id);
    });

    ipcMain.handle(`db:${ipcName}:update`, (_, id, data) => {
      const fields = [];
      const values = [];
      for (const [key, val] of Object.entries(data)) {
        if (key === 'id') continue;
        fields.push(`${key} = ?`);
        values.push(val === null || val === undefined ? null : (typeof val === 'object' ? JSON.stringify(val) : val));
      }
      fields.push("updated_at = datetime('now')");
      values.push(id);
      db().prepare(`UPDATE ${table} SET ${fields.join(', ')} WHERE id = ?`).run(...values);
      return db().prepare(`SELECT * FROM ${table} WHERE id = ?`).get(id);
    });

    ipcMain.handle(`db:${ipcName}:delete`, (_, id) => {
      db().prepare(`DELETE FROM ${table} WHERE id = ?`).run(id);
      return { success: true };
    });
  }

  registerCrud('stories', 'stories', 'project_id');
  registerCrud('characters', 'characters', 'project_id');
  registerCrud('worlds', 'worlds', 'project_id');
  registerCrud('episodes', 'episodes', 'project_id');
  registerCrud('visual-assets', 'visual_assets', 'project_id');
  registerCrud('scenes', 'scenes', 'episode_id');
  registerCrud('shots', 'shots', 'scene_id');

  // Resources — with optional category filter
  ipcMain.handle('db:resources:list', (_, filters) => {
    if (filters?.category) {
      return db().prepare('SELECT * FROM resources WHERE category = ? ORDER BY updated_at DESC').all(filters.category);
    }
    return db().prepare('SELECT * FROM resources ORDER BY updated_at DESC').all();
  });
  ipcMain.handle('db:resources:get', (_, id) => {
    return db().prepare('SELECT * FROM resources WHERE id = ?').get(id);
  });
  ipcMain.handle('db:resources:create', (_, data) => {
    const id = uuidv4();
    db().prepare(`
      INSERT INTO resources (id, category, name, description, content, tags, source_url)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, data.category, data.name, data.description || '', data.content || '', JSON.stringify(data.tags || []), data.source_url || '');
    return db().prepare('SELECT * FROM resources WHERE id = ?').get(id);
  });
  ipcMain.handle('db:resources:update', (_, id, data) => {
    const fields = [];
    const values = [];
    for (const [key, val] of Object.entries(data)) {
      if (key === 'id') continue;
      fields.push(`${key} = ?`);
      values.push(typeof val === 'object' ? JSON.stringify(val) : val);
    }
    fields.push("updated_at = datetime('now')");
    values.push(id);
    db().prepare(`UPDATE resources SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    return db().prepare('SELECT * FROM resources WHERE id = ?').get(id);
  });
  ipcMain.handle('db:resources:delete', (_, id) => {
    db().prepare('DELETE FROM resources WHERE id = ?').run(id);
    return { success: true };
  });

  // ── NODE WORKSPACE ───────────────────────────
  registerCrud('workspace-nodes', 'workspace_nodes', 'parent_id');
  registerCrud('node-todos', 'node_todos', 'node_id');
  registerCrud('node-notes', 'node_notes', 'node_id');

  // Workspace nodes — list root nodes (no parent)
  ipcMain.handle('db:workspace-nodes:list-roots', () => {
    return db().prepare('SELECT * FROM workspace_nodes WHERE parent_id IS NULL ORDER BY created_at ASC').all();
  });

  // Workspace nodes — list children of a parent
  ipcMain.handle('db:workspace-nodes:list-children', (_, parentId) => {
    return db().prepare('SELECT * FROM workspace_nodes WHERE parent_id = ? ORDER BY created_at ASC').all(parentId);
  });

  // Workspace nodes — list siblings (same parent context) for @ mention
  ipcMain.handle('db:workspace-nodes:list-siblings', (_, parentId) => {
    if (parentId) {
      return db().prepare('SELECT id, name FROM workspace_nodes WHERE parent_id = ? ORDER BY name ASC').all(parentId);
    }
    return db().prepare('SELECT id, name FROM workspace_nodes WHERE parent_id IS NULL ORDER BY name ASC').all();
  });

  // Node todos — list by node with subtodos
  ipcMain.handle('db:node-todos:list-by-node', (_, nodeId) => {
    return db().prepare('SELECT * FROM node_todos WHERE node_id = ? ORDER BY sort_order ASC, created_at ASC').all(nodeId);
  });

  // Node notes — list by node
  ipcMain.handle('db:node-notes:list-by-node', (_, nodeId) => {
    return db().prepare('SELECT * FROM node_notes WHERE node_id = ? ORDER BY sort_order ASC, created_at ASC').all(nodeId);
  });

  // Node connections
  ipcMain.handle('db:node-connections:create', (_, data) => {
    const id = uuidv4();
    try {
      db().prepare(`INSERT INTO node_connections (id, source_node_id, target_node_id, label) VALUES (?, ?, ?, ?)`).run(
        id, data.source_node_id, data.target_node_id, data.label || ''
      );
    } catch (e) {
      // UNIQUE constraint — connection already exists
      if (e.message.includes('UNIQUE')) return null;
      throw e;
    }
    return db().prepare('SELECT * FROM node_connections WHERE id = ?').get(id);
  });

  ipcMain.handle('db:node-connections:list-by-node', (_, nodeId) => {
    return db().prepare(
      'SELECT * FROM node_connections WHERE source_node_id = ? OR target_node_id = ? ORDER BY created_at ASC'
    ).all(nodeId, nodeId);
  });

  ipcMain.handle('db:node-connections:list-by-context', (_, parentId) => {
    // Get all connections between nodes that share the same parent context
    const nodeIds = parentId
      ? db().prepare('SELECT id FROM workspace_nodes WHERE parent_id = ?').all(parentId).map(r => r.id)
      : db().prepare('SELECT id FROM workspace_nodes WHERE parent_id IS NULL').all().map(r => r.id);
    if (nodeIds.length === 0) return [];
    const placeholders = nodeIds.map(() => '?').join(',');
    return db().prepare(
      `SELECT * FROM node_connections WHERE source_node_id IN (${placeholders}) AND target_node_id IN (${placeholders})`
    ).all(...nodeIds, ...nodeIds);
  });

  ipcMain.handle('db:node-connections:list-all', () => {
    return db().prepare('SELECT * FROM node_connections ORDER BY created_at ASC').all();
  });

  ipcMain.handle('db:node-connections:delete', (_, id) => {
    db().prepare('DELETE FROM node_connections WHERE id = ?').run(id);
    return { success: true };
  });

  // ── DASHBOARD STATS ──────────────────────────
  ipcMain.handle('db:dashboard:stats', () => {
    const projects = db().prepare('SELECT COUNT(*) as count FROM projects').get();
    const inProduction = db().prepare("SELECT COUNT(*) as count FROM projects WHERE production_status NOT IN ('idea', 'completed')").get();
    const completed = db().prepare("SELECT COUNT(*) as count FROM projects WHERE production_status = 'completed'").get();
    const totalShots = db().prepare('SELECT COUNT(*) as count FROM shots').get();
    const approvedShots = db().prepare("SELECT COUNT(*) as count FROM shots WHERE status = 'final'").get();
    const resources = db().prepare('SELECT COUNT(*) as count FROM resources').get();

    const recentProjects = db().prepare('SELECT * FROM projects ORDER BY updated_at DESC LIMIT 5').all();

    return {
      totalProjects: projects.count,
      inProduction: inProduction.count,
      completed: completed.count,
      totalShots: totalShots.count,
      approvedShots: approvedShots.count,
      totalResources: resources.count,
      recentProjects,
    };
  });

  // ── Scenes by project (not just episode) ─────
  ipcMain.handle('db:scenes:list-by-project', (_, projectId) => {
    return db().prepare('SELECT * FROM scenes WHERE project_id = ? ORDER BY scene_number ASC').all(projectId);
  });
}

module.exports = { registerIpcHandlers };
