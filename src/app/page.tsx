'use client';

import { useState, useEffect, useCallback } from 'react';
import { projectApi, documentApi, analysisApi, ocrApi, highlightApi, type Project } from '@/utils/api';
import type { Document, Quote } from '@/types';

// Icons as inline SVG components
const IconFolder = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
  </svg>
);

const IconPlus = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

const IconChevronLeft = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
  </svg>
);

const IconChevronRight = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);

const IconDocument = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const IconAnalysis = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

const IconPen = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
  </svg>
);

const IconHighlight = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
  </svg>
);

const IconUpload = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
  </svg>
);

const IconRefresh = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

const IconTrash = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

type TabType = 'documents' | 'analysis' | 'generate' | 'highlight';

export default function App() {
  // Sidebar state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Project state
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [creatingProject, setCreatingProject] = useState(false);

  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>('documents');

  // Document state
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Analysis state
  const [quotesByStandard, setQuotesByStandard] = useState<Record<string, Quote[]>>({});
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Backend status
  const [backendStatus, setBackendStatus] = useState<'checking' | 'online' | 'offline'>('checking');

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Load projects on mount
  useEffect(() => {
    loadProjects();
    checkBackendStatus();
  }, []);

  // Load documents when project changes
  useEffect(() => {
    if (currentProject) {
      loadDocuments();
      loadAnalysis();
    }
  }, [currentProject]);

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

      // Auto-select first project if none selected
      if (data && data.length > 0 && !currentProject) {
        setCurrentProject(data[0]);
      }
    } catch (error) {
      console.error('Failed to load projects:', error);
      showToast('Failed to load projects', 'error');
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
      showToast('Project created', 'success');
    } catch (error) {
      console.error('Failed to create project:', error);
      showToast('Failed to create project', 'error');
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

  const handleFileUpload = async (files: FileList) => {
    if (!currentProject || files.length === 0) return;

    setUploading(true);
    let successCount = 0;

    for (const file of Array.from(files)) {
      try {
        await documentApi.upload(currentProject.id, file);
        successCount++;
      } catch (error) {
        console.error(`Failed to upload ${file.name}:`, error);
      }
    }

    setUploading(false);
    if (successCount > 0) {
      showToast(`Uploaded ${successCount} file(s)`, 'success');
      loadDocuments();
    }
  };

  const handleRunOCR = async () => {
    if (!currentProject) return;
    try {
      await ocrApi.triggerBatch(currentProject.id);
      showToast('OCR started', 'success');
      // Poll for updates
      setTimeout(loadDocuments, 2000);
    } catch (error) {
      console.error('OCR failed:', error);
      showToast('OCR failed', 'error');
    }
  };

  const handleRunAnalysis = async () => {
    if (!currentProject) return;
    try {
      setIsAnalyzing(true);
      const docIds = selectedDocs.length > 0 ? selectedDocs : undefined;
      const result = await analysisApi.analyzeDocuments(currentProject.id, docIds);

      if (result.success) {
        await analysisApi.generateSummary(currentProject.id);
        await loadAnalysis();
        showToast(`Found ${result.total_quotes_found} quotes`, 'success');
      }
    } catch (error) {
      console.error('Analysis failed:', error);
      showToast('Analysis failed', 'error');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    try {
      await documentApi.deleteDocument(docId);
      setDocuments(prev => prev.filter(d => d.id !== docId));
      setSelectedDocs(prev => prev.filter(id => id !== docId));
      showToast('Document deleted', 'success');
    } catch (error) {
      console.error('Delete failed:', error);
      showToast('Delete failed', 'error');
    }
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const tabs = [
    { id: 'documents' as TabType, label: 'Documents', icon: <IconDocument /> },
    { id: 'analysis' as TabType, label: 'Analysis', icon: <IconAnalysis /> },
    { id: 'generate' as TabType, label: 'Generate', icon: <IconPen /> },
    { id: 'highlight' as TabType, label: 'Highlight', icon: <IconHighlight /> },
  ];

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`bg-white border-r border-[#E2E8F0] flex flex-col transition-all duration-300 ${
          sidebarCollapsed ? 'w-16' : 'w-72'
        }`}
      >
        {/* Sidebar Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-[#E2E8F0]">
          {!sidebarCollapsed && (
            <h1 className="font-semibold text-[#1E293B] truncate">Document Pipeline</h1>
          )}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-2 hover:bg-[#F8FAFC] rounded-lg transition-colors"
          >
            {sidebarCollapsed ? <IconChevronRight /> : <IconChevronLeft />}
          </button>
        </div>

        {/* New Project Button */}
        <div className="p-3">
          <button
            onClick={createProject}
            disabled={creatingProject}
            className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-[#2563EB] text-white rounded-lg hover:bg-[#1D4ED8] transition-colors disabled:opacity-50 ${
              sidebarCollapsed ? 'px-2' : ''
            }`}
          >
            <IconPlus />
            {!sidebarCollapsed && <span>New Project</span>}
          </button>
        </div>

        {/* Project List */}
        <div className="flex-1 overflow-y-auto px-3 pb-3">
          {projectsLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-12 skeleton rounded-lg" />
              ))}
            </div>
          ) : projects.length === 0 ? (
            !sidebarCollapsed && (
              <p className="text-sm text-[#64748B] text-center py-4">No projects yet</p>
            )
          ) : (
            <div className="space-y-1">
              {projects.map(project => (
                <button
                  key={project.id}
                  onClick={() => setCurrentProject(project)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left ${
                    currentProject?.id === project.id
                      ? 'bg-[#EFF6FF] text-[#2563EB]'
                      : 'hover:bg-[#F8FAFC] text-[#1E293B]'
                  }`}
                >
                  <IconFolder />
                  {!sidebarCollapsed && (
                    <span className="truncate text-sm font-medium">{project.name}</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Backend Status */}
        <div className="p-3 border-t border-[#E2E8F0]">
          <div className={`flex items-center gap-2 ${sidebarCollapsed ? 'justify-center' : ''}`}>
            <span
              className={`w-2 h-2 rounded-full ${
                backendStatus === 'online'
                  ? 'bg-[#10B981]'
                  : backendStatus === 'offline'
                  ? 'bg-[#EF4444]'
                  : 'bg-[#F59E0B] animate-pulse'
              }`}
            />
            {!sidebarCollapsed && (
              <span className="text-xs text-[#64748B]">
                Backend: {backendStatus === 'online' ? 'Connected' : backendStatus === 'offline' ? 'Disconnected' : 'Checking...'}
              </span>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white border-b border-[#E2E8F0] flex items-center justify-between px-6">
          <div>
            <h2 className="font-semibold text-[#1E293B]">
              {currentProject?.name || 'Select a Project'}
            </h2>
            {currentProject && (
              <p className="text-xs text-[#64748B]">
                {documents.length} documents | {Object.values(quotesByStandard).flat().length} quotes
              </p>
            )}
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 bg-[#F8FAFC] p-1 rounded-lg">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-white text-[#2563EB] shadow-sm'
                    : 'text-[#64748B] hover:text-[#1E293B]'
                }`}
              >
                {tab.icon}
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
          {!currentProject ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <IconFolder />
                <p className="mt-4 text-[#64748B]">Select or create a project to get started</p>
              </div>
            </div>
          ) : (
            <>
              {/* Documents Tab */}
              {activeTab === 'documents' && (
                <div className="space-y-6 animate-fade-in">
                  {/* Upload Area */}
                  <div
                    className="card p-8 border-2 border-dashed border-[#E2E8F0] hover:border-[#2563EB] transition-colors cursor-pointer"
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => {
                      e.preventDefault();
                      handleFileUpload(e.dataTransfer.files);
                    }}
                    onClick={() => document.getElementById('file-input')?.click()}
                  >
                    <input
                      id="file-input"
                      type="file"
                      multiple
                      accept=".pdf,.png,.jpg,.jpeg"
                      className="hidden"
                      onChange={e => e.target.files && handleFileUpload(e.target.files)}
                    />
                    <div className="flex flex-col items-center text-center">
                      <div className="w-12 h-12 bg-[#EFF6FF] rounded-full flex items-center justify-center text-[#2563EB] mb-4">
                        <IconUpload />
                      </div>
                      <p className="font-medium text-[#1E293B]">
                        {uploading ? 'Uploading...' : 'Drop files here or click to upload'}
                      </p>
                      <p className="text-sm text-[#64748B] mt-1">PDF, PNG, JPG supported</p>
                    </div>
                  </div>

                  {/* Document Actions */}
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-[#1E293B]">Documents ({documents.length})</h3>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={loadDocuments}
                        className="flex items-center gap-2 px-3 py-2 text-sm text-[#64748B] hover:text-[#1E293B] hover:bg-[#F8FAFC] rounded-lg transition-colors"
                      >
                        <IconRefresh />
                        Refresh
                      </button>
                      <button
                        onClick={handleRunOCR}
                        disabled={documents.length === 0}
                        className="px-4 py-2 text-sm bg-[#2563EB] text-white rounded-lg hover:bg-[#1D4ED8] transition-colors disabled:opacity-50"
                      >
                        Run OCR
                      </button>
                    </div>
                  </div>

                  {/* Document List */}
                  {documentsLoading ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="h-16 skeleton rounded-lg" />
                      ))}
                    </div>
                  ) : documents.length === 0 ? (
                    <div className="card p-8 text-center">
                      <p className="text-[#64748B]">No documents uploaded yet</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {documents.map(doc => (
                        <div
                          key={doc.id}
                          className={`card p-4 flex items-center justify-between ${
                            selectedDocs.includes(doc.id) ? 'ring-2 ring-[#2563EB]' : ''
                          }`}
                        >
                          <div className="flex items-center gap-4">
                            <input
                              type="checkbox"
                              checked={selectedDocs.includes(doc.id)}
                              onChange={() => {
                                setSelectedDocs(prev =>
                                  prev.includes(doc.id)
                                    ? prev.filter(id => id !== doc.id)
                                    : [...prev, doc.id]
                                );
                              }}
                              className="w-4 h-4 rounded border-[#E2E8F0] text-[#2563EB] focus:ring-[#2563EB]"
                            />
                            <div>
                              <p className="font-medium text-[#1E293B]">{doc.file_name}</p>
                              <p className="text-xs text-[#64748B]">
                                {doc.exhibit_number} | {doc.page_count} pages
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span
                              className={`px-2 py-1 text-xs rounded-full ${
                                doc.ocr_status === 'completed'
                                  ? 'bg-[#DCFCE7] text-[#10B981]'
                                  : doc.ocr_status === 'processing'
                                  ? 'bg-[#FEF3C7] text-[#F59E0B]'
                                  : 'bg-[#F1F5F9] text-[#64748B]'
                              }`}
                            >
                              {doc.ocr_status || 'pending'}
                            </span>
                            <button
                              onClick={() => handleDeleteDocument(doc.id)}
                              className="p-2 text-[#64748B] hover:text-[#EF4444] hover:bg-[#FEF2F2] rounded-lg transition-colors"
                            >
                              <IconTrash />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Analysis Tab */}
              {activeTab === 'analysis' && (
                <div className="space-y-6 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-[#1E293B]">L-1 Evidence Analysis</h3>
                    <button
                      onClick={handleRunAnalysis}
                      disabled={isAnalyzing || documents.length === 0}
                      className="px-4 py-2 text-sm bg-[#F97316] text-white rounded-lg hover:bg-[#EA580C] transition-colors disabled:opacity-50"
                    >
                      {isAnalyzing ? 'Analyzing...' : 'Run Analysis'}
                    </button>
                  </div>

                  {Object.keys(quotesByStandard).length === 0 ? (
                    <div className="card p-8 text-center">
                      <IconAnalysis />
                      <p className="mt-4 text-[#64748B]">No analysis results yet. Run analysis to extract L-1 evidence.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {Object.entries(quotesByStandard).map(([standard, quotes]) => (
                        <div key={standard} className="card p-4">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-medium text-[#1E293B]">{standard}</h4>
                            <span className="px-2 py-1 text-xs bg-[#EFF6FF] text-[#2563EB] rounded-full">
                              {quotes.length} quotes
                            </span>
                          </div>
                          <div className="space-y-2">
                            {quotes.slice(0, 3).map((quote, idx) => (
                              <div key={idx} className="p-3 bg-[#F8FAFC] rounded-lg text-sm">
                                <p className="text-[#1E293B] line-clamp-2">{quote.quote}</p>
                                <p className="text-xs text-[#64748B] mt-1">
                                  Source: {quote.source?.exhibit_id || 'Unknown'}
                                </p>
                              </div>
                            ))}
                            {quotes.length > 3 && (
                              <p className="text-xs text-[#64748B] text-center py-2">
                                +{quotes.length - 3} more quotes
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Generate Tab */}
              {activeTab === 'generate' && (
                <div className="space-y-6 animate-fade-in">
                  <div className="card p-6">
                    <h3 className="font-semibold text-[#1E293B] mb-4">Generate Petition Paragraphs</h3>
                    <p className="text-[#64748B] mb-6">
                      Generate professional petition letter paragraphs based on the analyzed evidence.
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                      {['Specialized Knowledge', 'Managerial Capacity', 'Executive Capacity', 'Qualifying Relationship'].map(section => (
                        <button
                          key={section}
                          className="p-4 text-left border border-[#E2E8F0] rounded-lg hover:border-[#2563EB] hover:bg-[#EFF6FF] transition-colors"
                        >
                          <p className="font-medium text-[#1E293B]">{section}</p>
                          <p className="text-xs text-[#64748B] mt-1">Generate paragraph</p>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Highlight Tab */}
              {activeTab === 'highlight' && (
                <div className="space-y-6 animate-fade-in">
                  <div className="card p-6">
                    <h3 className="font-semibold text-[#1E293B] mb-4">Document Highlighting</h3>
                    <p className="text-[#64748B] mb-6">
                      Automatically highlight key evidence in your documents.
                    </p>
                    <button
                      onClick={async () => {
                        if (currentProject) {
                          try {
                            await highlightApi.triggerBatch(currentProject.id);
                            showToast('Highlighting started', 'success');
                          } catch {
                            showToast('Highlighting failed', 'error');
                          }
                        }
                      }}
                      disabled={documents.length === 0}
                      className="px-4 py-2 bg-[#2563EB] text-white rounded-lg hover:bg-[#1D4ED8] transition-colors disabled:opacity-50"
                    >
                      Run Highlight Analysis
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-4 right-4 px-4 py-3 rounded-lg shadow-lg animate-slide-in ${
            toast.type === 'success' ? 'bg-[#10B981] text-white' : 'bg-[#EF4444] text-white'
          }`}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}
