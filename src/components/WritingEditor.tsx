'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { EnhancedCitation, TextSelection } from '@/types';
import CitationTooltip from './CitationTooltip';
import SelectionBubble from './SelectionBubble';

interface WritingEditorProps {
  content: string;
  onChange: (content: string) => void;
  citations: EnhancedCitation[];
  onSelectionChange: (selection: TextSelection | null) => void;
  selectionEditMode: 'bubble' | 'panel';
  onEditSelection: () => void;
  readOnly?: boolean;
}

// Parse content and extract citation references like [Exhibit A-6: Title]
const CITATION_REGEX = /\[Exhibit\s+([A-Z]-?\d+)(?::\s*([^\]]+))?\]/g;

interface ParsedSegment {
  type: 'text' | 'citation';
  content: string;
  exhibit?: string;
  title?: string;
}

function parseContent(content: string): ParsedSegment[] {
  const segments: ParsedSegment[] = [];
  let lastIndex = 0;

  const matches = content.matchAll(CITATION_REGEX);
  for (const match of matches) {
    // Add text before citation
    if (match.index! > lastIndex) {
      segments.push({
        type: 'text',
        content: content.slice(lastIndex, match.index),
      });
    }

    // Add citation
    segments.push({
      type: 'citation',
      content: match[0],
      exhibit: match[1],
      title: match[2],
    });

    lastIndex = match.index! + match[0].length;
  }

  // Add remaining text
  if (lastIndex < content.length) {
    segments.push({
      type: 'text',
      content: content.slice(lastIndex),
    });
  }

  return segments;
}

export default function WritingEditor({
  content,
  onChange,
  citations,
  onSelectionChange,
  selectionEditMode,
  onEditSelection,
  readOnly = false,
}: WritingEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [hoveredCitation, setHoveredCitation] = useState<{
    citation: EnhancedCitation;
    position: { x: number; y: number };
  } | null>(null);
  const [selection, setSelection] = useState<{
    text: string;
    start: number;
    end: number;
    position: { x: number; y: number };
  } | null>(null);

  // Find citation data by exhibit number
  const findCitation = useCallback(
    (exhibit: string): EnhancedCitation | undefined => {
      return citations.find((c) => c.exhibit === exhibit);
    },
    [citations]
  );

  // Handle citation hover
  const handleCitationMouseEnter = useCallback(
    (exhibit: string, event: React.MouseEvent) => {
      const citation = findCitation(exhibit);
      if (citation) {
        const rect = (event.target as HTMLElement).getBoundingClientRect();
        setHoveredCitation({
          citation,
          position: { x: rect.left, y: rect.bottom },
        });
      }
    },
    [findCitation]
  );

  const handleCitationMouseLeave = useCallback(() => {
    // Delay closing to allow moving to tooltip
    setTimeout(() => {
      setHoveredCitation(null);
    }, 100);
  }, []);

  // Handle text selection
  const handleSelectionChange = useCallback(() => {
    const windowSelection = window.getSelection();
    if (!windowSelection || windowSelection.isCollapsed || !editorRef.current) {
      setSelection(null);
      onSelectionChange(null);
      return;
    }

    const selectedText = windowSelection.toString().trim();
    if (!selectedText) {
      setSelection(null);
      onSelectionChange(null);
      return;
    }

    // Get selection position
    const range = windowSelection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    // Calculate start/end indices in content
    // This is a simplified approach - in a real editor you'd use proper offset calculation
    const start = content.indexOf(selectedText);
    const end = start + selectedText.length;

    const newSelection = {
      text: selectedText,
      start: start >= 0 ? start : 0,
      end: start >= 0 ? end : selectedText.length,
      position: { x: rect.left + rect.width / 2, y: rect.top },
    };

    setSelection(newSelection);
    onSelectionChange({
      text: newSelection.text,
      start: newSelection.start,
      end: newSelection.end,
    });
  }, [content, onSelectionChange]);

  // Listen for selection changes
  useEffect(() => {
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, [handleSelectionChange]);

  // Clear selection when clicking outside
  const handleEditorClick = useCallback((e: React.MouseEvent) => {
    // Don't clear if clicking on a citation or selection bubble
    const target = e.target as HTMLElement;
    if (target.closest('.citation-link') || target.closest('.selection-bubble')) {
      return;
    }
  }, []);

  // Handle content editing
  const handleInput = useCallback(
    (e: React.FormEvent<HTMLDivElement>) => {
      const newContent = (e.target as HTMLDivElement).innerText;
      onChange(newContent);
    },
    [onChange]
  );

  // Render content with clickable citations
  const renderContent = () => {
    const segments = parseContent(content);

    return segments.map((segment, index) => {
      if (segment.type === 'citation') {
        const citation = findCitation(segment.exhibit!);
        return (
          <span
            key={index}
            className={`citation-link inline-flex items-center px-1 py-0.5 rounded text-sm font-medium cursor-pointer transition-colors ${
              citation
                ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                : 'bg-gray-100 text-gray-600'
            }`}
            onMouseEnter={(e) => handleCitationMouseEnter(segment.exhibit!, e)}
            onMouseLeave={handleCitationMouseLeave}
          >
            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            {segment.content}
          </span>
        );
      }

      return <span key={index}>{segment.content}</span>;
    });
  };

  return (
    <div className="relative">
      {/* Editor area */}
      <div
        ref={editorRef}
        contentEditable={!readOnly}
        suppressContentEditableWarning
        onInput={handleInput}
        onClick={handleEditorClick}
        className={`min-h-[300px] p-4 text-gray-800 leading-relaxed focus:outline-none ${
          readOnly ? 'bg-gray-50' : 'bg-white'
        }`}
        style={{ whiteSpace: 'pre-wrap' }}
      >
        {renderContent()}
      </div>

      {/* Citation tooltip */}
      {hoveredCitation && (
        <CitationTooltip
          citation={hoveredCitation.citation}
          position={hoveredCitation.position}
          onClose={() => setHoveredCitation(null)}
        />
      )}

      {/* Selection bubble (Mode A) */}
      {selection && selectionEditMode === 'bubble' && (
        <SelectionBubble
          selection={{
            text: selection.text,
            start: selection.start,
            end: selection.end,
          }}
          position={selection.position}
          onEdit={onEditSelection}
          onCopy={() => navigator.clipboard.writeText(selection.text)}
          onClose={() => {
            setSelection(null);
            onSelectionChange(null);
            window.getSelection()?.removeAllRanges();
          }}
        />
      )}

      {/* Selection indicator for panel mode */}
      {selection && selectionEditMode === 'panel' && (
        <div className="absolute top-2 right-2 bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full">
          {selection.text.length} chars selected
        </div>
      )}
    </div>
  );
}
