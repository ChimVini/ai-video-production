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

  // ── RESOURCE CATALOG ─────────────────────────
  ipcMain.handle('db:resource-catalog:list', (_, filters) => {
    let sql = 'SELECT * FROM resource_catalog WHERE 1=1';
    const params = [];
    if (filters?.resource_type) {
      sql += ' AND resource_type = ?';
      params.push(filters.resource_type);
    }
    if (filters?.source_system) {
      sql += ' AND source_system = ?';
      params.push(filters.source_system);
    }
    if (filters?.status) {
      sql += ' AND status = ?';
      params.push(filters.status);
    }
    if (filters?.search) {
      sql += ' AND (name LIKE ? OR tags LIKE ?)';
      params.push(`%${filters.search}%`, `%${filters.search}%`);
    }
    sql += ' ORDER BY updated_at DESC';
    return db().prepare(sql).all(...params);
  });

  ipcMain.handle('db:resource-catalog:get', (_, id) => {
    return db().prepare('SELECT * FROM resource_catalog WHERE id = ?').get(id);
  });

  ipcMain.handle('db:resource-catalog:get-by-source', (_, sourceSystem, sourceId) => {
    return db().prepare('SELECT * FROM resource_catalog WHERE source_system = ? AND source_id = ?').get(sourceSystem, sourceId);
  });

  ipcMain.handle('db:resource-catalog:create', (_, data) => {
    const id = uuidv4();
    db().prepare(`
      INSERT INTO resource_catalog (id, resource_type, source_system, source_id, version_id, variant_id, name, thumbnail, status, tags, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, data.resource_type, data.source_system, data.source_id,
      data.version_id || '', data.variant_id || '', data.name,
      data.thumbnail || '', data.status || 'draft',
      JSON.stringify(data.tags || []), JSON.stringify(data.metadata || {})
    );
    return db().prepare('SELECT * FROM resource_catalog WHERE id = ?').get(id);
  });

  ipcMain.handle('db:resource-catalog:update', (_, id, data) => {
    const fields = [];
    const values = [];
    for (const [key, val] of Object.entries(data)) {
      if (key === 'id') continue;
      fields.push(`${key} = ?`);
      values.push(val === null || val === undefined ? null : (typeof val === 'object' ? JSON.stringify(val) : val));
    }
    fields.push("updated_at = datetime('now')");
    values.push(id);
    db().prepare(`UPDATE resource_catalog SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    return db().prepare('SELECT * FROM resource_catalog WHERE id = ?').get(id);
  });

  ipcMain.handle('db:resource-catalog:delete', (_, id) => {
    db().prepare('DELETE FROM resource_catalog WHERE id = ?').run(id);
    return { success: true };
  });

  // Sync: scans source tables and creates/updates catalog entries
  ipcMain.handle('db:resource-catalog:sync', (_, projectId) => {
    const syncSource = (sourceTable, resourceType, sourceSystem) => {
      const rows = projectId
        ? db().prepare(`SELECT * FROM ${sourceTable} WHERE project_id = ?`).all(projectId)
        : db().prepare(`SELECT * FROM ${sourceTable}`).all();

      let created = 0, updated = 0;
      for (const row of rows) {
        const existing = db().prepare(
          'SELECT * FROM resource_catalog WHERE source_system = ? AND source_id = ?'
        ).get(sourceSystem, row.id);

        if (!existing) {
          const id = uuidv4();
          db().prepare(`
            INSERT INTO resource_catalog (id, resource_type, source_system, source_id, version_id, name, status, tags, metadata)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            id, resourceType, sourceSystem, row.id,
            row.version || '1.0', row.name || row.title || '',
            row.status || 'draft',
            row.tags || '[]',
            JSON.stringify({ project_id: row.project_id })
          );
          created++;
        } else if (existing.updated_at < row.updated_at) {
          db().prepare(`
            UPDATE resource_catalog SET name = ?, status = ?, version_id = ?, tags = ?, updated_at = datetime('now')
            WHERE id = ?
          `).run(
            row.name || row.title || '', row.status || 'draft',
            row.version || '1.0', row.tags || '[]', existing.id
          );
          updated++;
        }
      }
      return { created, updated };
    };

    const results = {
      characters: syncSource('characters', 'CHARACTER', 'CHARACTER_SYSTEM'),
      stories: syncSource('stories', 'STORY', 'CONTENT_SYSTEM'),
      worlds: syncSource('worlds', 'WORLD', 'CONTEXT_SYSTEM'),
      scenes: syncSource('scenes', 'SCENE', 'CONTENT_SYSTEM'),
      visual_assets: syncSource('visual_assets', 'VISUAL_ASSET', 'CHARACTER_SYSTEM'),
      character_variants: syncSource('character_variants', 'CHARACTER_VARIANT', 'CHARACTER_SYSTEM'),
      locations: syncSource('locations', 'LOCATION', 'CONTEXT_SYSTEM'),
      environments: syncSource('environments', 'ENVIRONMENT', 'CONTEXT_SYSTEM'),
    };
    return results;
  });

  // ── WORKFLOWS ───────────────────────────────
  registerCrud('workflows', 'workflows', 'project_id');

  ipcMain.handle('db:workflows:list-templates', () => {
    return db().prepare('SELECT * FROM workflows WHERE is_template = 1 ORDER BY updated_at DESC').all();
  });

  ipcMain.handle('db:workflows:save-as-template', (_, id) => {
    db().prepare("UPDATE workflows SET is_template = 1, updated_at = datetime('now') WHERE id = ?").run(id);
    return db().prepare('SELECT * FROM workflows WHERE id = ?').get(id);
  });

  ipcMain.handle('db:workflows:unset-template', (_, id) => {
    db().prepare("UPDATE workflows SET is_template = 0, updated_at = datetime('now') WHERE id = ?").run(id);
    return db().prepare('SELECT * FROM workflows WHERE id = ?').get(id);
  });

  ipcMain.handle('db:workflows:duplicate', (_, sourceId, opts = {}) => {
    const src = db().prepare('SELECT * FROM workflows WHERE id = ?').get(sourceId);
    if (!src) throw new Error('Source workflow not found');

    const newId = uuidv4();
    const newName = opts.name || `${src.name} (Copy)`;
    const asTemplate = opts.asTemplate ? 1 : 0;

    db().prepare(`
      INSERT INTO workflows (id, project_id, name, description, is_template, status, metadata)
      VALUES (?, ?, ?, ?, ?, 'draft', ?)
    `).run(newId, src.project_id, newName, src.description || '', asTemplate, src.metadata || '{}');

    // Copy nodes with new IDs, building old→new map
    const srcNodes = db().prepare('SELECT * FROM workflow_nodes WHERE workflow_id = ? ORDER BY created_at ASC').all(sourceId);
    const nodeMap = {};
    const insertNode = db().prepare(`
      INSERT INTO workflow_nodes (id, workflow_id, node_type, node_subtype, label, position_x, position_y, config, resource_ref, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
    `);
    for (const n of srcNodes) {
      const nid = uuidv4();
      nodeMap[n.id] = nid;
      insertNode.run(nid, newId, n.node_type, n.node_subtype, n.label, n.position_x, n.position_y, n.config || '{}', n.resource_ref || '{}');
    }

    // Copy connections remapping node IDs
    const srcConns = db().prepare('SELECT * FROM workflow_connections WHERE workflow_id = ? ORDER BY created_at ASC').all(sourceId);
    const insertConn = db().prepare(`
      INSERT INTO workflow_connections (id, workflow_id, source_node_id, target_node_id, data_type, input_role, required, config)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const c of srcConns) {
      const cid = uuidv4();
      const newSrc = nodeMap[c.source_node_id];
      const newTgt = nodeMap[c.target_node_id];
      if (newSrc && newTgt) {
        insertConn.run(cid, newId, newSrc, newTgt, c.data_type || '', c.input_role || '', c.required ?? 1, c.config || '{}');
      }
    }

    return db().prepare('SELECT * FROM workflows WHERE id = ?').get(newId);
  });

  // ── WORKFLOW NODES ──────────────────────────
  ipcMain.handle('db:workflow-nodes:list', (_, workflowId) => {
    return db().prepare('SELECT * FROM workflow_nodes WHERE workflow_id = ? ORDER BY created_at ASC').all(workflowId);
  });

  ipcMain.handle('db:workflow-nodes:get', (_, id) => {
    return db().prepare('SELECT * FROM workflow_nodes WHERE id = ?').get(id);
  });

  ipcMain.handle('db:workflow-nodes:create', (_, data) => {
    const id = uuidv4();
    db().prepare(`
      INSERT INTO workflow_nodes (id, workflow_id, node_type, node_subtype, label, position_x, position_y, config, resource_ref, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, data.workflow_id, data.node_type, data.node_subtype, data.label,
      data.position_x || 0, data.position_y || 0,
      typeof data.config === 'string' ? data.config : JSON.stringify(data.config || {}),
      typeof data.resource_ref === 'string' ? data.resource_ref : JSON.stringify(data.resource_ref || {}),
      data.status || 'pending'
    );
    return db().prepare('SELECT * FROM workflow_nodes WHERE id = ?').get(id);
  });

  ipcMain.handle('db:workflow-nodes:update', (_, id, data) => {
    const fields = [];
    const values = [];
    for (const [key, val] of Object.entries(data)) {
      if (key === 'id') continue;
      fields.push(`${key} = ?`);
      values.push(val === null || val === undefined ? null : (typeof val === 'object' ? JSON.stringify(val) : val));
    }
    fields.push("updated_at = datetime('now')");
    values.push(id);
    db().prepare(`UPDATE workflow_nodes SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    return db().prepare('SELECT * FROM workflow_nodes WHERE id = ?').get(id);
  });

  ipcMain.handle('db:workflow-nodes:delete', (_, id) => {
    db().prepare('DELETE FROM workflow_nodes WHERE id = ?').run(id);
    return { success: true };
  });

  // Batch update positions (for canvas drag operations)
  ipcMain.handle('db:workflow-nodes:batch-update-positions', (_, updates) => {
    const stmt = db().prepare('UPDATE workflow_nodes SET position_x = ?, position_y = ?, updated_at = datetime(\'now\') WHERE id = ?');
    const transaction = db().transaction((items) => {
      for (const { id, position_x, position_y } of items) {
        stmt.run(position_x, position_y, id);
      }
    });
    transaction(updates);
    return { success: true };
  });

  // ── WORKFLOW CONNECTIONS ────────────────────
  ipcMain.handle('db:workflow-connections:list', (_, workflowId) => {
    return db().prepare('SELECT * FROM workflow_connections WHERE workflow_id = ? ORDER BY created_at ASC').all(workflowId);
  });

  ipcMain.handle('db:workflow-connections:create', (_, data) => {
    const id = uuidv4();
    db().prepare(`
      INSERT INTO workflow_connections (id, workflow_id, source_node_id, target_node_id, data_type, input_role, required, config)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, data.workflow_id, data.source_node_id, data.target_node_id,
      data.data_type || '', data.input_role || '',
      data.required !== undefined ? (data.required ? 1 : 0) : 1,
      JSON.stringify(data.config || {})
    );
    return db().prepare('SELECT * FROM workflow_connections WHERE id = ?').get(id);
  });

  ipcMain.handle('db:workflow-connections:delete', (_, id) => {
    db().prepare('DELETE FROM workflow_connections WHERE id = ?').run(id);
    return { success: true };
  });

  // Get connections for a specific node (incoming + outgoing)
  ipcMain.handle('db:workflow-connections:list-by-node', (_, nodeId) => {
    return db().prepare(
      'SELECT * FROM workflow_connections WHERE source_node_id = ? OR target_node_id = ? ORDER BY created_at ASC'
    ).all(nodeId, nodeId);
  });

  // ── WORKFLOW RUNS ───────────────────────────
  ipcMain.handle('db:workflow-runs:list', (_, workflowId) => {
    return db().prepare('SELECT * FROM workflow_runs WHERE workflow_id = ? ORDER BY created_at DESC').all(workflowId);
  });

  ipcMain.handle('db:workflow-runs:get', (_, id) => {
    return db().prepare('SELECT * FROM workflow_runs WHERE id = ?').get(id);
  });

  ipcMain.handle('db:workflow-runs:create', (_, data) => {
    const id = uuidv4();
    db().prepare(`
      INSERT INTO workflow_runs (id, workflow_id, status, input_snapshot, metadata)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      id, data.workflow_id, data.status || 'pending',
      JSON.stringify(data.input_snapshot || {}),
      JSON.stringify(data.metadata || {})
    );
    return db().prepare('SELECT * FROM workflow_runs WHERE id = ?').get(id);
  });

  ipcMain.handle('db:workflow-runs:update', (_, id, data) => {
    const fields = [];
    const values = [];
    for (const [key, val] of Object.entries(data)) {
      if (key === 'id') continue;
      fields.push(`${key} = ?`);
      values.push(val === null || val === undefined ? null : (typeof val === 'object' ? JSON.stringify(val) : val));
    }
    values.push(id);
    db().prepare(`UPDATE workflow_runs SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    return db().prepare('SELECT * FROM workflow_runs WHERE id = ?').get(id);
  });

  // ── GENERATION ATTEMPTS ─────────────────────
  ipcMain.handle('db:generation-attempts:list', (_, filters) => {
    let sql = 'SELECT * FROM generation_attempts WHERE 1=1';
    const params = [];
    if (filters?.workflow_run_id) {
      sql += ' AND workflow_run_id = ?';
      params.push(filters.workflow_run_id);
    }
    if (filters?.workflow_node_id) {
      sql += ' AND workflow_node_id = ?';
      params.push(filters.workflow_node_id);
    }
    if (filters?.scene_id) {
      sql += ' AND scene_id = ?';
      params.push(filters.scene_id);
    }
    if (filters?.status) {
      sql += ' AND status = ?';
      params.push(filters.status);
    }
    sql += ' ORDER BY created_at DESC';
    return db().prepare(sql).all(...params);
  });

  ipcMain.handle('db:generation-attempts:get', (_, id) => {
    return db().prepare('SELECT * FROM generation_attempts WHERE id = ?').get(id);
  });

  ipcMain.handle('db:generation-attempts:create', (_, data) => {
    const id = uuidv4();
    // Get next attempt number for this node+run
    const prev = db().prepare(
      'SELECT MAX(attempt_number) as max_num FROM generation_attempts WHERE workflow_node_id = ? AND workflow_run_id = ?'
    ).get(data.workflow_node_id, data.workflow_run_id);
    const attemptNumber = (prev?.max_num || 0) + 1;

    db().prepare(`
      INSERT INTO generation_attempts (id, workflow_run_id, workflow_node_id, scene_id, attempt_number, input_snapshot, prompt, negative_prompt, provider_id, provider_params, status, previous_attempt_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, data.workflow_run_id, data.workflow_node_id, data.scene_id || null,
      attemptNumber, JSON.stringify(data.input_snapshot || {}),
      data.prompt || '', data.negative_prompt || '',
      data.provider_id || null, JSON.stringify(data.provider_params || {}),
      data.status || 'generating', data.previous_attempt_id || null
    );
    return db().prepare('SELECT * FROM generation_attempts WHERE id = ?').get(id);
  });

  ipcMain.handle('db:generation-attempts:update', (_, id, data) => {
    const fields = [];
    const values = [];
    for (const [key, val] of Object.entries(data)) {
      if (key === 'id') continue;
      fields.push(`${key} = ?`);
      values.push(val === null || val === undefined ? null : (typeof val === 'object' ? JSON.stringify(val) : val));
    }
    values.push(id);
    db().prepare(`UPDATE generation_attempts SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    return db().prepare('SELECT * FROM generation_attempts WHERE id = ?').get(id);
  });

  // Get attempt history chain (following previous_attempt_id)
  ipcMain.handle('db:generation-attempts:get-history', (_, attemptId) => {
    const history = [];
    let currentId = attemptId;
    while (currentId) {
      const attempt = db().prepare('SELECT * FROM generation_attempts WHERE id = ?').get(currentId);
      if (!attempt) break;
      history.push(attempt);
      currentId = attempt.previous_attempt_id;
    }
    return history;
  });

  // ── REVIEWS ─────────────────────────────────
  registerCrud('reviews', 'reviews', 'generation_attempt_id');

  ipcMain.handle('db:reviews:list-by-attempt', (_, attemptId) => {
    return db().prepare('SELECT * FROM reviews WHERE generation_attempt_id = ? ORDER BY created_at ASC').all(attemptId);
  });

  // ── FEEDBACK ────────────────────────────────
  registerCrud('feedback', 'feedback', 'generation_attempt_id');

  ipcMain.handle('db:feedback:list-by-attempt', (_, attemptId) => {
    return db().prepare('SELECT * FROM feedback WHERE generation_attempt_id = ? ORDER BY created_at ASC').all(attemptId);
  });

  // ── PROVIDER CONFIGS ────────────────────────
  ipcMain.handle('db:provider-configs:list', () => {
    return db().prepare('SELECT * FROM provider_configs ORDER BY name ASC').all();
  });

  ipcMain.handle('db:provider-configs:get', (_, id) => {
    return db().prepare('SELECT * FROM provider_configs WHERE id = ?').get(id);
  });

  ipcMain.handle('db:provider-configs:create', (_, data) => {
    const id = uuidv4();
    db().prepare(`
      INSERT INTO provider_configs (id, name, provider_type, endpoint, capabilities, default_params, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, data.name, data.provider_type, data.endpoint || '',
      JSON.stringify(data.capabilities || []),
      JSON.stringify(data.default_params || {}),
      data.status || 'active'
    );
    return db().prepare('SELECT * FROM provider_configs WHERE id = ?').get(id);
  });

  ipcMain.handle('db:provider-configs:update', (_, id, data) => {
    const fields = [];
    const values = [];
    for (const [key, val] of Object.entries(data)) {
      if (key === 'id') continue;
      fields.push(`${key} = ?`);
      values.push(val === null || val === undefined ? null : (typeof val === 'object' ? JSON.stringify(val) : val));
    }
    fields.push("updated_at = datetime('now')");
    values.push(id);
    db().prepare(`UPDATE provider_configs SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    return db().prepare('SELECT * FROM provider_configs WHERE id = ?').get(id);
  });

  ipcMain.handle('db:provider-configs:delete', (_, id) => {
    db().prepare('DELETE FROM provider_configs WHERE id = ?').run(id);
    return { success: true };
  });

  // Get providers by capability
  ipcMain.handle('db:provider-configs:list-by-capability', (_, capability) => {
    return db().prepare(
      "SELECT * FROM provider_configs WHERE status = 'active' AND capabilities LIKE ? ORDER BY name ASC"
    ).all(`%${capability}%`);
  });

  // ── CHARACTER STATES ────────────────────────
  ipcMain.handle('db:character-states:list', (_, filters) => {
    let sql = 'SELECT * FROM character_states WHERE 1=1';
    const params = [];
    if (filters?.character_id) {
      sql += ' AND character_id = ?';
      params.push(filters.character_id);
    }
    if (filters?.scene_id) {
      sql += ' AND scene_id = ?';
      params.push(filters.scene_id);
    }
    sql += ' ORDER BY created_at ASC';
    return db().prepare(sql).all(...params);
  });

  ipcMain.handle('db:character-states:get', (_, id) => {
    return db().prepare('SELECT * FROM character_states WHERE id = ?').get(id);
  });

  ipcMain.handle('db:character-states:create', (_, data) => {
    const id = uuidv4();
    db().prepare(`
      INSERT INTO character_states (id, character_id, scene_id, state_description, state_type, attributes, previous_state_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, data.character_id, data.scene_id || null,
      data.state_description || '', data.state_type || 'temporary',
      JSON.stringify(data.attributes || {}), data.previous_state_id || null
    );
    return db().prepare('SELECT * FROM character_states WHERE id = ?').get(id);
  });

  ipcMain.handle('db:character-states:update', (_, id, data) => {
    const fields = [];
    const values = [];
    for (const [key, val] of Object.entries(data)) {
      if (key === 'id') continue;
      fields.push(`${key} = ?`);
      values.push(val === null || val === undefined ? null : (typeof val === 'object' ? JSON.stringify(val) : val));
    }
    values.push(id);
    db().prepare(`UPDATE character_states SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    return db().prepare('SELECT * FROM character_states WHERE id = ?').get(id);
  });

  ipcMain.handle('db:character-states:delete', (_, id) => {
    db().prepare('DELETE FROM character_states WHERE id = ?').run(id);
    return { success: true };
  });

  // Get state chain for a character (following previous_state_id)
  ipcMain.handle('db:character-states:get-chain', (_, characterId, sceneId) => {
    // Get the latest state for this character up to this scene
    const states = db().prepare(
      'SELECT * FROM character_states WHERE character_id = ? ORDER BY created_at ASC'
    ).all(characterId);

    if (sceneId) {
      // Filter to states up to and including the given scene
      const sceneStates = states.filter(s => s.scene_id === sceneId || !s.scene_id);
      return sceneStates;
    }
    return states;
  });

  // ── PROJECT BRIEFS ──────────────────────────
  registerCrud('project-briefs', 'project_briefs', 'project_id');

  // ── CHARACTER VARIANTS ─────────────────────
  registerCrud('character-variants', 'character_variants', 'character_id');

  ipcMain.handle('db:character-variants:list-by-project', (_, projectId) => {
    return db().prepare('SELECT * FROM character_variants WHERE project_id = ? ORDER BY created_at ASC').all(projectId);
  });

  // ── LOCATIONS ──────────────────────────────
  registerCrud('locations', 'locations', 'world_id');

  ipcMain.handle('db:locations:list-by-project', (_, projectId) => {
    return db().prepare('SELECT * FROM locations WHERE project_id = ? ORDER BY created_at ASC').all(projectId);
  });

  // ── ENVIRONMENTS ───────────────────────────
  registerCrud('environments', 'environments', 'location_id');

  ipcMain.handle('db:environments:list-by-project', (_, projectId) => {
    return db().prepare('SELECT * FROM environments WHERE project_id = ? ORDER BY created_at ASC').all(projectId);
  });

  // ── CONTEXT STATES ─────────────────────────
  ipcMain.handle('db:context-states:list', (_, environmentId) => {
    return db().prepare('SELECT * FROM context_states WHERE environment_id = ? ORDER BY created_at ASC').all(environmentId);
  });

  ipcMain.handle('db:context-states:list-by-scene', (_, sceneId) => {
    return db().prepare('SELECT * FROM context_states WHERE scene_id = ? ORDER BY created_at ASC').all(sceneId);
  });

  ipcMain.handle('db:context-states:get', (_, id) => {
    return db().prepare('SELECT * FROM context_states WHERE id = ?').get(id);
  });

  ipcMain.handle('db:context-states:create', (_, data) => {
    const id = uuidv4();
    db().prepare(`
      INSERT INTO context_states (id, environment_id, scene_id, project_id, time_of_day, weather_condition, lighting_condition, objects_present, objects_changed, atmosphere_override, state_description, state_type, previous_state_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, data.environment_id, data.scene_id || null, data.project_id,
      data.time_of_day || '', data.weather_condition || '',
      data.lighting_condition || '',
      JSON.stringify(data.objects_present || []),
      JSON.stringify(data.objects_changed || []),
      data.atmosphere_override || '', data.state_description || '',
      data.state_type || 'temporary', data.previous_state_id || null
    );
    return db().prepare('SELECT * FROM context_states WHERE id = ?').get(id);
  });

  ipcMain.handle('db:context-states:update', (_, id, data) => {
    const fields = [];
    const values = [];
    for (const [key, val] of Object.entries(data)) {
      if (key === 'id') continue;
      fields.push(`${key} = ?`);
      values.push(val === null || val === undefined ? null : (typeof val === 'object' ? JSON.stringify(val) : val));
    }
    values.push(id);
    db().prepare(`UPDATE context_states SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    return db().prepare('SELECT * FROM context_states WHERE id = ?').get(id);
  });

  ipcMain.handle('db:context-states:delete', (_, id) => {
    db().prepare('DELETE FROM context_states WHERE id = ?').run(id);
    return { success: true };
  });

  // ── PROMPT TEMPLATES ───────────────────────
  registerCrud('prompt-templates', 'prompt_templates', 'project_id');

  ipcMain.handle('db:prompt-templates:list-by-purpose', (_, purpose) => {
    return db().prepare('SELECT * FROM prompt_templates WHERE purpose = ? ORDER BY created_at DESC').all(purpose);
  });

  ipcMain.handle('db:prompt-templates:list-global', () => {
    return db().prepare('SELECT * FROM prompt_templates WHERE is_global = 1 ORDER BY created_at DESC').all();
  });

  // ── DASHBOARD STATS ──────────────────────────
  ipcMain.handle('db:dashboard:stats', () => {
    const projects = db().prepare('SELECT COUNT(*) as count FROM projects').get();
    const inProduction = db().prepare("SELECT COUNT(*) as count FROM projects WHERE production_status NOT IN ('idea', 'completed')").get();
    const completed = db().prepare("SELECT COUNT(*) as count FROM projects WHERE production_status = 'completed'").get();
    const totalShots = db().prepare('SELECT COUNT(*) as count FROM shots').get();
    const approvedShots = db().prepare("SELECT COUNT(*) as count FROM shots WHERE status = 'final'").get();
    const resources = db().prepare('SELECT COUNT(*) as count FROM resources').get();
    const workflows = db().prepare('SELECT COUNT(*) as count FROM workflows').get();
    const catalogEntries = db().prepare('SELECT COUNT(*) as count FROM resource_catalog').get();

    // Workspace stats
    const totalAttempts = db().prepare('SELECT COUNT(*) as count FROM generation_attempts').get();
    const approvedAttempts = db().prepare("SELECT COUNT(*) as count FROM generation_attempts WHERE status = 'approved'").get();
    const pendingReviews = db().prepare("SELECT COUNT(*) as count FROM generation_attempts WHERE status IN ('generated', 'review')").get();
    const totalRuns = db().prepare('SELECT COUNT(*) as count FROM workflow_runs').get();
    const activeProviders = db().prepare("SELECT COUNT(*) as count FROM provider_configs WHERE status = 'active'").get();

    const recentProjects = db().prepare('SELECT * FROM projects ORDER BY updated_at DESC LIMIT 5').all();
    const recentWorkflows = db().prepare('SELECT * FROM workflows ORDER BY updated_at DESC LIMIT 5').all();
    const recentAttempts = db().prepare(
      `SELECT ga.*, wn.label as node_label, w.name as workflow_name
       FROM generation_attempts ga
       LEFT JOIN workflow_nodes wn ON ga.workflow_node_id = wn.id
       LEFT JOIN workflows w ON wn.workflow_id = w.id
       ORDER BY ga.created_at DESC LIMIT 8`
    ).all();

    return {
      totalProjects: projects.count,
      inProduction: inProduction.count,
      completed: completed.count,
      totalShots: totalShots.count,
      approvedShots: approvedShots.count,
      totalResources: resources.count,
      totalWorkflows: workflows.count,
      totalCatalogEntries: catalogEntries.count,
      totalAttempts: totalAttempts.count,
      approvedAttempts: approvedAttempts.count,
      pendingReviews: pendingReviews.count,
      totalRuns: totalRuns.count,
      activeProviders: activeProviders.count,
      recentProjects,
      recentWorkflows,
      recentAttempts,
    };
  });

  // ── PRODUCTION HISTORY (cross-workflow) ──────
  ipcMain.handle('db:production-history:list', (_, filters = {}) => {
    let where = [];
    let params = [];

    if (filters.status) {
      where.push('ga.status = ?');
      params.push(filters.status);
    }
    if (filters.workflowId) {
      where.push('w.id = ?');
      params.push(filters.workflowId);
    }
    if (filters.search) {
      where.push('(wn.label LIKE ? OR w.name LIKE ? OR ga.provider_id LIKE ?)');
      const term = `%${filters.search}%`;
      params.push(term, term, term);
    }

    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const limit = filters.limit || 50;
    const offset = filters.offset || 0;
    params.push(limit, offset);

    const rows = db().prepare(
      `SELECT ga.*, wn.label as node_label, wn.node_subtype, w.name as workflow_name, w.id as workflow_id
       FROM generation_attempts ga
       LEFT JOIN workflow_nodes wn ON ga.workflow_node_id = wn.id
       LEFT JOIN workflows w ON wn.workflow_id = w.id
       ${whereClause}
       ORDER BY ga.created_at DESC
       LIMIT ? OFFSET ?`
    ).all(...params);

    const total = db().prepare(
      `SELECT COUNT(*) as count
       FROM generation_attempts ga
       LEFT JOIN workflow_nodes wn ON ga.workflow_node_id = wn.id
       LEFT JOIN workflows w ON wn.workflow_id = w.id
       ${whereClause}`
    ).get(...params.slice(0, -2));

    return { rows, total: total.count };
  });

  ipcMain.handle('db:production-history:stats', () => {
    const byStatus = db().prepare(
      `SELECT status, COUNT(*) as count FROM generation_attempts GROUP BY status`
    ).all();
    const byWorkflow = db().prepare(
      `SELECT w.name, w.id, COUNT(*) as count
       FROM generation_attempts ga
       JOIN workflow_nodes wn ON ga.workflow_node_id = wn.id
       JOIN workflows w ON wn.workflow_id = w.id
       GROUP BY w.id
       ORDER BY count DESC
       LIMIT 10`
    ).all();
    return { byStatus, byWorkflow };
  });

  // ── Scenes by project (not just episode) ─────
  ipcMain.handle('db:scenes:list-by-project', (_, projectId) => {
    return db().prepare('SELECT * FROM scenes WHERE project_id = ? ORDER BY scene_number ASC').all(projectId);
  });

  // ════════════════════════════════════════════════════════
  //  DEPENDENCY RECORDS — Impact/Dependency Tracking (Spec 1 §9)
  // ════════════════════════════════════════════════════════
  ipcMain.handle('db:dependency-records:list', (_, projectId) => {
    return db().prepare(
      'SELECT * FROM dependency_records WHERE project_id = ? ORDER BY created_at DESC'
    ).all(projectId);
  });

  ipcMain.handle('db:dependency-records:get', (_, id) => {
    return db().prepare('SELECT * FROM dependency_records WHERE id = ?').get(id);
  });

  ipcMain.handle('db:dependency-records:create', (_, data) => {
    const id = 'dep_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
    db().prepare(`INSERT INTO dependency_records
      (id, project_id, source_entity_type, source_entity_id,
       dependent_entity_type, dependent_entity_id, dependency_type,
       impact_level, status, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(id, data.project_id, data.source_entity_type, data.source_entity_id,
      data.dependent_entity_type, data.dependent_entity_id,
      data.dependency_type || 'reference', data.impact_level || 'medium',
      'current', data.notes || '');
    return db().prepare('SELECT * FROM dependency_records WHERE id = ?').get(id);
  });

  ipcMain.handle('db:dependency-records:delete', (_, id) => {
    return db().prepare('DELETE FROM dependency_records WHERE id = ?').run(id);
  });

  // Get all dependents of a source entity
  ipcMain.handle('db:dependency-records:get-dependents', (_, sourceType, sourceId) => {
    return db().prepare(
      `SELECT * FROM dependency_records
       WHERE source_entity_type = ? AND source_entity_id = ?
       ORDER BY impact_level DESC`
    ).all(sourceType, sourceId);
  });

  // Get all dependencies (sources) of an entity
  ipcMain.handle('db:dependency-records:get-sources', (_, depType, depId) => {
    return db().prepare(
      `SELECT * FROM dependency_records
       WHERE dependent_entity_type = ? AND dependent_entity_id = ?
       ORDER BY impact_level DESC`
    ).all(depType, depId);
  });

  // Propagate change: mark all dependents as needs_review when source is modified
  ipcMain.handle('db:dependency-records:propagate-change', (_, sourceType, sourceId) => {
    const now = new Date().toISOString();
    const result = db().prepare(
      `UPDATE dependency_records SET status = 'needs_review', updated_at = ?
       WHERE source_entity_type = ? AND source_entity_id = ? AND status = 'current'`
    ).run(now, sourceType, sourceId);

    // Cascade: dependents that depend on things now marked needs_review
    // get marked outdated
    const needsReview = db().prepare(
      `SELECT dependent_entity_type, dependent_entity_id FROM dependency_records
       WHERE source_entity_type = ? AND source_entity_id = ? AND status = 'needs_review'`
    ).all(sourceType, sourceId);

    for (const dep of needsReview) {
      db().prepare(
        `UPDATE dependency_records SET status = 'outdated', updated_at = ?
         WHERE source_entity_type = ? AND source_entity_id = ?
         AND status = 'current'`
      ).run(now, dep.dependent_entity_type, dep.dependent_entity_id);
    }

    return { updated: result.changes, cascaded: needsReview.length };
  });

  // Resolve dependency (mark back as current after review)
  ipcMain.handle('db:dependency-records:resolve', (_, id) => {
    const now = new Date().toISOString();
    db().prepare(
      `UPDATE dependency_records SET status = 'current', last_validated_at = ?, updated_at = ? WHERE id = ?`
    ).run(now, now, id);
    return db().prepare('SELECT * FROM dependency_records WHERE id = ?').get(id);
  });

  // Impact summary for a project
  ipcMain.handle('db:dependency-records:impact-summary', (_, projectId) => {
    const byStatus = db().prepare(
      `SELECT status, COUNT(*) as count FROM dependency_records
       WHERE project_id = ? GROUP BY status`
    ).all(projectId);
    const byType = db().prepare(
      `SELECT dependency_type, COUNT(*) as count FROM dependency_records
       WHERE project_id = ? GROUP BY dependency_type`
    ).all(projectId);
    const critical = db().prepare(
      `SELECT * FROM dependency_records
       WHERE project_id = ? AND status IN ('needs_review', 'outdated', 'broken')
       ORDER BY CASE impact_level
         WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4
       END LIMIT 20`
    ).all(projectId);
    return { byStatus, byType, critical };
  });

  // ════════════════════════════════════════════════════════
  //  EXECUTION SNAPSHOTS — Immutable RUN records (Spec 2 §3.C)
  // ════════════════════════════════════════════════════════
  ipcMain.handle('db:execution-snapshots:create', (_, data) => {
    const id = 'RUN-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6).toUpperCase();
    db().prepare(`INSERT INTO execution_snapshots
      (id, project_id, workflow_run_id, scene_id, shot_id, snapshot_type,
       frozen_prompt, frozen_negative_prompt, frozen_character_states,
       frozen_context_states, frozen_spatial_data, frozen_resource_versions,
       frozen_provider_config, frozen_prompt_template_id, frozen_prompt_template_version,
       production_mode, gate_validation_result)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(id, data.project_id, data.workflow_run_id || null, data.scene_id || null,
      data.shot_id || null, data.snapshot_type || 'generation',
      data.frozen_prompt || '', data.frozen_negative_prompt || '',
      JSON.stringify(data.frozen_character_states || {}),
      JSON.stringify(data.frozen_context_states || {}),
      JSON.stringify(data.frozen_spatial_data || {}),
      JSON.stringify(data.frozen_resource_versions || {}),
      JSON.stringify(data.frozen_provider_config || {}),
      data.frozen_prompt_template_id || null,
      data.frozen_prompt_template_version || '',
      data.production_mode || 'reference',
      JSON.stringify(data.gate_validation_result || {}));
    return db().prepare('SELECT * FROM execution_snapshots WHERE id = ?').get(id);
  });

  ipcMain.handle('db:execution-snapshots:get', (_, id) => {
    return db().prepare('SELECT * FROM execution_snapshots WHERE id = ?').get(id);
  });

  ipcMain.handle('db:execution-snapshots:list', (_, projectId) => {
    return db().prepare(
      'SELECT * FROM execution_snapshots WHERE project_id = ? ORDER BY created_at DESC LIMIT 100'
    ).all(projectId);
  });

  ipcMain.handle('db:execution-snapshots:list-by-shot', (_, shotId) => {
    return db().prepare(
      'SELECT * FROM execution_snapshots WHERE shot_id = ? ORDER BY created_at DESC'
    ).all(shotId);
  });

  // ════════════════════════════════════════════════════════
  //  SPATIAL CONTINUITY — Spec 1 §8.3
  // ════════════════════════════════════════════════════════
  ipcMain.handle('db:spatial-continuity:list', (_, sceneId) => {
    return db().prepare(
      'SELECT * FROM spatial_continuity WHERE scene_id = ? ORDER BY created_at ASC'
    ).all(sceneId);
  });

  ipcMain.handle('db:spatial-continuity:list-by-shot', (_, shotId) => {
    return db().prepare(
      'SELECT * FROM spatial_continuity WHERE shot_id = ? ORDER BY element_type ASC'
    ).all(shotId);
  });

  ipcMain.handle('db:spatial-continuity:create', (_, data) => {
    const id = 'spc_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
    db().prepare(`INSERT INTO spatial_continuity
      (id, project_id, scene_id, shot_id, element_type, element_ref_id,
       element_name, position_data, orientation, frame_of_reference,
       previous_shot_id, continuity_status, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(id, data.project_id, data.scene_id, data.shot_id || null,
      data.element_type, data.element_ref_id || '',
      data.element_name || '', JSON.stringify(data.position_data || {}),
      data.orientation || '', data.frame_of_reference || '',
      data.previous_shot_id || null, data.continuity_status || 'unverified',
      data.notes || '');
    return db().prepare('SELECT * FROM spatial_continuity WHERE id = ?').get(id);
  });

  ipcMain.handle('db:spatial-continuity:update', (_, id, data) => {
    const fields = [];
    const values = [];
    for (const [k, v] of Object.entries(data)) {
      if (k === 'id') continue;
      fields.push(`${k} = ?`);
      values.push(typeof v === 'object' ? JSON.stringify(v) : v);
    }
    fields.push("updated_at = datetime('now')");
    values.push(id);
    db().prepare(`UPDATE spatial_continuity SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    return db().prepare('SELECT * FROM spatial_continuity WHERE id = ?').get(id);
  });

  ipcMain.handle('db:spatial-continuity:delete', (_, id) => {
    return db().prepare('DELETE FROM spatial_continuity WHERE id = ?').run(id);
  });

  // ════════════════════════════════════════════════════════
  //  CONTINUITY LEDGER — Spec 2 §3.E
  // ════════════════════════════════════════════════════════
  ipcMain.handle('db:continuity-ledger:list', (_, sceneId) => {
    return db().prepare(
      `SELECT cl.*, sa.shot_number as shot_a_number, sb.shot_number as shot_b_number
       FROM continuity_ledger cl
       LEFT JOIN shots sa ON cl.shot_a_id = sa.id
       LEFT JOIN shots sb ON cl.shot_b_id = sb.id
       WHERE cl.scene_id = ? ORDER BY sa.shot_number ASC`
    ).all(sceneId);
  });

  ipcMain.handle('db:continuity-ledger:create', (_, data) => {
    const id = 'cled_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
    db().prepare(`INSERT INTO continuity_ledger
      (id, project_id, scene_id, shot_a_id, shot_b_id, check_type,
       status, details, auto_detected)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(id, data.project_id, data.scene_id, data.shot_a_id, data.shot_b_id,
      data.check_type, data.status || 'pending', data.details || '',
      data.auto_detected ? 1 : 0);
    return db().prepare('SELECT * FROM continuity_ledger WHERE id = ?').get(id);
  });

  ipcMain.handle('db:continuity-ledger:update-status', (_, id, status, resolvedBy) => {
    const now = new Date().toISOString();
    db().prepare(
      `UPDATE continuity_ledger SET status = ?, resolved_at = ?, resolved_by = ? WHERE id = ?`
    ).run(status, status === 'passed' || status === 'waived' ? now : null, resolvedBy || '', id);
    return db().prepare('SELECT * FROM continuity_ledger WHERE id = ?').get(id);
  });

  ipcMain.handle('db:continuity-ledger:summary', (_, projectId) => {
    return db().prepare(
      `SELECT check_type, status, COUNT(*) as count
       FROM continuity_ledger WHERE project_id = ?
       GROUP BY check_type, status`
    ).all(projectId);
  });

  // ════════════════════════════════════════════════════════
  //  VALIDATION RESULTS — Multi-level validation (Spec 1 §12)
  // ════════════════════════════════════════════════════════
  ipcMain.handle('db:validation-results:list', (_, projectId, level) => {
    if (level) {
      return db().prepare(
        `SELECT * FROM validation_results
         WHERE project_id = ? AND validation_level = ?
         ORDER BY created_at DESC`
      ).all(projectId, level);
    }
    return db().prepare(
      'SELECT * FROM validation_results WHERE project_id = ? ORDER BY created_at DESC LIMIT 200'
    ).all(projectId);
  });

  ipcMain.handle('db:validation-results:get-for-entity', (_, entityType, entityId) => {
    return db().prepare(
      `SELECT * FROM validation_results
       WHERE target_entity_type = ? AND target_entity_id = ?
       ORDER BY created_at DESC LIMIT 1`
    ).get(entityType, entityId);
  });

  ipcMain.handle('db:validation-results:create', (_, data) => {
    const id = 'val_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
    db().prepare(`INSERT INTO validation_results
      (id, project_id, validation_level, target_entity_type, target_entity_id,
       validation_type, status, data_confidence, issues, warnings, metadata, validated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(id, data.project_id, data.validation_level, data.target_entity_type,
      data.target_entity_id, data.validation_type || 'auto',
      data.status || 'pending', data.data_confidence || 'confirmed',
      JSON.stringify(data.issues || []), JSON.stringify(data.warnings || []),
      JSON.stringify(data.metadata || {}), data.validated_at || null);
    return db().prepare('SELECT * FROM validation_results WHERE id = ?').get(id);
  });

  ipcMain.handle('db:validation-results:update', (_, id, data) => {
    const fields = [];
    const values = [];
    for (const [k, v] of Object.entries(data)) {
      if (k === 'id') continue;
      fields.push(`${k} = ?`);
      values.push(typeof v === 'object' ? JSON.stringify(v) : v);
    }
    values.push(id);
    db().prepare(`UPDATE validation_results SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    return db().prepare('SELECT * FROM validation_results WHERE id = ?').get(id);
  });

  // Gate validation: check if all prerequisites are met before generation
  ipcMain.handle('db:validation:gate-check', (_, projectId, shotId) => {
    const shot = db().prepare('SELECT * FROM shots WHERE id = ?').get(shotId);
    if (!shot) return { passed: false, errors: ['Shot not found'] };

    const scene = db().prepare('SELECT * FROM scenes WHERE id = ?').get(shot.scene_id);
    const project = db().prepare('SELECT * FROM projects WHERE id = ?').get(projectId);
    const errors = [];
    const warnings = [];

    // Check scene exists and has content
    if (!scene) errors.push('Scene not found');
    else if (!scene.description && !scene.script_content) warnings.push('Scene has no description or script');

    // Check character states exist if production mode requires them
    if (project?.production_mode === 'shot_controlled') {
      const charStates = db().prepare(
        'SELECT COUNT(*) as count FROM character_states WHERE scene_id = ?'
      ).get(shot.scene_id);
      if (charStates.count === 0) warnings.push('No character states defined for this scene');
    }

    // Check context states exist
    const ctxStates = db().prepare(
      `SELECT COUNT(*) as count FROM context_states
       WHERE scene_id = ? AND project_id = ?`
    ).get(shot.scene_id, projectId);
    if (ctxStates.count === 0) warnings.push('No context/environment states for this scene');

    // Check prompt template availability
    const promptTemplates = db().prepare(
      `SELECT COUNT(*) as count FROM prompt_templates
       WHERE project_id = ? AND status = 'active'`
    ).get(projectId);
    if (promptTemplates.count === 0) warnings.push('No active prompt templates');

    // Check dependencies
    const brokenDeps = db().prepare(
      `SELECT COUNT(*) as count FROM dependency_records
       WHERE project_id = ? AND status IN ('outdated', 'broken')`
    ).get(projectId);
    if (brokenDeps.count > 0) warnings.push(`${brokenDeps.count} dependency issue(s) detected`);

    return {
      passed: errors.length === 0,
      errors,
      warnings,
      shot,
      scene,
      production_mode: project?.production_mode || 'reference'
    };
  });

  // ── Enhanced Dashboard Stats ─────
  ipcMain.handle('db:dashboard:enhanced-stats', (_, projectId) => {
    const base = projectId
      ? { projectFilter: 'WHERE project_id = ?', params: [projectId] }
      : { projectFilter: '', params: [] };

    const sceneProgress = db().prepare(
      `SELECT status, COUNT(*) as count FROM scenes ${base.projectFilter} GROUP BY status`
    ).all(...base.params);

    const shotProgress = db().prepare(
      `SELECT status, COUNT(*) as count FROM shots
       ${base.projectFilter ? base.projectFilter.replace('project_id', 'scene_id IN (SELECT id FROM scenes WHERE project_id') + ')' : ''}
       GROUP BY status`
    ).all(...base.params);

    const runningJobs = db().prepare(
      `SELECT COUNT(*) as count FROM workflow_runs WHERE status = 'running'`
    ).get();

    const recentAttempts = db().prepare(
      `SELECT status, COUNT(*) as count FROM generation_attempts
       WHERE created_at > datetime('now', '-7 days') GROUP BY status`
    ).all();

    const depIssues = projectId
      ? db().prepare(
          `SELECT status, COUNT(*) as count FROM dependency_records
           WHERE project_id = ? AND status != 'current' GROUP BY status`
        ).all(projectId)
      : db().prepare(
          `SELECT status, COUNT(*) as count FROM dependency_records
           WHERE status != 'current' GROUP BY status`
        ).all();

    const validationSummary = projectId
      ? db().prepare(
          `SELECT validation_level, status, COUNT(*) as count FROM validation_results
           WHERE project_id = ? GROUP BY validation_level, status`
        ).all(projectId)
      : [];

    return {
      sceneProgress,
      shotProgress,
      runningJobs: runningJobs.count,
      recentAttempts,
      depIssues,
      validationSummary
    };
  });
}

module.exports = { registerIpcHandlers };
