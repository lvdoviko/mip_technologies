// src/components/layout/Navigation.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useScrollDetection } from '../../hooks/useScrollDetection';
import Logo from '../ui/Logo';
import LanguageSelector from '../ui/LanguageSelector';
import { navItems } from '../../data/navItems';

const Navigation = () => {
  const { t } = useTranslation();
  const isScrolled = useScrollDetection(50);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('');
  const observerRef = useRef(null);
  const mobileMenuRef = useRef(null);
  const menuButtonRef = useRef(null);

  // Handle keyboard navigation
  useEffect(() => {
    // Handle mobile menu close with Escape
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
      }
    };

    // Focus trap in mobile menu
    const handleFocusTrap = (e) => {
      if (!isMobileMenuOpen || !mobileMenuRef.current) return;
      
      const focusableElements = mobileMenuRef.current.querySelectorAll(
        'a[href], button, input, textarea, select, [tabindex]:not([tabindex="-1"])'
      );
      
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      
      if (e.key === 'Tab' && e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      } else if (e.key === 'Tab' && !e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    if (mobileMenuRef.current) {
      mobileMenuRef.current.addEventListener('keydown', handleFocusTrap);
    }
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (mobileMenuRef.current) {
        mobileMenuRef.current.removeEventListener('keydown', handleFocusTrap);
      }
    };
  }, [isMobileMenuOpen]);

  // Move focus when mobile menu opens/closes
  useEffect(() => {
    if (isMobileMenuOpen && mobileMenuRef.current) {
      const firstFocusable = mobileMenuRef.current.querySelector('a[href], button');
      if (firstFocusable) {
        setTimeout(() => firstFocusable.focus(), 100);
      }
    } else if (!isMobileMenuOpen && menuButtonRef.current) {
      menuButtonRef.current.focus();
    }
  }, [isMobileMenuOpen]);

  // Observer for tracking active section
  useEffect(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }
    
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { threshold: 0.3 }
    );

    // Create translated menu items for observer
    const observerMenuItems = [
      { href: '#solutions' },
      { href: '#case-studies' },
      { href: '#methodology' },
      { href: '#company' }
    ];

    observerMenuItems.forEach((item) => {
      const sectionId = item.href.slice(1);
      const element = document.getElementById(sectionId);
      if (element) observerRef.current.observe(element);
    });

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
    };
  }, []);

  // Handle smooth scrolling without changing URL
  const handleSmoothScroll = (e, sectionId) => {
    e.preventDefault();
    
    // Clean any existing hash in the URL
    if (window.history && window.history.replaceState) {
      window.history.replaceState('', document.title, window.location.pathname);
    }
    
    if (!sectionId || sectionId === '') {
      // Scroll to top when clicking on logo or home
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      // Scroll to the specific section
      const section = document.getElementById(sectionId);
      if (section) {
        section.scrollIntoView({ behavior: 'smooth' });
      }
    }
    
    if (isMobileMenuOpen) {
      setIsMobileMenuOpen(false);
    }
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  // Create translated menu items
  const getMenuItems = () => [
    { href: '#solutions', label: t('navigation.solutions') },
    { href: '#case-studies', label: t('navigation.caseStudies') },
    { href: '#methodology', label: t('navigation.methodology') },
    { href: '#company', label: t('navigation.company') }
  ];

  const menuItems = getMenuItems();

  return (
    <nav 
      className={`fixed top-0 w-full z-50 transition-all duration-300 ${
        isScrolled 
          ? 'bg-black/95 backdrop-blur-md shadow-lg border-b border-white/10' 
          : 'bg-black/30 backdrop-blur-md'
      }`}
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="container mx-auto max-w-7xl px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo Section - Fixed alignment */}
          <a 
            href="#"
            className="flex items-baseline gap-1 cursor-pointer group"
            aria-label={t('navigation.ariaLabels.home')}
            onClick={(e) => handleSmoothScroll(e, '')}
          >
            <div className="transition-transform duration-300 group-hover:scale-105">
              <Logo variant="dark" size="xl" className="mr-0" />
            </div>
            
            <div className="hidden sm:flex">
              <span className="text-lg font-medium text-slate-500 tracking-wide uppercase leading-none transform translate-y-[-8px]">
                Technologies
              </span>
            </div>
          </a>
          
          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-1" role="menubar">
            {menuItems.map((item) => {
              const isActive = activeSection === item.href.slice(1);
              const sectionId = item.href.slice(1);
              
              return (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={(e) => handleSmoothScroll(e, sectionId)}
                  className={`px-5 py-2.5 font-medium text-sm transition-all duration-200 relative
                    ${isActive 
                      ? 'text-white' 
                      : 'text-gray-300 hover:text-white'
                    }`}
                  aria-current={isActive ? 'page' : undefined}
                  role="menuitem"
                >
                  {item.label}
                  {isActive && (
                    <div className="absolute bottom-0 left-0 w-full h-0.5 bg-white"></div>
                  )}
                </a>
              );
            })}
          </div>
          
          {/* Language Selector Desktop */}
          <div className="hidden lg:flex items-center">
            <LanguageSelector />
          </div>
          
          {/* CTA Button Desktop - Updated style to match form button */}
          <div className="hidden md:flex items-center ml-4">
            <a
              href="#contact"
              onClick={(e) => handleSmoothScroll(e, 'contact')}
              className="px-7 py-3 rounded-none font-medium border border-white bg-black text-white hover:bg-white hover:text-black transition-colors duration-300"
              aria-label={t('navigation.getStarted')}
            >
              {t('navigation.getStarted')}
            </a>
          </div>
          
          {/* Mobile Menu Button */}
          <div className="lg:hidden">
            <button
              ref={menuButtonRef}
              onClick={toggleMobileMenu}
              className="p-3 rounded-xl text-gray-300 hover:text-white hover:bg-white/10 transition-all duration-200"
              aria-expanded={isMobileMenuOpen}
              aria-label={isMobileMenuOpen ? t('navigation.ariaLabels.closeMenu') : t('navigation.ariaLabels.openMenu')}
              aria-controls="mobile-menu"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                {isMobileMenuOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
          </div>
        </div>
        
        {/* Mobile Menu */}
        <div 
          id="mobile-menu"
          ref={mobileMenuRef}
          className={`lg:hidden transition-all duration-300 overflow-hidden ${
            isMobileMenuOpen 
              ? 'max-h-96 opacity-100 pb-6' 
              : 'max-h-0 opacity-0'
          }`}
          role="menu"
          aria-labelledby="mobile-menu-button"
        >
          <div className="bg-black/90 backdrop-blur-md shadow-2xl border border-white/10 mt-4 overflow-hidden">
            {menuItems.map((item, index) => {
              const isActive = activeSection === item.href.slice(1);
              const sectionId = item.href.slice(1);
              return (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={(e) => handleSmoothScroll(e, sectionId)}
                  className={`block px-6 py-4 text-base font-medium transition-all duration-200 border-b border-white/5 last:border-b-0 relative ${
                    isActive 
                      ? 'text-white bg-white/5' 
                      : 'text-gray-300 hover:text-white hover:bg-white/5'
                  }`}
                  aria-current={isActive ? 'page' : undefined}
                  role="menuitem"
                  tabIndex={isMobileMenuOpen ? 0 : -1}
                >
                  {item.label}
                  {isActive && (
                    <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-white"></div>
                  )}
                </a>
              );
            })}
            
            {/* Mobile Language Selector */}
            <div className="px-6 py-4 border-t border-white/10">
              <LanguageSelector className="w-full justify-center" />
            </div>
            
            {/* Mobile CTA - Updated style to match form button */}
            <div className="p-6 border-t border-white/10">
              <a
                href="#contact"
                onClick={(e) => handleSmoothScroll(e, 'contact')}
                className="block w-full px-6 py-4 rounded-none font-medium border border-white bg-black text-white hover:bg-white hover:text-black transition-colors duration-300"
                role="menuitem"
              >
                {t('navigation.getStarted')}
              </a>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;