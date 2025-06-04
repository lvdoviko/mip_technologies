// src/components/layout/Navigation.jsx
import React, { useState, useEffect } from 'react';
import { useScrollDetection } from '../../hooks/useScrollDetection';
import Logo from '../ui/Logo';
import { navItems } from '../../data/navItems';

const Navigation = () => {
  const isScrolled = useScrollDetection(50);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('');
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e) => {
      const nav = e.currentTarget;
      const rect = nav.getBoundingClientRect();
      setMousePos({
        x: ((e.clientX - rect.left) / rect.width) * 100,
        y: ((e.clientY - rect.top) / rect.height) * 100,
      });
    };

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
    <nav 
      className={`
        fixed top-0 w-full z-50 transition-all duration-500
        ${isScrolled 
          ? 'glass-card shadow-glass-lg backdrop-blur-2xl' 
          : 'bg-transparent'
        }
      `}
      onMouseMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        setMousePos({
          x: ((e.clientX - rect.left) / rect.width) * 100,
          y: ((e.clientY - rect.top) / rect.height) * 100,
        });
      }}
    >
      {/* Dynamic Background Glow */}
      <div 
        className={`
          absolute inset-0 transition-opacity duration-300 pointer-events-none
          ${isScrolled ? 'opacity-100' : 'opacity-0'}
        `}
        style={{
          background: `
            radial-gradient(circle at ${mousePos.x}% ${mousePos.y}%, 
              rgba(0, 135, 255, 0.1) 0%, 
              transparent 50%
            )
          `,
        }}
      />
      
      {/* Border Gradient */}
      {isScrolled && (
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary-300/50 to-transparent"></div>
      )}
      
      <div className="container mx-auto max-w-7xl px-4 relative z-10">
        <div className="flex justify-between items-center h-16 md:h-20">
          {/* Logo Section */}
          <div className="flex items-center gap-3 cursor-pointer group">
            <div className="relative">
              <div className="absolute inset-0 bg-primary-500/20 rounded-xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative p-2 hover:scale-110 transition-transform duration-300">
                <Logo />
              </div>
            </div>
            
            <div className="hidden sm:block">
              <span className="text-2xl lg:text-3xl font-bold font-display">
                <span className="text-gray-900">MIP</span>
                <span className="text-gradient bg-gradient-to-r from-primary-500 to-neon-blue bg-clip-text text-transparent ml-1">
                  TECHNOLOGIES
                </span>
              </span>
            </div>
          </div>
          
          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-1">
            {navItems.map((item, index) => {
              const isActive = activeSection === item.href.slice(1);
              
              return (
                <a
                  key={item.href}
                  href={item.href}
                  className={`
                    relative px-6 py-3 rounded-xl font-medium transition-all duration-300
                    group hover:scale-105 overflow-hidden
                    ${isActive 
                      ? 'text-primary-600 bg-primary-50/80 shadow-soft' 
                      : 'text-gray-700 hover:text-primary-600 hover:bg-white/50'
                    }
                  `}
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  {/* Hover Background */}
                  <div className="absolute inset-0 bg-gradient-to-r from-primary-50 to-neon-blue/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl"></div>
                  
                  {/* Active Indicator */}
                  {isActive && (
                    <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-8 h-1 bg-gradient-to-r from-primary-500 to-neon-blue rounded-full"></div>
                  )}
                  
                  {/* Text */}
                  <span className="relative z-10">{item.label}</span>
                  
                  {/* Shimmer Effect */}
                  <div className="absolute inset-0 shimmer opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </a>
              );
            })}
          </div>
          
          {/* CTA Button Desktop */}
          <div className="hidden md:flex items-center">
            <a
              href="#contatti"
              className="
                px-6 py-3 rounded-xl font-semibold
                bg-gradient-to-r from-primary-500 to-primary-400
                hover:from-primary-600 hover:to-primary-500
                text-white shadow-soft hover:shadow-glow-md
                transform hover:-translate-y-0.5 hover:scale-105
                transition-all duration-300
                border border-primary-400/20
                relative overflow-hidden group
              "
            >
              <div className="relative z-10 flex items-center gap-2">
                <span>Inizia Ora</span>
                <svg
                  className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 8l4 4m0 0l-4 4m4-4H3"
                  />
                </svg>
              </div>
              
              {/* Button Shimmer */}
              <div className="absolute inset-0 shimmer opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </a>
          </div>
          
          {/* Mobile Menu Button */}
          <div className="lg:hidden">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className={`
                relative p-3 rounded-xl transition-all duration-300
                ${isMobileMenuOpen 
                  ? 'bg-primary-500 text-white shadow-glow-md' 
                  : 'text-gray-700 hover:text-primary-600 hover:bg-white/50'
                }
                group overflow-hidden
              `}
            >
              {/* Background */}
              <div className="absolute inset-0 bg-gradient-to-r from-primary-50 to-neon-blue/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl"></div>
              
              {/* Icon */}
              <div className="relative z-10">
                <svg
                  className={`w-6 h-6 transition-transform duration-300 ${
                    isMobileMenuOpen ? 'rotate-90' : ''
                  }`}
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
              </div>
            </button>
          </div>
        </div>
        
        {/* Mobile Menu */}
        <div className={`
          lg:hidden transition-all duration-500 overflow-hidden
          ${isMobileMenuOpen 
            ? 'max-h-96 opacity-100 pb-6' 
            : 'max-h-0 opacity-0 pb-0'
          }
        `}>
          <div className="glass-card mt-4 rounded-2xl border border-white/30 backdrop-blur-xl overflow-hidden">
            {navItems.map((item, index) => {
              const isActive = activeSection === item.href.slice(1);
              
              return (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`
                    block px-6 py-4 transition-all duration-300
                    border-b border-white/10 last:border-b-0
                    relative group overflow-hidden
                    ${isActive 
                      ? 'text-primary-600 bg-primary-50/50' 
                      : 'text-gray-700 hover:text-primary-600 hover:bg-white/30'
                    }
                  `}
                  style={{ 
                    animationDelay: `${index * 100}ms`,
                    opacity: isMobileMenuOpen ? 1 : 0,
                    transform: isMobileMenuOpen ? 'translateY(0)' : 'translateY(-10px)',
                    transition: `all 0.3s ease ${index * 50}ms`,
                  }}
                >
                  {/* Hover Background */}
                  <div className="absolute inset-0 bg-gradient-to-r from-primary-50 to-neon-blue/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  
                  {/* Content */}
                  <div className="relative z-10 flex items-center justify-between">
                    <span className="font-medium">{item.label}</span>
                    
                    {isActive && (
                      <div className="w-2 h-2 rounded-full bg-gradient-to-r from-primary-500 to-neon-blue"></div>
                    )}
                  </div>
                  
                  {/* Shimmer Effect */}
                  <div className="absolute inset-0 shimmer opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </a>
              );
            })}
            
            {/* Mobile CTA */}
            <div className="p-4">
              <a
                href="#contatti"
                onClick={() => setIsMobileMenuOpen(false)}
                className="
                  block w-full px-6 py-4 rounded-xl font-semibold text-center
                  bg-gradient-to-r from-primary-500 to-primary-400
                  hover:from-primary-600 hover:to-primary-500
                  text-white shadow-soft hover:shadow-glow-md
                  transition-all duration-300
                  border border-primary-400/20
                  relative overflow-hidden group
                "
              >
                <div className="relative z-10 flex items-center justify-center gap-2">
                  <span>Inizia Ora</span>
                  <span className="text-xl">🚀</span>
                </div>
                
                {/* Button Shimmer */}
                <div className="absolute inset-0 shimmer opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </a>
            </div>
          </div>
        </div>
      </div>
      
      {/* Neural Network Lines */}
      {isScrolled && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div 
            className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-primary-400/30 to-transparent animate-data-flow"
            style={{ animationDuration: '4s' }}
          />
        </div>
      )}
    </nav>
  );
};

export default Navigation;