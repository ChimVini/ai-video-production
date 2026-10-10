const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // Projects
  getProjects: () => ipcRenderer.invoke('db:projects:list'),
  getProject: (id) => ipcRenderer.invoke('db:projects:get', id),
  createProject: (data) => ipcRenderer.invoke('db:projects:create', data),
  updateProject: (id, data) => ipcRenderer.invoke('db:projects:update', id, data),
  deleteProject: (id) => ipcRenderer.invoke('db:projects:delete', id),

  // Stories
  getStories: (projectId) => ipcRenderer.invoke('db:stories:list', projectId),
  getStory: (id) => ipcRenderer.invoke('db:stories:get', id),
  createStory: (data) => ipcRenderer.invoke('db:stories:create', data),
  updateStory: (id, data) => ipcRenderer.invoke('db:stories:update', id, data),
  deleteStory: (id) => ipcRenderer.invoke('db:stories:delete', id),

  // Characters
  getCharacters: (projectId) => ipcRenderer.invoke('db:characters:list', projectId),
  getCharacter: (id) => ipcRenderer.invoke('db:characters:get', id),
  createCharacter: (data) => ipcRenderer.invoke('db:characters:create', data),
  updateCharacter: (id, data) => ipcRenderer.invoke('db:characters:update', id, data),
  deleteCharacter: (id) => ipcRenderer.invoke('db:characters:delete', id),

  // Worlds
  getWorlds: (projectId) => ipcRenderer.invoke('db:worlds:list', projectId),
  getWorld: (id) => ipcRenderer.invoke('db:worlds:get', id),
  createWorld: (data) => ipcRenderer.invoke('db:worlds:create', data),
  updateWorld: (id, data) => ipcRenderer.invoke('db:worlds:update', id, data),
  deleteWorld: (id) => ipcRenderer.invoke('db:worlds:delete', id),

  // Episodes
  getEpisodes: (projectId) => ipcRenderer.invoke('db:episodes:list', projectId),
  getEpisode: (id) => ipcRenderer.invoke('db:episodes:get', id),
  createEpisode: (data) => ipcRenderer.invoke('db:episodes:create', data),
  updateEpisode: (id, data) => ipcRenderer.invoke('db:episodes:update', id, data),
  deleteEpisode: (id) => ipcRenderer.invoke('db:episodes:delete', id),

  // Visual Assets
  getVisualAssets: (projectId) => ipcRenderer.invoke('db:visual-assets:list', projectId),
  getVisualAsset: (id) => ipcRenderer.invoke('db:visual-assets:get', id),
  createVisualAsset: (data) => ipcRenderer.invoke('db:visual-assets:create', data),
  updateVisualAsset: (id, data) => ipcRenderer.invoke('db:visual-assets:update', id, data),
  deleteVisualAsset: (id) => ipcRenderer.invoke('db:visual-assets:delete', id),

  // Scenes
  getScenes: (episodeId) => ipcRenderer.invoke('db:scenes:list', episodeId),
  getScene: (id) => ipcRenderer.invoke('db:scenes:get', id),
  createScene: (data) => ipcRenderer.invoke('db:scenes:create', data),
  updateScene: (id, data) => ipcRenderer.invoke('db:scenes:update', id, data),
  deleteScene: (id) => ipcRenderer.invoke('db:scenes:delete', id),

  // Shots
  getShots: (sceneId) => ipcRenderer.invoke('db:shots:list', sceneId),
  getShot: (id) => ipcRenderer.invoke('db:shots:get', id),
  createShot: (data) => ipcRenderer.invoke('db:shots:create', data),
  updateShot: (id, data) => ipcRenderer.invoke('db:shots:update', id, data),
  deleteShot: (id) => ipcRenderer.invoke('db:shots:delete', id),

  // Resources
  getResources: (filters) => ipcRenderer.invoke('db:resources:list', filters),
  getResource: (id) => ipcRenderer.invoke('db:resources:get', id),
  createResource: (data) => ipcRenderer.invoke('db:resources:create', data),
  updateResource: (id, data) => ipcRenderer.invoke('db:resources:update', id, data),
  deleteResource: (id) => ipcRenderer.invoke('db:resources:delete', id),

  // Scenes by project (for single videos)
  getScenesByProject: (projectId) => ipcRenderer.invoke('db:scenes:list-by-project', projectId),

  // Workspace Nodes
  getWorkspaceNodes: (parentId) => ipcRenderer.invoke('db:workspace-nodes:list', parentId),
  getWorkspaceNode: (id) => ipcRenderer.invoke('db:workspace-nodes:get', id),
  createWorkspaceNode: (data) => ipcRenderer.invoke('db:workspace-nodes:create', data),
  updateWorkspaceNode: (id, data) => ipcRenderer.invoke('db:workspace-nodes:update', id, data),
  deleteWorkspaceNode: (id) => ipcRenderer.invoke('db:workspace-nodes:delete', id),
  getWorkspaceRootNodes: () => ipcRenderer.invoke('db:workspace-nodes:list-roots'),
  getWorkspaceChildren: (parentId) => ipcRenderer.invoke('db:workspace-nodes:list-children', parentId),
  getWorkspaceSiblings: (parentId) => ipcRenderer.invoke('db:workspace-nodes:list-siblings', parentId),

  // Node Todos
  getNodeTodos: (nodeId) => ipcRenderer.invoke('db:node-todos:list-by-node', nodeId),
  getNodeTodo: (id) => ipcRenderer.invoke('db:node-todos:get', id),
  createNodeTodo: (data) => ipcRenderer.invoke('db:node-todos:create', data),
  updateNodeTodo: (id, data) => ipcRenderer.invoke('db:node-todos:update', id, data),
  deleteNodeTodo: (id) => ipcRenderer.invoke('db:node-todos:delete', id),

  // Node Notes
  getNodeNotes: (nodeId) => ipcRenderer.invoke('db:node-notes:list-by-node', nodeId),
  getNodeNote: (id) => ipcRenderer.invoke('db:node-notes:get', id),
  createNodeNote: (data) => ipcRenderer.invoke('db:node-notes:create', data),
  updateNodeNote: (id, data) => ipcRenderer.invoke('db:node-notes:update', id, data),
  deleteNodeNote: (id) => ipcRenderer.invoke('db:node-notes:delete', id),

  // Node Connections
  createNodeConnection: (data) => ipcRenderer.invoke('db:node-connections:create', data),
  getNodeConnections: (nodeId) => ipcRenderer.invoke('db:node-connections:list-by-node', nodeId),
  getContextConnections: (parentId) => ipcRenderer.invoke('db:node-connections:list-by-context', parentId),
  getAllNodeConnections: () => ipcRenderer.invoke('db:node-connections:list-all'),
  deleteNodeConnection: (id) => ipcRenderer.invoke('db:node-connections:delete', id),

  // ── Resource Catalog ──────────────────────────
  getResourceCatalog: (filters) => ipcRenderer.invoke('db:resource-catalog:list', filters),
  getResourceCatalogEntry: (id) => ipcRenderer.invoke('db:resource-catalog:get', id),
  getResourceCatalogBySource: (sourceSystem, sourceId) => ipcRenderer.invoke('db:resource-catalog:get-by-source', sourceSystem, sourceId),
  createResourceCatalogEntry: (data) => ipcRenderer.invoke('db:resource-catalog:create', data),
  updateResourceCatalogEntry: (id, data) => ipcRenderer.invoke('db:resource-catalog:update', id, data),
  deleteResourceCatalogEntry: (id) => ipcRenderer.invoke('db:resource-catalog:delete', id),
  syncResourceCatalog: (projectId) => ipcRenderer.invoke('db:resource-catalog:sync', projectId),

  // ── Workflows ───────────────────────────────
  getWorkflows: (projectId) => ipcRenderer.invoke('db:workflows:list', projectId),
  getWorkflow: (id) => ipcRenderer.invoke('db:workflows:get', id),
  createWorkflow: (data) => ipcRenderer.invoke('db:workflows:create', data),
  updateWorkflow: (id, data) => ipcRenderer.invoke('db:workflows:update', id, data),
  deleteWorkflow: (id) => ipcRenderer.invoke('db:workflows:delete', id),
  getWorkflowTemplates: () => ipcRenderer.invoke('db:workflows:list-templates'),
  saveWorkflowAsTemplate: (id) => ipcRenderer.invoke('db:workflows:save-as-template', id),
  unsetWorkflowTemplate: (id) => ipcRenderer.invoke('db:workflows:unset-template', id),
  duplicateWorkflow: (id, opts) => ipcRenderer.invoke('db:workflows:duplicate', id, opts),

  // ── Workflow Nodes ──────────────────────────
  getWorkflowNodes: (workflowId) => ipcRenderer.invoke('db:workflow-nodes:list', workflowId),
  getWorkflowNode: (id) => ipcRenderer.invoke('db:workflow-nodes:get', id),
  createWorkflowNode: (data) => ipcRenderer.invoke('db:workflow-nodes:create', data),
  updateWorkflowNode: (id, data) => ipcRenderer.invoke('db:workflow-nodes:update', id, data),
  deleteWorkflowNode: (id) => ipcRenderer.invoke('db:workflow-nodes:delete', id),
  batchUpdateNodePositions: (updates) => ipcRenderer.invoke('db:workflow-nodes:batch-update-positions', updates),

  // ── Workflow Connections ────────────────────
  getWorkflowConnections: (workflowId) => ipcRenderer.invoke('db:workflow-connections:list', workflowId),
  createWorkflowConnection: (data) => ipcRenderer.invoke('db:workflow-connections:create', data),
  deleteWorkflowConnection: (id) => ipcRenderer.invoke('db:workflow-connections:delete', id),
  getWorkflowConnectionsByNode: (nodeId) => ipcRenderer.invoke('db:workflow-connections:list-by-node', nodeId),

  // ── Workflow Runs ───────────────────────────
  getWorkflowRuns: (workflowId) => ipcRenderer.invoke('db:workflow-runs:list', workflowId),
  getWorkflowRun: (id) => ipcRenderer.invoke('db:workflow-runs:get', id),
  createWorkflowRun: (data) => ipcRenderer.invoke('db:workflow-runs:create', data),
  updateWorkflowRun: (id, data) => ipcRenderer.invoke('db:workflow-runs:update', id, data),

  // ── Generation Attempts ─────────────────────
  getGenerationAttempts: (filters) => ipcRenderer.invoke('db:generation-attempts:list', filters),
  getGenerationAttempt: (id) => ipcRenderer.invoke('db:generation-attempts:get', id),
  createGenerationAttempt: (data) => ipcRenderer.invoke('db:generation-attempts:create', data),
  updateGenerationAttempt: (id, data) => ipcRenderer.invoke('db:generation-attempts:update', id, data),
  getGenerationHistory: (attemptId) => ipcRenderer.invoke('db:generation-attempts:get-history', attemptId),

  // ── Reviews ─────────────────────────────────
  getReviews: (attemptId) => ipcRenderer.invoke('db:reviews:list', attemptId),
  getReview: (id) => ipcRenderer.invoke('db:reviews:get', id),
  createReview: (data) => ipcRenderer.invoke('db:reviews:create', data),
  updateReview: (id, data) => ipcRenderer.invoke('db:reviews:update', id, data),
  deleteReview: (id) => ipcRenderer.invoke('db:reviews:delete', id),
  getReviewsByAttempt: (attemptId) => ipcRenderer.invoke('db:reviews:list-by-attempt', attemptId),

  // ── Feedback ────────────────────────────────
  getFeedback: (attemptId) => ipcRenderer.invoke('db:feedback:list', attemptId),
  getFeedbackItem: (id) => ipcRenderer.invoke('db:feedback:get', id),
  createFeedback: (data) => ipcRenderer.invoke('db:feedback:create', data),
  updateFeedback: (id, data) => ipcRenderer.invoke('db:feedback:update', id, data),
  deleteFeedback: (id) => ipcRenderer.invoke('db:feedback:delete', id),
  getFeedbackByAttempt: (attemptId) => ipcRenderer.invoke('db:feedback:list-by-attempt', attemptId),

  // ── Provider Configs ────────────────────────
  getProviderConfigs: () => ipcRenderer.invoke('db:provider-configs:list'),
  getProviderConfig: (id) => ipcRenderer.invoke('db:provider-configs:get', id),
  createProviderConfig: (data) => ipcRenderer.invoke('db:provider-configs:create', data),
  updateProviderConfig: (id, data) => ipcRenderer.invoke('db:provider-configs:update', id, data),
  deleteProviderConfig: (id) => ipcRenderer.invoke('db:provider-configs:delete', id),
  getProvidersByCapability: (capability) => ipcRenderer.invoke('db:provider-configs:list-by-capability', capability),

  // ── Character States ────────────────────────
  getCharacterStates: (filters) => ipcRenderer.invoke('db:character-states:list', filters),
  getCharacterState: (id) => ipcRenderer.invoke('db:character-states:get', id),
  createCharacterState: (data) => ipcRenderer.invoke('db:character-states:create', data),
  updateCharacterState: (id, data) => ipcRenderer.invoke('db:character-states:update', id, data),
  deleteCharacterState: (id) => ipcRenderer.invoke('db:character-states:delete', id),
  getCharacterStateChain: (characterId, sceneId) => ipcRenderer.invoke('db:character-states:get-chain', characterId, sceneId),

  // ── Project Briefs (Phase A1) ─────────────────
  getProjectBriefs: (projectId) => ipcRenderer.invoke('db:project-briefs:list', projectId),
  getProjectBrief: (id) => ipcRenderer.invoke('db:project-briefs:get', id),
  createProjectBrief: (data) => ipcRenderer.invoke('db:project-briefs:create', data),
  updateProjectBrief: (id, data) => ipcRenderer.invoke('db:project-briefs:update', id, data),
  deleteProjectBrief: (id) => ipcRenderer.invoke('db:project-briefs:delete', id),

  // ── Character Variants (Phase A1) ─────────────
  getCharacterVariants: (characterId) => ipcRenderer.invoke('db:character-variants:list', characterId),
  getCharacterVariantsByProject: (projectId) => ipcRenderer.invoke('db:character-variants:list-by-project', projectId),
  getCharacterVariant: (id) => ipcRenderer.invoke('db:character-variants:get', id),
  createCharacterVariant: (data) => ipcRenderer.invoke('db:character-variants:create', data),
  updateCharacterVariant: (id, data) => ipcRenderer.invoke('db:character-variants:update', id, data),
  deleteCharacterVariant: (id) => ipcRenderer.invoke('db:character-variants:delete', id),

  // ── Locations (Phase A1) ──────────────────────
  getLocations: (worldId) => ipcRenderer.invoke('db:locations:list', worldId),
  getLocationsByProject: (projectId) => ipcRenderer.invoke('db:locations:list-by-project', projectId),
  getLocation: (id) => ipcRenderer.invoke('db:locations:get', id),
  createLocation: (data) => ipcRenderer.invoke('db:locations:create', data),
  updateLocation: (id, data) => ipcRenderer.invoke('db:locations:update', id, data),
  deleteLocation: (id) => ipcRenderer.invoke('db:locations:delete', id),

  // ── Environments (Phase A1) ───────────────────
  getEnvironments: (locationId) => ipcRenderer.invoke('db:environments:list', locationId),
  getEnvironmentsByProject: (projectId) => ipcRenderer.invoke('db:environments:list-by-project', projectId),
  getEnvironment: (id) => ipcRenderer.invoke('db:environments:get', id),
  createEnvironment: (data) => ipcRenderer.invoke('db:environments:create', data),
  updateEnvironment: (id, data) => ipcRenderer.invoke('db:environments:update', id, data),
  deleteEnvironment: (id) => ipcRenderer.invoke('db:environments:delete', id),

  // ── Context States (Phase A1) ─────────────────
  getContextStates: (environmentId) => ipcRenderer.invoke('db:context-states:list', environmentId),
  getContextStatesByScene: (sceneId) => ipcRenderer.invoke('db:context-states:list-by-scene', sceneId),
  getContextState: (id) => ipcRenderer.invoke('db:context-states:get', id),
  createContextState: (data) => ipcRenderer.invoke('db:context-states:create', data),
  updateContextState: (id, data) => ipcRenderer.invoke('db:context-states:update', id, data),
  deleteContextState: (id) => ipcRenderer.invoke('db:context-states:delete', id),

  // ── Prompt Templates (Phase A1) ───────────────
  getPromptTemplates: (projectId) => ipcRenderer.invoke('db:prompt-templates:list', projectId),
  getPromptTemplatesByPurpose: (purpose) => ipcRenderer.invoke('db:prompt-templates:list-by-purpose', purpose),
  getPromptTemplate: (id) => ipcRenderer.invoke('db:prompt-templates:get', id),
  createPromptTemplate: (data) => ipcRenderer.invoke('db:prompt-templates:create', data),
  updatePromptTemplate: (id, data) => ipcRenderer.invoke('db:prompt-templates:update', id, data),
  deletePromptTemplate: (id) => ipcRenderer.invoke('db:prompt-templates:delete', id),
  getGlobalPromptTemplates: () => ipcRenderer.invoke('db:prompt-templates:list-global'),

  // ── Google Veo Integration ───────────────────
  veoSubmit: (data) => ipcRenderer.invoke('veo:submit', data),
  veoPoll: (data) => ipcRenderer.invoke('veo:poll', data),
  veoPollUntilDone: (data) => ipcRenderer.invoke('veo:poll-until-done', data),
  veoCancel: (data) => ipcRenderer.invoke('veo:cancel', data),
  veoCompilePrompt: (data) => ipcRenderer.invoke('veo:compile-prompt', data),
  veoGenerateKeyframe: (data) => ipcRenderer.invoke('veo:generate-keyframe', data),
  veoValidateAuth: (data) => ipcRenderer.invoke('veo:validate-auth', data),
  onVeoProgress: (callback) => ipcRenderer.on('veo:progress', (_, data) => callback(data)),
  offVeoProgress: (callback) => ipcRenderer.removeListener('veo:progress', callback),

  // Dashboard stats
  getDashboardStats: () => ipcRenderer.invoke('db:dashboard:stats'),

  // ── Production History ─────────────────────────
  getProductionHistory: (filters) => ipcRenderer.invoke('db:production-history:list', filters),
  getProductionHistoryStats: () => ipcRenderer.invoke('db:production-history:stats'),

  // ── Dependency Records (Impact/Dependency Tracking) ───
  getDependencyRecords: (projectId) => ipcRenderer.invoke('db:dependency-records:list', projectId),
  getDependencyRecord: (id) => ipcRenderer.invoke('db:dependency-records:get', id),
  createDependencyRecord: (data) => ipcRenderer.invoke('db:dependency-records:create', data),
  deleteDependencyRecord: (id) => ipcRenderer.invoke('db:dependency-records:delete', id),
  getDependents: (sourceType, sourceId) => ipcRenderer.invoke('db:dependency-records:get-dependents', sourceType, sourceId),
  getDependencySources: (depType, depId) => ipcRenderer.invoke('db:dependency-records:get-sources', depType, depId),
  propagateDependencyChange: (sourceType, sourceId) => ipcRenderer.invoke('db:dependency-records:propagate-change', sourceType, sourceId),
  resolveDependency: (id) => ipcRenderer.invoke('db:dependency-records:resolve', id),
  getDependencyImpactSummary: (projectId) => ipcRenderer.invoke('db:dependency-records:impact-summary', projectId),

  // ── Execution Snapshots (Immutable RUN records) ───────
  createExecutionSnapshot: (data) => ipcRenderer.invoke('db:execution-snapshots:create', data),
  getExecutionSnapshot: (id) => ipcRenderer.invoke('db:execution-snapshots:get', id),
  getExecutionSnapshots: (projectId) => ipcRenderer.invoke('db:execution-snapshots:list', projectId),
  getExecutionSnapshotsByShot: (shotId) => ipcRenderer.invoke('db:execution-snapshots:list-by-shot', shotId),

  // ── Spatial Continuity ────────────────────────────────
  getSpatialContinuity: (sceneId) => ipcRenderer.invoke('db:spatial-continuity:list', sceneId),
  getSpatialContinuityByShot: (shotId) => ipcRenderer.invoke('db:spatial-continuity:list-by-shot', shotId),
  createSpatialContinuity: (data) => ipcRenderer.invoke('db:spatial-continuity:create', data),
  updateSpatialContinuity: (id, data) => ipcRenderer.invoke('db:spatial-continuity:update', id, data),
  deleteSpatialContinuity: (id) => ipcRenderer.invoke('db:spatial-continuity:delete', id),

  // ── Continuity Ledger ─────────────────────────────────
  getContinuityLedger: (sceneId) => ipcRenderer.invoke('db:continuity-ledger:list', sceneId),
  createContinuityEntry: (data) => ipcRenderer.invoke('db:continuity-ledger:create', data),
  updateContinuityStatus: (id, status, resolvedBy) => ipcRenderer.invoke('db:continuity-ledger:update-status', id, status, resolvedBy),
  getContinuityLedgerSummary: (projectId) => ipcRenderer.invoke('db:continuity-ledger:summary', projectId),

  // ── Validation Results ────────────────────────────────
  getValidationResults: (projectId, level) => ipcRenderer.invoke('db:validation-results:list', projectId, level),
  getValidationForEntity: (entityType, entityId) => ipcRenderer.invoke('db:validation-results:get-for-entity', entityType, entityId),
  createValidationResult: (data) => ipcRenderer.invoke('db:validation-results:create', data),
  updateValidationResult: (id, data) => ipcRenderer.invoke('db:validation-results:update', id, data),

  // ── Gate Validation (pre-generation check) ────────────
  runGateCheck: (projectId, shotId) => ipcRenderer.invoke('db:validation:gate-check', projectId, shotId),

  // ── Enhanced Dashboard ────────────────────────────────
  getEnhancedDashboardStats: (projectId) => ipcRenderer.invoke('db:dashboard:enhanced-stats', projectId),
});
