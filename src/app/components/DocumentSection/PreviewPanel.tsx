'use client';

import { useState } from 'react';
import type { Document } from '@/types';

interface PreviewPanelProps {
  document: Document | null;
  projectId: string;
  onCopyText: () => void;
}

export default function PreviewPanel({ document, onCopyText }: PreviewPanelProps) {
  const [activeTab, setActiveTab] = useState<'ocr'>('ocr');

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    onCopyText();
  };

  if (!document) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="text-center text-[var(--color-text-secondary)]">
          <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-sm">Select a document to preview</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-[var(--color-surface)]">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-[var(--color-border)]">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm font-mono text-[var(--color-primary)] flex-shrink-0">
              {document.exhibit_number || '-'}
            </span>
            <span className="text-sm text-[var(--color-text)] truncate" title={document.file_name}>
              {document.file_name}
            </span>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={() => setActiveTab('ocr')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                activeTab === 'ocr'
                  ? 'bg-blue-100 text-[var(--color-primary)]'
                  : 'text-[var(--color-text-secondary)] hover:bg-gray-100'
              }`}
            >
              OCR Text
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full flex flex-col">
          {/* Status Bar */}
          <div className="flex-shrink-0 px-4 py-2 bg-gray-50 border-b border-[var(--color-border)] flex items-center justify-between">
            <div className="flex items-center gap-3 text-xs text-[var(--color-text-secondary)]">
              <span>Pages: {document.page_count || 1}</span>
              <span>~{Math.round((document.ocr_text?.length || 0) / 4)} tokens</span>
            </div>
            <button
              onClick={() => copyToClipboard(document.ocr_text || '')}
              disabled={!document.ocr_text}
              className="px-3 py-1 text-xs font-medium text-[var(--color-primary)] hover:bg-blue-50 rounded transition-colors disabled:text-gray-400 disabled:hover:bg-transparent"
            >
              Copy All
            </button>
          </div>

          {/* OCR Text */}
          <div className="flex-1 overflow-y-auto p-4">
            {document.ocr_status === 'completed' && document.ocr_text ? (
              <pre className="text-sm text-[var(--color-text)] whitespace-pre-wrap font-mono leading-relaxed">
                {document.ocr_text}
              </pre>
            ) : document.ocr_status === 'processing' ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-[var(--color-primary)] border-t-transparent mx-auto mb-3"></div>
                  <p className="text-sm text-[var(--color-text-secondary)]">OCR in progress...</p>
                </div>
              </div>
            ) : document.ocr_status === 'failed' ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center text-[var(--color-error)]">
                  <svg className="w-10 h-10 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <p className="text-sm">OCR failed</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center text-[var(--color-text-secondary)]">
                  <svg className="w-10 h-10 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-sm">OCR not started</p>
                  <p className="text-xs mt-1">Click &quot;Start OCR&quot; to process</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
