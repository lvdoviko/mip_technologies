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
        ? 'bg-black/90 backdrop-blur-sm shadow-minimal border-b border-white/10' 
        : 'bg-black/20 backdrop-blur-sm'
    }`}>
      <div className="container mx-auto max-w-6xl px-4">
        <div className="flex justify-between items-center h-16">
          {/* Logo Section */}
          <div className="flex items-center gap-1 cursor-pointer">
            <div className="p-2 hover-minimal transition-all duration-200">
              <Logo variant="dark" />
            </div>
            
            <div className="hidden sm:flex flex-col justify-center -ml-1">
              <span className="text-xl font-bold text-white leading-tight">
                MIP
              </span>
              <span className="text-sm font-bold text-gradient bg-gradient-to-r from-blue-400 to-white bg-clip-text text-transparent -mt-1">
                TECHNOLOGIES
              </span>
            </div>
          </div>
          
          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-2">
            {navItems.map((item) => {
              const isActive = activeSection === item.href.slice(1);
              return (
                <a
                  key={item.href}
                  href={item.href}
                  className={`px-4 py-2 rounded-full font-medium transition-all duration-200 ${
                    isActive 
                      ? 'text-white bg-transparent border border-white/70' 
                      : 'text-gray-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {item.label}
                </a>
              );
            })}
          </div>
          
          {/* CTA Button Desktop */}
          <div className="hidden md:flex items-center">
            <a
              href="#contatti"
              className="px-6 py-3 rounded-none font-medium bg-black border border-white text-white hover:bg-white hover:text-black transition-all duration-300"
            >
              Contattaci
            </a>
          </div>
          
          {/* Mobile Menu Button */}
          <div className="lg:hidden">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-full text-gray-300 hover:text-white hover:bg-white/10 transition-all duration-200"
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
        
        {/* Mobile Menu */}
        <div className={`lg:hidden transition-all duration-300 overflow-hidden ${
          isMobileMenuOpen 
            ? 'max-h-96 opacity-100 pb-4' 
            : 'max-h-0 opacity-0'
        }`}>
          <div className="bg-black rounded-xl shadow-xl border border-white/10 mt-2 overflow-hidden">
            {navItems.map((item) => {
              const isActive = activeSection === item.href.slice(1);
              return (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`block px-4 py-3 transition-all duration-200 border-b border-white/10 last:border-b-0 ${
                    isActive 
                      ? 'text-white bg-transparent' 
                      : 'text-gray-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {item.label}
                </a>
              );
            })}
            
            {/* Mobile CTA */}
            <div className="p-4 border-t border-white/10">
              <a
                href="#contatti"
                onClick={() => setIsMobileMenuOpen(false)}
                className="block w-full px-6 py-3 rounded-none font-medium text-center bg-black border border-white text-white hover:bg-white hover:text-black transition-all duration-300"
              >
                Contattaci
              </a>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;