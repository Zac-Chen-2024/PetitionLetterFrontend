'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  L1StandardKey,
  EnhancedCitation,
  DialogMessage,
  TextSelection,
  DialogLayoutMode,
  SelectionEditMode,
} from '@/types';
import { writingApi, analysisApi, citationApi } from '@/utils/api';
import { useLanguage } from '@/i18n/LanguageContext';
import SectionTabs from './SectionTabs';
import WritingEditor from './WritingEditor';
import DialogPanel from './DialogPanel';
import HistoryDrawer from './HistoryDrawer';

// ============================================================================
// TYPES
// ============================================================================
interface WritingModuleProps {
  projectId: string;
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
  modelsReady?: boolean;
}

type SectionStatus = 'empty' | 'draft' | 'complete';

interface SectionData {
  content: string;
  citations: EnhancedCitation[];
  status: SectionStatus;
}

// ============================================================================
// ICONS
// ============================================================================
const Icons = {
  Edit: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  ),
  Layout: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
    </svg>
  ),
  Save: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
    </svg>
  ),
  Generate: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  ),
  Settings: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export default function WritingModule({
  projectId,
  onSuccess,
  onError,
  modelsReady = true,
}: WritingModuleProps) {
  const { t } = useLanguage();

  // Section state
  const [activeSection, setActiveSection] = useState<L1StandardKey>('qualifying_relationship');
  const [sectionData, setSectionData] = useState<Record<L1StandardKey, SectionData>>({
    qualifying_relationship: { content: '', citations: [], status: 'empty' },
    qualifying_employment: { content: '', citations: [], status: 'empty' },
    qualifying_capacity: { content: '', citations: [], status: 'empty' },
    doing_business: { content: '', citations: [], status: 'empty' },
  });

  // Dialog state
  const [dialogHistory, setDialogHistory] = useState<DialogMessage[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [currentSelection, setCurrentSelection] = useState<TextSelection | null>(null);

  // Layout mode state
  const [dialogLayoutMode, setDialogLayoutMode] = useState<DialogLayoutMode>('bottom');
  const [selectionEditMode, setSelectionEditMode] = useState<SelectionEditMode>('bubble');
  const [showModeSettings, setShowModeSettings] = useState(false);

  // Processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Citation index
  const [citationIndex, setCitationIndex] = useState<Record<string, EnhancedCitation>>({});

  // ============================================================================
  // DATA LOADING
  // ============================================================================
  useEffect(() => {
    loadExistingWriting();
    loadCitationIndex();
  }, [projectId]);

  const loadExistingWriting = async () => {
    try {
      const result = await writingApi.getAllWriting(projectId);
      if (result.sections) {
        const newSectionData = { ...sectionData };
        Object.entries(result.sections).forEach(([section, data]) => {
          if (section in newSectionData) {
            const key = section as L1StandardKey;
            newSectionData[key] = {
              content: data.text,
              citations: data.citations.map((c) => ({
                ...c,
                document_id: '',
                page_number: 1,
              })),
              status: data.text ? 'draft' : 'empty',
            };
          }
        });
        setSectionData(newSectionData);
      }
    } catch (err) {
      console.error('Failed to load existing writing:', err);
    }
  };

  const loadCitationIndex = async () => {
    try {
      const result = await citationApi.getIndex(projectId);
      const index: Record<string, EnhancedCitation> = {};
      Object.entries(result.citations).forEach(([exhibit, data]) => {
        if (data.quotes && data.quotes.length > 0) {
          const quote = data.quotes[0];
          index[exhibit] = {
            exhibit,
            file_name: data.file_name,
            quote: quote.text,
            claim: '',
            document_id: data.document_id,
            page_number: quote.page,
            bbox: quote.bbox,
          };
        }
      });
      setCitationIndex(index);
    } catch (err) {
      console.error('Failed to load citation index:', err);
    }
  };

  // ============================================================================
  // CONTENT HANDLERS
  // ============================================================================
  const handleContentChange = useCallback(
    (content: string) => {
      setSectionData((prev) => ({
        ...prev,
        [activeSection]: {
          ...prev[activeSection],
          content,
          status: content ? 'draft' : 'empty',
        },
      }));
    },
    [activeSection]
  );

  const handleSelectionChange = useCallback((selection: TextSelection | null) => {
    setCurrentSelection(selection);
  }, []);

  const handleEditSelection = useCallback(() => {
    // In bubble mode, switch to panel mode temporarily to show the dialog
    if (selectionEditMode === 'bubble') {
      // Focus on the dialog panel
      setDialogLayoutMode('right');
    }
  }, [selectionEditMode]);

  // ============================================================================
  // DIALOG HANDLERS
  // ============================================================================
  const handleSendInstruction = async (instruction: string, selection: TextSelection | null) => {
    if (!instruction.trim()) return;

    setIsProcessing(true);

    // Add user message to history
    const userMessage: DialogMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: instruction,
      selection: selection || undefined,
      timestamp: new Date().toISOString(),
    };
    setDialogHistory((prev) => [...prev, userMessage]);

    try {
      const currentContent = sectionData[activeSection].content;
      const result = await writingApi.revise(
        projectId,
        activeSection,
        currentContent,
        instruction,
        selection || undefined
      );

      // Update content
      handleContentChange(result.revised_content);

      // Add assistant message
      const assistantMessage: DialogMessage = {
        id: `msg-${Date.now()}-response`,
        role: 'assistant',
        content: result.changes_made || 'Changes applied successfully.',
        timestamp: new Date().toISOString(),
      };
      setDialogHistory((prev) => [...prev, assistantMessage]);

      // Clear selection
      setCurrentSelection(null);
      window.getSelection()?.removeAllRanges();

      onSuccess?.(t.writing.contentUpdated);
    } catch (err) {
      console.error('Failed to apply changes:', err);
      onError?.(t.writing.applyFailed);

      // Add error message
      const errorMessage: DialogMessage = {
        id: `msg-${Date.now()}-error`,
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date().toISOString(),
      };
      setDialogHistory((prev) => [...prev, errorMessage]);
    } finally {
      setIsProcessing(false);
    }
  };

  // ============================================================================
  // GENERATE & SAVE
  // ============================================================================
  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const result = await writingApi.generateParagraph(projectId, activeSection);
      if (result.paragraph) {
        handleContentChange(result.paragraph.text);

        // Update citations
        const newCitations = result.paragraph.citations.map((c) => {
          const indexed = citationIndex[c.exhibit];
          return {
            ...c,
            document_id: indexed?.document_id || '',
            page_number: indexed?.page_number || 1,
            bbox: indexed?.bbox,
          };
        });

        setSectionData((prev) => ({
          ...prev,
          [activeSection]: {
            ...prev[activeSection],
            citations: newCitations,
          },
        }));

        onSuccess?.(t.writing.paragraphGenerated);
      }
    } catch (err) {
      console.error('Failed to generate paragraph:', err);
      onError?.(t.writing.generateFailed);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const data = sectionData[activeSection];
      await writingApi.saveManual(
        projectId,
        activeSection,
        data.content,
        data.citations
      );

      setSectionData((prev) => ({
        ...prev,
        [activeSection]: {
          ...prev[activeSection],
          status: 'complete',
        },
      }));

      onSuccess?.(t.writing.contentSaved);
    } catch (err) {
      console.error('Failed to save:', err);
      onError?.(t.writing.saveFailed);
    } finally {
      setIsSaving(false);
    }
  };

  // ============================================================================
  // RENDER
  // ============================================================================
  const currentData = sectionData[activeSection];
  const sectionStatus = Object.fromEntries(
    Object.entries(sectionData).map(([k, v]) => [k, v.status])
  ) as Record<L1StandardKey, SectionStatus>;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center text-purple-600">
            <Icons.Edit />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{t.writing.title}</h3>
            <p className="text-xs text-gray-500">{t.writing.subtitle}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Mode settings toggle */}
          <button
            onClick={() => setShowModeSettings(!showModeSettings)}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            title={t.writing.dialogPosition}
          >
            <Icons.Settings />
          </button>

          {/* Generate button */}
          <button
            onClick={handleGenerate}
            disabled={isGenerating || !modelsReady}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
          >
            {isGenerating ? (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <Icons.Generate />
            )}
            {t.writing.generate}
          </button>

          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={isSaving || !currentData.content}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            {isSaving ? (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <Icons.Save />
            )}
            {t.writing.save}
          </button>
        </div>
      </div>

      {/* Mode settings panel */}
      {showModeSettings && (
        <div className="px-6 py-3 border-b border-gray-200 bg-gray-50 flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">{t.writing.dialogPosition}:</span>
            <select
              value={dialogLayoutMode}
              onChange={(e) => setDialogLayoutMode(e.target.value as DialogLayoutMode)}
              className="text-sm border border-gray-300 rounded px-2 py-1"
            >
              <option value="bottom">{t.writing.bottom}</option>
              <option value="right">{t.writing.rightPanel}</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">{t.writing.selectionEdit}:</span>
            <select
              value={selectionEditMode}
              onChange={(e) => setSelectionEditMode(e.target.value as SelectionEditMode)}
              className="text-sm border border-gray-300 rounded px-2 py-1"
            >
              <option value="bubble">{t.writing.floatingBubble}</option>
              <option value="panel">{t.writing.sidePanel}</option>
            </select>
          </div>
        </div>
      )}

      {/* Section tabs */}
      <SectionTabs
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        sectionStatus={sectionStatus}
      />

      {/* Main content area */}
      <div className={`flex ${dialogLayoutMode === 'right' ? 'flex-row' : 'flex-col'}`}>
        {/* Editor */}
        <div className="flex-1 min-h-[400px] border-b border-gray-200">
          <WritingEditor
            content={currentData.content}
            onChange={handleContentChange}
            citations={currentData.citations}
            onSelectionChange={handleSelectionChange}
            selectionEditMode={selectionEditMode}
            onEditSelection={handleEditSelection}
          />
        </div>

        {/* Dialog panel */}
        <DialogPanel
          mode={dialogLayoutMode}
          selection={currentSelection}
          onSend={handleSendInstruction}
          onShowHistory={() => setIsHistoryOpen(true)}
          isProcessing={isProcessing}
          recentMessages={dialogHistory.slice(-3)}
        />
      </div>

      {/* History drawer */}
      <HistoryDrawer
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        history={dialogHistory}
      />

      {/* Models not ready warning */}
      {!modelsReady && (
        <div className="px-6 py-3 bg-amber-50 border-t border-amber-200 text-sm text-amber-700">
          {t.writing.modelsLoading}
        </div>
      )}
    </div>
  );
}
