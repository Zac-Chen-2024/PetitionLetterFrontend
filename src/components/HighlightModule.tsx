'use client';

import { useState, useEffect, useCallback } from 'react';
import { highlightApi, type DocumentHighlightInfo } from '@/utils/api';
import type { Document } from '@/types';
import PDFHighlightViewer from './PDFHighlightViewer';

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
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedFile, setSelectedFile] = useState<HighlightFile | null>(null);
  const [listCollapsed, setListCollapsed] = useState(false);
  const [pollErrorCount, setPollErrorCount] = useState(0);

  // Filter to only show OCR completed documents
  useEffect(() => {
    const ocrCompletedDocs = documents.filter(doc => doc.ocr_status === 'completed');
    const files: HighlightFile[] = ocrCompletedDocs.map(doc => ({
      id: doc.id,
      fileName: doc.file_name,
      exhibitNumber: doc.exhibit_number || 'N/A',
      status: 'pending' as HighlightFileStatus,
      pageCount: doc.page_count || 1,
    }));
    setHighlightFiles(files);

    // Auto-select first file if none selected
    if (!selectedFile && files.length > 0) {
      setSelectedFile(files[0]);
    }
  }, [documents, selectedFile]);

  // Load highlight status
  useEffect(() => {
    const loadHighlightStatus = async () => {
      if (highlightFiles.length === 0) return;

      try {
        const progress = await highlightApi.getProgress(projectId);

        setHighlightFiles(prev => prev.map(file => {
          const docInfo = progress.documents?.find((d: DocumentHighlightInfo) => d.id === file.id);
          if (docInfo) {
            return {
              ...file,
              status: (docInfo.highlight_status || 'pending') as HighlightFileStatus,
              pageCount: docInfo.page_count || file.pageCount,
            };
          }
          return file;
        }));
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

  // Poll highlight progress
  const pollProgress = useCallback(async () => {
    try {
      const progress = await highlightApi.getProgress(projectId);
      setPollErrorCount(0); // Reset error count on success

      // Update file statuses
      setHighlightFiles(prev => prev.map(file => {
        const docInfo = progress.documents?.find((d: DocumentHighlightInfo) => d.id === file.id);
        if (docInfo) {
          return {
            ...file,
            status: (docInfo.highlight_status || 'pending') as HighlightFileStatus,
          };
        }
        return file;
      }));

      // Continue polling if still processing
      if (progress.processing > 0 || progress.pending > 0) {
        setTimeout(pollProgress, 2000);
      } else {
        setIsProcessing(false);
        onHighlightComplete();
        if (progress.failed > 0) {
          onError(`高光分析完成: ${progress.completed} 成功, ${progress.failed} 失败`);
        } else if (progress.completed > 0) {
          onSuccess(`高光分析完成: ${progress.completed} 个文档已处理`);
        }
      }
    } catch (err) {
      console.error('Failed to get highlight progress:', err);
      setPollErrorCount(prev => prev + 1);

      // Stop polling after 3 consecutive errors
      if (pollErrorCount >= 2) {
        setIsProcessing(false);
        onError('无法连接后端服务，请检查后端是否运行');
        // Reset processing files to pending
        setHighlightFiles(prev => prev.map(f =>
          f.status === 'processing'
            ? { ...f, status: 'pending' as HighlightFileStatus }
            : f
        ));
      } else {
        // Retry with longer delay
        setTimeout(pollProgress, 5000);
      }
    }
  }, [projectId, onHighlightComplete, onSuccess, onError, pollErrorCount]);

  // Start highlight for single document
  const handleStartSingle = async (file: HighlightFile) => {
    try {
      setHighlightFiles(prev => prev.map(f =>
        f.id === file.id ? { ...f, status: 'processing' as HighlightFileStatus } : f
      ));

      setPollErrorCount(0); // Reset error count
      await highlightApi.trigger(file.id);
      setIsProcessing(true);

      // Start polling
      setTimeout(pollProgress, 1000);
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
      setIsProcessing(true);
      setPollErrorCount(0); // Reset error count

      // Mark all pending as processing
      setHighlightFiles(prev => prev.map(f =>
        f.status === 'pending' || f.status === 'not_started'
          ? { ...f, status: 'processing' as HighlightFileStatus }
          : f
      ));

      await highlightApi.triggerBatch(projectId);
      onSuccess('高光分析已启动');

      // Start polling
      setTimeout(pollProgress, 1000);
    } catch (error) {
      console.error('Batch highlight failed:', error);
      const errorMsg = error instanceof Error && error.message.includes('fetch')
        ? '无法连接后端服务'
        : '批量高光分析启动失败';
      onError(errorMsg);
      setIsProcessing(false);

      // Reset processing to pending
      setHighlightFiles(prev => prev.map(f =>
        f.status === 'processing' ? { ...f, status: 'pending' as HighlightFileStatus } : f
      ));
    }
  };

  // Select file to view
  const handleSelectFile = (file: HighlightFile) => {
    setSelectedFile(file);
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

      {/* Content - Left-Right Layout */}
      <div className="flex" style={{ minHeight: '500px' }}>
        {/* Left: File List (Collapsible) */}
        <div
          className={`border-r border-gray-200 flex flex-col transition-all duration-300 ${
            listCollapsed ? 'w-10' : 'w-64'
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

        {/* Right: PDF Preview Area */}
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
          <div className="flex-1 overflow-hidden p-4">
            <PDFHighlightViewer
              documentId={selectedFile?.id || null}
              documentName={selectedFile?.fileName}
              pageCount={selectedFile?.pageCount || 1}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
