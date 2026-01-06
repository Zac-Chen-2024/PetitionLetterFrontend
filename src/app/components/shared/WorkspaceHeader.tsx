'use client';

import LayoutSwitcher, { type LayoutMode } from './LayoutSwitcher';

interface WorkspaceHeaderProps {
  projectName: string;
  projectId: string;
  beneficiaryName: string;
  onBeneficiaryChange: (name: string) => void;
  onBeneficiarySave: () => void;
  isSaving?: boolean;
  layoutMode: LayoutMode;
  onLayoutChange: (mode: LayoutMode) => void;
  onBack?: () => void;
}

export default function WorkspaceHeader({
  projectName,
  projectId,
  beneficiaryName,
  onBeneficiaryChange,
  onBeneficiarySave,
  isSaving = false,
  layoutMode,
  onLayoutChange,
  onBack,
}: WorkspaceHeaderProps) {
  return (
    <header className="bg-[var(--color-surface)] border-b border-[var(--color-border)] h-16">
      <div className="h-full max-w-7xl mx-auto px-6 flex items-center justify-between">
        {/* Left: Back + Title */}
        <div className="flex items-center gap-4">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-gray-100 rounded-lg transition-colors"
              title="Back to Projects"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
          )}
          <div>
            <h1 className="text-lg font-semibold text-[var(--color-text)]">{projectName}</h1>
            <p className="text-xs text-[var(--color-text-secondary)]">L-1 Evidence Builder</p>
          </div>
        </div>

        {/* Center: Beneficiary Name */}
        <div className="flex items-center gap-3">
          <label className="text-sm text-[var(--color-text-secondary)]">Beneficiary:</label>
          <div className="relative">
            <input
              type="text"
              value={beneficiaryName}
              onChange={(e) => onBeneficiaryChange(e.target.value)}
              onBlur={onBeneficiarySave}
              onKeyDown={(e) => e.key === 'Enter' && onBeneficiarySave()}
              placeholder="Enter name"
              className="w-48 px-3 py-1.5 text-sm border border-[var(--color-border)] rounded-lg text-[var(--color-text)] bg-[var(--color-surface)] placeholder:text-gray-400 focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all"
            />
            {isSaving && (
              <div className="absolute right-2 top-1/2 -translate-y-1/2">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-[var(--color-primary)] border-t-transparent"></div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Layout Switcher + Project ID */}
        <div className="flex items-center gap-4">
          <LayoutSwitcher current={layoutMode} onChange={onLayoutChange} />
          <span className="text-xs text-[var(--color-text-secondary)] font-mono bg-gray-50 px-2 py-1 rounded">
            {projectId.slice(0, 8)}
          </span>
        </div>
      </div>
    </header>
  );
}
