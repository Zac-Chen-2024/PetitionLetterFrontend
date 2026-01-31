'use client';

import { useState, useEffect, useCallback } from 'react';
import { analysisApi, L1ProgressResponse } from '@/utils/api';
import { useSSE } from '@/hooks/useSSE';
import type { L1Summary, Quote, L1StandardKey } from '@/types';
import { L1_STANDARDS } from '@/types';
import { useLanguage } from '@/i18n/LanguageContext';

// Types
type ModuleStatus = 'idle' | 'processing' | 'completed' | 'error';

interface L1AnalysisModuleProps {
  projectId: string | null;
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
}

// Icons
const AnalysisIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
  </svg>
);

const PlayIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const ChevronDownIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);

const ChevronUpIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
  </svg>
);

// Status badge component
const StatusBadge = ({ status, t }: { status: ModuleStatus; t: ReturnType<typeof useLanguage>['t'] }) => {
  const config = {
    idle: { bg: 'bg-gray-100', text: 'text-gray-600', label: t.l1Analysis.status.idle },
    processing: { bg: 'bg-indigo-100', text: 'text-indigo-700', label: t.l1Analysis.status.processing },
    completed: { bg: 'bg-green-100', text: 'text-green-700', label: t.l1Analysis.status.completed },
    error: { bg: 'bg-red-100', text: 'text-red-700', label: t.l1Analysis.status.error },
  };
  const { bg, text, label } = config[status];
  return (
    <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${bg} ${text}`}>
      {label}
    </span>
  );
};

// Quote card component
const QuoteCard = ({ quote, index, t }: { quote: Quote; index: number; t: ReturnType<typeof useLanguage>['t'] }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-gray-200 rounded-lg p-3 hover:border-indigo-200 transition-colors">
      <div className="flex items-start gap-2">
        <span className="text-xs text-gray-400 mt-0.5">#{index + 1}</span>
        <div className="flex-1 min-w-0">
          <p className={`text-sm text-gray-700 ${expanded ? '' : 'line-clamp-2'}`}>
            "{quote.quote}"
          </p>
          {quote.quote.length > 100 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-xs text-indigo-600 hover:text-indigo-800 mt-1"
            >
              {expanded ? t.common.collapse : t.common.expand}
            </button>
          )}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className="px-2 py-0.5 text-xs rounded bg-gray-100 text-gray-600">
              {quote.source?.exhibit_id || 'N/A'}
            </span>
            {quote.page && (
              <span className="text-xs text-gray-500">P.{quote.page}</span>
            )}
          </div>
          {quote.relevance && (
            <p className="text-xs text-gray-500 mt-1 italic">
              {t.l1Analysis.relevance}: {quote.relevance}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

// Standard section component
const StandardSection = ({
  standardKey,
  quotes,
  defaultExpanded = false,
  t,
}: {
  standardKey: L1StandardKey;
  quotes: Quote[];
  defaultExpanded?: boolean;
  t: ReturnType<typeof useLanguage>['t'];
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const standard = L1_STANDARDS[standardKey];

  if (!standard) return null;

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 flex items-center justify-between transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="px-2 py-1 text-xs font-medium rounded bg-indigo-100 text-indigo-700">
            {quotes.length}
          </span>
          <div className="text-left">
            <p className="text-sm font-medium text-gray-900">{standard.chinese}</p>
            <p className="text-xs text-gray-500">{standard.english}</p>
          </div>
        </div>
        {expanded ? <ChevronUpIcon /> : <ChevronDownIcon />}
      </button>
      {expanded && (
        <div className="p-4 space-y-3 bg-white">
          {quotes.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">{t.l1Analysis.noRelatedQuotes}</p>
          ) : (
            quotes.map((quote, idx) => (
              <QuoteCard key={idx} quote={quote} index={idx} t={t} />
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default function L1AnalysisModule({
  projectId,
  onSuccess,
  onError,
}: L1AnalysisModuleProps) {
  const { t } = useLanguage();
  const [status, setStatus] = useState<ModuleStatus>('idle');
  const [summary, setSummary] = useState<L1Summary | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<L1ProgressResponse | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  // SSE URL for progress monitoring
  const sseUrl = projectId ? analysisApi.getStreamUrl(projectId) : null;

  // SSE handlers
  const handleSSEProgress = useCallback((data: L1ProgressResponse) => {
    setProgress(data);
    if (data.status === 'processing') {
      setStatus('processing');
    }
  }, []);

  const handleSSEComplete = useCallback(async (data: L1ProgressResponse) => {
    setProgress(data);

    if (data.status === 'completed' && projectId) {
      try {
        // Generate and load summary
        await analysisApi.generateSummary(projectId);
        const summaryResult = await analysisApi.getSummary(projectId);
        setSummary(summaryResult);
        setStatus('completed');
        onSuccess?.(`L-1 ${t.l1Analysis.status.completed}: ${data.completed} ${t.l1Analysis.documents}, ${t.l1Analysis.foundQuotes} ${data.total_quotes_found} ${t.l1Analysis.quotes}`);
      } catch (err) {
        console.error('Failed to generate summary:', err);
        setStatus('completed'); // Still mark as completed, summary might be available
      }
    }
  }, [projectId, onSuccess]);

  const handleSSEError = useCallback(() => {
    // SSE connection error - might reconnect automatically
    console.warn('L1 SSE connection error');
  }, []);

  // SSE hook
  const { isConnected, connect, disconnect } = useSSE<L1ProgressResponse>({
    url: sseUrl,
    onMessage: handleSSEProgress,
    onComplete: handleSSEComplete,
    onError: handleSSEError,
    autoConnect: false,
  });

  // Load existing analysis on mount
  useEffect(() => {
    if (projectId) {
      loadExistingAnalysis();
    } else {
      setSummary(null);
      setStatus('idle');
      setProgress(null);
    }

    return () => {
      disconnect();
    };
  }, [projectId, disconnect]);

  const loadExistingAnalysis = async () => {
    if (!projectId) return;

    try {
      setLoading(true);
      const statusResult = await analysisApi.getStatus(projectId);

      if (statusResult.has_summary && statusResult.summary_quotes > 0) {
        const summaryResult = await analysisApi.getSummary(projectId);
        setSummary(summaryResult);
        setStatus('completed');
      } else {
        setSummary(null);
        setStatus('idle');
      }
    } catch (err) {
      console.error('Failed to load existing analysis:', err);
      // Not an error - just no existing analysis
      setSummary(null);
      setStatus('idle');
    } finally {
      setLoading(false);
    }
  };

  const handleStartAnalysis = async () => {
    if (!projectId) return;

    try {
      setStatus('processing');
      setProgress(null);

      // Trigger analysis (now returns immediately)
      const result = await analysisApi.analyzeDocuments(projectId);

      if (result.success) {
        // Connect to SSE for progress updates
        connect();
      } else {
        throw new Error('Failed to start analysis');
      }
    } catch (err) {
      console.error('L-1 analysis failed:', err);
      const errorMsg = err instanceof Error && err.message.includes('fetch')
        ? t.backend.cannotConnect
        : t.l1Analysis.analysisFailed;
      onError?.(errorMsg);
      setStatus('error');
    }
  };

  // Get total quote count
  const totalQuotes = summary?.total_quotes || 0;

  // Get quotes organized by standard
  const getQuotesByStandard = (standardKey: L1StandardKey): Quote[] => {
    if (!summary?.by_standard) return [];
    return summary.by_standard[standardKey] || [];
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div
        className="px-5 py-4 border-b border-gray-100 bg-gray-50/50 cursor-pointer hover:bg-gray-100/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600">
              <AnalysisIcon />
            </div>
            <h3 className="text-base font-semibold text-gray-900">{t.l1Analysis.title}</h3>
            {totalQuotes > 0 && (
              <span className="text-xs text-gray-500">
                {totalQuotes} {t.l1Analysis.quotes}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleStartAnalysis();
              }}
              disabled={!projectId || status === 'processing'}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {status === 'processing' ? (
                <>
                  <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {t.l1Analysis.analyzing}
                </>
              ) : (
                <>
                  <PlayIcon />
                  {status === 'completed' ? t.l1Analysis.reanalyze : t.l1Analysis.startAnalysis}
                </>
              )}
            </button>
            <StatusBadge status={status} t={t} />
            <div className="ml-2 text-gray-400">
              {isExpanded ? <ChevronUpIcon /> : <ChevronDownIcon />}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      {isExpanded && (
      <div className="p-4">
        {!projectId ? (
          <div className="text-center py-8 text-gray-400">
            <AnalysisIcon />
            <p className="mt-2 text-sm">{t.l1Analysis.selectProject}</p>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <span className="ml-2 text-sm text-gray-500">{t.common.loading}</span>
          </div>
        ) : status === 'processing' ? (
          <div className="py-6">
            {/* Progress bar */}
            <div className="mb-4">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">
                  {t.l1Analysis.progress}: {progress?.completed || 0}/{progress?.total || 0} {t.l1Analysis.documents}
                </span>
                <span className="text-indigo-600 font-medium">
                  {progress?.progress_percent || 0}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress?.progress_percent || 0}%` }}
                />
              </div>
            </div>

            {/* Current document */}
            {progress?.current_doc && (
              <div className="bg-indigo-50 rounded-lg p-3 mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm text-indigo-700">
                    {t.l1Analysis.currentlyAnalyzing}: {progress.current_doc.exhibit_id} - {progress.current_doc.file_name}
                  </span>
                </div>
              </div>
            )}

            {/* Stats so far */}
            {progress && progress.total_quotes_found > 0 && (
              <div className="text-center text-sm text-gray-500">
                {t.l1Analysis.foundQuotes} {progress.total_quotes_found} {t.l1Analysis.quotes}
              </div>
            )}

            {/* Errors */}
            {progress?.errors && progress.errors.length > 0 && (
              <div className="mt-3 text-sm text-red-600">
                {progress.errors.length} {t.l1Analysis.docsFailed}
              </div>
            )}
          </div>
        ) : status === 'idle' ? (
          <div className="text-center py-8 text-gray-400">
            <svg className="w-12 h-12 mx-auto text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="mt-3 text-sm">{t.l1Analysis.clickToStart}</p>
            <p className="mt-1 text-xs">{t.l1Analysis.autoExtract}</p>
          </div>
        ) : status === 'error' ? (
          <div className="text-center py-8 text-red-400">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="mt-3 text-sm">{t.l1Analysis.retryMessage}</p>
          </div>
        ) : summary && totalQuotes > 0 ? (
          <div className="space-y-3">
            {/* Summary stats */}
            <div className="grid grid-cols-4 gap-3 mb-4">
              {(Object.keys(L1_STANDARDS) as L1StandardKey[]).map((key) => {
                const count = getQuotesByStandard(key).length;
                const standard = L1_STANDARDS[key];
                return (
                  <div key={key} className="bg-gray-50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-indigo-600">{count}</p>
                    <p className="text-xs text-gray-500 truncate" title={standard.chinese}>
                      {standard.chinese}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Standard sections */}
            <div className="space-y-3">
              {(Object.keys(L1_STANDARDS) as L1StandardKey[]).map((key, idx) => (
                <StandardSection
                  key={key}
                  standardKey={key}
                  quotes={getQuotesByStandard(key)}
                  defaultExpanded={idx === 0}
                  t={t}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-400">
            <p className="text-sm">{t.l1Analysis.noQuotes}</p>
          </div>
        )}
      </div>
      )}
    </div>
  );
}
