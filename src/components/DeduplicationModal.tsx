'use client';

import { useState } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { DeduplicationSuggestion, DeduplicationAction } from '@/utils/api';

interface DeduplicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  suggestions: DeduplicationSuggestion[];
  onApply: (actions: DeduplicationAction[]) => Promise<void>;
  isApplying: boolean;
}

// Icons
const MergeIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
  </svg>
);

const WarningIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
);

const CheckIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const CloseIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

// Confidence badge
const ConfidenceBadge = ({ confidence }: { confidence: number }) => {
  const percent = Math.round(confidence * 100);
  const color = percent >= 90 ? 'bg-green-100 text-green-700' :
                percent >= 70 ? 'bg-yellow-100 text-yellow-700' :
                'bg-red-100 text-red-700';

  return (
    <span className={`px-2 py-0.5 text-xs font-medium rounded ${color}`}>
      {percent}%
    </span>
  );
};

// Suggestion card component
const SuggestionCard = ({
  suggestion,
  isSelected,
  onToggle,
  t,
}: {
  suggestion: DeduplicationSuggestion;
  isSelected: boolean;
  onToggle: () => void;
  t: ReturnType<typeof useLanguage>['t'];
}) => {
  const isMerge = suggestion.type === 'merge_entities';

  return (
    <div
      className={`border rounded-lg p-4 transition-colors cursor-pointer ${
        isSelected ? 'border-rose-400 bg-rose-50/50' : 'border-gray-200 hover:border-gray-300'
      }`}
      onClick={onToggle}
    >
      <div className="flex items-start gap-3">
        {/* Checkbox */}
        <div className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
          isSelected ? 'bg-rose-500 border-rose-500 text-white' : 'border-gray-300'
        }`}>
          {isSelected && <CheckIcon />}
        </div>

        {/* Icon */}
        <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${
          isMerge ? 'bg-blue-100 text-blue-600' : 'bg-yellow-100 text-yellow-600'
        }`}>
          {isMerge ? <MergeIcon /> : <WarningIcon />}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`px-2 py-0.5 text-xs font-medium rounded ${
              isMerge ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'
            }`}>
              {isMerge ? t.relationship.dedup?.merge || 'Merge' : t.relationship.dedup?.suspicious || 'Suspicious'}
            </span>
            <ConfidenceBadge confidence={suggestion.confidence} />
          </div>

          {isMerge ? (
            <>
              <p className="text-sm font-medium text-gray-900 mb-1">
                {suggestion.primary_name}
                <span className="text-gray-400 mx-2">←</span>
                {suggestion.duplicate_names?.join(', ')}
              </p>
              <p className="text-xs text-gray-500">{suggestion.reason}</p>
            </>
          ) : (
            <>
              <p className="text-sm font-medium text-gray-900 mb-1">
                {suggestion.entity_name}
              </p>
              <p className="text-xs text-gray-500">
                {suggestion.reason}
                {suggestion.action && (
                  <span className="ml-2 text-yellow-600">
                    ({t.relationship.dedup?.reviewOrDelete || 'Review or delete'})
                  </span>
                )}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default function DeduplicationModal({
  isOpen,
  onClose,
  suggestions,
  onApply,
  isApplying,
}: DeduplicationModalProps) {
  const { t } = useLanguage();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(suggestions.map(s => s.id))
  );

  if (!isOpen) return null;

  const toggleSuggestion = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const selectAll = () => {
    setSelectedIds(new Set(suggestions.map(s => s.id)));
  };

  const selectNone = () => {
    setSelectedIds(new Set());
  };

  const handleApply = async () => {
    const actions: DeduplicationAction[] = [];

    for (const suggestion of suggestions) {
      if (!selectedIds.has(suggestion.id)) continue;

      if (suggestion.type === 'merge_entities' && suggestion.primary_id && suggestion.duplicate_ids) {
        actions.push({
          type: 'merge',
          primary_id: suggestion.primary_id,
          merge_ids: suggestion.duplicate_ids,
        });
      } else if (suggestion.type === 'suspicious_entity' && suggestion.entity_id) {
        actions.push({
          type: 'delete',
          entity_id: suggestion.entity_id,
        });
      }
    }

    if (actions.length > 0) {
      await onApply(actions);
    }
  };

  const selectedCount = selectedIds.size;
  const mergeCount = suggestions.filter(s => s.type === 'merge_entities' && selectedIds.has(s.id)).length;
  const deleteCount = suggestions.filter(s => s.type === 'suspicious_entity' && selectedIds.has(s.id)).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {t.relationship.dedup?.title || 'Deduplication Suggestions'}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {t.relationship.dedup?.foundSuggestions?.replace('{count}', String(suggestions.length)) ||
               `Found ${suggestions.length} suggestions`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Selection controls */}
        <div className="px-6 py-3 border-b border-gray-100 flex items-center gap-4 bg-gray-50/50">
          <span className="text-sm text-gray-600">
            {t.relationship.dedup?.selected?.replace('{count}', String(selectedCount)) ||
             `${selectedCount} selected`}
          </span>
          <button
            onClick={selectAll}
            className="text-sm text-rose-600 hover:text-rose-700"
          >
            {t.common.selectAll || 'Select all'}
          </button>
          <button
            onClick={selectNone}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            {t.common.selectNone || 'Select none'}
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {suggestions.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <CheckIcon />
              <p className="mt-2">{t.relationship.dedup?.noSuggestions || 'No duplicates found'}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {suggestions.map((suggestion) => (
                <SuggestionCard
                  key={suggestion.id}
                  suggestion={suggestion}
                  isSelected={selectedIds.has(suggestion.id)}
                  onToggle={() => toggleSuggestion(suggestion.id)}
                  t={t}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="text-sm text-gray-500">
            {mergeCount > 0 && (
              <span className="mr-3">
                {t.relationship.dedup?.willMerge?.replace('{count}', String(mergeCount)) ||
                 `Will merge ${mergeCount} entities`}
              </span>
            )}
            {deleteCount > 0 && (
              <span className="text-yellow-600">
                {t.relationship.dedup?.willDelete?.replace('{count}', String(deleteCount)) ||
                 `Will delete ${deleteCount} entities`}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              disabled={isApplying}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 disabled:opacity-50"
            >
              {t.common.cancel}
            </button>
            <button
              onClick={handleApply}
              disabled={isApplying || selectedCount === 0}
              className="px-4 py-2 text-sm font-medium text-white bg-rose-600 hover:bg-rose-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isApplying ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {t.relationship.dedup?.applying || 'Applying...'}
                </>
              ) : (
                <>
                  <CheckIcon />
                  {t.relationship.dedup?.applySelected || 'Apply Selected'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
