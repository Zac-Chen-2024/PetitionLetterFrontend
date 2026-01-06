'use client';

import { useState, useCallback, useEffect } from 'react';
import type { Quote, Citation, ParagraphVersion } from '@/types';
import { SECTION_TYPES, generateSectionWritingPrompt } from '@/utils/prompts';
import { writingApi } from '@/utils/api';

interface GenerateSectionProps {
  projectId: string;
  quotesByStandard: Record<string, Quote[]>;
  beneficiaryName: string;
  petitionerName: string;
  foreignEntityName: string;
  onPetitionerChange: (name: string) => void;
  onForeignEntityChange: (name: string) => void;
  onEntitySave: () => void;
  onViewQuote?: (quote: Quote) => void;
}

type TabType = 'manual' | 'auto';

function getAllQuotes(quotesByStandard: Record<string, Quote[]>): Quote[] {
  return Object.values(quotesByStandard).flat();
}

function formatQuotesForPrompt(quotes: Quote[]): string {
  const formatted = quotes.map(q => ({
    quote: q.quote,
    relevance: q.relevance,
    l1_standard: q.standard_en || q.standard || 'unknown',
    source: { exhibit_id: q.source.exhibit_id, file_name: q.source.file_name },
  }));
  return JSON.stringify(formatted, null, 2);
}

