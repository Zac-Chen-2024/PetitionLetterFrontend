'use client';

import { useState, useEffect } from 'react';
import { EnhancedCitation } from '@/types';
import { pdfApi } from '@/utils/api';

interface CitationTooltipProps {
  citation: EnhancedCitation;
  position: { x: number; y: number };
  onClose: () => void;
}

export default function CitationTooltip({
  citation,
  position,
  onClose,
}: CitationTooltipProps) {
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadPreview = async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await pdfApi.getPreview(
          citation.document_id,
          citation.page_number,
          citation.bbox
        );
        if (mounted) {
          setPreviewImage(result.image);
        }
      } catch (err) {
        if (mounted) {
          setError('Failed to load preview');
          console.error('Preview load error:', err);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadPreview();

    return () => {
      mounted = false;
    };
  }, [citation.document_id, citation.page_number, citation.bbox]);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.citation-tooltip')) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // Adjust position to stay within viewport
  const adjustedPosition = {
    x: Math.min(position.x, window.innerWidth - 280),
    y: position.y + 20,
  };

  return (
    <div
      className="citation-tooltip fixed z-50 bg-white rounded-lg shadow-xl border border-gray-200 p-3 w-64 animate-fade-in"
      style={{
        left: adjustedPosition.x,
        top: adjustedPosition.y,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-gray-700">
          Exhibit {citation.exhibit}
        </span>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* File info */}
      <div className="text-xs text-gray-500 mb-2">
        {citation.file_name} - Page {citation.page_number}
      </div>

      {/* Preview image */}
      <div className="relative bg-gray-100 rounded border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="h-32 flex items-center justify-center">
            <svg className="w-6 h-6 text-gray-400 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
        ) : error ? (
          <div className="h-32 flex items-center justify-center text-gray-400 text-xs">
            {error}
          </div>
        ) : previewImage ? (
          <img
            src={previewImage}
            alt={`Page ${citation.page_number} preview`}
            className="w-full h-auto"
          />
        ) : null}
      </div>

      {/* Quote preview */}
      {citation.quote && (
        <div className="mt-2 text-xs text-gray-600 line-clamp-3 italic border-l-2 border-blue-300 pl-2">
          &ldquo;{citation.quote}&rdquo;
        </div>
      )}

      {/* Claim/relevance */}
      {citation.claim && (
        <div className="mt-2 text-xs text-gray-500">
          <span className="font-medium">Supports:</span> {citation.claim}
        </div>
      )}
    </div>
  );
}
