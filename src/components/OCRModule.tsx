'use client';

import { useState, useEffect, useCallback } from 'react';
import { ocrApi, type OCRProgressResponse } from '@/utils/api';
import { useSSE } from '@/hooks/useSSE';
import { usePolling } from '@/hooks/usePolling';
import type { Document } from '@/types';
import { useLanguage } from '@/i18n/LanguageContext';

// SSE support detection
const supportsSSE = typeof window !== 'undefined' && typeof EventSource !== 'undefined';

// Types
export type OCRFileStatus = 'pending' | 'queued' | 'processing' | 'completed' | 'failed';
export type ModuleStatus = 'idle' | 'processing' | 'completed';

interface OCRFile {
  id: string;
  fileName: string;
  exhibitNumber: string;
  status: OCRFileStatus;
  progress?: number;
  ocrText?: string;
  error?: string;
}

interface OCRModuleProps {
  projectId: string;
  documents: Document[];
  onOCRComplete: () => void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
  modelsReady?: boolean;
}

// Icons
const ScanIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
  </svg>
);

const PlayIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const ChevronLeftIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
  </svg>
);

const ChevronRightIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);

// Status indicators - wrapped in component to access translations
const StatusIcon = ({ status, t }: { status: OCRFileStatus; t: ReturnType<typeof useLanguage>['t'] }) => {
  switch (status) {
    case 'pending':
      return <span className="w-2.5 h-2.5 rounded-full bg-gray-300 flex-shrink-0" title={t.ocr.pending} />;
    case 'queued':
      return <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 flex-shrink-0" title={t.ocr.queued} />;
    case 'processing':
      return (
        <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse flex-shrink-0" title={t.ocr.processing} />
      );
    case 'completed':
      return (
        <span className="w-2.5 h-2.5 rounded-full bg-green-500 flex-shrink-0" title={t.ocr.status.completed} />
      );
    case 'failed':
      return (
        <span className="w-2.5 h-2.5 rounded-full bg-red-500 flex-shrink-0" title={t.ocr.failed} />
      );
  }
};

