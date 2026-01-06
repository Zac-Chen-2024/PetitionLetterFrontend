'use client';

import { useState, useEffect, useCallback } from 'react';
import { projectApi, documentApi, analysisApi, type Project } from '@/utils/api';
import type { Document, Quote } from '@/types';

// Layout components
import PipelineLayout from './layouts/PipelineLayout';
import SidebarLayout from './layouts/SidebarLayout';
import TabsLayout from './layouts/TabsLayout';

// Section components
import DocumentSection from './components/DocumentSection';
import HighlightSection from './components/HighlightSection';
import AnalysisSection from './components/AnalysisSection';
import GenerateSection from './components/GenerateSection';

// Shared components
import { WorkspaceHeader, ToastContainer, useToast, type LayoutMode } from './components/shared';

// ============================================================================
// ICONS
// ============================================================================
const Icons = {
  Folder: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
    </svg>
  ),
  Plus: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  ),
  ChevronLeft: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  ),
  ChevronRight: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  ),
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export default function App() {
  // Toast
  const { toasts, addToast, removeToast } = useToast();

  // Sidebar state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Project state
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [creatingProject, setCreatingProject] = useState(false);

  // Entity names
  const [beneficiaryName, setBeneficiaryName] = useState('');
  const [petitionerName, setPetitionerName] = useState('');
  const [foreignEntityName, setForeignEntityName] = useState('');
  const [isSavingBeneficiary, setIsSavingBeneficiary] = useState(false);

  // Document state
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);

  // Analysis state
  const [quotesByStandard, setQuotesByStandard] = useState<Record<string, Quote[]>>({});
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Layout state
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('pipeline');

  // Backend status
  const [backendStatus, setBackendStatus] = useState<'checking' | 'online' | 'offline'>('checking');

  // ============================================================================
  // EFFECTS
  // ============================================================================
  useEffect(() => {
    loadProjects();
    checkBackendStatus();
  }, []);

  useEffect(() => {
    if (currentProject) {
      loadDocuments();
      loadAnalysis();
      // Reset entity names from project
      setBeneficiaryName(currentProject.beneficiaryName || '');
      setPetitionerName(currentProject.petitionerName || '');
      setForeignEntityName(currentProject.foreignEntityName || '');
    }
  }, [currentProject]);

  // ============================================================================
  // API FUNCTIONS
  // ============================================================================
  const checkBackendStatus = async () => {
    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';
      const response = await fetch(`${API_BASE}/`);
      setBackendStatus(response.ok ? 'online' : 'offline');
    } catch {
      setBackendStatus('offline');
    }
  };

  const loadProjects = async () => {
    try {
      setProjectsLoading(true);
      const data = await projectApi.listProjects();
      setProjects(data || []);
      if (data && data.length > 0 && !currentProject) {
        setCurrentProject(data[0]);
      }
    } catch (error) {
      console.error('Failed to load projects:', error);
      addToast('Failed to load projects', 'error');
    } finally {
      setProjectsLoading(false);
    }
  };

  const createProject = async () => {
    try {
      setCreatingProject(true);
      const newProject = await projectApi.createProject(`Project ${projects.length + 1}`);
      setProjects(prev => [newProject, ...prev]);
      setCurrentProject(newProject);
      setDocuments([]);
      setSelectedDocs([]);
      setQuotesByStandard({});
      setBeneficiaryName('');
      setPetitionerName('');
      setForeignEntityName('');
      addToast('Project created', 'success');
    } catch (error) {
      console.error('Failed to create project:', error);
      addToast('Failed to create project', 'error');
    } finally {
      setCreatingProject(false);
    }
  };

  const loadDocuments = async () => {
    if (!currentProject) return;
    try {
      setDocumentsLoading(true);
      const result = await documentApi.getDocuments(currentProject.id);
      setDocuments(result.documents || []);
    } catch (error) {
      console.error('Failed to load documents:', error);
      addToast('Failed to load documents', 'error');
    } finally {
      setDocumentsLoading(false);
    }
  };

  const loadAnalysis = async () => {
    if (!currentProject) return;
    try {
      const summary = await analysisApi.getSummary(currentProject.id);
      if (summary?.by_standard) {
        setQuotesByStandard(summary.by_standard);
      }
    } catch {
      // No analysis yet
    }
  };

  // Save beneficiary name
  const saveBeneficiaryName = async () => {
    if (!currentProject || !beneficiaryName.trim()) return;
    try {
      setIsSavingBeneficiary(true);
      await projectApi.updateProject(currentProject.id, { beneficiaryName: beneficiaryName.trim() });
      addToast('Beneficiary name saved', 'success');
    } catch (error) {
      console.error('Failed to save beneficiary name:', error);
      addToast('Failed to save', 'error');
    } finally {
      setIsSavingBeneficiary(false);
    }
  };

  // Save entity names
  const saveEntityNames = async () => {
    if (!currentProject) return;
    try {
      await projectApi.updateProject(currentProject.id, {
        petitionerName: petitionerName || undefined,
        foreignEntityName: foreignEntityName || undefined,
      });
    } catch (error) {
      console.error('Failed to save entity names:', error);
    }
  };

  // Document selection
  const handleSelectDoc = (docId: string) => {
    setSelectedDocs(prev =>
      prev.includes(docId) ? prev.filter(id => id !== docId) : [...prev, docId]
    );
  };

  const handleSelectAll = () => {
    if (selectedDocs.length === documents.length) {
      setSelectedDocs([]);
    } else {
      setSelectedDocs(documents.map(d => d.id));
    }
  };

  // Run analysis
  const handleRunAnalysis = async (docIds: string[]) => {
    if (!currentProject) return;
    try {
      setIsAnalyzing(true);
      const result = await analysisApi.analyzeDocuments(currentProject.id, docIds);

      if (result.success) {
        await analysisApi.generateSummary(currentProject.id);
        await loadAnalysis();
        addToast(`Found ${result.total_quotes_found} quotes`, 'success');
      }
    } catch (error) {
      console.error('Analysis failed:', error);
      addToast('Analysis failed', 'error');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // View quote handler
  const handleViewQuote = useCallback((quote: Quote) => {
    // For now, just show a toast - can implement PDF viewer modal later
    addToast(`Viewing: "${quote.quote.slice(0, 50)}..."`, 'info');
  }, [addToast]);

  // ============================================================================
  // SECTION COMPONENTS
  // ============================================================================
  const documentSection = currentProject ? (
    <DocumentSection
      projectId={currentProject.id}
      documents={documents}
      selectedDocs={selectedDocs}
      onSelectDoc={handleSelectDoc}
      onSelectAll={handleSelectAll}
      onRefresh={loadDocuments}
      onError={(msg) => addToast(msg, 'error')}
      onSuccess={(msg) => addToast(msg, 'success')}
      loading={documentsLoading}
    />
  ) : null;

  const highlightSection = currentProject ? (
    <HighlightSection
      projectId={currentProject.id}
      documents={documents}
      onError={(msg) => addToast(msg, 'error')}
      onSuccess={(msg) => addToast(msg, 'success')}
    />
  ) : null;

  const analysisSection = currentProject ? (
    <AnalysisSection
      projectId={currentProject.id}
      documents={documents}
      selectedDocs={selectedDocs}
      quotesByStandard={quotesByStandard}
      onRunAnalysis={handleRunAnalysis}
      isAnalyzing={isAnalyzing}
      onViewQuote={handleViewQuote}
    />
  ) : null;

  const generateSection = currentProject ? (
    <GenerateSection
      projectId={currentProject.id}
      quotesByStandard={quotesByStandard}
      beneficiaryName={beneficiaryName}
      petitionerName={petitionerName}
      foreignEntityName={foreignEntityName}
      onPetitionerChange={setPetitionerName}
      onForeignEntityChange={setForeignEntityName}
      onEntitySave={saveEntityNames}
      onViewQuote={handleViewQuote}
    />
  ) : null;

  const header = currentProject ? (
    <WorkspaceHeader
      projectName={currentProject.name}
      projectId={currentProject.id}
      beneficiaryName={beneficiaryName}
      onBeneficiaryChange={setBeneficiaryName}
      onBeneficiarySave={saveBeneficiaryName}
      isSaving={isSavingBeneficiary}
      layoutMode={layoutMode}
      onLayoutChange={setLayoutMode}
      onBack={() => setCurrentProject(null)}
    />
  ) : null;

  // ============================================================================
  // RENDER LAYOUT
  // ============================================================================
  const renderLayout = () => {
    if (!currentProject) return null;

    const layoutProps = {
      header,
      documents: documentSection,
      highlight: highlightSection,
      analysis: analysisSection,
      generate: generateSection,
    };

    switch (layoutMode) {
      case 'sidebar':
        return <SidebarLayout {...layoutProps} />;
      case 'tabs':
        return <TabsLayout {...layoutProps} />;
      default:
        return <PipelineLayout {...layoutProps} />;
    }
  };

  // ============================================================================
  // MAIN RENDER
  // ============================================================================
  return (
    <div className="flex h-screen overflow-hidden bg-[var(--color-background)]">
      {/* Sidebar */}
      <aside
        className={`bg-[var(--color-surface)] border-r border-[var(--color-border)] flex flex-col transition-all duration-300 ${
          sidebarCollapsed ? 'w-16' : 'w-72'
        }`}
      >
        {/* Sidebar Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-[var(--color-border)]">
          {!sidebarCollapsed && (
            <h1 className="font-semibold text-[var(--color-text)] truncate">ImmigrationCraft</h1>
          )}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-[var(--color-text-secondary)]"
          >
            {sidebarCollapsed ? <Icons.ChevronRight /> : <Icons.ChevronLeft />}
          </button>
        </div>

        {/* New Project Button */}
        <div className="p-3">
          <button
            onClick={createProject}
            disabled={creatingProject}
            className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] transition-colors disabled:opacity-50 ${
              sidebarCollapsed ? 'px-2' : ''
            }`}
          >
            <Icons.Plus />
            {!sidebarCollapsed && <span>New Project</span>}
          </button>
        </div>

        {/* Project List */}
        <div className="flex-1 overflow-y-auto px-3 pb-3">
          {projectsLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-12 bg-gray-100 animate-pulse rounded-lg" />
              ))}
            </div>
          ) : projects.length === 0 ? (
            !sidebarCollapsed && (
              <p className="text-sm text-[var(--color-text-secondary)] text-center py-4">No projects yet</p>
            )
          ) : (
            <div className="space-y-1">
              {projects.map(project => (
                <button
                  key={project.id}
                  onClick={() => setCurrentProject(project)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left ${
                    currentProject?.id === project.id
                      ? 'bg-blue-50 text-[var(--color-primary)]'
                      : 'hover:bg-gray-50 text-[var(--color-text)]'
                  }`}
                >
                  <Icons.Folder />
                  {!sidebarCollapsed && (
                    <span className="truncate text-sm font-medium">{project.name}</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Backend Status */}
        <div className="p-3 border-t border-[var(--color-border)]">
          <div className={`flex items-center gap-2 ${sidebarCollapsed ? 'justify-center' : ''}`}>
            <span
              className={`w-2 h-2 rounded-full ${
                backendStatus === 'online'
                  ? 'bg-[var(--color-success)]'
                  : backendStatus === 'offline'
                  ? 'bg-[var(--color-error)]'
                  : 'bg-[var(--color-warning)] animate-pulse'
              }`}
            />
            {!sidebarCollapsed && (
              <span className="text-xs text-[var(--color-text-secondary)]">
                {backendStatus === 'online' ? 'Connected' : backendStatus === 'offline' ? 'Disconnected' : 'Checking...'}
              </span>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {!currentProject ? (
          // No project selected
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center text-[var(--color-primary)] mx-auto mb-4">
                <Icons.Folder />
              </div>
              <p className="text-lg font-medium text-[var(--color-text)]">No Project Selected</p>
              <p className="text-[var(--color-text-secondary)] mt-2">Create or select a project to get started</p>
              <button
                onClick={createProject}
                disabled={creatingProject}
                className="mt-4 px-6 py-3 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] transition-colors disabled:opacity-50"
              >
                {creatingProject ? 'Creating...' : 'Create New Project'}
              </button>
            </div>
          </div>
        ) : (
          // Project workspace with layout
          renderLayout()
        )}
      </main>

      {/* Toast Container */}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
}
