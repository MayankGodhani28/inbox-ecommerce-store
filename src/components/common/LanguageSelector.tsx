import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from '../../context/LanguageContext';
import { Language, AVAILABLE_LANGUAGES } from '../../i18n/types';
import { ChevronDown, Globe } from 'lucide-react';

interface LanguageSelectorProps {
  variant?: 'segmented' | 'dropdown' | 'mobile';
  className?: string;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  variant = 'segmented',
  className = '',
}) => {
  const { language, setLanguage, currentLanguageOption } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (variant === 'segmented') {
    return (
      <div
        className={`flex items-center gap-1 bg-slate-800 p-0.5 rounded-lg border border-slate-700 ${className}`}
        role="group"
        aria-label="Language Selector"
      >
        {AVAILABLE_LANGUAGES.map((lang) => {
          const isActive = language === lang.code;
          return (
            <button
              key={lang.code}
              type="button"
              onClick={() => setLanguage(lang.code)}
              className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold transition-all cursor-pointer ${
                isActive
                  ? 'bg-orange-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/60'
              }`}
              title={lang.nativeName}
            >
              <span>{lang.flag}</span>
              <span>{lang.label}</span>
            </button>
          );
        })}
      </div>
    );
  }

  if (variant === 'mobile') {
    return (
      <div className={`flex flex-col gap-1.5 ${className}`}>
        <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
          <Globe className="size-3.5" />
          <span>Language / Sprache / Taal</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {AVAILABLE_LANGUAGES.map((lang) => {
            const isActive = language === lang.code;
            return (
              <button
                key={lang.code}
                type="button"
                onClick={() => setLanguage(lang.code)}
                className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                  isActive
                    ? 'bg-orange-50 border-orange-500 text-orange-700 ring-1 ring-orange-400 shadow-xs'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <span className="text-sm">{lang.flag}</span>
                <span>{lang.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // Dropdown variant
  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors cursor-pointer border border-slate-200"
        aria-label="Select language"
      >
        <span>{currentLanguageOption.flag}</span>
        <span>{currentLanguageOption.label}</span>
        <ChevronDown className="size-3 text-slate-500" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1.5 w-32 bg-white rounded-xl shadow-xl border border-slate-200 py-1 z-50 animate-fade-in">
          {AVAILABLE_LANGUAGES.map((lang) => {
            const isActive = language === lang.code;
            return (
              <button
                key={lang.code}
                type="button"
                onClick={() => {
                  setLanguage(lang.code);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs font-bold transition-colors text-left cursor-pointer ${
                  isActive
                    ? 'bg-orange-50 text-orange-600'
                    : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <span className="flex items-center gap-2">
                  <span>{lang.flag}</span>
                  <span>{lang.label}</span>
                </span>
                {isActive && <span className="text-orange-600 font-extrabold">•</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