export default function GenerateSection({
  projectId,
  quotesByStandard,
  beneficiaryName,
  petitionerName,
  foreignEntityName,
  onPetitionerChange,
  onForeignEntityChange,
  onEntitySave,
}: GenerateSectionProps) {
  const [activeTab, setActiveTab] = useState<TabType>('manual');
  const [selectedSection, setSelectedSection] = useState(SECTION_TYPES[0].key);
  const [versionsBySection, setVersionsBySection] = useState<Record<string, ParagraphVersion[]>>({});
  const [currentVersionIdBySection, setCurrentVersionIdBySection] = useState<Record<string, string | null>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [pastedResult, setPastedResult] = useState('');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  const versions = versionsBySection[selectedSection] || [];
  const currentVersionId = currentVersionIdBySection[selectedSection] || null;
  const currentVersion = versions.find(v => v.id === currentVersionId);

  const allQuotes = getAllQuotes(quotesByStandard);
  const totalQuotes = allQuotes.length;

  useEffect(() => {
    loadSavedWriting();
  }, [projectId]);

  const loadSavedWriting = async () => {
    try {
      setIsLoading(true);
      const result = await writingApi.getAllWriting(projectId);
      if (result?.sections) {
        const newVersionsBySection: Record<string, ParagraphVersion[]> = {};
        const newCurrentVersionIdBySection: Record<string, string | null> = {};

        for (const [sectionKey, data] of Object.entries(result.sections)) {
          const sectionData = data as { text: string; citations: Citation[]; timestamp: string; version_id: string };
          const version: ParagraphVersion = {
            id: sectionData.version_id || `saved-${sectionKey}`,
            version: 1,
            text: sectionData.text,
            citations: sectionData.citations || [],
            created_at: sectionData.timestamp || new Date().toISOString(),
          };
          newVersionsBySection[sectionKey] = [version];
          newCurrentVersionIdBySection[sectionKey] = version.id;
        }

        setVersionsBySection(newVersionsBySection);
        setCurrentVersionIdBySection(newCurrentVersionIdBySection);
      }
    } catch {
      console.log('No saved writing yet');
    } finally {
      setIsLoading(false);
    }
  };

  const getCombinedPrompt = useCallback(() => {
    const evidence = formatQuotesForPrompt(allQuotes);
    return generateSectionWritingPrompt(selectedSection, evidence, {
      petitionerName,
      foreignEntityName,
      beneficiaryName,
    });
  }, [selectedSection, beneficiaryName, petitionerName, foreignEntityName, allQuotes]);

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  const validateJSON = (jsonStr: string) => {
    if (!jsonStr.trim()) {
      setJsonError(null);
      return;
    }

    try {
      const parsed = JSON.parse(jsonStr);
      if (parsed.paragraph_text && parsed.citations_used) {
        setJsonError(null);
      } else {
        setJsonError('Invalid format: expected { paragraph_text, citations_used }');
      }
    } catch (e) {
      setJsonError(`JSON Parse Error: ${(e as Error).message}`);
    }
  };

  const handlePasteChange = (value: string) => {
    setPastedResult(value);
    validateJSON(value);
  };

  const addVersionToSection = (newVersion: ParagraphVersion) => {
    setVersionsBySection(prev => ({
      ...prev,
      [selectedSection]: [...(prev[selectedSection] || []), newVersion],
    }));
    setCurrentVersionIdBySection(prev => ({
      ...prev,
      [selectedSection]: newVersion.id,
    }));
  };

  const handleSaveManual = async () => {
    if (!pastedResult.trim() || jsonError || isSaving) return;

    try {
      setIsSaving(true);
      const parsed = JSON.parse(pastedResult);

      const result = await writingApi.saveManual(
        projectId,
        selectedSection,
        parsed.paragraph_text,
        parsed.citations_used || []
      );

      if (result.success) {
        const newVersion: ParagraphVersion = {
          id: `v${Date.now()}`,
          version: versions.length + 1,
          text: parsed.paragraph_text,
          citations: parsed.citations_used || [],
          created_at: new Date().toISOString(),
        };
        addVersionToSection(newVersion);
        setPastedResult('');
      }
    } catch (e) {
      setJsonError(`Failed to save: ${(e as Error).message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAutoGenerate = async () => {
    try {
      setIsGenerating(true);
      const result = await writingApi.generateParagraph(projectId, selectedSection, beneficiaryName || undefined);

      if (result.success) {
        const newVersion: ParagraphVersion = {
          id: `v${Date.now()}`,
          version: versions.length + 1,
          text: result.paragraph.text,
          citations: result.paragraph.citations,
          created_at: new Date().toISOString(),
        };
        addVersionToSection(newVersion);
      }
    } catch (error) {
      console.error('Generate failed:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const renderParagraphWithCitations = (text: string) => {
    const regex = /\[Exhibit ([A-Z]-\d+)(?::\s*([^\]]+))?\]/g;
    const parts: (string | React.ReactElement)[] = [];
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.slice(lastIndex, match.index));
      }

      const exhibitId = match[1];
      const title = match[2];
      const citation = currentVersion?.citations.find(c => c.exhibit === exhibitId);

      parts.push(
        <span key={match.index} className="relative group inline-block">
          <span className="text-[var(--color-primary)] cursor-pointer hover:bg-blue-50 px-0.5 rounded font-medium">
            [Exhibit {exhibitId}{title ? `: ${title}` : ''}]
          </span>
          {citation && (
            <div className="absolute z-50 bottom-full left-0 mb-2 w-72 bg-[var(--color-surface)] rounded-xl shadow-xl border border-[var(--color-border)] p-4 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 pointer-events-none">
              <div className="absolute -bottom-2 left-4 w-4 h-4 bg-[var(--color-surface)] border-r border-b border-[var(--color-border)] transform rotate-45"></div>
              <div className="relative">
                <div className="font-medium text-sm text-[var(--color-text)] mb-1">Exhibit {exhibitId}</div>
                <div className="text-xs text-[var(--color-text-secondary)] mb-2">{citation.file_name}</div>
                <div className="text-xs text-[var(--color-text)] italic line-clamp-3">&quot;{citation.quote}&quot;</div>
              </div>
            </div>
          )}
        </span>
      );

      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex));
    }

    return parts;
  };

  if (isLoading) {
    return (
      <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-12 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-[var(--color-primary)] border-t-transparent"></div>
        <span className="ml-3 text-[var(--color-text-secondary)]">Loading...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Config Card */}
      <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-5 space-y-4">
        <div className="flex items-center gap-4">
          <label className="text-sm text-[var(--color-text-secondary)] font-medium">Section:</label>
          <select
            value={selectedSection}
            onChange={(e) => setSelectedSection(e.target.value)}
            className="flex-1 max-w-md px-3 py-2 text-sm border border-[var(--color-border)] rounded-lg text-[var(--color-text)] bg-[var(--color-surface)] focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
          >
            {SECTION_TYPES.map(s => (
              <option key={s.key} value={s.key}>{s.label}</option>
            ))}
          </select>
          <span className="text-sm text-[var(--color-text-secondary)]">{totalQuotes} quotes available</span>
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <label className="text-sm text-[var(--color-text-secondary)]">Petitioner (US):</label>
            <input
              type="text"
              value={petitionerName}
              onChange={(e) => onPetitionerChange(e.target.value)}
              onBlur={onEntitySave}
              placeholder="e.g., ABC Corp."
              className="w-40 px-3 py-1.5 text-sm border border-[var(--color-border)] rounded-lg text-[var(--color-text)] bg-[var(--color-surface)] placeholder:text-gray-400 focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-[var(--color-text-secondary)]">Foreign Entity:</label>
            <input
              type="text"
              value={foreignEntityName}
              onChange={(e) => onForeignEntityChange(e.target.value)}
              onBlur={onEntitySave}
              placeholder="e.g., XYZ Ltd."
              className="w-40 px-3 py-1.5 text-sm border border-[var(--color-border)] rounded-lg text-[var(--color-text)] bg-[var(--color-surface)] placeholder:text-gray-400 focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
            />
          </div>
          {beneficiaryName && (
            <span className="text-sm text-[var(--color-text-secondary)]">
              Beneficiary: <strong className="text-[var(--color-text)]">{beneficiaryName}</strong>
            </span>
          )}
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab('manual')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
            activeTab === 'manual'
              ? 'bg-[var(--color-surface)] text-[var(--color-text)] shadow-sm'
              : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
          }`}
        >
          Manual (Copy & Paste)
        </button>
        <button
          onClick={() => setActiveTab('auto')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
            activeTab === 'auto'
              ? 'bg-[var(--color-surface)] text-[var(--color-text)] shadow-sm'
              : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
          }`}
        >
          Auto Generate
        </button>
      </div>

      {/* Manual Mode */}
      {activeTab === 'manual' && (
        <div className="space-y-6">
          <div className="bg-[var(--color-surface)] rounded-xl border-2 border-[var(--color-success)] p-5">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-[var(--color-text)] mb-1">Step 1: Copy to LLM</h4>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  Copy prompt + evidence for &quot;{SECTION_TYPES.find(s => s.key === selectedSection)?.label}&quot;. Paste into ChatGPT/Claude.
                </p>
              </div>
              <button
                onClick={() => copyToClipboard(getCombinedPrompt())}
                disabled={totalQuotes === 0}
                className="px-5 py-2.5 bg-[var(--color-success)] text-white rounded-lg font-medium hover:bg-emerald-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {copiedPrompt ? (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Copied!
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Copy Prompt
                  </>
                )}
              </button>
            </div>
            <div className="mt-3 flex items-center gap-3 text-xs text-[var(--color-text-secondary)]">
              <span className="px-2 py-1 bg-gray-100 rounded">{totalQuotes} quotes</span>
              <span className="px-2 py-1 bg-gray-100 rounded">~{Math.round(getCombinedPrompt().length / 4)} tokens</span>
            </div>
          </div>

          <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] overflow-hidden">
            <div className="px-5 py-3 bg-gray-50 border-b border-[var(--color-border)] flex items-center justify-between">
              <span className="font-semibold text-[var(--color-text)]">Step 2: Paste LLM Result</span>
              {jsonError ? (
                <span className="text-sm text-[var(--color-error)]">{jsonError}</span>
              ) : pastedResult.trim() ? (
                <span className="text-sm text-[var(--color-success)]">Valid JSON</span>
              ) : null}
            </div>
            <div className="p-5">
              <textarea
                value={pastedResult}
                onChange={(e) => handlePasteChange(e.target.value)}
                placeholder={`Paste the JSON result from LLM here...\n\n{\n  "paragraph_text": "...",\n  "citations_used": [...]\n}`}
                className="w-full h-40 p-4 text-sm font-mono border border-[var(--color-border)] rounded-lg resize-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent text-[var(--color-text)] placeholder:text-gray-400"
              />
              <div className="flex justify-end mt-4">
                <button
                  onClick={handleSaveManual}
                  disabled={!pastedResult.trim() || !!jsonError || isSaving}
                  className="px-5 py-2 bg-[var(--color-primary)] text-white rounded-lg font-medium hover:bg-[var(--color-primary-hover)] disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  {isSaving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      Saving...
                    </>
                  ) : (
                    'Save Paragraph'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Auto Mode */}
      {activeTab === 'auto' && (
        <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-5">
          <p className="text-sm text-[var(--color-text-secondary)] mb-4">
            Automatically generate paragraph using LLM API. The AI will select relevant quotes from all {totalQuotes} available quotes.
          </p>
          <button
            onClick={handleAutoGenerate}
            disabled={isGenerating || totalQuotes === 0}
            className="px-5 py-2.5 bg-[var(--color-primary)] text-white rounded-lg font-medium hover:bg-[var(--color-primary-hover)] disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {isGenerating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                Generating...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Generate Paragraph
              </>
            )}
          </button>
        </div>
      )}

      {/* Generated Paragraph Display */}
      {currentVersion && (
        <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] overflow-hidden">
          <div className="px-5 py-3 bg-gray-50 border-b border-[var(--color-border)] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="font-semibold text-[var(--color-text)]">Generated Paragraph</span>
              <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded">v{currentVersion.version}</span>
            </div>
            <button
              onClick={async () => { await navigator.clipboard.writeText(currentVersion.text); }}
              className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text)] flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copy
            </button>
          </div>
          <div className="p-5">
            <div className="text-sm text-[var(--color-text)] leading-relaxed whitespace-pre-wrap">
              {renderParagraphWithCitations(currentVersion.text)}
            </div>
          </div>
          {currentVersion.citations.length > 0 && (
            <div className="px-5 py-4 bg-gray-50 border-t border-[var(--color-border)]">
              <h4 className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-3">
                Citations ({currentVersion.citations.length})
              </h4>
              <div className="space-y-2">
                {currentVersion.citations.map((citation, idx) => (
                  <div key={idx} className="text-xs bg-[var(--color-surface)] rounded-lg p-3 border border-[var(--color-border)]">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-[var(--color-primary)]">[Exhibit {citation.exhibit}]</span>
                      <span className="text-[var(--color-text-secondary)]">{citation.file_name}</span>
                    </div>
                    <div className="text-[var(--color-text-secondary)] italic line-clamp-2">&quot;{citation.quote}&quot;</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {!currentVersion && (
        <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-[var(--color-text-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-[var(--color-text)] mb-2">No Paragraph Yet</h3>
          <p className="text-[var(--color-text-secondary)]">
            Use Manual mode to copy prompt to ChatGPT, or Auto mode to generate directly.
          </p>
        </div>
      )}
    </div>
  );
}
