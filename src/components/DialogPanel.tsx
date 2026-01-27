'use client';

import { useState, useRef, useEffect } from 'react';
import { TextSelection, DialogMessage, DialogLayoutMode } from '@/types';

interface DialogPanelProps {
  mode: DialogLayoutMode;
  selection: TextSelection | null;
  onSend: (instruction: string, selection: TextSelection | null) => Promise<void>;
  onShowHistory: () => void;
  isProcessing: boolean;
  recentMessages?: DialogMessage[];
}

// Icons
const SendIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
  </svg>
);

const HistoryIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const CloseIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

export default function DialogPanel({
  mode,
  selection,
  onSend,
  onShowHistory,
  isProcessing,
  recentMessages = [],
}: DialogPanelProps) {
  const [instruction, setInstruction] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-focus when selection changes in panel mode
  useEffect(() => {
    if (mode === 'right' && selection && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [selection, mode]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!instruction.trim() || isProcessing) return;

    await onSend(instruction.trim(), selection);
    setInstruction('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Bottom mode (ChatGPT style)
  if (mode === 'bottom') {
    return (
      <div className="border-t border-gray-200 bg-white p-4">
        {/* Selection indicator */}
        {selection && (
          <div className="mb-3 flex items-start gap-2 p-2 bg-yellow-50 rounded-lg border border-yellow-200">
            <span className="text-xs text-yellow-700 font-medium whitespace-nowrap">Selected:</span>
            <span className="text-xs text-yellow-800 line-clamp-2">&ldquo;{selection.text}&rdquo;</span>
          </div>
        )}

        {/* Input area */}
        <form onSubmit={handleSubmit} className="flex items-end gap-3">
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={selection ? 'How should I modify this selection?' : 'Enter editing instructions...'}
              className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              rows={1}
              disabled={isProcessing}
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onShowHistory}
              className="p-3 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
              title="View history"
            >
              <HistoryIcon />
            </button>

            <button
              type="submit"
              disabled={!instruction.trim() || isProcessing}
              className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isProcessing ? (
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                <SendIcon />
              )}
            </button>
          </div>
        </form>
      </div>
    );
  }

  // Right panel mode
  return (
    <div className="w-80 border-l border-gray-200 bg-white flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <h3 className="font-medium text-gray-900">Edit Assistant</h3>
        <button
          onClick={onShowHistory}
          className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
          title="View history"
        >
          <HistoryIcon />
        </button>
      </div>

      {/* Selection preview */}
      {selection && (
        <div className="p-4 border-b border-gray-200 bg-yellow-50">
          <div className="text-xs text-gray-500 mb-1">Selected text:</div>
          <div className="text-sm text-gray-800 line-clamp-4 bg-white p-2 rounded border border-yellow-200">
            &ldquo;{selection.text}&rdquo;
          </div>
        </div>
      )}

      {/* Recent messages */}
      {recentMessages.length > 0 && (
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {recentMessages.slice(-3).map((msg) => (
            <div
              key={msg.id}
              className={`text-sm p-2 rounded-lg ${
                msg.role === 'user'
                  ? 'bg-blue-50 text-blue-900 ml-4'
                  : 'bg-gray-50 text-gray-700 mr-4'
              }`}
            >
              {msg.content}
            </div>
          ))}
        </div>
      )}

      {/* Input area */}
      <div className="p-4 border-t border-gray-200 mt-auto">
        <textarea
          ref={textareaRef}
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={selection ? 'How should I modify this?' : 'Enter editing instructions...'}
          className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          rows={3}
          disabled={isProcessing}
        />

        <button
          onClick={() => handleSubmit()}
          disabled={!instruction.trim() || isProcessing}
          className="mt-3 w-full py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {isProcessing ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span>Processing...</span>
            </>
          ) : (
            <>
              <span>Apply Changes</span>
              <SendIcon />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
