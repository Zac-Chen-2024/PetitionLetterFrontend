'use client';

import { useState, useEffect, useCallback } from 'react';
import { projectApi, documentApi, healthApi, type Project, type PreloadStatus } from '@/utils/api';
import { usePolling } from '@/hooks/usePolling';
import type { Document } from '@/types';
import UploadModule from '@/components/UploadModule';
import OCRModule from '@/components/OCRModule';
import HighlightModule from '@/components/HighlightModule';
import L1AnalysisModule from '@/components/L1AnalysisModule';
import RelationshipModule from '@/components/RelationshipModule';

// ============================================================================
// VERSION INFO
// ============================================================================
const VERSION = '0.2.0';
const BUILD_TIME = process.env.NEXT_PUBLIC_BUILD_TIME || 'development';

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
  Refresh: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  ),
  Trash: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  ),
};

// ============================================================================
// TOAST COMPONENT
// ============================================================================
function Toast({
  message,
  type,
  onClose,
}: {
  message: string;
  type: 'success' | 'error' | 'info';
  onClose: () => void;
}) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColor = type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-500' : 'bg-blue-500';

  return (
    <div
      className={`fixed bottom-4 right-4 px-4 py-3 rounded-lg shadow-lg ${bgColor} text-white flex items-center gap-3 animate-slide-in z-50`}
    >
      <span>{message}</span>
      <button onClick={onClose} className="text-white/80 hover:text-white">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export default function App() {
  // Sidebar state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Project state
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [creatingProject, setCreatingProject] = useState(false);

  // Document state
  const [documents, setDocuments] = useState<Document[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);

  // Backend status
  const [backendStatus, setBackendStatus] = useState<'checking' | 'online' | 'offline'>('checking');

  // Toast state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // ============================================================================
  // API FUNCTIONS (defined before effects that use them)
  // ============================================================================
  const checkBackendStatus = useCallback(async () => {
    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';
      const response = await fetch(`${API_BASE}/`);
      setBackendStatus(response.ok ? 'online' : 'offline');
    } catch {
      setBackendStatus('offline');
    }
  }, []);

  // Poll model preload status using the usePolling hook
  const { data: preloadStatus } = usePolling<PreloadStatus>({
    fetcher: () => healthApi.getPreloadStatus(),
    shouldContinue: (status) => status.is_loading && !status.is_ready,
    interval: 2000,
    errorRetryInterval: 5000,
    maxErrorCount: 5,
    enabled: true, // Auto-start on mount
    onError: (error) => {
      console.error('Failed to get preload status:', error);
    },
  });

  // ============================================================================
  // EFFECTS
  // ============================================================================
  useEffect(() => {
    console.log(
      `%cPetitionLetter Frontend v${VERSION}%c\nBuild: ${BUILD_TIME} (New York Time)\n%c三模块布局版本`,
      'color: #2563EB; font-size: 14px; font-weight: bold;',
      'color: #64748B; font-size: 12px;',
      'color: #10B981; font-size: 12px;'
    );
    loadProjects();
    checkBackendStatus();
    // pollPreloadStatus is now handled by usePolling hook with enabled: true
  }, [checkBackendStatus]);

  useEffect(() => {
    if (currentProject) {
      loadDocuments();
    } else {
      setDocuments([]);
    }
  }, [currentProject]);

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
      showToast('加载项目失败', 'error');
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
      showToast('项目已创建', 'success');
    } catch (error) {
      console.error('Failed to create project:', error);
      showToast('创建项目失败', 'error');
    } finally {
      setCreatingProject(false);
    }
  };

  const deleteProject = async (projectId: string) => {
    if (!confirm('确定要删除此项目吗？此操作无法撤销。')) return;

    try {
      await projectApi.deleteProject(projectId);
      setProjects(prev => prev.filter(p => p.id !== projectId));
      if (currentProject?.id === projectId) {
        setCurrentProject(projects.find(p => p.id !== projectId) || null);
      }
      showToast('项目已删除', 'success');
    } catch (error) {
      console.error('Failed to delete project:', error);
      showToast('删除项目失败', 'error');
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

  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
    setToast({ message, type });
  };

  // ============================================================================
  // HANDLERS
  // ============================================================================
  const handleUploadComplete = async () => {
    // 延迟 500ms 确保后端处理完成
    await new Promise(resolve => setTimeout(resolve, 500));
    await loadDocuments();
  };

  const handleOCRComplete = () => {
    loadDocuments();
  };

  const handleHighlightComplete = () => {
    loadDocuments();
  };

  const handleSuccess = (message: string) => {
    showToast(message, 'success');
  };

  const handleError = (message: string) => {
    showToast(message, 'error');
  };

  // ============================================================================
  // RENDER
  // ============================================================================
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Sidebar */}
      <aside
        className={`bg-white border-r border-gray-200 flex flex-col transition-all duration-300 ${
          sidebarCollapsed ? 'w-16' : 'w-72'
        }`}
      >
        {/* Sidebar Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200">
          {!sidebarCollapsed && (
            <h1 className="font-semibold text-gray-900 truncate">PetitionLetter</h1>
          )}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            {sidebarCollapsed ? <Icons.ChevronRight /> : <Icons.ChevronLeft />}
          </button>
        </div>

        {/* New Project Button */}
        <div className="p-3">
          <button
            onClick={createProject}
            disabled={creatingProject}
            className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 ${
              sidebarCollapsed ? 'px-2' : ''
            }`}
          >
            <Icons.Plus />
            {!sidebarCollapsed && <span>新建项目</span>}
          </button>
        </div>

        {/* Project List */}
        <div className="flex-1 overflow-y-auto px-3 pb-3">
          {projectsLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : projects.length === 0 ? (
            !sidebarCollapsed && (
              <p className="text-sm text-gray-500 text-center py-4">暂无项目</p>
            )
          ) : (
            <div className="space-y-1">
              {projects.map(project => (
                <div
                  key={project.id}
                  className={`group flex items-center gap-2 rounded-lg transition-colors ${
                    currentProject?.id === project.id
                      ? 'bg-blue-50 text-blue-600'
                      : 'hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  <button
                    onClick={() => setCurrentProject(project)}
                    className="flex-1 flex items-center gap-3 px-3 py-2.5 text-left"
                  >
                    <Icons.Folder />
                    {!sidebarCollapsed && (
                      <span className="truncate text-sm font-medium">{project.name}</span>
                    )}
                  </button>
                  {!sidebarCollapsed && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteProject(project.id);
                      }}
                      className="p-1.5 mr-2 text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Icons.Trash />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Backend Status */}
        <div className="p-3 border-t border-gray-200">
          <div className={`flex items-center gap-2 ${sidebarCollapsed ? 'justify-center' : ''}`}>
            <span
              className={`w-2 h-2 rounded-full ${
                backendStatus === 'online'
                  ? 'bg-green-500'
                  : backendStatus === 'offline'
                  ? 'bg-red-500'
                  : 'bg-yellow-500 animate-pulse'
              }`}
            />
            {!sidebarCollapsed && (
              <span className="text-xs text-gray-500">
                {backendStatus === 'online' ? '已连接' : backendStatus === 'offline' ? '已断开' : '检查中...'}
              </span>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 flex-shrink-0">
          <div>
            <h2 className="font-semibold text-gray-900">
              {currentProject?.name || '选择一个项目'}
            </h2>
            {currentProject && (
              <p className="text-xs text-gray-500">
                {documents.length} 个文档 | 三模块流水线
              </p>
            )}
          </div>

          {/* Refresh Button */}
          {currentProject && (
            <button
              onClick={loadDocuments}
              disabled={documentsLoading}
              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
            >
              <Icons.Refresh />
              刷新
            </button>
          )}
        </header>

        {/* Content Area - Three Modules */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Model Preload Status Banner */}
          {preloadStatus && !preloadStatus.is_ready && (
            <div className="max-w-4xl mx-auto mb-4">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-amber-600 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-amber-800">模型加载中，请稍候...</p>
                    <div className="flex gap-4 mt-1 text-xs text-amber-600">
                      <span>
                        OCR: {preloadStatus.models.ocr.status === 'loaded' ? '✓ 已加载' :
                              preloadStatus.models.ocr.status === 'loading' ? `加载中 ${preloadStatus.models.ocr.progress}%` :
                              preloadStatus.models.ocr.status === 'error' ? `✗ 错误` : '等待'}
                      </span>
                      <span>
                        LLM: {preloadStatus.models.llm.status === 'loaded' ? '✓ 已加载' :
                              preloadStatus.models.llm.status === 'loading' ? `加载中 ${preloadStatus.models.llm.progress}%` :
                              preloadStatus.models.llm.status === 'error' ? `✗ 错误` : '等待'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {!currentProject ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center text-blue-500 mx-auto mb-4">
                  <Icons.Folder />
                </div>
                <p className="text-lg font-medium text-gray-900">未选择项目</p>
                <p className="text-gray-500 mt-2">创建或选择一个项目开始使用</p>
                <button
                  onClick={createProject}
                  className="mt-4 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  创建新项目
                </button>
              </div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto space-y-6">
              {/* Module 1: Upload */}
              <UploadModule
                projectId={currentProject.id}
                documents={documents}
                onUploadComplete={handleUploadComplete}
                onSuccess={handleSuccess}
                onError={handleError}
              />

              {/* Module 2: OCR */}
              <OCRModule
                projectId={currentProject.id}
                documents={documents}
                onOCRComplete={handleOCRComplete}
                onSuccess={handleSuccess}
                onError={handleError}
                modelsReady={preloadStatus?.is_ready ?? false}
              />

              {/* Module 3: Highlight */}
              <HighlightModule
                projectId={currentProject.id}
                documents={documents}
                onHighlightComplete={handleHighlightComplete}
                onSuccess={handleSuccess}
                onError={handleError}
                modelsReady={preloadStatus?.is_ready ?? false}
              />

              {/* Module 4: L-1 Analysis */}
              <L1AnalysisModule
                projectId={currentProject.id}
                onSuccess={handleSuccess}
                onError={handleError}
              />

              {/* Module 5: Relationship Analysis */}
              <RelationshipModule
                projectId={currentProject.id}
                onSuccess={handleSuccess}
                onError={handleError}
              />

              {/* Future Modules Placeholder */}
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center">
                <p className="text-sm text-gray-500">后续模块</p>
                <p className="text-xs text-gray-400 mt-1">
                  Petition Letter 写作
                </p>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
