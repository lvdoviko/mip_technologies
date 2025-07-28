// src/components/ui/LanguageSelector.jsx
import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, Globe } from 'lucide-react';

const LanguageSelector = ({ className = '' }) => {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);

  const languages = [
    { 
      code: 'en', 
      name: 'English', 
      flag: '🇬🇧',
      nativeName: 'English'
    },
    { 
      code: 'it', 
      name: 'Italiano', 
      flag: '🇮🇹',
      nativeName: 'Italiano'
    }
  ];

  const currentLanguage = languages.find(lang => lang.code === i18n.language) || languages[0];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (!isOpen) return;
      
      if (event.key === 'Escape') {
        setIsOpen(false);
        buttonRef.current?.focus();
      } else if (event.key === 'ArrowDown') {
        event.preventDefault();
        const firstItem = dropdownRef.current?.querySelector('button');
        firstItem?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleLanguageChange = (languageCode) => {
    i18n.changeLanguage(languageCode);
    setIsOpen(false);
    buttonRef.current?.focus();
  };

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      {/* Trigger Button */}
      <button
        ref={buttonRef}
        onClick={toggleDropdown}
        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-300 hover:text-white transition-all duration-200 rounded-none border border-transparent hover:border-white/20 hover:bg-white/5"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={`Current language: ${currentLanguage.nativeName}. Click to change language`}
      >
        <Globe className="w-4 h-4" />
        <span className="hidden sm:inline">{currentLanguage.flag}</span>
        <span className="hidden md:inline">{currentLanguage.code.toUpperCase()}</span>
        <ChevronDown 
          className={`w-3 h-3 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-48 bg-black/95 backdrop-blur-md border border-white/10 shadow-xl z-50 overflow-hidden">
          <div className="py-1" role="listbox">
            {languages.map((language, index) => {
              const isSelected = language.code === i18n.language;
              
              return (
                <button
                  key={language.code}
                  onClick={() => handleLanguageChange(language.code)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-all duration-200 text-left ${
                    isSelected
                      ? 'bg-white/10 text-white' 
                      : 'text-gray-300 hover:text-white hover:bg-white/5'
                  }`}
                  role="option"
                  aria-selected={isSelected}
                  tabIndex={isOpen ? 0 : -1}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleLanguageChange(language.code);
                    } else if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      const nextButton = e.target.nextElementSibling;
                      if (nextButton) {
                        nextButton.focus();
                      } else {
                        // Focus first item if at end
                        dropdownRef.current?.querySelector('button')?.focus();
                      }
                    } else if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      const prevButton = e.target.previousElementSibling;
                      if (prevButton) {
                        prevButton.focus();
                      } else {
                        // Focus last item if at beginning
                        const buttons = dropdownRef.current?.querySelectorAll('button');
                        buttons?.[buttons.length - 1]?.focus();
                      }
                    }
                  }}
                >
                  <span className="text-lg">{language.flag}</span>
                  <div className="flex-1">
                    <div className="font-medium">{language.nativeName}</div>
                    <div className="text-xs text-gray-400">{language.name}</div>
                  </div>
                  {isSelected && (
                    <div className="w-2 h-2 bg-white rounded-none"></div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default LanguageSelector;