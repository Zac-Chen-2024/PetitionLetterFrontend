'use client';

import { useLanguage } from '@/i18n/LanguageContext';
import type { Locale } from '@/i18n';

interface LanguageSwitcherProps {
  className?: string;
}

export default function LanguageSwitcher({ className = '' }: LanguageSwitcherProps) {
  const { locale, setLocale } = useLanguage();

  const handleToggle = () => {
    const newLocale: Locale = locale === 'zh' ? 'en' : 'zh';
    setLocale(newLocale);
  };

  return (
    <button
      onClick={handleToggle}
      className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg
        bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors ${className}`}
      title={locale === 'zh' ? 'Switch to English' : '切换到中文'}
    >
      <svg
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"
        />
      </svg>
      <span>{locale === 'zh' ? 'EN' : '中文'}</span>
    </button>
  );
}
