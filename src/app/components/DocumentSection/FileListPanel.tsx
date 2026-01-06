'use client';

import { useState } from 'react';
import type { Document } from '@/types';

interface FileListPanelProps {
  documents: Document[];
  selectedDocs: string[];
  activeDocId: string | null;
  onSelectDoc: (docId: string) => void;
  onViewDoc: (docId: string) => void;
  onDeleteDoc: (docId: string) => void;
  folders: string[];
  ocrProgress: {
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
  } | null;
  isOcrRunning: boolean;
  onStartOcr: () => void;
  onPauseOcr: () => void;
  onCancelOcr: () => void;
  onResumeOcr: (documentId: string) => void;
  onBatchDelete: () => void;
}

const canStartOcr = (documents: Document[], selectedDocs: string[]): boolean => {
  const needsOcr = (status: string) =>
    status === 'pending' || status === 'failed' || status === 'partial';

  if (selectedDocs.length > 0) {
    return documents.some(d =>
      selectedDocs.includes(d.id) && needsOcr(d.ocr_status)
    );
  }
  return documents.some(d => needsOcr(d.ocr_status));
};

const getFolderFromExhibit = (exhibitNumber: string | null | undefined): string => {
  if (!exhibitNumber) return 'Other';
  const match = exhibitNumber.match(/^([A-Za-z0-9]+)-\d+$/i);
  return match ? match[1].toUpperCase() : 'Other';
};

