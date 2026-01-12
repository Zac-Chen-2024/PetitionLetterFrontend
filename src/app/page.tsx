'use client';

import { useState, useEffect } from 'react';
import { projectApi, documentApi, analysisApi, ocrApi, highlightApi, type Project } from '@/utils/api';
import type { Document, Quote } from '@/types';

// ============================================================================
// VERSION INFO
// ============================================================================
const VERSION = '0.1.1';
const BUILD_TIME = '2025-01-12 10:20 EST';

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
  Upload: () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
    </svg>
  ),
  Scan: () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  ),
  Analysis: () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
  Pen: () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
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
  Check: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  Layout: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
    </svg>
  ),
  Pipeline: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
    </svg>
  ),
  Grid: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    </svg>
  ),
  Download: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  ),
};

// ============================================================================
// TYPES
// ============================================================================
type LayoutType = 'pipeline' | 'tabs';
type StepStatus = 'pending' | 'active' | 'processing' | 'completed';

interface Step {
  id: number;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
}

const STEPS: Step[] = [
  { id: 1, title: 'Upload Documents', subtitle: 'Add PDF/images to analyze', icon: <Icons.Upload /> },
  { id: 2, title: 'OCR & Highlight', subtitle: 'Extract text and mark evidence', icon: <Icons.Scan /> },
  { id: 3, title: 'L-1 Analysis', subtitle: 'Extract quotes by standard', icon: <Icons.Analysis /> },
  { id: 4, title: 'Generate Paragraphs', subtitle: 'Create petition letter content', icon: <Icons.Pen /> },
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export default function App() {
  // Layout state
  const [layout, setLayout] = useState<LayoutType>('pipeline');
  const [showLayoutMenu, setShowLayoutMenu] = useState(false);

  // Sidebar state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Project state
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [creatingProject, setCreatingProject] = useState(false);

  // Pipeline step state
  const [currentStep, setCurrentStep] = useState(1);

  // Document state
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  // OCR state
  const [ocrRunning, setOcrRunning] = useState(false);
  const [highlightRunning, setHighlightRunning] = useState(false);

  // Analysis state
  const [quotesByStandard, setQuotesByStandard] = useState<Record<string, Quote[]>>({});
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Generate state
  const [generatedContent, setGeneratedContent] = useState<Record<string, string>>({});
  const [isGenerating, setIsGenerating] = useState(false);

  // Backend status
  const [backendStatus, setBackendStatus] = useState<'checking' | 'online' | 'offline'>('checking');

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // ============================================================================
  // EFFECTS
  // ============================================================================
  useEffect(() => {
    console.log(
      `%cPetitionLetter Frontend v${VERSION}%c\nBuild: ${BUILD_TIME} (New York Time)`,
      'color: #2563EB; font-size: 14px; font-weight: bold;',
      'color: #64748B; font-size: 12px;'
    );
    loadProjects();
    checkBackendStatus();
  }, []);

  useEffect(() => {
    if (currentProject) {
      loadDocuments();
      loadAnalysis();
    }
  }, [currentProject]);

  // Auto-advance step based on data
  useEffect(() => {
    if (documents.length > 0 && currentStep === 1) {
      // Don't auto-advance, let user control
    }
  }, [documents, currentStep]);

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
      setCurrentStep(1);
      setDocuments([]);
      setQuotesByStandard({});
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
      setOcrRunning(true);
      await ocrApi.triggerBatch(currentProject.id);
      showToast('OCR started', 'success');
      // Poll for updates
      const pollInterval = setInterval(async () => {
        await loadDocuments();
        const allCompleted = documents.every(d => d.ocr_status === 'completed');
        if (allCompleted) {
          clearInterval(pollInterval);
          setOcrRunning(false);
          showToast('OCR completed', 'success');
        }
      }, 3000);
      // Stop polling after 5 minutes
      setTimeout(() => {
        clearInterval(pollInterval);
        setOcrRunning(false);
      }, 300000);
    } catch (error) {
      console.error('OCR failed:', error);
      showToast('OCR failed', 'error');
      setOcrRunning(false);
    }
  };

  const handleRunHighlight = async () => {
    if (!currentProject) return;
    try {
      setHighlightRunning(true);
      await highlightApi.triggerBatch(currentProject.id);
      showToast('Highlighting started', 'success');
      setTimeout(() => {
        setHighlightRunning(false);
        showToast('Highlighting completed', 'success');
      }, 5000);
    } catch (error) {
      console.error('Highlight failed:', error);
      showToast('Highlighting failed', 'error');
      setHighlightRunning(false);
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

  // ============================================================================
  // STEP STATUS HELPERS
  // ============================================================================
  const getStepStatus = (stepId: number): StepStatus => {
    if (stepId === 1) {
      if (uploading) return 'processing';
      if (documents.length > 0) return 'completed';
      return currentStep === 1 ? 'active' : 'pending';
    }
    if (stepId === 2) {
      if (ocrRunning || highlightRunning) return 'processing';
      const allOcrDone = documents.length > 0 && documents.every(d => d.ocr_status === 'completed');
      if (allOcrDone) return 'completed';
      return currentStep === 2 ? 'active' : 'pending';
    }
    if (stepId === 3) {
      if (isAnalyzing) return 'processing';
      if (Object.keys(quotesByStandard).length > 0) return 'completed';
      return currentStep === 3 ? 'active' : 'pending';
    }
    if (stepId === 4) {
      if (isGenerating) return 'processing';
      if (Object.keys(generatedContent).length > 0) return 'completed';
      return currentStep === 4 ? 'active' : 'pending';
    }
    return 'pending';
  };

  const canProceedToStep = (stepId: number): boolean => {
    if (stepId === 1) return true;
    if (stepId === 2) return documents.length > 0;
    if (stepId === 3) return documents.some(d => d.ocr_status === 'completed');
    if (stepId === 4) return Object.keys(quotesByStandard).length > 0;
    return false;
  };

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================
  const renderStepIndicator = () => (
    <div className="flex items-center justify-center py-6 px-4 bg-white border-b border-[#E2E8F0]">
      {STEPS.map((step, idx) => {
        const status = getStepStatus(step.id);
        const isClickable = canProceedToStep(step.id);

        return (
          <div key={step.id} className="flex items-center">
            {/* Step Circle */}
            <button
              onClick={() => isClickable && setCurrentStep(step.id)}
              disabled={!isClickable}
              className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-all ${
                isClickable ? 'cursor-pointer hover:bg-[#F8FAFC]' : 'cursor-not-allowed opacity-50'
              } ${currentStep === step.id ? 'bg-[#EFF6FF]' : ''}`}
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                  status === 'completed'
                    ? 'bg-[#10B981] text-white'
                    : status === 'processing'
                    ? 'bg-[#F59E0B] text-white animate-pulse'
                    : status === 'active'
                    ? 'bg-[#2563EB] text-white'
                    : 'bg-[#E2E8F0] text-[#64748B]'
                }`}
              >
                {status === 'completed' ? <Icons.Check /> : <span className="font-semibold">{step.id}</span>}
              </div>
              <div className="text-left hidden lg:block">
                <p className={`text-sm font-medium ${currentStep === step.id ? 'text-[#2563EB]' : 'text-[#1E293B]'}`}>
                  {step.title}
                </p>
                <p className="text-xs text-[#64748B]">{step.subtitle}</p>
              </div>
            </button>

            {/* Connector Line */}
            {idx < STEPS.length - 1 && (
              <div className={`w-12 h-0.5 mx-2 ${getStepStatus(step.id) === 'completed' ? 'bg-[#10B981]' : 'bg-[#E2E8F0]'}`} />
            )}
          </div>
        );
      })}
    </div>
  );

  const renderStep1Upload = () => (
    <div className="space-y-6 animate-fade-in">
      {/* Upload Zone */}
      <div
        className="card p-12 border-2 border-dashed border-[#E2E8F0] hover:border-[#2563EB] transition-colors cursor-pointer"
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
          <div className="w-16 h-16 bg-[#EFF6FF] rounded-full flex items-center justify-center text-[#2563EB] mb-4">
            <Icons.Upload />
          </div>
          <p className="text-lg font-medium text-[#1E293B]">
            {uploading ? 'Uploading...' : 'Drop files here or click to upload'}
          </p>
          <p className="text-sm text-[#64748B] mt-2">PDF, PNG, JPG supported (max 50MB each)</p>
        </div>
      </div>

      {/* Document List */}
      <div className="card">
        <div className="p-4 border-b border-[#E2E8F0] flex items-center justify-between">
          <h3 className="font-semibold text-[#1E293B]">Uploaded Documents ({documents.length})</h3>
          <button
            onClick={loadDocuments}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-[#64748B] hover:text-[#1E293B] hover:bg-[#F8FAFC] rounded-lg transition-colors"
          >
            <Icons.Refresh />
            Refresh
          </button>
        </div>

        {documentsLoading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-14 skeleton rounded-lg" />
            ))}
          </div>
        ) : documents.length === 0 ? (
          <div className="p-8 text-center text-[#64748B]">
            No documents uploaded yet. Upload files to continue.
          </div>
        ) : (
          <div className="divide-y divide-[#E2E8F0]">
            {documents.map(doc => (
              <div key={doc.id} className="p-4 flex items-center justify-between hover:bg-[#F8FAFC]">
                <div className="flex items-center gap-4">
                  <input
                    type="checkbox"
                    checked={selectedDocs.includes(doc.id)}
                    onChange={() => {
                      setSelectedDocs(prev =>
                        prev.includes(doc.id) ? prev.filter(id => id !== doc.id) : [...prev, doc.id]
                      );
                    }}
                    className="w-4 h-4 rounded border-[#E2E8F0] text-[#2563EB] focus:ring-[#2563EB]"
                  />
                  <div>
                    <p className="font-medium text-[#1E293B]">{doc.file_name}</p>
                    <p className="text-xs text-[#64748B]">
                      {doc.exhibit_number || 'No exhibit #'} | {doc.page_count} pages
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
                    <Icons.Trash />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Next Step Button */}
      {documents.length > 0 && (
        <div className="flex justify-end">
          <button
            onClick={() => setCurrentStep(2)}
            className="px-6 py-3 bg-[#2563EB] text-white rounded-lg hover:bg-[#1D4ED8] transition-colors font-medium"
          >
            Continue to OCR & Highlight →
          </button>
        </div>
      )}
    </div>
  );

  const renderStep2OCR = () => (
    <div className="space-y-6 animate-fade-in">
      <div className="grid md:grid-cols-2 gap-6">
        {/* OCR Card */}
        <div className="card p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-[#EFF6FF] rounded-lg flex items-center justify-center text-[#2563EB]">
              <Icons.Scan />
            </div>
            <div>
              <h3 className="font-semibold text-[#1E293B]">OCR Processing</h3>
              <p className="text-sm text-[#64748B]">Extract text from documents</p>
            </div>
          </div>

          <div className="space-y-3 mb-4">
            {documents.map(doc => (
              <div key={doc.id} className="flex items-center justify-between p-3 bg-[#F8FAFC] rounded-lg">
                <span className="text-sm text-[#1E293B] truncate flex-1 mr-3">{doc.file_name}</span>
                <span
                  className={`px-2 py-1 text-xs rounded-full whitespace-nowrap ${
                    doc.ocr_status === 'completed'
                      ? 'bg-[#DCFCE7] text-[#10B981]'
                      : doc.ocr_status === 'processing'
                      ? 'bg-[#FEF3C7] text-[#F59E0B]'
                      : 'bg-[#F1F5F9] text-[#64748B]'
                  }`}
                >
                  {doc.ocr_status || 'pending'}
                </span>
              </div>
            ))}
          </div>

          <button
            onClick={handleRunOCR}
            disabled={ocrRunning || documents.length === 0}
            className="w-full py-3 bg-[#2563EB] text-white rounded-lg hover:bg-[#1D4ED8] transition-colors disabled:opacity-50 font-medium"
          >
            {ocrRunning ? 'Processing...' : 'Run OCR on All Documents'}
          </button>
        </div>

        {/* Highlight Card */}
        <div className="card p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-[#FEF3C7] rounded-lg flex items-center justify-center text-[#F59E0B]">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-[#1E293B]">Evidence Highlighting</h3>
              <p className="text-sm text-[#64748B]">Mark key evidence in PDFs</p>
            </div>
          </div>

          <p className="text-sm text-[#64748B] mb-4">
            Automatically identify and highlight important evidence passages in your documents for easy reference.
          </p>

          <button
            onClick={handleRunHighlight}
            disabled={highlightRunning || !documents.some(d => d.ocr_status === 'completed')}
            className="w-full py-3 bg-[#F59E0B] text-white rounded-lg hover:bg-[#D97706] transition-colors disabled:opacity-50 font-medium"
          >
            {highlightRunning ? 'Highlighting...' : 'Run Highlight Analysis'}
          </button>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <button
          onClick={() => setCurrentStep(1)}
          className="px-6 py-3 text-[#64748B] hover:text-[#1E293B] hover:bg-[#F8FAFC] rounded-lg transition-colors font-medium"
        >
          ← Back to Upload
        </button>
        <button
          onClick={() => setCurrentStep(3)}
          disabled={!documents.some(d => d.ocr_status === 'completed')}
          className="px-6 py-3 bg-[#2563EB] text-white rounded-lg hover:bg-[#1D4ED8] transition-colors disabled:opacity-50 font-medium"
        >
          Continue to Analysis →
        </button>
      </div>
    </div>
  );

  const renderStep3Analysis = () => (
    <div className="space-y-6 animate-fade-in">
      {/* Analysis Action Card */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-[#F0FDF4] rounded-lg flex items-center justify-center text-[#10B981]">
              <Icons.Analysis />
            </div>
            <div>
              <h3 className="font-semibold text-[#1E293B]">L-1 Visa Evidence Analysis</h3>
              <p className="text-sm text-[#64748B]">Extract quotes by L-1 standard categories</p>
            </div>
          </div>
          <button
            onClick={handleRunAnalysis}
            disabled={isAnalyzing}
            className="px-6 py-3 bg-[#10B981] text-white rounded-lg hover:bg-[#059669] transition-colors disabled:opacity-50 font-medium"
          >
            {isAnalyzing ? 'Analyzing...' : 'Run L-1 Analysis'}
          </button>
        </div>

        <div className="grid grid-cols-4 gap-4 text-center">
          {['Qualifying Relationship', 'Qualifying Employment', 'Qualifying Capacity', 'Doing Business'].map(
            (standard, idx) => {
              const key = standard.toLowerCase().replace(/ /g, '_');
              const count = quotesByStandard[key]?.length || 0;
              return (
                <div key={idx} className="p-4 bg-[#F8FAFC] rounded-lg">
                  <p className="text-2xl font-bold text-[#2563EB]">{count}</p>
                  <p className="text-xs text-[#64748B] mt-1">{standard}</p>
                </div>
              );
            }
          )}
        </div>
      </div>

      {/* Analysis Results */}
      {Object.keys(quotesByStandard).length > 0 && (
        <div className="space-y-4">
          {Object.entries(quotesByStandard).map(([standard, quotes]) => (
            <div key={standard} className="card">
              <div className="p-4 border-b border-[#E2E8F0] flex items-center justify-between">
                <h4 className="font-medium text-[#1E293B] capitalize">{standard.replace(/_/g, ' ')}</h4>
                <span className="px-3 py-1 text-sm bg-[#EFF6FF] text-[#2563EB] rounded-full">
                  {quotes.length} quotes
                </span>
              </div>
              <div className="divide-y divide-[#E2E8F0]">
                {quotes.slice(0, 5).map((quote, idx) => (
                  <div key={idx} className="p-4">
                    <p className="text-sm text-[#1E293B] line-clamp-3">{quote.quote}</p>
                    <p className="text-xs text-[#64748B] mt-2">
                      Source: {quote.source?.exhibit_id || 'Unknown'} | Page: {quote.page || 'N/A'}
                    </p>
                  </div>
                ))}
                {quotes.length > 5 && (
                  <div className="p-4 text-center text-sm text-[#64748B]">
                    +{quotes.length - 5} more quotes
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between">
        <button
          onClick={() => setCurrentStep(2)}
          className="px-6 py-3 text-[#64748B] hover:text-[#1E293B] hover:bg-[#F8FAFC] rounded-lg transition-colors font-medium"
        >
          ← Back to OCR
        </button>
        <button
          onClick={() => setCurrentStep(4)}
          disabled={Object.keys(quotesByStandard).length === 0}
          className="px-6 py-3 bg-[#2563EB] text-white rounded-lg hover:bg-[#1D4ED8] transition-colors disabled:opacity-50 font-medium"
        >
          Continue to Generate →
        </button>
      </div>
    </div>
  );

  const renderStep4Generate = () => (
    <div className="space-y-6 animate-fade-in">
      <div className="card p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 bg-[#FEF3C7] rounded-lg flex items-center justify-center text-[#F59E0B]">
            <Icons.Pen />
          </div>
          <div>
            <h3 className="font-semibold text-[#1E293B]">Generate Petition Paragraphs</h3>
            <p className="text-sm text-[#64748B]">Create professional petition letter content from analyzed evidence</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {[
            { key: 'specialized_knowledge', title: 'Specialized Knowledge', desc: 'L-1B specialized knowledge criteria' },
            { key: 'managerial_capacity', title: 'Managerial Capacity', desc: 'L-1A managerial role evidence' },
            { key: 'executive_capacity', title: 'Executive Capacity', desc: 'L-1A executive role evidence' },
            { key: 'qualifying_relationship', title: 'Qualifying Relationship', desc: 'Corporate relationship evidence' },
          ].map(section => (
            <button
              key={section.key}
              onClick={() => {
                setIsGenerating(true);
                // Simulate generation
                setTimeout(() => {
                  setGeneratedContent(prev => ({
                    ...prev,
                    [section.key]: `Generated content for ${section.title}...`,
                  }));
                  setIsGenerating(false);
                  showToast(`Generated ${section.title} paragraph`, 'success');
                }, 2000);
              }}
              disabled={isGenerating}
              className="p-6 text-left border-2 border-[#E2E8F0] rounded-xl hover:border-[#2563EB] hover:bg-[#EFF6FF] transition-all group"
            >
              <div className="flex items-center justify-between mb-2">
                <p className="font-semibold text-[#1E293B] group-hover:text-[#2563EB]">{section.title}</p>
                {generatedContent[section.key] && (
                  <span className="w-5 h-5 bg-[#10B981] text-white rounded-full flex items-center justify-center">
                    <Icons.Check />
                  </span>
                )}
              </div>
              <p className="text-sm text-[#64748B]">{section.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Generated Content Preview */}
      {Object.keys(generatedContent).length > 0 && (
        <div className="card">
          <div className="p-4 border-b border-[#E2E8F0] flex items-center justify-between">
            <h4 className="font-semibold text-[#1E293B]">Generated Content</h4>
            <button className="flex items-center gap-2 px-4 py-2 bg-[#2563EB] text-white rounded-lg hover:bg-[#1D4ED8] transition-colors text-sm">
              <Icons.Download />
              Export All
            </button>
          </div>
          <div className="p-4 space-y-4">
            {Object.entries(generatedContent).map(([key, content]) => (
              <div key={key} className="p-4 bg-[#F8FAFC] rounded-lg">
                <p className="text-sm font-medium text-[#2563EB] mb-2 capitalize">{key.replace(/_/g, ' ')}</p>
                <p className="text-sm text-[#1E293B]">{content}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between">
        <button
          onClick={() => setCurrentStep(3)}
          className="px-6 py-3 text-[#64748B] hover:text-[#1E293B] hover:bg-[#F8FAFC] rounded-lg transition-colors font-medium"
        >
          ← Back to Analysis
        </button>
        <button
          disabled={Object.keys(generatedContent).length === 0}
          className="px-6 py-3 bg-[#10B981] text-white rounded-lg hover:bg-[#059669] transition-colors disabled:opacity-50 font-medium"
        >
          Complete & Export
        </button>
      </div>
    </div>
  );

  // ============================================================================
  // MAIN RENDER
  // ============================================================================
  return (
    <div className="flex h-screen overflow-hidden bg-[#F8FAFC]">
      {/* Sidebar */}
      <aside
        className={`bg-white border-r border-[#E2E8F0] flex flex-col transition-all duration-300 ${
          sidebarCollapsed ? 'w-16' : 'w-72'
        }`}
      >
        {/* Sidebar Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-[#E2E8F0]">
          {!sidebarCollapsed && (
            <h1 className="font-semibold text-[#1E293B] truncate">PetitionLetter</h1>
          )}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-2 hover:bg-[#F8FAFC] rounded-lg transition-colors"
          >
            {sidebarCollapsed ? <Icons.ChevronRight /> : <Icons.ChevronLeft />}
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
            <Icons.Plus />
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
                  onClick={() => {
                    setCurrentProject(project);
                    setCurrentStep(1);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left ${
                    currentProject?.id === project.id
                      ? 'bg-[#EFF6FF] text-[#2563EB]'
                      : 'hover:bg-[#F8FAFC] text-[#1E293B]'
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
                {backendStatus === 'online' ? 'Connected' : backendStatus === 'offline' ? 'Disconnected' : 'Checking...'}
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
                Step {currentStep} of 4 | {documents.length} documents
              </p>
            )}
          </div>

          {/* Layout Switcher */}
          <div className="relative">
            <button
              onClick={() => setShowLayoutMenu(!showLayoutMenu)}
              className="flex items-center gap-2 px-4 py-2 text-sm text-[#64748B] hover:text-[#1E293B] hover:bg-[#F8FAFC] rounded-lg transition-colors"
            >
              <Icons.Layout />
              <span className="hidden sm:inline">Layout</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showLayoutMenu && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-[#E2E8F0] py-2 z-50">
                <button
                  onClick={() => {
                    setLayout('pipeline');
                    setShowLayoutMenu(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-[#F8FAFC] ${
                    layout === 'pipeline' ? 'text-[#2563EB] bg-[#EFF6FF]' : 'text-[#1E293B]'
                  }`}
                >
                  <Icons.Pipeline />
                  Pipeline View
                </button>
                <button
                  onClick={() => {
                    setLayout('tabs');
                    setShowLayoutMenu(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-[#F8FAFC] ${
                    layout === 'tabs' ? 'text-[#2563EB] bg-[#EFF6FF]' : 'text-[#1E293B]'
                  }`}
                >
                  <Icons.Grid />
                  Tabs View
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Step Indicator (Pipeline Layout Only) */}
        {layout === 'pipeline' && currentProject && renderStepIndicator()}

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
          {!currentProject ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 bg-[#EFF6FF] rounded-full flex items-center justify-center text-[#2563EB] mx-auto mb-4">
                  <Icons.Folder />
                </div>
                <p className="text-lg font-medium text-[#1E293B]">No Project Selected</p>
                <p className="text-[#64748B] mt-2">Create or select a project to get started</p>
                <button
                  onClick={createProject}
                  className="mt-4 px-6 py-3 bg-[#2563EB] text-white rounded-lg hover:bg-[#1D4ED8] transition-colors"
                >
                  Create New Project
                </button>
              </div>
            </div>
          ) : layout === 'pipeline' ? (
            <div className="max-w-4xl mx-auto">
              {currentStep === 1 && renderStep1Upload()}
              {currentStep === 2 && renderStep2OCR()}
              {currentStep === 3 && renderStep3Analysis()}
              {currentStep === 4 && renderStep4Generate()}
            </div>
          ) : (
            // Tabs layout - simplified version
            <div className="text-center py-12">
              <p className="text-[#64748B]">Tabs layout coming soon...</p>
              <button
                onClick={() => setLayout('pipeline')}
                className="mt-4 text-[#2563EB] hover:underline"
              >
                Switch to Pipeline View
              </button>
            </div>
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

      {/* Click outside to close layout menu */}
      {showLayoutMenu && (
        <div className="fixed inset-0 z-40" onClick={() => setShowLayoutMenu(false)} />
      )}
    </div>
  );
}
