import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from '../../context/LanguageContext';
import { Language, AVAILABLE_LANGUAGES } from '../../i18n/types';
import { ChevronDown, Globe, Check } from 'lucide-react';

interface LanguageSelectorProps {
  variant?: 'segmented' | 'dropdown' | 'mobile';
  className?: string;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  variant = 'dropdown',
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

  // Modern Dropdown variant for Navbar
  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-slate-900 text-xs font-bold transition-all cursor-pointer border border-slate-200/90 shadow-xs"
        aria-label="Select language"
        title={`Current Language: ${currentLanguageOption.nativeName}`}
      >
        <span className="text-sm leading-none">{currentLanguageOption.flag}</span>
        <span className="tracking-wide">{currentLanguageOption.label}</span>
        <ChevronDown className={`size-3 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-44 bg-white rounded-2xl shadow-xl border border-slate-200/90 p-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
          <div className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 mb-1 flex items-center gap-1.5">
            <Globe className="size-3 text-slate-400" />
            <span>Select Language</span>
          </div>
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
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
                  isActive
                    ? 'bg-orange-50 text-orange-600 font-extrabold shadow-xs'
                    : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <span className="text-base leading-none">{lang.flag}</span>
                  <span className="flex flex-col">
                    <span className="text-xs font-bold leading-tight">{lang.nativeName}</span>
                    <span className="text-[10px] text-slate-400 font-normal">{lang.label}</span>
                  </span>
                </span>
                {isActive && <Check className="size-3.5 text-orange-600 shrink-0 stroke-[2.5]" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