export default function FileListPanel({
  documents,
  selectedDocs,
  activeDocId,
  onSelectDoc,
  onViewDoc,
  onDeleteDoc,
  folders,
  ocrProgress,
  isOcrRunning,
  onStartOcr,
  onPauseOcr,
  onCancelOcr,
  onResumeOcr,
  onBatchDelete,
}: FileListPanelProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['A']));

  const documentsByFolder: Record<string, Document[]> = {};
  folders.forEach(folder => {
    documentsByFolder[folder] = [];
  });
  documents.forEach(doc => {
    const folder = getFolderFromExhibit(doc.exhibit_number);
    if (!documentsByFolder[folder]) {
      documentsByFolder[folder] = [];
    }
    documentsByFolder[folder].push(doc);
  });

  Object.keys(documentsByFolder).forEach(folder => {
    documentsByFolder[folder].sort((a, b) => {
      const aNum = parseInt(a.exhibit_number?.match(/-(\d+)$/)?.[1] || '0');
      const bNum = parseInt(b.exhibit_number?.match(/-(\d+)$/)?.[1] || '0');
      return aNum - bNum;
    });
  });

  const allFolders = Array.from(new Set([...folders, ...Object.keys(documentsByFolder)])).sort((a, b) => {
    if (a === 'Other') return 1;
    if (b === 'Other') return -1;
    return a.localeCompare(b);
  });

  const toggleFolder = (folder: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(folder)) {
        next.delete(folder);
      } else {
        next.add(folder);
      }
      return next;
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-[var(--color-success)]';
      case 'processing': return 'bg-[var(--color-warning)]';
      case 'queued': return 'bg-blue-400';
      case 'partial': return 'bg-yellow-500';
      case 'paused': return 'bg-purple-500';
      case 'cancelled': return 'bg-gray-500';
      case 'failed': return 'bg-[var(--color-error)]';
      default: return 'bg-gray-300';
    }
  };

  const canResume = (status: string) => status === 'paused' || status === 'partial';

  return (
    <div className="h-full flex flex-col bg-[var(--color-surface)]">
      {/* OCR Control Bar */}
      <div className="flex-shrink-0 p-3 border-b border-[var(--color-border)]">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-[var(--color-text-secondary)]">
            {documents.length} files
            {ocrProgress && ` | ${ocrProgress.completed} OCR done`}
          </span>
          <button
            onClick={onStartOcr}
            disabled={isOcrRunning || !canStartOcr(documents, selectedDocs)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
              isOcrRunning || !canStartOcr(documents, selectedDocs)
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)]'
            }`}
          >
            {isOcrRunning ? (
              <>
                <div className="animate-spin rounded-full h-3 w-3 border border-white border-t-transparent"></div>
                OCR...
              </>
            ) : (
              <>
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
                {selectedDocs.length > 0 ? `OCR Selected (${selectedDocs.length})` : 'Start OCR'}
              </>
            )}
          </button>
        </div>

        {isOcrRunning && ocrProgress && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs text-[var(--color-text-secondary)]">
              <span>{ocrProgress.completed + ocrProgress.failed}/{ocrProgress.total}</span>
              <span>{ocrProgress.progress_percent}%</span>
            </div>
            <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-[var(--color-primary)] transition-all duration-300"
                style={{ width: `${ocrProgress.progress_percent}%` }}
              />
            </div>
            {ocrProgress.current_processing && ocrProgress.current_processing.total_pages > 0 && (
              <div className="flex items-center justify-between">
                <div className="text-xs text-[var(--color-primary)] truncate flex-1" title={ocrProgress.current_processing.file_name}>
                  {ocrProgress.current_processing.file_name} ({ocrProgress.current_processing.current_page}/{ocrProgress.current_processing.total_pages})
                </div>
                <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                  <button onClick={onPauseOcr} className="p-1 text-[var(--color-warning)] hover:bg-yellow-50 rounded transition-colors" title="Pause OCR">
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                    </svg>
                  </button>
                  <button onClick={onCancelOcr} className="p-1 text-[var(--color-error)] hover:bg-red-50 rounded transition-colors" title="Cancel OCR">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {selectedDocs.length > 0 && (
          <div className="mt-2 flex items-center justify-between">
            <span className="text-xs text-[var(--color-primary)] font-medium">{selectedDocs.length} selected</span>
            <button onClick={onBatchDelete} className="px-2 py-1 text-xs font-medium text-[var(--color-error)] hover:bg-red-50 rounded transition-colors flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete
            </button>
          </div>
        )}
      </div>

      {/* File List */}
      <div className="flex-1 overflow-y-auto">
        {allFolders.map(folder => {
          const folderDocs = documentsByFolder[folder] || [];
          const isExpanded = expandedFolders.has(folder);
          const completedCount = folderDocs.filter(d => d.ocr_status === 'completed').length;

          return (
            <div key={folder} className="border-b border-[var(--color-border)] last:border-b-0">
              <button
                onClick={() => toggleFolder(folder)}
                className="w-full px-3 py-2 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <svg className={`w-3 h-3 text-[var(--color-text-secondary)] transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  <span className="w-5 h-5 rounded bg-amber-100 flex items-center justify-center">
                    <svg className="w-3 h-3 text-amber-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" />
                    </svg>
                  </span>
                  <span className="text-sm font-medium text-[var(--color-text)]">{folder}</span>
                  <span className="text-xs text-[var(--color-text-secondary)]">({folderDocs.length})</span>
                </div>
                {folderDocs.length > 0 && (
                  <div className="w-12 h-1 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-[var(--color-success)]" style={{ width: `${(completedCount / folderDocs.length) * 100}%` }} />
                  </div>
                )}
              </button>

              {isExpanded && (
                <div className="bg-gray-50/50">
                  {folderDocs.length === 0 ? (
                    <div className="px-3 py-4 text-xs text-[var(--color-text-secondary)] text-center">No files in folder {folder}</div>
                  ) : (
                    folderDocs.map(doc => (
                      <div
                        key={doc.id}
                        onClick={() => onViewDoc(doc.id)}
                        className={`px-3 py-2 flex items-center gap-2 cursor-pointer transition-colors border-l-2 ${
                          activeDocId === doc.id ? 'bg-blue-50 border-l-[var(--color-primary)]' : 'border-l-transparent hover:bg-gray-100'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedDocs.includes(doc.id)}
                          onChange={(e) => { e.stopPropagation(); onSelectDoc(doc.id); }}
                          onClick={(e) => e.stopPropagation()}
                          className="w-3.5 h-3.5 text-[var(--color-primary)] rounded border-gray-300 cursor-pointer flex-shrink-0"
                        />
                        <span className="text-xs font-mono text-[var(--color-primary)] w-10 flex-shrink-0">{doc.exhibit_number || '-'}</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs text-[var(--color-text)] truncate" title={doc.file_name}>{doc.file_name}</div>
                        </div>
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${getStatusColor(doc.ocr_status)}`} title={doc.ocr_status} />
                        {canResume(doc.ocr_status) && (
                          <button
                            onClick={(e) => { e.stopPropagation(); onResumeOcr(doc.id); }}
                            className="p-1 text-[var(--color-success)] hover:bg-green-50 rounded transition-colors flex-shrink-0"
                            title="Resume OCR"
                          >
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M8 5v14l11-7z" />
                            </svg>
                          </button>
                        )}
                        <button
                          onClick={(e) => { e.stopPropagation(); if (confirm(`Delete "${doc.file_name}"?`)) onDeleteDoc(doc.id); }}
                          className="p-1 text-[var(--color-text-secondary)] hover:text-[var(--color-error)] rounded transition-colors flex-shrink-0"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
