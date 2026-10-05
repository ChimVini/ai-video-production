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

  // Dashboard stats
  getDashboardStats: () => ipcRenderer.invoke('db:dashboard:stats'),
});
