'use client';

import { L1StandardKey, L1_STANDARDS } from '@/types';

interface SectionTabsProps {
  activeSection: L1StandardKey;
  onSectionChange: (section: L1StandardKey) => void;
  sectionStatus?: Record<L1StandardKey, 'empty' | 'draft' | 'complete'>;
}

const SECTION_ORDER: L1StandardKey[] = [
  'qualifying_relationship',
  'qualifying_employment',
  'qualifying_capacity',
  'doing_business',
];

const SECTION_SHORT_NAMES: Record<L1StandardKey, string> = {
  qualifying_relationship: 'Qual. Relationship',
  qualifying_employment: 'Qual. Employment',
  qualifying_capacity: 'Qual. Capacity',
  doing_business: 'Doing Business',
};

const StatusDot = ({ status }: { status: 'empty' | 'draft' | 'complete' }) => {
  const colors = {
    empty: 'bg-gray-300',
    draft: 'bg-yellow-400',
    complete: 'bg-green-500',
  };

  return <span className={`w-2 h-2 rounded-full ${colors[status]}`} />;
};

export default function SectionTabs({
  activeSection,
  onSectionChange,
  sectionStatus = {
    qualifying_relationship: 'empty',
    qualifying_employment: 'empty',
    qualifying_capacity: 'empty',
    doing_business: 'empty',
  },
}: SectionTabsProps) {
  return (
    <div className="flex border-b border-gray-200 bg-white">
      {SECTION_ORDER.map((section) => {
        const isActive = activeSection === section;
        const status = sectionStatus[section];
        const standard = L1_STANDARDS[section];

        return (
          <button
            key={section}
            onClick={() => onSectionChange(section)}
            className={`
              flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors
              border-b-2 -mb-[2px]
              ${
                isActive
                  ? 'border-blue-600 text-blue-600 bg-blue-50'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }
            `}
            title={standard.english}
          >
            <StatusDot status={status} />
            <span className="hidden sm:inline">{SECTION_SHORT_NAMES[section]}</span>
            <span className="sm:hidden">{section.split('_')[1].slice(0, 3)}</span>
          </button>
        );
      })}
    </div>
  );
}
