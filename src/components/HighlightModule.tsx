'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { highlightApi, type DocumentHighlightInfo, type HighlightItem, type HighlightProgressResponse } from '@/utils/api';
import { useSSE } from '@/hooks/useSSE';
import { usePolling } from '@/hooks/usePolling';
import type { Document } from '@/types';
import PDFHighlightViewer from './PDFHighlightViewer';

// SSE support detection
const supportsSSE = typeof window !== 'undefined' && typeof EventSource !== 'undefined';

// Types
export type HighlightFileStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'not_started';
export type ModuleStatus = 'idle' | 'processing' | 'completed';

interface HighlightFile {
  id: string;
  fileName: string;
  exhibitNumber: string;
  status: HighlightFileStatus;
  pageCount: number;
  highlightCount?: number;
}

interface HighlightModuleProps {
  projectId: string;
  documents: Document[];
  onHighlightComplete: () => void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
  modelsReady?: boolean;
}

// Icons
const HighlightIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
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

// Status indicators
const StatusIcon = ({ status }: { status: HighlightFileStatus }) => {
  switch (status) {
    case 'not_started':
    case 'pending':
      return <span className="w-2.5 h-2.5 rounded-full bg-gray-300 flex-shrink-0" title="待分析" />;
    case 'processing':
      return (
        <span className="w-2.5 h-2.5 rounded-full bg-yellow-500 animate-pulse flex-shrink-0" title="分析中" />
      );
    case 'completed':
      return (
        <span className="w-2.5 h-2.5 rounded-full bg-green-500 flex-shrink-0" title="完成" />
      );
    case 'failed':
      return (
        <span className="w-2.5 h-2.5 rounded-full bg-red-500 flex-shrink-0" title="失败" />
      );
  }
};

