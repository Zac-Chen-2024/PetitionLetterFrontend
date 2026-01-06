'use client';

import { ReactNode, useState } from 'react';

interface SidebarLayoutProps {
  header: ReactNode;
  documents: ReactNode;
  highlight: ReactNode;
  analysis: ReactNode;
  generate: ReactNode;
}

type Section = 'documents' | 'highlight' | 'analysis' | 'generate';

const NAV_ITEMS: { key: Section; label: string; icon: ReactNode }[] = [
  {
    key: 'documents',
    label: 'Documents',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
      </svg>
    ),
  },
  {
    key: 'highlight',
    label: 'Highlights',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
      </svg>
    ),
  },
  {
    key: 'analysis',
    label: 'Analysis',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    key: 'generate',
    label: 'Generate',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    ),
  },
];

export default function SidebarLayout({
  header,
  documents,
  highlight,
  analysis,
  generate,
}: SidebarLayoutProps) {
  const [activeSection, setActiveSection] = useState<Section>('documents');

  const renderContent = () => {
    switch (activeSection) {
      case 'documents':
        return documents;
      case 'highlight':
        return highlight;
      case 'analysis':
        return analysis;
      case 'generate':
        return generate;
    }
  };

  const getProgressWidth = () => {
    switch (activeSection) {
      case 'documents': return '0%';
      case 'highlight': return '33%';
      case 'analysis': return '66%';
      case 'generate': return '100%';
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      {/* Header */}
      <div className="sticky top-0 z-50">
        {header}
      </div>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 min-h-[calc(100vh-64px)] bg-[var(--color-surface)] border-r border-[var(--color-border)] sticky top-16 self-start">
          <nav className="p-4 space-y-1">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.key}
                onClick={() => setActiveSection(item.key)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all ${
                  activeSection === item.key
                    ? 'bg-blue-50 text-[var(--color-primary)]'
                    : 'text-[var(--color-text-secondary)] hover:bg-gray-50 hover:text-[var(--color-text)]'
                }`}
              >
                {item.icon}
                <span className="font-medium">{item.label}</span>
                {activeSection === item.key && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[var(--color-primary)]"></div>
                )}
              </button>
            ))}
          </nav>

          {/* Progress indicator */}
          <div className="p-4 border-t border-[var(--color-border)] mt-4">
            <div className="text-xs text-[var(--color-text-secondary)] mb-2">Progress</div>
            <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-[var(--color-primary)] transition-all duration-300"
                style={{ width: getProgressWidth() }}
              ></div>
            </div>
            <div className="flex justify-between mt-2">
              {['1', '2', '3', '4'].map((num, i) => (
                <div
                  key={num}
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                    i <= NAV_ITEMS.findIndex(item => item.key === activeSection)
                      ? 'bg-[var(--color-primary)] text-white'
                      : 'bg-gray-200 text-[var(--color-text-secondary)]'
                  }`}
                >
                  {num}
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-8">
          <div className="max-w-5xl mx-auto">
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
}
