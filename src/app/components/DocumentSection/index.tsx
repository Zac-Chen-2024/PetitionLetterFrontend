'use client';

import { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import type { Document } from '@/types';
import FileListPanel from './FileListPanel';
import PreviewPanel from './PreviewPanel';
import UploadZone from './UploadZone';

interface DocumentSectionProps {
  projectId: string;
  documents: Document[];
  selectedDocs: string[];
  onSelectDoc: (docId: string) => void;
  onSelectAll: () => void;
  onRefresh: () => void;
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
  loading?: boolean;
}

interface OcrProgress {
  total: number;
  pending: number;
  queued: number;
  processing: number;
  completed: number;
  failed: number;
  partial: number;
  paused: number;
  cancelled: number;
  progress_percent: number;
  current_processing?: {
    document_id: string;
    file_name: string;
    current_page: number;
    total_pages: number;
    page_status: string;
  };
}

const DEFAULT_FOLDERS = ['A', 'B', 'C', 'D'];
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

export default function DocumentSection({
  projectId,
  documents,
  selectedDocs,
  onSelectDoc,
  onRefresh,
  onError,
  onSuccess,
  loading = false,
}: DocumentSectionProps) {
  const [folders, setFolders] = useState<string[]>(DEFAULT_FOLDERS);
  const [selectedFolder, setSelectedFolder] = useState<string>('A');
  const [ocrProgress, setOcrProgress] = useState<OcrProgress | null>(null);
  const [isOcrRunning, setIsOcrRunning] = useState(false);
  const [activeDocId, setActiveDocId] = useState<string | null>(null);
  const [panelWidth, setPanelWidth] = useState(320);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const activeDocument = useMemo(() => {
    return documents.find(d => d.id === activeDocId) || null;
  }, [documents, activeDocId]);

  useEffect(() => {
    const savedFolders = localStorage.getItem(`folders_${projectId}`);
    if (savedFolders) {
      try {
        const parsed = JSON.parse(savedFolders);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setFolders(parsed);
          if (!parsed.includes(selectedFolder)) {
            setSelectedFolder(parsed[0]);
          }
        }
      } catch {
        // Use default
      }
    }
  }, [projectId]);

  const handleAddFolder = (folder: string) => {
    const newFolders = [...folders, folder];
    setFolders(newFolders);
    localStorage.setItem(`folders_${projectId}`, JSON.stringify(newFolders));
  };

  const handleDeleteDoc = async (docId: string) => {
    try {
      const response = await fetch(`${API_BASE}/api/document/${docId}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Delete failed');
      onSuccess('File deleted');
      if (activeDocId === docId) setActiveDocId(null);
      onRefresh();
    } catch {
      onError('Failed to delete file');
    }
  };

  const handleBatchDelete = async () => {
    if (selectedDocs.length === 0) return;
    if (!confirm(`Delete ${selectedDocs.length} selected files?`)) return;

    try {
      const response = await fetch(`${API_BASE}/api/document/batch/${projectId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(selectedDocs),
      });
      if (!response.ok) throw new Error('Batch delete failed');
      const result = await response.json();
      onSuccess(`Deleted ${result.deleted_count} files`);
      if (activeDocId && selectedDocs.includes(activeDocId)) setActiveDocId(null);
      onRefresh();
    } catch {
      onError('Batch delete failed');
    }
  };

  const fetchOcrProgress = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/api/ocr/progress/${projectId}`);
      if (response.ok) {
        const data = await response.json();
        setOcrProgress(data);

        if (data.processing > 0 && !isOcrRunning) {
          setIsOcrRunning(true);
        }

        if (isOcrRunning && data.processing === 0) {
          setIsOcrRunning(false);
          onRefresh();
          if (data.failed > 0) {
            onSuccess(`OCR complete: ${data.completed} done, ${data.failed} failed`);
          } else if (data.completed > 0) {
            onSuccess(`OCR complete: ${data.completed} files processed`);
          }
        }
      }
    } catch {
      // Ignore errors
    }
  }, [projectId, isOcrRunning, onRefresh, onSuccess]);

  useEffect(() => {
    if (isOcrRunning) {
      progressIntervalRef.current = setInterval(() => {
        fetchOcrProgress();
      }, 5000);
    } else {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
    }

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, [isOcrRunning, fetchOcrProgress]);

  useEffect(() => {
    fetchOcrProgress();
  }, [projectId]);

  const handleStartOcr = async () => {
    try {
      const docsToOcr = selectedDocs.length > 0
        ? selectedDocs
        : documents.filter(d => d.ocr_status === 'pending').map(d => d.id);

      if (docsToOcr.length === 0) {
        onSuccess('No files to process');
        return;
      }

      let successCount = 0;
      let errorCount = 0;

      for (const docId of docsToOcr) {
        try {
          const response = await fetch(`${API_BASE}/api/ocr/${docId}`, { method: 'POST' });
          if (response.ok) successCount++;
          else errorCount++;
        } catch {
          errorCount++;
        }
      }

      if (successCount > 0) {
        setIsOcrRunning(true);
        onSuccess(`Starting OCR for ${successCount} file(s)`);
        fetchOcrProgress();
        onRefresh();
      }
      if (errorCount > 0) {
        onError(`Failed to start OCR for ${errorCount} file(s)`);
      }
    } catch {
      onError('Failed to start OCR');
    }
  };

  const handlePauseOcr = async () => {
    if (!ocrProgress?.current_processing?.document_id) {
      onError('No document currently processing');
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/api/ocr/pause/${ocrProgress.current_processing.document_id}`, { method: 'POST' });
      const data = await response.json();
      if (data.success) {
        onSuccess('Pause requested - will stop after current page');
        fetchOcrProgress();
      } else {
        onError(data.message || 'Failed to pause OCR');
      }
    } catch {
      onError('Failed to pause OCR');
    }
  };

  const handleCancelOcr = async () => {
    if (!ocrProgress?.current_processing?.document_id) {
      onError('No document currently processing');
      return;
    }

    if (!confirm('Cancel OCR? Progress will be saved and can be resumed later.')) return;

    try {
      const response = await fetch(`${API_BASE}/api/ocr/cancel/${ocrProgress.current_processing.document_id}`, { method: 'POST' });
      const data = await response.json();
      if (data.success) {
        onSuccess('Cancel requested - will stop after current page');
        setIsOcrRunning(false);
        fetchOcrProgress();
        onRefresh();
      } else {
        onError(data.message || 'Failed to cancel OCR');
      }
    } catch {
      onError('Failed to cancel OCR');
    }
  };

  const handleResumeOcr = async (documentId: string) => {
    try {
      const response = await fetch(`${API_BASE}/api/ocr/resume/${documentId}`, { method: 'POST' });
      const data = await response.json();
      if (data.success) {
        setIsOcrRunning(true);
        onSuccess(data.message);
        fetchOcrProgress();
        onRefresh();
      } else {
        onError(data.message || 'Failed to resume OCR');
      }
    } catch {
      onError('Failed to resume OCR');
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;
      const containerRect = containerRef.current.getBoundingClientRect();
      const newWidth = e.clientX - containerRect.left;
      setPanelWidth(Math.max(240, Math.min(newWidth, containerRect.width * 0.5)));
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  if (loading) {
    return (
      <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-12 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-[var(--color-primary)] border-t-transparent"></div>
        <span className="ml-3 text-[var(--color-text-secondary)]">Loading documents...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Upload Zone */}
      <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-4">
        <UploadZone
          projectId={projectId}
          folders={folders}
          selectedFolder={selectedFolder}
          onFolderSelect={setSelectedFolder}
          onAddFolder={handleAddFolder}
          onUploadComplete={onRefresh}
          onError={onError}
          onSuccess={onSuccess}
        />
      </div>

      {/* Two Column Layout */}
      <div
        ref={containerRef}
        className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] overflow-hidden flex"
        style={{ height: '600px' }}
      >
        {/* Left Panel - File List */}
        <div className="flex-shrink-0 border-r border-[var(--color-border)] overflow-hidden" style={{ width: panelWidth }}>
          <FileListPanel
            documents={documents}
            selectedDocs={selectedDocs}
            activeDocId={activeDocId}
            onSelectDoc={onSelectDoc}
            onViewDoc={setActiveDocId}
            onDeleteDoc={handleDeleteDoc}
            folders={folders}
            ocrProgress={ocrProgress}
            isOcrRunning={isOcrRunning}
            onStartOcr={handleStartOcr}
            onPauseOcr={handlePauseOcr}
            onCancelOcr={handleCancelOcr}
            onResumeOcr={handleResumeOcr}
            onBatchDelete={handleBatchDelete}
          />
        </div>

        {/* Resize Handle */}
        <div
          className={`w-1 flex-shrink-0 cursor-col-resize transition-colors ${
            isDragging ? 'bg-[var(--color-primary)]' : 'bg-transparent hover:bg-blue-200'
          }`}
          onMouseDown={handleMouseDown}
        />

        {/* Right Panel - Preview */}
        <div className="flex-1 overflow-hidden">
          <PreviewPanel
            document={activeDocument}
            projectId={projectId}
            onCopyText={() => onSuccess('Copied!')}
          />
        </div>
      </div>
    </div>
  );
}
