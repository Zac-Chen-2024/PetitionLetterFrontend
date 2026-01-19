'use client';

import { useState, useRef, useCallback } from 'react';
import { uploadFileChunked } from '@/utils/api';

// Types
export interface UploadingFile {
  id: string;
  file: File;
  exhibitNumber: string;
  status: 'pending' | 'uploading' | 'completed' | 'failed';
  progress: number;
  error?: string;
}

export type ModuleStatus = 'idle' | 'uploading' | 'completed';

interface UploadModuleProps {
  projectId: string;
  onUploadComplete: () => void;
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
}

// Available exhibit folders
const EXHIBIT_FOLDERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

// Icons
const UploadIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
  </svg>
);

const CloudUploadIcon = () => (
  <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
  </svg>
);

const CheckIcon = () => (
  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
  </svg>
);

const XIcon = () => (
  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const FileIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

export default function UploadModule({
  projectId,
  onUploadComplete,
  onError,
  onSuccess,
}: UploadModuleProps) {
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState('A');
  const [nextNumber, setNextNumber] = useState(1);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get module status
  const getModuleStatus = (): ModuleStatus => {
    if (isUploading) return 'uploading';
    if (uploadingFiles.some(f => f.status === 'completed')) return 'completed';
    return 'idle';
  };

  const moduleStatus = getModuleStatus();

  // Handle file selection
  const handleFiles = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;

    const newFiles: UploadingFile[] = [];
    let currentNumber = nextNumber;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      // Only accept PDF, images, and common document types
      const validTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg', 'image/tiff'];
      if (!validTypes.includes(file.type) && !file.name.match(/\.(pdf|png|jpg|jpeg|tiff?)$/i)) {
        continue;
      }

      newFiles.push({
        id: `${Date.now()}-${i}`,
        file,
        exhibitNumber: `${selectedFolder}-${currentNumber}`,
        status: 'pending',
        progress: 0,
      });
      currentNumber++;
    }

    if (newFiles.length > 0) {
      setUploadingFiles(prev => [...prev, ...newFiles]);
      setNextNumber(currentNumber);
    }
  }, [selectedFolder, nextNumber]);

  // Handle drag events
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  // Update exhibit number for a file
  const updateExhibitNumber = (id: string, exhibitNumber: string) => {
    setUploadingFiles(prev =>
      prev.map(f => f.id === id ? { ...f, exhibitNumber } : f)
    );
  };

  // Remove a file from the list
  const removeFile = (id: string) => {
    setUploadingFiles(prev => prev.filter(f => f.id !== id));
  };

  // Upload all pending files
  const uploadAll = async () => {
    const pendingFiles = uploadingFiles.filter(f => f.status === 'pending');
    if (pendingFiles.length === 0) return;

    setIsUploading(true);
    let successCount = 0;
    let errorCount = 0;

    for (const item of pendingFiles) {
      const fileId = item.id;

      // Update status to uploading
      setUploadingFiles(prev =>
        prev.map(f => f.id === fileId ? { ...f, status: 'uploading' as const, progress: 0 } : f)
      );

      try {
        await uploadFileChunked(
          projectId,
          item.file,
          item.exhibitNumber,
          item.file.name.replace(/\.[^/.]+$/, ''),
          (percent) => {
            setUploadingFiles(prev =>
              prev.map(f => f.id === fileId ? { ...f, progress: percent } : f)
            );
          }
        );

        // Update status to completed
        setUploadingFiles(prev =>
          prev.map(f => f.id === fileId ? { ...f, status: 'completed' as const, progress: 100 } : f)
        );
        successCount++;
      } catch (error) {
        // Update status to failed
        setUploadingFiles(prev =>
          prev.map(f => f.id === fileId ? { ...f, status: 'failed' as const, error: (error as Error).message } : f)
        );
        errorCount++;
      }
    }

    setIsUploading(false);

    if (successCount > 0) {
      onSuccess(`${successCount} 个文件上传成功`);
      onUploadComplete();
    }
    if (errorCount > 0) {
      onError(`${errorCount} 个文件上传失败`);
    }

    // Clear completed files after a short delay
    setTimeout(() => {
      setUploadingFiles(prev => prev.filter(f => f.status !== 'completed'));
    }, 2000);
  };

  // Clear all files
  const clearAll = () => {
    setUploadingFiles([]);
  };

  // Status badge component
  const StatusBadge = ({ status }: { status: ModuleStatus }) => {
    const config = {
      idle: { bg: 'bg-gray-100', text: 'text-gray-600', label: '等待上传' },
      uploading: { bg: 'bg-blue-100', text: 'text-blue-700', label: '上传中' },
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
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
              <UploadIcon />
            </div>
            <h3 className="text-base font-semibold text-gray-900">上传模块</h3>
          </div>
          <StatusBadge status={moduleStatus} />
        </div>
      </div>

      {/* Content */}
      <div className="p-5 space-y-4">
        {/* Exhibit Selection */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Exhibit:</label>
            <select
              value={selectedFolder}
              onChange={(e) => {
                setSelectedFolder(e.target.value);
                setNextNumber(1);
              }}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {EXHIBIT_FOLDERS.map(folder => (
                <option key={folder} value={folder}>{folder}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">起始编号:</label>
            <input
              type="number"
              min="1"
              value={nextNumber}
              onChange={(e) => setNextNumber(parseInt(e.target.value) || 1)}
              className="w-16 px-2 py-1.5 text-sm border border-gray-300 rounded-lg text-gray-900 bg-white text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="text-sm text-gray-600">
            下一个: <span className="font-mono font-semibold text-blue-600">{selectedFolder}-{nextNumber}</span>
          </div>
        </div>

        {/* Drop Zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
            isDragging
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.png,.jpg,.jpeg,.tiff,.tif"
            onChange={(e) => handleFiles(e.target.files)}
            className="hidden"
          />
          <div className="text-gray-400 mb-3">
            <CloudUploadIcon />
          </div>
          <p className="text-sm font-medium text-gray-700">
            拖拽文件到这里，或点击上传
          </p>
          <p className="text-xs text-gray-500 mt-1">
            支持 PDF、JPG、PNG
          </p>
        </div>

        {/* Upload Progress List */}
        {uploadingFiles.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">上传中：</span>
              <div className="flex gap-2">
                <button
                  onClick={clearAll}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  清除
                </button>
              </div>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {uploadingFiles.map((item) => (
                <div
                  key={item.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border ${
                    item.status === 'completed'
                      ? 'bg-green-50 border-green-200'
                      : item.status === 'failed'
                      ? 'bg-red-50 border-red-200'
                      : item.status === 'uploading'
                      ? 'bg-blue-50 border-blue-200'
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  {/* Status Icon */}
                  <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
                    {item.status === 'uploading' ? (
                      <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    ) : item.status === 'completed' ? (
                      <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                        <CheckIcon />
                      </div>
                    ) : item.status === 'failed' ? (
                      <div className="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-white">
                        <XIcon />
                      </div>
                    ) : (
                      <div className="text-gray-400">
                        <FileIcon />
                      </div>
                    )}
                  </div>

                  {/* Exhibit Number (editable for pending) */}
                  {item.status === 'pending' ? (
                    <input
                      type="text"
                      value={item.exhibitNumber}
                      onChange={(e) => updateExhibitNumber(item.id, e.target.value)}
                      className="w-14 text-xs border border-gray-300 rounded px-1.5 py-0.5 text-gray-900 bg-white"
                    />
                  ) : (
                    <span className="text-xs font-medium text-gray-700 w-14">{item.exhibitNumber}</span>
                  )}

                  {/* File Info and Progress */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-gray-800 truncate" title={item.file.name}>
                        {item.file.name}
                      </span>
                      <span className={`text-xs font-medium ml-2 ${
                        item.status === 'completed' ? 'text-green-600' :
                        item.status === 'failed' ? 'text-red-600' :
                        item.status === 'uploading' ? 'text-blue-600' : 'text-gray-400'
                      }`}>
                        {item.status === 'completed' ? '完成' :
                         item.status === 'failed' ? '失败' :
                         item.status === 'uploading' ? `${item.progress}%` : '等待中'}
                      </span>
                    </div>
                    {/* Progress Bar */}
                    <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          item.status === 'completed' ? 'bg-green-500' :
                          item.status === 'failed' ? 'bg-red-500' : 'bg-blue-500'
                        }`}
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
                    {item.status === 'failed' && item.error && (
                      <p className="text-xs text-red-500 mt-1 truncate">{item.error}</p>
                    )}
                  </div>

                  {/* Remove Button (for pending only) */}
                  {item.status === 'pending' && (
                    <button
                      onClick={() => removeFile(item.id)}
                      className="text-gray-400 hover:text-red-600 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Upload Button */}
            {uploadingFiles.some(f => f.status === 'pending') && (
              <button
                onClick={uploadAll}
                disabled={isUploading}
                className="w-full py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm flex items-center justify-center gap-2 transition-colors"
              >
                {isUploading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    上传中...
                  </>
                ) : (
                  <>
                    <UploadIcon />
                    开始上传
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
