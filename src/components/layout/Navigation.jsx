import React, { useState, useEffect } from 'react';
import { useScrollDetection } from '../../hooks/useScrollDetection';
import Logo from '../ui/Logo';
import { navItems } from '../../data/navItems';

const Navigation = () => {
  const isScrolled = useScrollDetection(50);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('');

  useEffect(() => {
    // Track active section
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { threshold: 0.3 }
    );

    // Observe all sections
    navItems.forEach((item) => {
      const element = document.querySelector(item.href);
      if (element) observer.observe(element);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${
      isScrolled 
        ? 'bg-black/95 backdrop-blur-md shadow-lg border-b border-white/10' 
        : 'bg-black/30 backdrop-blur-md'
    }`}>
      <div className="container mx-auto max-w-7xl px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo Section - Professional spacing and typography */}
          <div className="flex items-center gap-4 cursor-pointer group">
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
          </div>
          
          {/* Desktop Navigation - Professional spacing */}
          <div className="hidden lg:flex items-center space-x-1">
            {navItems.map((item) => {
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
                >
                  {item.label}
                </a>
              );
            })}
          </div>
          
          {/* CTA Button Desktop - Professional styling */}
          <div className="hidden md:flex items-center">
            <a
              href="#contact"
              className="px-7 py-3 rounded-lg font-semibold text-sm bg-white text-black hover:bg-gray-100 transform hover:-translate-y-0.5 transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              Get Started
            </a>
          </div>
          
          {/* Mobile Menu Button - Better positioning */}
          <div className="lg:hidden">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-3 rounded-xl text-gray-300 hover:text-white hover:bg-white/10 transition-all duration-200"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
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
        
        {/* Mobile Menu - Professional design */}
        <div className={`lg:hidden transition-all duration-300 overflow-hidden ${
          isMobileMenuOpen 
            ? 'max-h-96 opacity-100 pb-6' 
            : 'max-h-0 opacity-0'
        }`}>
          <div className="bg-black/90 backdrop-blur-md rounded-2xl shadow-2xl border border-white/10 mt-4 overflow-hidden">
            {navItems.map((item) => {
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
                >
                  {item.label}
                </a>
              );
            })}
            
            {/* Mobile CTA - Professional styling */}
            <div className="p-6 border-t border-white/10">
              <a
                href="#contact"
                onClick={() => setIsMobileMenuOpen(false)}
                className="block w-full px-6 py-4 rounded-xl font-semibold text-center bg-white text-black hover:bg-gray-100 transition-all duration-300"
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