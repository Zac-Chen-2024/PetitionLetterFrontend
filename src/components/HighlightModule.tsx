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

const EyeIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
);

// Status indicators
const StatusIcon = ({ status }: { status: HighlightFileStatus }) => {
  switch (status) {
    case 'not_started':
    case 'pending':
      return <span className="w-3 h-3 rounded-full bg-gray-300" title="待分析" />;
    case 'processing':
      return (
        <span className="w-3 h-3 rounded-full bg-yellow-500 animate-pulse" title="分析中" />
      );
    case 'completed':
      return (
        <span className="w-3 h-3 rounded-full bg-green-500 flex items-center justify-center" title="完成">
          <svg className="w-2 h-2 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </span>
      );
    case 'failed':
      return (
        <span className="w-3 h-3 rounded-full bg-red-500 flex items-center justify-center" title="失败">
          <svg className="w-2 h-2 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </span>
      );
  }
};

export default function HighlightModule({
  projectId,
  documents,
  onHighlightComplete,
  onSuccess,
  onError,
}: HighlightModuleProps) {
  const [highlightFiles, setHighlightFiles] = useState<HighlightFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedFile, setSelectedFile] = useState<HighlightFile | null>(null);

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
  }, [documents]);

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
  const processingCount = highlightFiles.filter(f => f.status === 'processing').length;

  // Poll highlight progress
  const pollProgress = useCallback(async () => {
    try {
      const progress = await highlightApi.getProgress(projectId);

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
        } else {
          onSuccess(`高光分析完成: ${progress.completed} 个文档已处理`);
        }
      }
    } catch (err) {
      console.error('Failed to get highlight progress:', err);
      setTimeout(pollProgress, 3000);
    }
  }, [projectId, onHighlightComplete, onSuccess, onError]);

  // Start highlight for single document
  const handleStartSingle = async (file: HighlightFile) => {
    try {
      setHighlightFiles(prev => prev.map(f =>
        f.id === file.id ? { ...f, status: 'processing' as HighlightFileStatus } : f
      ));

      await highlightApi.trigger(file.id);
      setIsProcessing(true);

      // Start polling
      setTimeout(pollProgress, 1000);
    } catch (error) {
      console.error('Highlight failed:', error);
      onError('高光分析启动失败');
      setHighlightFiles(prev => prev.map(f =>
        f.id === file.id ? { ...f, status: 'failed' as HighlightFileStatus } : f
      ));
    }
  };

  // Start highlight for all pending documents
  const handleStartAll = async () => {
    if (pendingCount === 0) return;

    try {
      setIsProcessing(true);

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
      onError('批量高光分析启动失败');
      setIsProcessing(false);

      // Reset processing to pending
      setHighlightFiles(prev => prev.map(f =>
        f.status === 'processing' ? { ...f, status: 'pending' as HighlightFileStatus } : f
      ));
    }
  };

  // View highlight result
  const handleViewResult = (file: HighlightFile) => {
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
          </div>
          <StatusBadge status={moduleStatus} />
        </div>
      </div>

      {/* Content */}
      <div className="p-5 space-y-4">
        {/* Action Bar */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            可分析文件：<span className="font-medium text-gray-900">{pendingCount}</span>
            {completedCount > 0 && (
              <span className="ml-3 text-green-600">已完成: {completedCount}</span>
            )}
            {processingCount > 0 && (
              <span className="ml-3 text-yellow-600">分析中: {processingCount}</span>
            )}
          </div>
          <button
            onClick={handleStartAll}
            disabled={pendingCount === 0 || isProcessing}
            className="flex items-center gap-2 px-4 py-2 bg-yellow-500 text-white text-sm font-medium rounded-lg hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <PlayIcon />
            全部分析
          </button>
        </div>

        {/* File List */}
        {highlightFiles.length === 0 ? (
          <div className="border border-gray-200 rounded-lg bg-gray-50 p-6 text-center">
            <p className="text-sm text-gray-500">暂无可分析的文件</p>
            <p className="text-xs text-gray-400 mt-1">请先在 OCR 模块中完成文字识别</p>
          </div>
        ) : (
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="max-h-64 overflow-y-auto">
              {highlightFiles.map((file) => (
                <div
                  key={file.id}
                  className={`flex items-center gap-3 px-4 py-3 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 transition-colors ${
                    selectedFile?.id === file.id ? 'bg-yellow-50' : ''
                  }`}
                >
                  {/* Status Icon */}
                  <StatusIcon status={file.status} />

                  {/* File Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-gray-500">{file.exhibitNumber}:</span>
                      <span className="text-sm text-gray-800 truncate">{file.fileName}</span>
                    </div>
                    {file.status === 'processing' && (
                      <div className="mt-1 h-1 bg-gray-200 rounded-full overflow-hidden w-full max-w-xs">
                        <div className="h-full bg-yellow-500 rounded-full animate-pulse" style={{ width: '60%' }} />
                      </div>
                    )}
                  </div>

                  {/* Status Text */}
                  <span className={`text-xs ${
                    file.status === 'completed' ? 'text-green-600' :
                    file.status === 'processing' ? 'text-yellow-600' :
                    file.status === 'failed' ? 'text-red-600' : 'text-gray-400'
                  }`}>
                    {file.status === 'completed' ? '完成' :
                     file.status === 'processing' ? '分析中' :
                     file.status === 'failed' ? '失败' : '待分析'}
                  </span>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    {(file.status === 'pending' || file.status === 'not_started') && !isProcessing && (
                      <button
                        onClick={() => handleStartSingle(file)}
                        className="px-2.5 py-1 text-xs font-medium text-yellow-600 bg-yellow-50 rounded hover:bg-yellow-100 transition-colors"
                      >
                        分析
                      </button>
                    )}
                    {file.status === 'completed' && (
                      <button
                        onClick={() => handleViewResult(file)}
                        className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-blue-600 bg-blue-50 rounded hover:bg-blue-100 transition-colors"
                      >
                        <EyeIcon />
                        查看
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PDF Preview with Highlights */}
        <PDFHighlightViewer
          documentId={selectedFile?.id || null}
          documentName={selectedFile?.fileName}
          pageCount={selectedFile?.pageCount || 1}
        />
      </div>
    </div>
  );
}
