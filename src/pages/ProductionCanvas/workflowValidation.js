/**
 * Workflow validation — pre-execution checks.
 * Validates the workflow graph before starting a run.
 */

/**
 * Validate a workflow for execution readiness.
 * Returns { valid: boolean, errors: string[], warnings: string[] }
 */
export function validateWorkflow(nodes, connections) {
  const errors = [];
  const warnings = [];

  if (nodes.length === 0) {
    errors.push('Workflow has no nodes. Add at least one PROCESS node.');
    return { valid: false, errors, warnings };
  }

  // Check for orphan nodes (no connections at all)
  const connectedNodeIds = new Set();
  connections.forEach(c => {
    connectedNodeIds.add(c.source_node_id);
    connectedNodeIds.add(c.target_node_id);
  });

  const orphanNodes = nodes.filter(n => !connectedNodeIds.has(n.id));
  if (orphanNodes.length > 0 && nodes.length > 1) {
    warnings.push(`${orphanNodes.length} disconnected node(s): ${orphanNodes.map(n => n.label).join(', ')}`);
  }

  // Check PROCESS nodes have at least one input
  const processNodes = nodes.filter(n => n.node_type === 'PROCESS');
  if (processNodes.length === 0) {
    warnings.push('No PROCESS nodes found. A workflow typically needs at least one process step.');
  }

  processNodes.forEach(pn => {
    const inputs = connections.filter(c => c.target_node_id === pn.id);
    if (inputs.length === 0) {
      warnings.push(`Process node "${pn.label}" has no inputs.`);
    }
    // Check required inputs
    const requiredInputs = inputs.filter(c => c.required);
    // (optional: check all required connections have sources with completed status)
  });

  // Check for cycles (simple DFS)
  const hasCycle = detectCycles(nodes, connections);
  if (hasCycle) {
    errors.push('Workflow contains a cycle. Remove circular connections to allow execution.');
  }

  // Check DATA nodes have resource references
  const dataNodes = nodes.filter(n => n.node_type === 'DATA');
  dataNodes.forEach(dn => {
    let ref;
    try { ref = JSON.parse(dn.resource_ref); } catch { ref = null; }
    if (!ref || !ref.catalogId) {
      warnings.push(`Data node "${dn.label}" has no resource reference. It may not provide data during execution.`);
    }
  });

  // Check PROCESS nodes with providers have valid provider config
  processNodes.forEach(pn => {
    let config;
    try { config = JSON.parse(pn.config); } catch { config = {}; }
    if (config.providerId) {
      // Provider is configured — will be verified at runtime
    } else if (pn.node_subtype !== 'manual_step') {
      warnings.push(`Process node "${pn.label}" has no provider configured. Manual export/import will be needed.`);
    }
  });

  // Check OUTPUT nodes have at least one input
  const outputNodes = nodes.filter(n => n.node_type === 'OUTPUT');
  outputNodes.forEach(on => {
    const inputs = connections.filter(c => c.target_node_id === on.id);
    if (inputs.length === 0) {
      warnings.push(`Output node "${on.label}" has no inputs.`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Async validation that checks resource existence and provider capabilities.
 * Call this before starting a workflow run for thorough pre-execution checks.
 */
export async function validateWorkflowAsync(nodes, connections, api) {
  // Start with synchronous validation
  const result = validateWorkflow(nodes, connections);

  // Check resource references still exist
  const dataNodes = nodes.filter(n => n.node_type === 'DATA');
  for (const dn of dataNodes) {
    let ref;
    try { ref = JSON.parse(dn.resource_ref); } catch { ref = null; }
    if (ref?.catalogId) {
      try {
        const entry = await api.getResourceCatalogEntry(ref.catalogId);
        if (!entry) {
          result.errors.push(`Missing resource: "${dn.label}" references catalog entry that no longer exists.`);
        } else if (entry.status === 'archived') {
          result.warnings.push(`Archived resource: "${dn.label}" references "${entry.name}" which is archived.`);
        }
      } catch {
        result.warnings.push(`Could not verify resource for "${dn.label}".`);
      }
    }
  }

  // Check provider capabilities
  const processNodes = nodes.filter(n => n.node_type === 'PROCESS');
  for (const pn of processNodes) {
    let config;
    try { config = JSON.parse(pn.config); } catch { config = {}; }
    if (config.providerId) {
      try {
        const provider = await api.getProviderConfig(config.providerId);
        if (!provider) {
          result.errors.push(`Invalid provider: "${pn.label}" references a provider that no longer exists.`);
        } else if (provider.status !== 'active') {
          result.errors.push(`Disabled provider: "${pn.label}" uses provider "${provider.name}" which is disabled.`);
        }
      } catch {
        result.warnings.push(`Could not verify provider for "${pn.label}".`);
      }
    }
  }

  result.valid = result.errors.length === 0;
  return result;
}

/**
 * Detect cycles using DFS
 */
function detectCycles(nodes, connections) {
  const adjacency = {};
  nodes.forEach(n => { adjacency[n.id] = []; });
  connections.forEach(c => {
    if (adjacency[c.source_node_id]) {
      adjacency[c.source_node_id].push(c.target_node_id);
    }
  });

  const visited = new Set();
  const inStack = new Set();

  function dfs(nodeId) {
    if (inStack.has(nodeId)) return true; // cycle
    if (visited.has(nodeId)) return false;
    visited.add(nodeId);
    inStack.add(nodeId);
    for (const neighbor of (adjacency[nodeId] || [])) {
      if (dfs(neighbor)) return true;
    }
    inStack.delete(nodeId);
    return false;
  }

  for (const node of nodes) {
    if (dfs(node.id)) return true;
  }
  return false;
}

/**
 * Compute topological execution order.
 * Returns array of node IDs in dependency order, or null if cycle detected.
 */
export function topologicalSort(nodes, connections) {
  const adjacency = {};
  const inDegree = {};
  nodes.forEach(n => { adjacency[n.id] = []; inDegree[n.id] = 0; });
  connections.forEach(c => {
    if (adjacency[c.source_node_id]) {
      adjacency[c.source_node_id].push(c.target_node_id);
      inDegree[c.target_node_id] = (inDegree[c.target_node_id] || 0) + 1;
    }
  });

  const queue = nodes.filter(n => inDegree[n.id] === 0).map(n => n.id);
  const order = [];

  while (queue.length > 0) {
    const current = queue.shift();
    order.push(current);
    for (const neighbor of (adjacency[current] || [])) {
      inDegree[neighbor]--;
      if (inDegree[neighbor] === 0) queue.push(neighbor);
    }
  }

  return order.length === nodes.length ? order : null;
}

/**
 * Build input snapshot for a generation attempt.
 * Captures all upstream data at the current moment for reproducibility.
 */
export function buildInputSnapshot(nodeId, nodes, connections) {
  const snapshot = {
    nodeId,
    timestamp: new Date().toISOString(),
    inputs: [],
  };

  // Gather inbound connections and their source node data
  const inbound = connections.filter(c => c.target_node_id === nodeId);
  inbound.forEach(conn => {
    const sourceNode = nodes.find(n => n.id === conn.source_node_id);
    if (!sourceNode) return;

    let resourceRef;
    try { resourceRef = JSON.parse(sourceNode.resource_ref); } catch { resourceRef = null; }
    let config;
    try { config = JSON.parse(sourceNode.config); } catch { config = {}; }

    snapshot.inputs.push({
      connectionId: conn.id,
      sourceNodeId: sourceNode.id,
      sourceLabel: sourceNode.label,
      sourceType: sourceNode.node_type,
      sourceSubtype: sourceNode.node_subtype,
      dataType: conn.data_type,
      inputRole: conn.input_role,
      required: !!conn.required,
      resourceRef,
      config,
    });
  });

  return snapshot;
}

/**
 * Pre-generation gate validation.
 * Validates data completeness before allowing generation to proceed.
 * Uses the backend gate-check for database queries; adds client-side checks.
 */
export async function runGateValidation(projectId, shotId, nodes, connections) {
  const result = {
    passed: true,
    errors: [],
    warnings: [],
    checkedAt: new Date().toISOString(),
  };

  // 1. Backend gate check (DB-level validation)
  try {
    const dbGate = await window.api.runGateCheck(projectId, shotId);
    if (!dbGate.passed) {
      result.passed = false;
      result.errors.push(...(dbGate.errors || []));
    }
    result.warnings.push(...(dbGate.warnings || []));
    result.production_mode = dbGate.production_mode;
  } catch (err) {
    result.warnings.push('Could not run database gate check: ' + err.message);
  }

  // 2. Workflow-level validation
  if (nodes && connections) {
    const wfResult = validateWorkflow(nodes, connections);
    if (!wfResult.valid) {
      result.passed = false;
      result.errors.push(...wfResult.errors.map(e => 'Workflow: ' + e));
    }
    result.warnings.push(...wfResult.warnings.map(w => 'Workflow: ' + w));
  }

  // 3. Check for process nodes without required inputs
  if (nodes && connections) {
    const processNodes = nodes.filter(n => n.node_type === 'PROCESS');
    for (const pn of processNodes) {
      const inputs = connections.filter(c => c.target_node_id === pn.id);
      const requiredMissing = inputs.filter(c => c.required).length === 0
        && inputs.length === 0;
      if (requiredMissing) {
        result.warnings.push(`Process node "${pn.label}" has no inputs`);
      }
    }
  }

  return result;
}

/**
 * Validate data completeness for a specific validation level.
 * Returns an object { valid, issues[], warnings[] }
 */
export function validateDataCompleteness(entity, level) {
  const issues = [];
  const warnings = [];

  switch (level) {
    case 'character':
      if (!entity.name) issues.push('Character name is required');
      if (!entity.description) warnings.push('No character description');
      if (!entity.visual_prompt) warnings.push('No visual prompt defined');
      break;
    case 'scene':
      if (!entity.scene_number) issues.push('Scene number is required');
      if (!entity.description && !entity.script_content) warnings.push('Scene has no description or script');
      break;
    case 'shot':
      if (!entity.shot_number) issues.push('Shot number is required');
      if (!entity.prompt) warnings.push('No shot prompt defined');
      if (!entity.duration) warnings.push('No shot duration set');
      break;
    case 'project':
      if (!entity.name) issues.push('Project name is required');
      if (!entity.production_mode) warnings.push('Production mode not set');
      break;
    default:
      break;
  }

  return {
    valid: issues.length === 0,
    issues,
    warnings,
  };
}
