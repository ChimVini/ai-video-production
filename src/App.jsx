import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Sidebar from './components/Layout/Sidebar';
import Dashboard from './pages/Dashboard/Dashboard';
import ProjectsPage from './pages/Projects/ProjectsPage';
import ProjectDetail from './pages/Projects/ProjectDetail';
import StoriesPage from './pages/System1/StoriesPage';
import CharactersPage from './pages/System1/CharactersPage';
import WorldsPage from './pages/System1/WorldsPage';
import VisualAssetsPage from './pages/System2/VisualAssetsPage';
import ProductionPage from './pages/System3/ProductionPage';
import ShotWorkspace from './pages/System3/ShotWorkspace';
import ResourcesPage from './pages/Resources/ResourcesPage';
import ResourceLibraryPage from './pages/ResourceLibrary/ResourceLibraryPage';
import WorkflowListPage from './pages/ProductionCanvas/WorkflowListPage';
import ProductionCanvasPage from './pages/ProductionCanvas/ProductionCanvasPage';
import ProviderConfigPage from './pages/ProviderConfig/ProviderConfigPage';
import ProductionHistoryPage from './pages/ProductionHistory/ProductionHistoryPage';
import LocationsPage from './pages/System3/LocationsPage';
import PromptTemplatesPage from './pages/Workspace/PromptTemplatesPage';
import NodeDatabasePage from './pages/NodeWorkspace/NodeDatabasePage';
import NodeCanvasPage from './pages/NodeWorkspace/NodeCanvasPage';
import NodeWorkspacePage from './pages/NodeWorkspace/NodeWorkspacePage';
import ImpactDependencyPage from './pages/ImpactView/ImpactDependencyPage';
import ValidationPage from './pages/Validation/ValidationPage';
import ContinuityPage from './pages/Continuity/ContinuityPage';

export default function App() {
  return (
    <div className="flex h-screen overflow-hidden bg-s-0">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-6 bg-s-1">
        <div className="page-enter">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/projects" element={<ProjectsPage />} />
            <Route path="/projects/:id" element={<ProjectDetail />} />
            <Route path="/stories" element={<StoriesPage />} />
            <Route path="/characters" element={<CharactersPage />} />
            <Route path="/worlds" element={<WorldsPage />} />
            <Route path="/visual-assets" element={<VisualAssetsPage />} />
            <Route path="/production" element={<ProductionPage />} />
            <Route path="/production/shot/:id" element={<ShotWorkspace />} />
            <Route path="/locations" element={<LocationsPage />} />
            <Route path="/resources" element={<ResourcesPage />} />
            {/* System 4 — Production Workspace */}
            <Route path="/resource-library" element={<ResourceLibraryPage />} />
            <Route path="/workflows" element={<WorkflowListPage />} />
            <Route path="/workflows/:workflowId" element={<ProductionCanvasPage />} />
            <Route path="/providers" element={<ProviderConfigPage />} />
            <Route path="/prompt-templates" element={<PromptTemplatesPage />} />
            <Route path="/history" element={<ProductionHistoryPage />} />
            {/* Impact/Dependency & Validation */}
            <Route path="/impact" element={<ImpactDependencyPage />} />
            <Route path="/validation" element={<ValidationPage />} />
            <Route path="/continuity" element={<ContinuityPage />} />
            {/* Legacy Node Workspace */}
            <Route path="/node-canvas" element={<NodeDatabasePage />} />
            <Route path="/node-canvas/view" element={<NodeCanvasPage />} />
            <Route path="/node-canvas/view/:rootId" element={<NodeCanvasPage />} />
            <Route path="/node-canvas/:rootId" element={<NodeDatabasePage />} />
            <Route path="/node-workspace/:nodeId" element={<NodeWorkspacePage />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}
