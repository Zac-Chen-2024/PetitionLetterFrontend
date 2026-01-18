'use client';

import { useState, useRef, useCallback } from 'react';
import { uploadFileChunked } from '@/utils/api';

interface FileUploaderProps {
  projectId: string;
  onUploadComplete: () => void;
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
}

interface UploadingFile {
  file: File;
  exhibitNumber: string;
  status: 'pending' | 'uploading' | 'completed' | 'failed';
  error?: string;
  progress: number;  // Upload progress 0-100
}

// 上传进度 Modal 组件
function UploadProgressModal({
  files,
  onClose,
  isUploading,
}: {
  files: UploadingFile[];
  onClose: () => void;
  isUploading: boolean;
}) {
  const completedCount = files.filter(f => f.status === 'completed').length;
  const failedCount = files.filter(f => f.status === 'failed').length;
  const totalCount = files.length;
  const overallProgress = totalCount > 0
    ? Math.round(files.reduce((sum, f) => sum + (f.progress || 0), 0) / totalCount)
    : 0;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              {isUploading ? '正在上传文件...' : '上传完成'}
            </h3>
            {!isUploading && (
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Overall progress */}
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">总进度</span>
            <span className="text-lg font-bold text-blue-600">{overallProgress}%</span>
          </div>
          <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
          <div className="mt-2 text-xs text-gray-500">
            已完成 {completedCount} / {totalCount} 个文件
            {failedCount > 0 && <span className="text-red-500 ml-2">({failedCount} 个失败)</span>}
          </div>
        </div>

        {/* File list */}
        <div className="px-6 py-4 max-h-64 overflow-y-auto">
          <div className="space-y-3">
            {files.map((item, index) => (
              <div key={index} className="flex items-center gap-3">
                {/* Status icon */}
                <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center">
                  {item.status === 'uploading' ? (
                    <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  ) : item.status === 'completed' ? (
                    <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  ) : item.status === 'failed' ? (
                    <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </div>
                  ) : (
                    <div className="w-5 h-5 bg-gray-300 rounded-full" />
                  )}
                </div>

                {/* File info and progress */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-800 truncate" title={item.file.name}>
                      {item.exhibitNumber}: {item.file.name}
                    </span>
                    <span className={`text-sm font-medium ml-2 ${
                      item.status === 'completed' ? 'text-green-600' :
                      item.status === 'failed' ? 'text-red-600' :
                      item.status === 'uploading' ? 'text-blue-600' : 'text-gray-400'
                    }`}>
                      {item.status === 'completed' ? '完成' :
                       item.status === 'failed' ? '失败' :
                       item.status === 'uploading' ? `${item.progress}%` : '等待中'}
                    </span>
                  </div>
                  {/* Progress bar */}
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
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        {!isUploading && (
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
            <button
              onClick={onClose}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              确定
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Available folders
const FOLDERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

export default function FileUploader({
  projectId,
  onUploadComplete,
  onError,
  onSuccess,
}: FileUploaderProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState('A');
  const [nextNumber, setNextNumber] = useState(1);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      setIsExpanded(true);
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
  const updateExhibitNumber = (index: number, exhibitNumber: string) => {
    setUploadingFiles(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], exhibitNumber };
      return updated;
    });
  };

  // Remove a file from the list
  const removeFile = (index: number) => {
    setUploadingFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Upload all pending files
  const uploadAll = async () => {
    const pendingFiles = uploadingFiles.filter(f => f.status === 'pending');
    if (pendingFiles.length === 0) return;

    // 显示进度 Modal
    setShowProgressModal(true);
    setIsUploading(true);

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < uploadingFiles.length; i++) {
      const currentIndex = i;  // Capture value to avoid closure bug
      const item = uploadingFiles[i];
      if (item.status !== 'pending') continue;

      // Update status to uploading with initial progress
      setUploadingFiles(prev => {
        const updated = [...prev];
        updated[currentIndex] = { ...updated[currentIndex], status: 'uploading', progress: 0 };
        return updated;
      });

      try {
        await uploadFileChunked(
          projectId,
          item.file,
          item.exhibitNumber,
          item.file.name.replace(/\.[^/.]+$/, ''), // Use filename without extension as title
          // Progress callback (chunked upload provides percent directly)
          (percent) => {
            setUploadingFiles(prev => {
              const updated = [...prev];
              updated[currentIndex] = {
                ...updated[currentIndex],
                progress: percent,
              };
              return updated;
            });
          }
        );

        // Update status to completed
        setUploadingFiles(prev => {
          const updated = [...prev];
          updated[currentIndex] = { ...updated[currentIndex], status: 'completed', progress: 100 };
          return updated;
        });
        successCount++;
      } catch (error) {
        // Update status to failed
        setUploadingFiles(prev => {
          const updated = [...prev];
          updated[currentIndex] = { ...updated[currentIndex], status: 'failed', error: (error as Error).message };
          return updated;
        });
        errorCount++;
      }
    }

    // 上传完成
    setIsUploading(false);

    // Notify completion
    if (successCount > 0) {
      onSuccess(`已上传 ${successCount} 个文件。点击 "Start OCR" 开始处理。`);
      onUploadComplete();
    }
    if (errorCount > 0) {
      onError(`${errorCount} 个文件上传失败。`);
    }
  };

  // 关闭 Modal 并清理完成的文件
  const handleCloseModal = () => {
    setShowProgressModal(false);
    setUploadingFiles(prev => prev.filter(f => f.status !== 'completed'));
  };

  // Clear all files
  const clearAll = () => {
    setUploadingFiles([]);
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-gray-900">Upload Documents</h3>
            {uploadingFiles.length > 0 && (
              <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full">
                {uploadingFiles.length} file(s)
              </span>
            )}
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg
              className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Content */}
      {isExpanded && (
        <div className="p-4 space-y-4">
          {/* Drop zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragging
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
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
            <svg
              className="w-10 h-10 mx-auto text-gray-400 mb-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            <p className="text-sm text-gray-700 font-medium">
              Drop files here or click to browse
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Supports PDF, PNG, JPG, TIFF
            </p>
          </div>

          {/* Folder and number selection */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-700 font-medium">Target Folder:</label>
              <div className="flex gap-1">
                {FOLDERS.map(folder => (
                  <button
                    key={folder}
                    onClick={() => {
                      setSelectedFolder(folder);
                      setNextNumber(1); // Reset number when changing folder
                    }}
                    className={`w-8 h-8 text-xs font-semibold rounded transition-colors ${
                      selectedFolder === folder
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {folder}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-700 font-medium">Starting #:</label>
              <input
                type="number"
                min="1"
                value={nextNumber}
                onChange={(e) => setNextNumber(parseInt(e.target.value) || 1)}
                className="w-16 text-xs border border-gray-300 rounded px-2 py-1 text-gray-900 bg-white text-center"
              />
            </div>
            <div className="text-xs text-gray-600">
              Next: <span className="font-mono font-semibold text-blue-600">{selectedFolder}-{nextNumber}</span>
            </div>
          </div>

          {/* File list */}
          {uploadingFiles.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-medium text-gray-700">Files to upload:</div>
              <div className="max-h-48 overflow-y-auto space-y-2">
                {uploadingFiles.map((item, index) => (
                  <div
                    key={index}
                    className={`flex items-center gap-2 p-2 rounded border ${
                      item.status === 'completed'
                        ? 'bg-green-50 border-green-200'
                        : item.status === 'failed'
                        ? 'bg-red-50 border-red-200'
                        : item.status === 'uploading'
                        ? 'bg-blue-50 border-blue-200'
                        : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    {/* Status icon */}
                    <div className="flex-shrink-0">
                      {item.status === 'uploading' ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                      ) : item.status === 'completed' ? (
                        <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : item.status === 'failed' ? (
                        <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      )}
                    </div>

                    {/* Exhibit number input */}
                    <input
                      type="text"
                      value={item.exhibitNumber}
                      onChange={(e) => updateExhibitNumber(index, e.target.value)}
                      disabled={item.status !== 'pending'}
                      className="w-16 text-xs border border-gray-300 rounded px-1.5 py-0.5 text-gray-900 bg-white disabled:bg-gray-100"
                    />

                    {/* File name and progress */}
                    <div className="flex-1 min-w-0">
                      <span className="text-xs text-gray-800 truncate block" title={item.file.name}>
                        {item.file.name}
                      </span>
                      {/* Progress bar for uploading files */}
                      {item.status === 'uploading' && (
                        <div className="mt-1">
                          <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-500 rounded-full transition-all duration-150"
                              style={{ width: `${item.progress || 0}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* File size or upload progress */}
                    <span className="text-xs text-gray-500 whitespace-nowrap">
                      {item.status === 'uploading' && item.progress !== undefined ? (
                        <span className="text-blue-600 font-medium">{item.progress}%</span>
                      ) : (
                        `${(item.file.size / 1024).toFixed(0)} KB`
                      )}
                    </span>

                    {/* Remove button */}
                    {item.status === 'pending' && (
                      <button
                        onClick={() => removeFile(index)}
                        className="text-gray-400 hover:text-red-600"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Action buttons */}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={clearAll}
                  className="px-3 py-1.5 text-xs text-gray-600 hover:text-gray-800"
                >
                  Clear All
                </button>
                <button
                  onClick={uploadAll}
                  disabled={uploadingFiles.filter(f => f.status === 'pending').length === 0}
                  className="px-4 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  Upload Files
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 上传进度 Modal */}
      {showProgressModal && (
        <UploadProgressModal
          files={uploadingFiles}
          onClose={handleCloseModal}
          isUploading={isUploading}
        />
      )}
    </div>
  );
}