export default function HighlightModule({
  projectId,
  documents,
  onHighlightComplete,
  onSuccess,
  onError,
  modelsReady = true,
}: HighlightModuleProps) {
  const [highlightFiles, setHighlightFiles] = useState<HighlightFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<HighlightFile | null>(null);
  const [listCollapsed, setListCollapsed] = useState(false);
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Highlight list state
  const [allHighlights, setAllHighlights] = useState<HighlightItem[]>([]);
  const [highlightsLoading, setHighlightsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedHighlightId, setSelectedHighlightId] = useState<string | null>(null);

  // Refs for preventing duplicate operations
  const initializedRef = useRef(false);
  const highlightsLoadingRef = useRef(false);

  // SSE stream URL
  const sseUrl = projectId ? highlightApi.getStreamUrl(projectId) : null;

  // Handle progress update (shared by SSE and polling)
  const handleProgressUpdate = useCallback((progress: HighlightProgressResponse) => {
    setHighlightFiles(prev => {
      let hasChange = false;
      const updated = prev.map(file => {
        const docInfo = progress.documents?.find((d: DocumentHighlightInfo) => d.id === file.id);
        if (docInfo) {
          const newStatus = (docInfo.highlight_status || 'pending') as HighlightFileStatus;
          if (file.status !== newStatus) {
            hasChange = true;
            return { ...file, status: newStatus };
          }
        }
        return file;
      });
      // 只在有实际变化时返回新数组，否则返回原数组（引用不变）
      return hasChange ? updated : prev;
    });
  }, []);

  // Handle highlight complete (shared by SSE and polling)
  const handleHighlightDone = useCallback((progress: HighlightProgressResponse) => {
    setIsProcessing(false);
    onHighlightComplete();
    if (progress.failed > 0) {
      onError(`高光分析完成: ${progress.completed} 成功, ${progress.failed} 失败`);
    } else if (progress.completed > 0) {
      onSuccess(`高光分析完成: ${progress.completed} 个文档已处理`);
    }
  }, [onHighlightComplete, onError, onSuccess]);

  // Use SSE hook for real-time progress (primary method)
  const {
    isConnected: sseConnected,
    connect: sseConnect,
    disconnect: sseDisconnect,
  } = useSSE<HighlightProgressResponse>({
    url: supportsSSE ? sseUrl : null,
    onMessage: handleProgressUpdate,
    onComplete: handleHighlightDone,
    onError: (event) => {
      console.error('[Highlight SSE] Connection error:', event);
    },
  });

  // Fallback: Use polling hook for highlight progress
  const {
    isPolling,
    errorCount: pollErrorCount,
    start: startPolling,
    stop: stopPolling,
  } = usePolling({
    fetcher: () => highlightApi.getProgress(projectId),
    shouldContinue: (progress) => progress.processing > 0 || progress.pending > 0,
    interval: 2000,
    errorRetryInterval: 5000,
    maxErrorCount: 3,
    maxDuration: 30 * 60 * 1000, // 30 minutes
    enabled: false, // Manual start
    onSuccess: (progress) => {
      handleProgressUpdate(progress);
      if (progress.processing === 0 && progress.pending === 0) {
        handleHighlightDone(progress);
      }
    },
    onError: (err) => {
      console.error('Failed to get highlight progress:', err);
    },
    onMaxErrors: () => {
      setIsProcessing(false);
      onError('无法连接后端服务，请检查后端是否运行');
      setHighlightFiles(prev => prev.map(f =>
        f.status === 'processing'
          ? { ...f, status: 'pending' as HighlightFileStatus }
          : f
      ));
    },
    onTimeout: () => {
      setIsProcessing(false);
      onError('高光分析处理超时，请检查后端状态');
      setHighlightFiles(prev => prev.map(f =>
        f.status === 'processing'
          ? { ...f, status: 'pending' as HighlightFileStatus }
          : f
      ));
    },
  });

  // Start monitoring (SSE or polling)
  const startMonitoring = useCallback(() => {
    setIsProcessing(true);
    if (supportsSSE) {
      sseConnect();
    } else {
      startPolling();
    }
  }, [sseConnect, startPolling]);

  // Stop monitoring
  const stopMonitoring = useCallback(() => {
    setIsProcessing(false);
    if (supportsSSE) {
      sseDisconnect();
    } else {
      stopPolling();
    }
  }, [sseDisconnect, stopPolling]);

  // 使用 useMemo 计算 OCR 完成的文档 ID 列表
  const ocrCompletedDocIds = useMemo(() => {
    return documents
      .filter(doc => doc.ocr_status === 'completed')
      .map(doc => doc.id)
      .sort()
      .join(',');
  }, [documents]);

  // 只在文档 ID 列表变化时更新 highlightFiles
  useEffect(() => {
    const ocrCompletedDocs = documents.filter(doc => doc.ocr_status === 'completed');

    setHighlightFiles(prev => {
      // 检查是否有实际变化
      const prevIds = new Set(prev.map(f => f.id));
      const newIds = new Set(ocrCompletedDocs.map(d => d.id));

      // 如果 ID 集合相同，保持不变
      if (prevIds.size === newIds.size && [...prevIds].every(id => newIds.has(id))) {
        return prev;
      }

      // 有变化时才更新
      return ocrCompletedDocs.map(doc => {
        const existingFile = prev.find(f => f.id === doc.id);
        return {
          id: doc.id,
          fileName: doc.file_name,
          exhibitNumber: doc.exhibit_number || 'N/A',
          status: existingFile?.status || 'pending' as HighlightFileStatus,
          pageCount: doc.page_count || 1,
        };
      });
    });
  }, [ocrCompletedDocIds, documents]);

  // Auto-select first file if none selected
  useEffect(() => {
    if (!selectedFile && highlightFiles.length > 0) {
      setSelectedFile(highlightFiles[0]);
    }
  }, [selectedFile, highlightFiles]);

  // 使用 useMemo 提取当前选中文件的最新状态
  const currentSelectedFileStatus = useMemo(() => {
    if (!selectedFile) return null;
    return highlightFiles.find(f => f.id === selectedFile.id)?.status ?? null;
  }, [highlightFiles, selectedFile?.id]);

  // 只在状态实际变化时同步
  useEffect(() => {
    if (selectedFile && currentSelectedFileStatus && currentSelectedFileStatus !== selectedFile.status) {
      setSelectedFile(prev => prev ? { ...prev, status: currentSelectedFileStatus } : null);
    }
  }, [currentSelectedFileStatus, selectedFile?.status]);

  // 重置初始化标志当 projectId 变化时
  useEffect(() => {
    initializedRef.current = false;
  }, [projectId]);

  // 初始化时从后端加载一次状态（仅在组件挂载或 projectId 变化时）
  useEffect(() => {
    const loadHighlightStatus = async () => {
      // 只在未初始化且有文件时加载
      if (initializedRef.current || highlightFiles.length === 0) return;
      initializedRef.current = true;

      try {
        const progress = await highlightApi.getProgress(projectId);
        setHighlightFiles(prev => {
          let hasChange = false;
          const updated = prev.map(file => {
            const docInfo = progress.documents?.find((d: DocumentHighlightInfo) => d.id === file.id);
            if (docInfo) {
              const newStatus = (docInfo.highlight_status || 'pending') as HighlightFileStatus;
              if (file.status !== newStatus) {
                hasChange = true;
                return {
                  ...file,
                  status: newStatus,
                  pageCount: docInfo.page_count || file.pageCount,
                };
              }
            }
            return file;
          });
          return hasChange ? updated : prev;
        });
      } catch (err) {
        console.error('Failed to load highlight status:', err);
      }
    };

    loadHighlightStatus();
  }, [projectId, highlightFiles.length]);

  // Get module status
  const getModuleStatus = (): ModuleStatus => {
    if (isProcessing || highlightFiles.some(f => f.status === 'processing')) return 'processing';
    if (highlightFiles.length > 0 && highlightFiles.every(f => f.status === 'completed')) return 'completed';
    return 'idle';
  };

  const moduleStatus = getModuleStatus();

  // Get counts
  const pendingCount = highlightFiles.filter(f => f.status === 'pending' || f.status === 'not_started').length;
  const completedCount = highlightFiles.filter(f => f.status === 'completed').length;

  // Start highlight for single document
  const handleStartSingle = async (file: HighlightFile) => {
    try {
      setHighlightFiles(prev => prev.map(f =>
        f.id === file.id ? { ...f, status: 'processing' as HighlightFileStatus } : f
      ));

      await highlightApi.trigger(file.id);

      // Start SSE or polling to monitor progress
      startMonitoring();
    } catch (error) {
      console.error('Highlight failed:', error);
      const errorMsg = error instanceof Error && error.message.includes('fetch')
        ? '无法连接后端服务'
        : '高光分析启动失败';
      onError(errorMsg);
      setHighlightFiles(prev => prev.map(f =>
        f.id === file.id ? { ...f, status: 'pending' as HighlightFileStatus } : f
      ));
    }
  };

  // Start highlight for all pending documents
  const handleStartAll = async () => {
    if (pendingCount === 0) return;

    try {
      // Mark all pending as processing
      setHighlightFiles(prev => prev.map(f =>
        f.status === 'pending' || f.status === 'not_started'
          ? { ...f, status: 'processing' as HighlightFileStatus }
          : f
      ));

      await highlightApi.triggerBatch(projectId);
      onSuccess('高光分析已启动');

      // Start SSE or polling to monitor progress
      startMonitoring();
    } catch (error) {
      console.error('Batch highlight failed:', error);
      const errorMsg = error instanceof Error && error.message.includes('fetch')
        ? '无法连接后端服务'
        : '批量高光分析启动失败';
      onError(errorMsg);

      // Reset processing to pending
      setHighlightFiles(prev => prev.map(f =>
        f.status === 'processing' ? { ...f, status: 'pending' as HighlightFileStatus } : f
      ));
    }
  };

  // 提取当前选中文件的状态（稳定的原始值）
  const selectedFileStatus = highlightFiles.find(f => f.id === selectedFile?.id)?.status;

  // Load highlights when selected file changes or completes
  useEffect(() => {
    const loadHighlights = async () => {
      if (!selectedFile) {
        setAllHighlights([]);
        return;
      }

      // 只在文件完成高光分析时加载高光
      if (selectedFileStatus !== 'completed') {
        setAllHighlights([]);
        return;
      }

      // 防止重复加载
      if (highlightsLoadingRef.current) return;
      highlightsLoadingRef.current = true;

      setHighlightsLoading(true);
      try {
        const data = await highlightApi.getHighlights(selectedFile.id);
        setAllHighlights(data.highlights || []);
      } catch (err) {
        console.error('Failed to load highlights:', err);
        setAllHighlights([]);
      } finally {
        setHighlightsLoading(false);
        highlightsLoadingRef.current = false;
      }
    };

    loadHighlights();
    setCurrentPage(1);
    setSelectedHighlightId(null);
  }, [selectedFile?.id, selectedFileStatus]);  // 只依赖 id 和 status，不依赖整个数组

  // Select file to view
  const handleSelectFile = (file: HighlightFile) => {
    setSelectedFile(file);
  };

  // Handle highlight click - navigate to page
  const handleHighlightClick = (highlight: HighlightItem) => {
    setCurrentPage(highlight.page_number);
    setSelectedHighlightId(highlight.id);
  };

  // Status badge component
  const StatusBadge = ({ status }: { status: ModuleStatus }) => {
    const config = {
      idle: { bg: 'bg-gray-100', text: 'text-gray-600', label: '等待分析' },
      processing: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: '分析中' },
      completed: { bg: 'bg-green-100', text: 'text-green-700', label: '已完成' },
    };
    const { bg, text, label } = config[status];
    return (
      <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${bg} ${text}`}>
        {label}
      </span>
    );
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center text-yellow-600">
              <HighlightIcon />
            </div>
            <h3 className="text-base font-semibold text-gray-900">高光模块</h3>
            <span className="text-xs text-gray-500">
              {completedCount}/{highlightFiles.length} 已完成
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleStartAll}
              disabled={pendingCount === 0 || isProcessing || !modelsReady}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-500 text-white text-xs font-medium rounded-lg hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title={!modelsReady ? '模型加载中...' : undefined}
            >
              <PlayIcon />
              {!modelsReady ? '模型加载中...' : '全部分析'}
            </button>
            <StatusBadge status={moduleStatus} />
          </div>
        </div>
      </div>

      {/* Content - Left-Center-Right Layout */}
      <div className="flex" style={{ height: '500px' }}>
        {/* Left: File List (Collapsible) */}
        <div
          className={`border-r border-gray-200 flex flex-col transition-all duration-300 ${
            listCollapsed ? 'w-10' : 'w-56'
          }`}
        >
          {/* List Header */}
          <div className="px-3 py-2 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
            {!listCollapsed && (
              <span className="text-xs font-medium text-gray-600">文件列表</span>
            )}
            <button
              onClick={() => setListCollapsed(!listCollapsed)}
              className="p-1 hover:bg-gray-200 rounded transition-colors"
              title={listCollapsed ? '展开' : '折叠'}
            >
              {listCollapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
            </button>
          </div>

          {/* File List */}
          {!listCollapsed ? (
            <div className="flex-1 overflow-y-auto">
              {highlightFiles.length === 0 ? (
                <div className="p-4 text-center text-xs text-gray-400">
                  暂无可分析的文件
                  <p className="mt-1">请先完成 OCR</p>
                </div>
              ) : (
                <div className="py-1">
                  {highlightFiles.map((file) => (
                    <div
                      key={file.id}
                      onClick={() => handleSelectFile(file)}
                      className={`flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors ${
                        selectedFile?.id === file.id
                          ? 'bg-yellow-50 border-r-2 border-yellow-500'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <StatusIcon status={file.status} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-700 truncate">
                          {file.exhibitNumber}
                        </p>
                        <p className="text-xs text-gray-500 truncate" title={file.fileName}>
                          {file.fileName}
                        </p>
                      </div>
                      {(file.status === 'pending' || file.status === 'not_started') && !isProcessing && modelsReady && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartSingle(file);
                          }}
                          className="px-1.5 py-0.5 text-xs text-yellow-600 hover:bg-yellow-100 rounded transition-colors"
                        >
                          分析
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            // Collapsed view - show icons only
            <div className="flex-1 overflow-y-auto py-1">
              {highlightFiles.map((file) => (
                <div
                  key={file.id}
                  onClick={() => handleSelectFile(file)}
                  className={`flex items-center justify-center py-2 cursor-pointer transition-colors ${
                    selectedFile?.id === file.id ? 'bg-yellow-50' : 'hover:bg-gray-50'
                  }`}
                  title={`${file.exhibitNumber}: ${file.fileName}`}
                >
                  <StatusIcon status={file.status} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Center: PDF Preview Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Preview Header */}
          <div className="px-4 py-2 border-b border-gray-100 bg-gray-50">
            <span className="text-xs font-medium text-gray-600">
              {selectedFile
                ? `PDF 预览 - ${selectedFile.exhibitNumber}: ${selectedFile.fileName}`
                : 'PDF 预览'}
            </span>
          </div>

          {/* Preview Content */}
          <div className="flex-1 overflow-hidden p-2">
            <PDFHighlightViewer
              documentId={selectedFile?.id || null}
              documentName={selectedFile?.fileName}
              pageCount={selectedFile?.pageCount || 1}
              currentPage={currentPage}
              onPageChange={setCurrentPage}
              selectedHighlightId={selectedHighlightId}
            />
          </div>
        </div>

        {/* Right: Highlight List (Collapsible) */}
        <div
          className={`border-l border-gray-200 flex flex-col transition-all duration-300 ${
            rightPanelCollapsed ? 'w-10' : 'w-64'
          }`}
        >
          {/* List Header */}
          <div className="px-3 py-2 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
            <button
              onClick={() => setRightPanelCollapsed(!rightPanelCollapsed)}
              className="p-1 hover:bg-gray-200 rounded transition-colors"
              title={rightPanelCollapsed ? '展开' : '折叠'}
            >
              {rightPanelCollapsed ? <ChevronLeftIcon /> : <ChevronRightIcon />}
            </button>
            {!rightPanelCollapsed && (
              <span className="text-xs font-medium text-gray-600">
                高光列表 {allHighlights.length > 0 && `(${allHighlights.length})`}
              </span>
            )}
          </div>

          {/* Highlight List */}
          {!rightPanelCollapsed ? (
            <div className="flex-1 overflow-y-auto">
              {highlightsLoading ? (
                <div className="p-4 flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : allHighlights.length === 0 ? (
                <div className="p-4 text-center text-xs text-gray-400">
                  {selectedFile?.status === 'completed'
                    ? '暂无高光'
                    : '完成分析后显示高光'}
                </div>
              ) : (
                <div className="py-1">
                  {allHighlights.map((highlight, idx) => (
                    <div
                      key={highlight.id || idx}
                      onClick={() => handleHighlightClick(highlight)}
                      className={`px-3 py-2 cursor-pointer transition-colors border-b border-gray-50 ${
                        selectedHighlightId === highlight.id
                          ? 'bg-yellow-50 border-l-2 border-l-yellow-500'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-gray-400">#{idx + 1}</span>
                        <span className="text-xs text-gray-500">P.{highlight.page_number}</span>
                        {highlight.category_cn && (
                          <span className="px-1.5 py-0.5 text-xs rounded bg-yellow-100 text-yellow-700">
                            {highlight.category_cn}
                          </span>
                        )}
                        {highlight.importance === 'high' && (
                          <span className="px-1.5 py-0.5 text-xs rounded bg-red-100 text-red-600">
                            重要
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-700 line-clamp-2">
                        {highlight.text_content || '无文本内容'}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            // Collapsed view - show count only
            <div className="flex-1 flex flex-col items-center py-4">
              <span className="text-xs text-gray-500 [writing-mode:vertical-lr]">
                {allHighlights.length > 0 ? `${allHighlights.length} 高光` : '无高光'}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
