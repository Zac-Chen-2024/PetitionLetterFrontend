'use client';

import { useState, useEffect } from 'react';
import { highlightApi, type HighlightItem } from '@/utils/api';
import { useLanguage } from '@/i18n/LanguageContext';

interface PDFHighlightViewerProps {
  documentId: string | null;
  documentName?: string;
  pageCount?: number;
  // Controlled page (optional - if provided, parent controls the page)
  currentPage?: number;
  onPageChange?: (page: number) => void;
  // Selected highlight from parent (optional)
  selectedHighlightId?: string | null;
}

// Icons
const ChevronLeftIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
  </svg>
);

const ChevronRightIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);

const DownloadIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
  </svg>
);

const ZoomInIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
  </svg>
);

const ZoomOutIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
  </svg>
);

// Highlight category colors
const HIGHLIGHT_COLORS: Record<string, string> = {
  'key_fact': 'rgba(59, 130, 246, 0.3)', // blue
  'evidence': 'rgba(16, 185, 129, 0.3)', // green
  'timeline': 'rgba(245, 158, 11, 0.3)', // yellow
  'entity': 'rgba(139, 92, 246, 0.3)', // purple
  'financial': 'rgba(236, 72, 153, 0.3)', // pink
  'default': 'rgba(251, 191, 36, 0.3)', // amber
};

const getCategoryColor = (category: string | null): string => {
  if (!category) return HIGHLIGHT_COLORS.default;
  return HIGHLIGHT_COLORS[category.toLowerCase()] || HIGHLIGHT_COLORS.default;
};

