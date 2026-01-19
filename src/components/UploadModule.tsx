'use client';

import { useState, useRef, useCallback, useMemo } from 'react';
import { uploadFileChunked } from '@/utils/api';

// Types
export interface UploadingFile {
  id: string;
  file: File;
  exhibitNumber: string;
  exhibitFolder: string;
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
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

const TrashIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
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
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get files grouped by folder
  const filesByFolder = useMemo(() => {
    const grouped: Record<string, UploadingFile[]> = {};
    EXHIBIT_FOLDERS.forEach(folder => {
      grouped[folder] = uploadingFiles.filter(f => f.exhibitFolder === folder);
    });
    return grouped;
  }, [uploadingFiles]);

  // Get next number for selected folder
  const getNextNumber = useCallback((folder: string) => {
    const folderFiles = uploadingFiles.filter(f => f.exhibitFolder === folder);
    if (folderFiles.length === 0) return 1;
    const maxNum = Math.max(...folderFiles.map(f => {
      const match = f.exhibitNumber.match(/-(\d+)$/);
      return match ? parseInt(match[1]) : 0;
    }));
    return maxNum + 1;
  }, [uploadingFiles]);

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
    let currentNumber = getNextNumber(selectedFolder);

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
        exhibitFolder: selectedFolder,
        status: 'pending',
        progress: 0,
      });
      currentNumber++;
    }

    if (newFiles.length > 0) {
      setUploadingFiles(prev => [...prev, ...newFiles]);
    }
  }, [selectedFolder, getNextNumber]);

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
    // Keep completed files in list - don't auto-clear
  };

  // Clear all files in selected folder
  const clearFolder = () => {
    setUploadingFiles(prev => prev.filter(f => f.exhibitFolder !== selectedFolder));
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

  const currentFolderFiles = filesByFolder[selectedFolder] || [];
  const pendingCount = uploadingFiles.filter(f => f.status === 'pending').length;
  const totalCount = uploadingFiles.length;

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
            {totalCount > 0 && (
              <span className="text-xs text-gray-500">
                {totalCount} 个文件
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {pendingCount > 0 && (
              <button
                onClick={uploadAll}
                disabled={isUploading}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <UploadIcon />
                上传 ({pendingCount})
              </button>
            )}
            <StatusBadge status={moduleStatus} />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex" style={{ minHeight: '300px' }}>
        {/* Left: Exhibit Tabs (Horizontal) + File List (Vertical) */}
        <div className="w-64 border-r border-gray-200 flex flex-col">
          {/* Horizontal Exhibit Tabs */}
          <div className="px-2 py-2 border-b border-gray-100 bg-gray-50">
            <div className="flex flex-wrap gap-1">
              {EXHIBIT_FOLDERS.map(folder => {
                const count = filesByFolder[folder]?.length || 0;
                return (
                  <button
                    key={folder}
                    onClick={() => setSelectedFolder(folder)}
                    className={`relative px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                      selectedFolder === folder
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                    }`}
                  >
                    {folder}
                    {count > 0 && (
                      <span className={`absolute -top-1 -right-1 w-4 h-4 text-xs rounded-full flex items-center justify-center ${
                        selectedFolder === folder ? 'bg-white text-blue-600' : 'bg-blue-500 text-white'
                      }`}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* File List Header */}
          <div className="px-3 py-2 border-b border-gray-100 flex items-center justify-between">
            <span className="text-xs font-medium text-gray-600">
              Exhibit {selectedFolder} ({currentFolderFiles.length})
            </span>
            {currentFolderFiles.length > 0 && (
              <button
                onClick={clearFolder}
                className="text-xs text-gray-400 hover:text-red-500 transition-colors"
              >
                清除
              </button>
            )}
          </div>

          {/* Vertical File List */}
          <div className="flex-1 overflow-y-auto">
            {currentFolderFiles.length === 0 ? (
              <div className="p-4 text-center text-xs text-gray-400">
                暂无文件
                <p className="mt-1">拖拽或点击右侧区域上传</p>
              </div>
            ) : (
              <div className="py-1">
                {currentFolderFiles.map((item) => (
                  <div
                    key={item.id}
                    className={`flex items-center gap-2 px-3 py-2 border-b border-gray-50 ${
                      item.status === 'completed'
                        ? 'bg-green-50'
                        : item.status === 'failed'
                        ? 'bg-red-50'
                        : item.status === 'uploading'
                        ? 'bg-blue-50'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    {/* Status Icon */}
                    <div className="flex-shrink-0 w-4 h-4 flex items-center justify-center">
                      {item.status === 'uploading' ? (
                        <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                      ) : item.status === 'completed' ? (
                        <div className="w-3 h-3 bg-green-500 rounded-full flex items-center justify-center">
                          <CheckIcon />
                        </div>
                      ) : item.status === 'failed' ? (
                        <div className="w-3 h-3 bg-red-500 rounded-full flex items-center justify-center text-white">
                          <XIcon />
                        </div>
                      ) : (
                        <div className="text-gray-400">
                          <FileIcon />
                        </div>
                      )}
                    </div>

                    {/* File Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-700 truncate">
                        {item.exhibitNumber}
                      </p>
                      <p className="text-xs text-gray-500 truncate" title={item.file.name}>
                        {item.file.name}
                      </p>
                      {/* Progress Bar */}
                      {item.status === 'uploading' && (
                        <div className="mt-1 h-1 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500 rounded-full transition-all duration-300"
                            style={{ width: `${item.progress}%` }}
                          />
                        </div>
                      )}
                    </div>

                    {/* Progress / Remove */}
                    <div className="flex-shrink-0">
                      {item.status === 'uploading' ? (
                        <span className="text-xs text-blue-600">{item.progress}%</span>
                      ) : item.status === 'pending' ? (
                        <button
                          onClick={() => removeFile(item.id)}
                          className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                        >
                          <TrashIcon />
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Drop Zone */}
        <div className="flex-1 p-4 flex items-center justify-center">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`w-full h-full border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all ${
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
            <div className={`mb-3 ${isDragging ? 'text-blue-500' : 'text-gray-400'}`}>
              <CloudUploadIcon />
            </div>
            <p className="text-sm font-medium text-gray-700">
              拖拽文件到这里，或点击上传
            </p>
            <p className="text-xs text-gray-500 mt-1">
              支持 PDF、JPG、PNG
            </p>
            <p className="text-xs text-blue-600 mt-3 font-medium">
              当前目标: Exhibit {selectedFolder}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
