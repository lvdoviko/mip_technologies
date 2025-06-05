import React, { useState, useEffect, useRef } from 'react';
import { useScrollDetection } from '../../hooks/useScrollDetection';
import Logo from '../ui/Logo';
import { navItems } from '../../data/navItems';

const Navigation = () => {
  const isScrolled = useScrollDetection(50);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('');
  const observerRef = useRef(null);
  const mobileMenuRef = useRef(null);
  const menuButtonRef = useRef(null);

  // Gestisce la navigazione con tastiera
  useEffect(() => {
    // Gestisce la chiusura del menu mobile con Escape
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
      }
    };

    // Gestisce il focus trap nel menu mobile
    const handleFocusTrap = (e) => {
      if (!isMobileMenuOpen || !mobileMenuRef.current) return;
      
      const focusableElements = mobileMenuRef.current.querySelectorAll(
        'a[href], button, input, textarea, select, [tabindex]:not([tabindex="-1"])'
      );
      
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      
      // Se si preme Shift+Tab sull'elemento focusabile più in alto, 
      // sposta il focus all'elemento più in basso
      if (e.key === 'Tab' && e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      }
      
      // Se si preme Tab sull'elemento focusabile più in basso, 
      // sposta il focus all'elemento più in alto
      else if (e.key === 'Tab' && !e.shiftKey && document.activeElement === lastElement) {
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

  // Sposta il focus quando il menu mobile si apre/chiude
  useEffect(() => {
    if (isMobileMenuOpen && mobileMenuRef.current) {
      // Quando il menu si apre, sposta il focus al primo elemento
      const firstFocusable = mobileMenuRef.current.querySelector('a[href], button');
      if (firstFocusable) {
        setTimeout(() => firstFocusable.focus(), 100);
      }
    } else if (!isMobileMenuOpen && menuButtonRef.current) {
      // Quando il menu si chiude, riporta il focus al pulsante
      menuButtonRef.current.focus();
    }
  }, [isMobileMenuOpen]);

  // Observer per tracciare la sezione attiva
  useEffect(() => {
    // Rilascia l'observer precedente se esiste
    if (observerRef.current) {
      observerRef.current.disconnect();
    }
    
    // Crea un nuovo observer
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

    // Filtra gli elementi di navigazione per escludere "Get Started"
    const menuItems = navItems.filter(item => item.label !== "Get Started");

    // Osserva tutte le sezioni
    menuItems.forEach((item) => {
      const sectionId = item.href.slice(1); // Rimuove il # iniziale
      const element = document.getElementById(sectionId);
      if (element) observerRef.current.observe(element);
    });

    // Cleanup dell'observer
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
    };
  }, []);

  // Gestisce il toggle del menu mobile
  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  // Filtra gli elementi di navigazione per escludere "Get Started" dal menu principale
  const menuItems = navItems.filter(item => item.label !== "Get Started");

  return (
    <nav 
      className={`fixed top-0 w-full z-50 transition-all duration-300 ${
        isScrolled 
          ? 'bg-black/95 backdrop-blur-md shadow-lg border-b border-white/10' 
          : 'bg-black/30 backdrop-blur-md'
      }`}
      role="navigation"
      aria-label="Menu principale"
    >
      <div className="container mx-auto max-w-7xl px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo Section */}
          <a 
            href="#" 
            className="flex items-center gap-4 cursor-pointer group"
            aria-label="MIP Technologies - Torna alla home"
          >
            <div className="transition-transform duration-300 group-hover:scale-105">
              <Logo variant="dark" size="xl" className="mr-0" />
            </div>
            
            <div className="hidden sm:flex items-baseline gap-1">
              <span className="text-2xl font-black text-white tracking-tight">
                MIP
              </span>
              <span className="text-lg font-medium text-gray-400 tracking-wide uppercase">
                Technologies
              </span>
            </div>
          </a>
          
          {/* Desktop Navigation - Solo elementi di menu filtrati */}
          <div className="hidden lg:flex items-center space-x-1" role="menubar">
            {menuItems.map((item) => {
              const isActive = activeSection === item.href.slice(1);
              return (
                <a
                  key={item.href}
                  href={item.href}
                  className={`px-5 py-2.5 rounded-full font-medium text-sm transition-all duration-200 ${
                    isActive 
                      ? 'text-white bg-white/10 border border-white/20' 
                      : 'text-gray-300 hover:text-white hover:bg-white/5'
                  }`}
                  aria-current={isActive ? 'page' : undefined}
                  role="menuitem"
                >
                  {item.label}
                </a>
              );
            })}
          </div>
          
          {/* CTA Button Desktop */}
          <div className="hidden md:flex items-center">
            <a
              href="#contact"
              className="px-7 py-3 rounded-lg font-semibold text-sm bg-white text-black hover:bg-gray-100 transform hover:-translate-y-0.5 transition-all duration-300 shadow-lg hover:shadow-xl"
              aria-label="Inizia subito - Contattaci"
            >
              Get Started
            </a>
          </div>
          
          {/* Mobile Menu Button */}
          <div className="lg:hidden">
            <button
              ref={menuButtonRef}
              onClick={toggleMobileMenu}
              className="p-3 rounded-xl text-gray-300 hover:text-white hover:bg-white/10 transition-all duration-200"
              aria-expanded={isMobileMenuOpen}
              aria-label={isMobileMenuOpen ? "Chiudi menu" : "Apri menu"}
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
        
        {/* Mobile Menu - Menu mobile con elementi filtrati */}
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
          <div className="bg-black/90 backdrop-blur-md rounded-2xl shadow-2xl border border-white/10 mt-4 overflow-hidden">
            {menuItems.map((item, index) => {
              const isActive = activeSection === item.href.slice(1);
              return (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`block px-6 py-4 text-base font-medium transition-all duration-200 border-b border-white/5 last:border-b-0 ${
                    isActive 
                      ? 'text-white bg-white/5' 
                      : 'text-gray-300 hover:text-white hover:bg-white/5'
                  }`}
                  aria-current={isActive ? 'page' : undefined}
                  role="menuitem"
                  tabIndex={isMobileMenuOpen ? 0 : -1}
                >
                  {item.label}
                </a>
              );
            })}
            
            {/* Mobile CTA - Manteniamo qui il pulsante Get Started */}
            <div className="p-6 border-t border-white/10">
              <a
                href="#contact"
                onClick={() => setIsMobileMenuOpen(false)}
                className="block w-full px-6 py-4 rounded-xl font-semibold text-center bg-white text-black hover:bg-gray-100 transition-all duration-300"
                role="menuitem"
                tabIndex={isMobileMenuOpen ? 0 : -1}
              >
                Get Started
              </a>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;