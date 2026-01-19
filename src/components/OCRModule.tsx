'use client';

import { useState, useEffect, useCallback } from 'react';
import { ocrApi } from '@/utils/api';
import type { Document } from '@/types';

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

// Status indicators
const StatusIcon = ({ status }: { status: OCRFileStatus }) => {
  switch (status) {
    case 'pending':
      return <span className="w-2.5 h-2.5 rounded-full bg-gray-300 flex-shrink-0" title="待处理" />;
    case 'queued':
      return <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 flex-shrink-0" title="队列中" />;
    case 'processing':
      return (
        <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse flex-shrink-0" title="处理中" />
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

export default function OCRModule({
  projectId,
  documents,
  onOCRComplete,
  onSuccess,
  onError,
  modelsReady = true,
}: OCRModuleProps) {
  const [ocrFiles, setOcrFiles] = useState<OCRFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [selectedOCRText, setSelectedOCRText] = useState<string>('');
  const [listCollapsed, setListCollapsed] = useState(false);
  const [pollErrorCount, setPollErrorCount] = useState(0);

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

  // Poll OCR progress
  const pollProgress = useCallback(async () => {
    try {
      const progress = await ocrApi.getProgress(projectId);
      setPollErrorCount(0); // Reset error count on success

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

      // Continue polling if still processing
      if (progress.processing > 0 || progress.pending > 0) {
        setTimeout(pollProgress, 2000);
      } else {
        setIsProcessing(false);
        onOCRComplete();
        if (progress.failed > 0) {
          onError(`OCR 完成: ${progress.completed} 成功, ${progress.failed} 失败`);
        } else if (progress.completed > 0) {
          onSuccess(`OCR 完成: ${progress.completed} 个文档已处理`);
        }
      }
    } catch (err) {
      console.error('Failed to get OCR progress:', err);
      setPollErrorCount(prev => prev + 1);

      // Stop polling after 3 consecutive errors
      if (pollErrorCount >= 2) {
        setIsProcessing(false);
        onError('无法连接后端服务，请检查后端是否运行');
        // Reset processing files to pending
        setOcrFiles(prev => prev.map(f =>
          f.status === 'processing' || f.status === 'queued'
            ? { ...f, status: 'pending' as OCRFileStatus }
            : f
        ));
      } else {
        // Retry with longer delay
        setTimeout(pollProgress, 5000);
      }
    }
  }, [projectId, onOCRComplete, onSuccess, onError, pollErrorCount]);

  // Start OCR for single document
  const handleStartSingle = async (documentId: string) => {
    try {
      setOcrFiles(prev => prev.map(f =>
        f.id === documentId ? { ...f, status: 'processing' as OCRFileStatus } : f
      ));

      setPollErrorCount(0); // Reset error count
      await ocrApi.triggerSingle(documentId);
      setIsProcessing(true);

      // Start polling
      setTimeout(pollProgress, 1000);
    } catch (error) {
      console.error('OCR failed:', error);
      const errorMsg = error instanceof Error && error.message.includes('fetch')
        ? '无法连接后端服务'
        : 'OCR 启动失败';
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
      setIsProcessing(true);
      setPollErrorCount(0); // Reset error count

      // Mark all pending as queued
      setOcrFiles(prev => prev.map(f =>
        f.status === 'pending' ? { ...f, status: 'queued' as OCRFileStatus } : f
      ));

      await ocrApi.triggerBatch(projectId);
      onSuccess('OCR 处理已启动');

      // Start polling
      setTimeout(pollProgress, 1000);
    } catch (error) {
      console.error('Batch OCR failed:', error);
      const errorMsg = error instanceof Error && error.message.includes('fetch')
        ? '无法连接后端服务'
        : '批量 OCR 启动失败';
      onError(errorMsg);
      setIsProcessing(false);

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
      idle: { bg: 'bg-gray-100', text: 'text-gray-600', label: '等待处理' },
      processing: { bg: 'bg-blue-100', text: 'text-blue-700', label: '处理中' },
      completed: { bg: 'bg-green-100', text: 'text-green-700', label: '已完成' },
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
            <h3 className="text-base font-semibold text-gray-900">OCR 模块</h3>
            <span className="text-xs text-gray-500">
              {completedCount}/{ocrFiles.length} 已完成
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleStartAll}
              disabled={pendingCount === 0 || isProcessing || !modelsReady}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-xs font-medium rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title={!modelsReady ? '模型加载中...' : undefined}
            >
              <PlayIcon />
              {!modelsReady ? '模型加载中...' : '全部开始'}
            </button>
            <StatusBadge status={moduleStatus} />
          </div>
        </div>
      </div>

      {/* Content - Left-Right Layout */}
      <div className="flex" style={{ minHeight: '400px' }}>
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
              {ocrFiles.length === 0 ? (
                <div className="p-4 text-center text-xs text-gray-400">
                  暂无文件
                </div>
              ) : (
                <div className="py-1">
                  {ocrFiles.map((file) => (
                    <div
                      key={file.id}
                      onClick={() => file.status === 'completed' && handleSelectFile(file)}
                      className={`flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors ${
                        selectedFileId === file.id
                          ? 'bg-purple-50 border-r-2 border-purple-500'
                          : 'hover:bg-gray-50'
                      } ${file.status !== 'completed' ? 'opacity-60' : ''}`}
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
                      {file.status === 'pending' && !isProcessing && modelsReady && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartSingle(file.id);
                          }}
                          className="px-1.5 py-0.5 text-xs text-purple-600 hover:bg-purple-100 rounded transition-colors"
                        >
                          开始
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
              {ocrFiles.map((file) => (
                <div
                  key={file.id}
                  onClick={() => file.status === 'completed' && handleSelectFile(file)}
                  className={`flex items-center justify-center py-2 cursor-pointer transition-colors ${
                    selectedFileId === file.id ? 'bg-purple-50' : 'hover:bg-gray-50'
                  }`}
                  title={`${file.exhibitNumber}: ${file.fileName}`}
                >
                  <StatusIcon status={file.status} />
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
                ? `OCR 结果 - ${selectedFile.exhibitNumber}: ${selectedFile.fileName}`
                : 'OCR 结果预览'}
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
                复制
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
                  <p className="text-sm">选择一个已完成 OCR 的文件查看结果</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
