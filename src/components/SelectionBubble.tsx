'use client';

import { TextSelection } from '@/types';

interface SelectionBubbleProps {
  selection: TextSelection;
  position: { x: number; y: number };
  onEdit: () => void;
  onCopy?: () => void;
  onClose: () => void;
}

export default function SelectionBubble({
  selection,
  position,
  onEdit,
  onCopy,
  onClose,
}: SelectionBubbleProps) {
  // Adjust position to stay within viewport
  const adjustedPosition = {
    x: Math.max(10, Math.min(position.x - 50, window.innerWidth - 130)),
    y: position.y - 45,
  };

  return (
    <div
      className="fixed z-50 animate-fade-in"
      style={{
        left: adjustedPosition.x,
        top: adjustedPosition.y,
      }}
    >
      <div className="bg-gray-900 text-white px-2 py-1.5 rounded-lg shadow-lg flex items-center gap-1">
        {/* Edit button */}
        <button
          onClick={onEdit}
          className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-gray-700 transition-colors text-sm"
          title="Edit selection"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <span>Edit</span>
        </button>

        {/* Divider */}
        {onCopy && <div className="w-px h-4 bg-gray-600" />}

        {/* Copy button */}
        {onCopy && (
          <button
            onClick={onCopy}
            className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-gray-700 transition-colors text-sm"
            title="Copy selection"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>
        )}

        {/* Close button */}
        <button
          onClick={onClose}
          className="flex items-center px-1.5 py-1 rounded hover:bg-gray-700 transition-colors"
          title="Close"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Arrow pointing down */}
      <div className="absolute left-1/2 transform -translate-x-1/2 -bottom-1.5">
        <div className="w-3 h-3 bg-gray-900 rotate-45" />
      </div>
    </div>
  );
}