export default function PDFHighlightViewer({
  documentId,
  pageCount = 1,
  currentPage: controlledPage,
  onPageChange,
  selectedHighlightId,
}: PDFHighlightViewerProps) {
  const { t } = useLanguage();

  // Use controlled page if provided, otherwise use internal state
  const [internalPage, setInternalPage] = useState(1);
  const currentPage = controlledPage ?? internalPage;
  const setCurrentPage = (page: number) => {
    if (onPageChange) {
      onPageChange(page);
    } else {
      setInternalPage(page);
    }
  };

  const [totalPages, setTotalPages] = useState(pageCount);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [highlights, setHighlights] = useState<HighlightItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(100);
  const [selectedHighlight, setSelectedHighlight] = useState<HighlightItem | null>(null);
  const [imageDimensions, setImageDimensions] = useState<{
    width: number;
    height: number;
  } | null>(null);

  // Update selected highlight when selectedHighlightId changes from parent
  useEffect(() => {
    if (selectedHighlightId) {
      const found = highlights.find(h => h.id === selectedHighlightId);
      if (found) {
        setSelectedHighlight(found);
      }
    }
  }, [selectedHighlightId, highlights]);

  // Load page image and highlights
  useEffect(() => {
    if (!documentId) {
      setImageUrl(null);
      setHighlights([]);
      return;
    }

    const loadPageData = async () => {
      setLoading(true);
      setError(null);
      setImageDimensions(null);

      try {
        // Get page image URL
        const imgUrl = highlightApi.getPageImage(documentId, currentPage);
        setImageUrl(imgUrl);

        // Get highlights for this page
        const highlightData = await highlightApi.getHighlights(documentId, currentPage);
        setHighlights(highlightData.highlights || []);
      } catch (err) {
        console.error('Failed to load page data:', err);
        setError(t.pdfViewer.loadFailed);
        setImageUrl(null);
        setHighlights([]);
      } finally {
        setLoading(false);
      }
    };

    loadPageData();
  }, [documentId, currentPage]);

  // Update total pages when prop changes
  useEffect(() => {
    setTotalPages(pageCount);
  }, [pageCount]);

  // Reset to page 1 when document changes (only for internal state)
  useEffect(() => {
    if (!controlledPage) {
      setInternalPage(1);
    }
    setSelectedHighlight(null);
  }, [documentId, controlledPage]);

  // Navigation handlers
  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
      setSelectedHighlight(null);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
      setSelectedHighlight(null);
    }
  };

  // Zoom handlers
  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 25, 200));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 25, 50));
  };

  // Download current page
  const handleDownload = () => {
    if (imageUrl) {
      window.open(imageUrl, '_blank');
    }
  };

  // Convert normalized coordinates (0-1000) to pixel coordinates
  const convertBboxToPixels = (
    bbox: { x1: number; y1: number; x2: number; y2: number },
    imgWidth: number,
    imgHeight: number
  ) => {
    return {
      left: (bbox.x1 / 1000) * imgWidth,
      top: (bbox.y1 / 1000) * imgHeight,
      width: ((bbox.x2 - bbox.x1) / 1000) * imgWidth,
      height: ((bbox.y2 - bbox.y1) / 1000) * imgHeight,
    };
  };

  if (!documentId) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50 rounded-lg border border-gray-200">
        <div className="text-center">
          <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-sm text-gray-500">{t.pdfViewer.selectFile}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col border border-gray-200 rounded-lg overflow-hidden bg-white">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-200">
        {/* Zoom controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleZoomOut}
            disabled={zoom <= 50}
            className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title={t.pdfViewer.zoomOut}
          >
            <ZoomOutIcon />
          </button>
          <span className="text-xs text-gray-600 min-w-[40px] text-center">{zoom}%</span>
          <button
            onClick={handleZoomIn}
            disabled={zoom >= 200}
            className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title={t.pdfViewer.zoomIn}
          >
            <ZoomInIcon />
          </button>
        </div>

        {/* Page navigation */}
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrevPage}
            disabled={currentPage <= 1}
            className="p-1 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeftIcon />
          </button>
          <span className="text-sm text-gray-700 min-w-[60px] text-center">
            {currentPage} / {totalPages}
          </span>
          <button
            onClick={handleNextPage}
            disabled={currentPage >= totalPages}
            className="p-1 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRightIcon />
          </button>
        </div>

        {/* Download */}
        <button
          onClick={handleDownload}
          className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded transition-colors"
          title={t.pdfViewer.downloadPage}
        >
          <DownloadIcon />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto bg-gray-100 relative">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-sm text-red-500">{error}</p>
          </div>
        ) : imageUrl ? (
          <div className="min-h-full flex items-start justify-center p-4">
            <div
              className="relative shadow-lg bg-white"
              style={{
                transform: `scale(${zoom / 100})`,
                transformOrigin: 'top center',
              }}
            >
              {/* PDF Page Image */}
              <img
                src={imageUrl}
                alt={`Page ${currentPage}`}
                className="block"
                style={{ maxWidth: 'none' }}
                onLoad={(e) => {
                  const img = e.target as HTMLImageElement;
                  setImageDimensions({
                    width: img.naturalWidth,
                    height: img.naturalHeight,
                  });
                }}
                onError={() => setError(t.pdfViewer.imageFailed)}
              />

              {/* Highlight Overlays */}
              {imageDimensions && highlights.map((highlight, idx) => {
                if (!highlight.bbox || highlight.bbox.x1 == null) return null;

                const { x1, y1, x2, y2 } = highlight.bbox;
                const pixelCoords = convertBboxToPixels(
                  { x1: x1 || 0, y1: y1 || 0, x2: x2 || 0, y2: y2 || 0 },
                  imageDimensions.width,
                  imageDimensions.height
                );

                if (pixelCoords.width <= 0 || pixelCoords.height <= 0) return null;

                return (
                  <div
                    key={highlight.id || idx}
                    className={`absolute cursor-pointer transition-all ${
                      selectedHighlight?.id === highlight.id
                        ? 'ring-2 ring-blue-500'
                        : 'hover:ring-2 hover:ring-blue-300'
                    }`}
                    style={{
                      left: `${pixelCoords.left}px`,
                      top: `${pixelCoords.top}px`,
                      width: `${pixelCoords.width}px`,
                      height: `${pixelCoords.height}px`,
                      backgroundColor: getCategoryColor(highlight.category),
                      borderRadius: '2px',
                    }}
                    onClick={() => setSelectedHighlight(highlight)}
                    title={highlight.text_content || t.highlight.highlightArea}
                  />
                );
              })}
            </div>
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-sm text-gray-500">{t.pdfViewer.loadFailed}</p>
          </div>
        )}
      </div>

      {/* Highlight Details Panel */}
      {selectedHighlight && (
        <div className="px-4 py-3 bg-blue-50 border-t border-blue-200">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                {selectedHighlight.category && (
                  <span className="px-2 py-0.5 text-xs font-medium rounded bg-blue-100 text-blue-700">
                    {selectedHighlight.category_cn || selectedHighlight.category}
                  </span>
                )}
                {selectedHighlight.importance && (
                  <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                    selectedHighlight.importance === 'high'
                      ? 'bg-red-100 text-red-700'
                      : selectedHighlight.importance === 'medium'
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}>
                    {selectedHighlight.importance === 'high' ? t.pdfViewer.highImportance :
                     selectedHighlight.importance === 'medium' ? t.pdfViewer.mediumImportance : t.pdfViewer.lowImportance}
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-800 line-clamp-2">
                {selectedHighlight.text_content || t.highlight.noTextContent}
              </p>
              {selectedHighlight.reason && (
                <p className="text-xs text-gray-600 mt-1 line-clamp-1">
                  <span className="font-medium">{t.pdfViewer.reason}:</span> {selectedHighlight.reason}
                </p>
              )}
            </div>
            <button
              onClick={() => setSelectedHighlight(null)}
              className="p-1 text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Highlights count footer */}
      {highlights.length > 0 && (
        <div className="px-3 py-1.5 bg-gray-50 border-t border-gray-100 text-xs text-gray-500 text-center">
          {t.highlight.currentPage} {highlights.length} {t.highlight.highlightAreas}
        </div>
      )}
    </div>
  );
}
