'use client';

import { useState } from 'react';
import type { Quote, L1StandardKey } from '@/types';
import { STANDARD_DISPLAY_NAMES } from '@/utils/prompts';

interface StandardViewProps {
  quotesByStandard: Record<string, Quote[]>;
  onViewQuote?: (quote: Quote) => void;
}

function QuoteCard({ quote, onView }: { quote: Quote; onView?: () => void }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className="bg-gray-50 rounded-lg p-4 border border-[var(--color-border)] hover:border-blue-300 transition-colors cursor-pointer"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onView}
    >
      <div className="text-sm text-[var(--color-text)] mb-3 line-clamp-3">&quot;{quote.quote}&quot;</div>
      <div className="text-xs text-[var(--color-text-secondary)] mb-3">{quote.relevance}</div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="px-2 py-1 bg-blue-50 text-[var(--color-primary)] text-xs font-medium rounded">
            {quote.source.exhibit_id}
          </span>
          {quote.page && <span className="text-xs text-[var(--color-text-secondary)]">p.{quote.page}</span>}
        </div>
        {isHovered && <span className="text-xs text-[var(--color-primary)]">View in PDF</span>}
      </div>
    </div>
  );
}

function StandardSection({
  standardKey,
  quotes,
  onViewQuote,
}: {
  standardKey: string;
  quotes: Quote[];
  onViewQuote?: (quote: Quote) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const displayName = STANDARD_DISPLAY_NAMES[standardKey as L1StandardKey] || { chinese: standardKey, english: standardKey };

  const getStatusColor = () => {
    if (quotes.length >= 5) return 'bg-[var(--color-success)]';
    if (quotes.length >= 2) return 'bg-[var(--color-warning)]';
    if (quotes.length >= 1) return 'bg-blue-500';
    return 'bg-gray-300';
  };

  return (
    <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <svg className={`w-4 h-4 text-[var(--color-text-secondary)] transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <div className={`w-2 h-2 rounded-full ${getStatusColor()}`}></div>
          <div className="text-left">
            <div className="font-semibold text-[var(--color-text)]">{displayName.english}</div>
            <div className="text-xs text-[var(--color-text-secondary)]">{displayName.chinese}</div>
          </div>
        </div>
        <span className="px-3 py-1 text-sm font-medium bg-gray-100 text-[var(--color-text-secondary)] rounded-full">
          {quotes.length} quote{quotes.length !== 1 ? 's' : ''}
        </span>
      </button>

      {isExpanded && (
        <div className="p-5 border-t border-[var(--color-border)] space-y-3">
          {quotes.length > 0 ? (
            quotes.map((quote, index) => (
              <QuoteCard key={index} quote={quote} onView={() => onViewQuote?.(quote)} />
            ))
          ) : (
            <div className="text-center py-8 text-[var(--color-text-secondary)] text-sm">
              No evidence found for this standard yet.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function StandardView({ quotesByStandard, onViewQuote }: StandardViewProps) {
  const standardOrder: L1StandardKey[] = [
    'qualifying_relationship',
    'qualifying_employment',
    'qualifying_capacity',
    'doing_business',
  ];

  const totalQuotes = Object.values(quotesByStandard).flat().length;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 text-sm">
        <span className="text-[var(--color-text)] font-medium">{totalQuotes} Total Quotes</span>
        <div className="flex items-center gap-2">
          {standardOrder.map(key => {
            const count = quotesByStandard[key]?.length || 0;
            return (
              <div key={key} className="flex items-center gap-1">
                <div className={`w-2 h-2 rounded-full ${
                  count >= 5 ? 'bg-[var(--color-success)]' : count >= 2 ? 'bg-[var(--color-warning)]' : count >= 1 ? 'bg-blue-500' : 'bg-gray-300'
                }`}></div>
                <span className="text-xs text-[var(--color-text-secondary)]">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {standardOrder.map(key => (
        <StandardSection key={key} standardKey={key} quotes={quotesByStandard[key] || []} onViewQuote={onViewQuote} />
      ))}
    </div>
  );
}