export default function OCRModule({
  projectId,
  documents,
  onOCRComplete,
  onSuccess,
  onError,
  modelsReady = true,
}: OCRModuleProps) {
  const { t } = useLanguage();
  const [ocrFiles, setOcrFiles] = useState<OCRFile[]>([]);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [selectedOCRText, setSelectedOCRText] = useState<string>('');
  const [listCollapsed, setListCollapsed] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Page-level progress for currently processing document
  const [currentProcessing, setCurrentProcessing] = useState<{
    documentId: string;
    fileName: string;
    currentPage: number;
    totalPages: number;
  } | null>(null);

  // SSE stream URL
  const sseUrl = projectId ? ocrApi.getStreamUrl(projectId) : null;

  // Handle progress update (shared by SSE and polling)
  const handleProgressUpdate = useCallback((progress: OCRProgressResponse) => {
    // Update page-level progress for current document
    if (progress.current_processing) {
      setCurrentProcessing({
        documentId: progress.current_processing.document_id,
        fileName: progress.current_processing.file_name,
        currentPage: progress.current_processing.current_page,
        totalPages: progress.current_processing.total_pages,
      });
    } else {
      setCurrentProcessing(null);
    }

    // Update file statuses
    setOcrFiles(prev => prev.map(file => {
      const docProgress = progress.documents?.find(d => d.id === file.id);
      if (docProgress) {
        return {
          ...file,
          status: docProgress.ocr_status as OCRFileStatus,
        };
      }
      return file;
    }));
  }, []);

  // Handle OCR complete (shared by SSE and polling)
  const handleOCRDone = useCallback((progress: OCRProgressResponse) => {
    setIsProcessing(false);
    setCurrentProcessing(null);  // Clear page progress
    onOCRComplete();
    if (progress.failed > 0) {
      onError(`${t.ocr.ocrComplete}: ${progress.completed} ${t.common.success}, ${progress.failed} ${t.ocr.failed}`);
    } else if (progress.completed > 0) {
      onSuccess(`${t.ocr.ocrComplete}: ${progress.completed} ${t.l1Analysis.documents}`);
    }
  }, [onOCRComplete, onError, onSuccess, t]);

  // Use SSE hook for real-time progress (primary method)
  const {
    isConnected: sseConnected,
    connect: sseConnect,
    disconnect: sseDisconnect,
  } = useSSE<OCRProgressResponse>({
    url: supportsSSE ? sseUrl : null,
    onMessage: handleProgressUpdate,
    onComplete: handleOCRDone,
    onError: (event) => {
      console.error('[OCR SSE] Connection error:', event);
      // SSE will auto-reconnect, but we log for debugging
    },
  });

  // Fallback: Use polling hook for OCR progress (for browsers without SSE)
  const {
    isPolling,
    errorCount: pollErrorCount,
    start: startPolling,
    stop: stopPolling,
  } = usePolling({
    fetcher: () => ocrApi.getProgress(projectId),
    shouldContinue: (progress) => progress.processing > 0 || progress.pending > 0 || progress.queued > 0,
    interval: 2000,
    errorRetryInterval: 5000,
    maxErrorCount: 3,
    maxDuration: 30 * 60 * 1000, // 30 minutes
    enabled: false, // Manual start
    onSuccess: (progress) => {
      handleProgressUpdate(progress);
      // Check if polling is complete
      if (progress.processing === 0 && progress.pending === 0 && progress.queued === 0) {
        handleOCRDone(progress);
      }
    },
    onError: (err) => {
      console.error('Failed to get OCR progress:', err);
    },
    onMaxErrors: () => {
      setIsProcessing(false);
      onError(t.backend.cannotConnect);
      // Reset processing files to pending
      setOcrFiles(prev => prev.map(f =>
        f.status === 'processing' || f.status === 'queued'
          ? { ...f, status: 'pending' as OCRFileStatus }
          : f
      ));
    },
    onTimeout: () => {
      setIsProcessing(false);
      onError(t.ocr.timeout);
      // Reset processing files to pending
      setOcrFiles(prev => prev.map(f =>
        f.status === 'processing' || f.status === 'queued'
          ? { ...f, status: 'pending' as OCRFileStatus }
          : f
      ));
    },
  });

  // Start monitoring OCR progress (SSE or polling)
  const startMonitoring = useCallback(() => {
    setIsProcessing(true);
    if (supportsSSE) {
      sseConnect();
    } else {
      // Fallback to polling
      startPolling();
    }
  }, [sseConnect, startPolling]);

  // Stop monitoring OCR progress
  const stopMonitoring = useCallback(() => {
    setIsProcessing(false);
    if (supportsSSE) {
      sseDisconnect();
    } else {
      stopPolling();
    }
  }, [sseDisconnect, stopPolling]);

  // Convert documents to OCR files
  useEffect(() => {
    const files: OCRFile[] = documents.map(doc => ({
      id: doc.id,
      fileName: doc.file_name,
      exhibitNumber: doc.exhibit_number || 'N/A',
      status: (doc.ocr_status as OCRFileStatus) || 'pending',
      ocrText: doc.ocr_text,
    }));
    setOcrFiles(files);

    // Auto-select first completed file if none selected
    if (!selectedFileId) {
      const firstCompleted = files.find(f => f.status === 'completed');
      if (firstCompleted) {
        setSelectedFileId(firstCompleted.id);
        setSelectedOCRText(firstCompleted.ocrText || '');
      }
    }
  }, [documents, selectedFileId]);

  // Get module status
  const getModuleStatus = (): ModuleStatus => {
    if (isProcessing || ocrFiles.some(f => f.status === 'processing')) return 'processing';
    if (ocrFiles.length > 0 && ocrFiles.every(f => f.status === 'completed')) return 'completed';
    return 'idle';
  };

  const moduleStatus = getModuleStatus();

  // Get pending files count
  const pendingCount = ocrFiles.filter(f => f.status === 'pending').length;
  const completedCount = ocrFiles.filter(f => f.status === 'completed').length;

  // Start OCR for single document
  const handleStartSingle = async (documentId: string) => {
    try {
      setOcrFiles(prev => prev.map(f =>
        f.id === documentId ? { ...f, status: 'processing' as OCRFileStatus } : f
      ));

      await ocrApi.triggerSingle(documentId);

      // Start SSE or polling to monitor progress
      startMonitoring();
    } catch (error) {
      console.error('OCR failed:', error);
      const errorMsg = error instanceof Error && error.message.includes('fetch')
        ? t.backend.cannotConnect
        : t.ocr.ocrFailed;
      onError(errorMsg);
      setOcrFiles(prev => prev.map(f =>
        f.id === documentId ? { ...f, status: 'pending' as OCRFileStatus } : f
      ));
    }
  };

  // Start OCR for all pending documents
  const handleStartAll = async () => {
    if (pendingCount === 0) return;

    try {
      // Mark all pending as queued
      setOcrFiles(prev => prev.map(f =>
        f.status === 'pending' ? { ...f, status: 'queued' as OCRFileStatus } : f
      ));

      await ocrApi.triggerBatch(projectId);
      onSuccess(t.ocr.ocrComplete);

      // Start SSE or polling to monitor progress
      startMonitoring();
    } catch (error) {
      console.error('Batch OCR failed:', error);
      const errorMsg = error instanceof Error && error.message.includes('fetch')
        ? t.backend.cannotConnect
        : t.ocr.batchFailed;
      onError(errorMsg);

      // Reset queued to pending
      setOcrFiles(prev => prev.map(f =>
        f.status === 'queued' ? { ...f, status: 'pending' as OCRFileStatus } : f
      ));
    }
  };

  // Select file to view
  const handleSelectFile = (file: OCRFile) => {
    setSelectedFileId(file.id);
    setSelectedOCRText(file.ocrText || '');
  };

  // Status badge component
  const StatusBadge = ({ status }: { status: ModuleStatus }) => {
    const config = {
      idle: { bg: 'bg-gray-100', text: 'text-gray-600', label: t.ocr.status.idle },
      processing: { bg: 'bg-blue-100', text: 'text-blue-700', label: t.ocr.status.processing },
      completed: { bg: 'bg-green-100', text: 'text-green-700', label: t.ocr.status.completed },
    };
    const { bg, text, label } = config[status];
    return (
      <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${bg} ${text}`}>
        {label}
      </span>
    );
  };

  const selectedFile = ocrFiles.find(f => f.id === selectedFileId);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center text-purple-600">
              <ScanIcon />
            </div>
            <h3 className="text-base font-semibold text-gray-900">{t.ocr.title}</h3>
            <span className="text-xs text-gray-500">
              {completedCount}/{ocrFiles.length} {t.ocr.completed}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleStartAll}
              disabled={pendingCount === 0 || isProcessing || !modelsReady}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-xs font-medium rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title={!modelsReady ? t.backend.modelsLoading : undefined}
            >
              <PlayIcon />
              {!modelsReady ? t.backend.modelsLoading : t.ocr.startAll}
            </button>
            <StatusBadge status={moduleStatus} />
          </div>
        </div>
      </div>

      {/* Content - Left-Right Layout */}
      <div className="flex" style={{ height: '500px' }}>
        {/* Left: File List (Collapsible) */}
        <div
          className={`border-r border-gray-200 flex flex-col transition-all duration-300 ${
            listCollapsed ? 'w-10' : 'w-64'
          }`}
        >
          {/* List Header */}
          <div className="px-3 py-2 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
            {!listCollapsed && (
              <span className="text-xs font-medium text-gray-600">{t.ocr.fileList}</span>
            )}
            <button
              onClick={() => setListCollapsed(!listCollapsed)}
              className="p-1 hover:bg-gray-200 rounded transition-colors"
              title={listCollapsed ? t.common.expand : t.common.collapse}
            >
              {listCollapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
            </button>
          </div>

          {/* File List */}
          {!listCollapsed ? (
            <div className="flex-1 overflow-y-auto">
              {ocrFiles.length === 0 ? (
                <div className="p-4 text-center text-xs text-gray-400">
                  {t.ocr.noFiles}
                </div>
              ) : (
                <div className="py-1">
                  {ocrFiles.map((file) => (
                    <div
                      key={file.id}
                      onClick={() => file.status === 'completed' && handleSelectFile(file)}
                      className={`px-3 py-2 cursor-pointer transition-colors ${
                        selectedFileId === file.id
                          ? 'bg-purple-50 border-r-2 border-purple-500'
                          : 'hover:bg-gray-50'
                      } ${file.status !== 'completed' ? 'opacity-60' : ''}`}
                    >
                      <div className="flex items-center gap-2">
                        <StatusIcon status={file.status} t={t} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-gray-700 truncate">
                            {file.exhibitNumber}
                          </p>
                          <p className="text-xs text-gray-500 truncate" title={file.fileName}>
                            {file.fileName}
                          </p>
                        </div>
                        {file.status === 'pending' && !isProcessing && modelsReady && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartSingle(file.id);
                            }}
                            className="px-1.5 py-0.5 text-xs text-purple-600 hover:bg-purple-100 rounded transition-colors"
                          >
                            {t.ocr.start}
                          </button>
                        )}
                      </div>

                      {/* Page-level progress bar for currently processing file */}
                      {currentProcessing?.documentId === file.id && currentProcessing.totalPages > 0 && (
                        <div className="mt-2">
                          <div className="flex justify-between text-xs text-gray-500 mb-1">
                            <span>{t.ocr.page} {currentProcessing.currentPage}/{currentProcessing.totalPages}</span>
                            <span>{Math.round((currentProcessing.currentPage / currentProcessing.totalPages) * 100)}%</span>
                          </div>
                          <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-purple-500 transition-all duration-300"
                              style={{ width: `${(currentProcessing.currentPage / currentProcessing.totalPages) * 100}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            // Collapsed view - show icons only
            <div className="flex-1 overflow-y-auto py-1">
              {ocrFiles.map((file) => (
                <div
                  key={file.id}
                  onClick={() => file.status === 'completed' && handleSelectFile(file)}
                  className={`flex items-center justify-center py-2 cursor-pointer transition-colors ${
                    selectedFileId === file.id ? 'bg-purple-50' : 'hover:bg-gray-50'
                  }`}
                  title={`${file.exhibitNumber}: ${file.fileName}`}
                >
                  <StatusIcon status={file.status} t={t} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Preview Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Preview Header */}
          <div className="px-4 py-2 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
            <span className="text-xs font-medium text-gray-600">
              {selectedFile
                ? `${t.ocr.result} - ${selectedFile.exhibitNumber}: ${selectedFile.fileName}`
                : t.ocr.resultPreview}
            </span>
            {selectedOCRText && (
              <button
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(selectedOCRText);
                  } catch (err) {
                    console.error('Failed to copy:', err);
                  }
                }}
                className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 hover:bg-gray-200 rounded transition-colors"
              >
                {t.common.copy}
              </button>
            )}
          </div>

          {/* Preview Content - Fixed Height with Scroll */}
          <div className="flex-1 overflow-y-auto p-4 bg-white">
            {selectedOCRText ? (
              <div
                className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap font-mono text-sm leading-relaxed"
              >
                {selectedOCRText}
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-sm">{t.ocr.selectCompleted}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
