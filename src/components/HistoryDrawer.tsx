'use client';

import { useState, useEffect, useRef } from 'react';
import { DialogMessage } from '@/types';

interface HistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  history: DialogMessage[];
  onApplyMessage?: (message: DialogMessage) => void;
}

const formatTime = (timestamp: string) => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatDate = (timestamp: string) => {
  const date = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return 'Today';
  } else if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  }
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
};

export default function HistoryDrawer({
  isOpen,
  onClose,
  history,
  onApplyMessage,
}: HistoryDrawerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const drawerRef = useRef<HTMLDivElement>(null);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  // Filter messages based on search
  const filteredHistory = history.filter((msg) =>
    msg.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group messages by date
  const groupedHistory = filteredHistory.reduce((acc, msg) => {
    const date = formatDate(msg.timestamp);
    if (!acc[date]) acc[date] = [];
    acc[date].push(msg);
    return acc;
  }, {} as Record<string, DialogMessage[]>);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        ref={drawerRef}
        className="fixed right-0 top-0 h-full w-96 max-w-full bg-white shadow-xl z-50 flex flex-col animate-slide-in-right"
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Edit History</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search history..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* History list */}
        <div className="flex-1 overflow-y-auto">
          {Object.keys(groupedHistory).length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <svg className="w-12 h-12 mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm">
                {searchQuery ? 'No matching messages' : 'No history yet'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {Object.entries(groupedHistory).map(([date, messages]) => (
                <div key={date}>
                  <div className="px-4 py-2 bg-gray-50 sticky top-0">
                    <span className="text-xs font-medium text-gray-500">{date}</span>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className="p-4 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <span
                            className={`text-xs font-medium px-2 py-0.5 rounded ${
                              msg.role === 'user'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-green-100 text-green-700'
                            }`}
                          >
                            {msg.role === 'user' ? 'You' : 'Assistant'}
                          </span>
                          <span className="text-xs text-gray-400">
                            {formatTime(msg.timestamp)}
                          </span>
                        </div>

                        <p className="text-sm text-gray-700 line-clamp-3">
                          {msg.content}
                        </p>

                        {msg.selection && (
                          <div className="mt-2 text-xs text-gray-500 bg-gray-100 p-2 rounded">
                            <span className="font-medium">Selection:</span>{' '}
                            &ldquo;{msg.selection.text.slice(0, 50)}
                            {msg.selection.text.length > 50 ? '...' : ''}&rdquo;
                          </div>
                        )}

                        {onApplyMessage && msg.role === 'assistant' && (
                          <button
                            onClick={() => onApplyMessage(msg)}
                            className="mt-2 text-xs text-blue-600 hover:text-blue-800"
                          >
                            Apply this change
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <p className="text-xs text-gray-500 text-center">
            {history.length} message{history.length !== 1 ? 's' : ''} in history
          </p>
        </div>
      </div>
    </>
  );
}
