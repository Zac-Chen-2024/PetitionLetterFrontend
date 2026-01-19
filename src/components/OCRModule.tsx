'use client';

import { useState, useEffect, useCallback } from 'react';
import { ocrApi } from '@/utils/api';
import type { Document } from '@/types';
import MarkdownPreview from './MarkdownPreview';

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

const EyeIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
);

// Status indicators
const StatusIcon = ({ status }: { status: OCRFileStatus }) => {
  switch (status) {
    case 'pending':
      return <span className="w-3 h-3 rounded-full bg-gray-300" title="待处理" />;
    case 'queued':
      return <span className="w-3 h-3 rounded-full bg-yellow-400" title="队列中" />;
    case 'processing':
      return (
        <span className="w-3 h-3 rounded-full bg-blue-500 animate-pulse" title="处理中" />
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

export default function OCRModule({
  projectId,
  documents,
  onOCRComplete,
  onSuccess,
  onError,
}: OCRModuleProps) {
  const [ocrFiles, setOcrFiles] = useState<OCRFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [selectedOCRText, setSelectedOCRText] = useState<string>('');

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
  }, [documents]);

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
  const processingCount = ocrFiles.filter(f => f.status === 'processing').length;

  // Poll OCR progress
  const pollProgress = useCallback(async () => {
    try {
      const progress = await ocrApi.getProgress(projectId);

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
        } else {
          onSuccess(`OCR 完成: ${progress.completed} 个文档已处理`);
        }
      }
    } catch (err) {
      console.error('Failed to get OCR progress:', err);
      setTimeout(pollProgress, 3000);
    }
  }, [projectId, onOCRComplete, onSuccess, onError]);

  // Start OCR for single document
  const handleStartSingle = async (documentId: string) => {
    try {
      setOcrFiles(prev => prev.map(f =>
        f.id === documentId ? { ...f, status: 'processing' as OCRFileStatus } : f
      ));

      await ocrApi.triggerSingle(documentId);
      setIsProcessing(true);

      // Start polling
      setTimeout(pollProgress, 1000);
    } catch (error) {
      console.error('OCR failed:', error);
      onError('OCR 启动失败');
      setOcrFiles(prev => prev.map(f =>
        f.id === documentId ? { ...f, status: 'failed' as OCRFileStatus } : f
      ));
    }
  };

  // Start OCR for all pending documents
  const handleStartAll = async () => {
    if (pendingCount === 0) return;

    try {
      setIsProcessing(true);

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
      onError('批量 OCR 启动失败');
      setIsProcessing(false);

      // Reset queued to pending
      setOcrFiles(prev => prev.map(f =>
        f.status === 'queued' ? { ...f, status: 'pending' as OCRFileStatus } : f
      ));
    }
  };

  // View OCR result
  const handleViewResult = (file: OCRFile) => {
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
          </div>
          <StatusBadge status={moduleStatus} />
        </div>
      </div>

      {/* Content */}
      <div className="p-5 space-y-4">
        {/* Action Bar */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            待处理文件：<span className="font-medium text-gray-900">{pendingCount}</span>
            {completedCount > 0 && (
              <span className="ml-3 text-green-600">已完成: {completedCount}</span>
            )}
            {processingCount > 0 && (
              <span className="ml-3 text-blue-600">处理中: {processingCount}</span>
            )}
          </div>
          <button
            onClick={handleStartAll}
            disabled={pendingCount === 0 || isProcessing}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <PlayIcon />
            全部开始
          </button>
        </div>

        {/* File List */}
        {ocrFiles.length === 0 ? (
          <div className="border border-gray-200 rounded-lg bg-gray-50 p-6 text-center">
            <p className="text-sm text-gray-500">暂无文件</p>
            <p className="text-xs text-gray-400 mt-1">请先在上传模块中上传文件</p>
          </div>
        ) : (
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="max-h-64 overflow-y-auto">
              {ocrFiles.map((file) => (
                <div
                  key={file.id}
                  className={`flex items-center gap-3 px-4 py-3 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 transition-colors ${
                    selectedFileId === file.id ? 'bg-purple-50' : ''
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
                        <div className="h-full bg-blue-500 rounded-full animate-pulse" style={{ width: '60%' }} />
                      </div>
                    )}
                  </div>

                  {/* Status Text */}
                  <span className={`text-xs ${
                    file.status === 'completed' ? 'text-green-600' :
                    file.status === 'processing' ? 'text-blue-600' :
                    file.status === 'queued' ? 'text-yellow-600' :
                    file.status === 'failed' ? 'text-red-600' : 'text-gray-400'
                  }`}>
                    {file.status === 'completed' ? '完成' :
                     file.status === 'processing' ? '处理中' :
                     file.status === 'queued' ? '队列中' :
                     file.status === 'failed' ? '失败' : '待处理'}
                  </span>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    {file.status === 'pending' && !isProcessing && (
                      <button
                        onClick={() => handleStartSingle(file.id)}
                        className="px-2.5 py-1 text-xs font-medium text-purple-600 bg-purple-50 rounded hover:bg-purple-100 transition-colors"
                      >
                        开始
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

        {/* OCR Result Preview */}
        <MarkdownPreview
          content={selectedOCRText}
          title={selectedFileId ? `OCR 结果预览 - ${ocrFiles.find(f => f.id === selectedFileId)?.fileName || ''}` : 'OCR 结果预览'}
          maxHeight="250px"
        />
      </div>
    </div>
  );
}
