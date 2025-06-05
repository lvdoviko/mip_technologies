// src/MainApp.jsx
import React, { useEffect, useState } from 'react';
import Navigation from './components/layout/Navigation';
import Footer from './components/layout/Footer';
import Hero from './sections/Hero';
import Services from './sections/Services';
import Projects from './sections/Projects';
import Process from './sections/Process';
import About from './sections/About';
import Contact from './sections/Contact';
import './styles/globals.css';

const MainApp = () => {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };

    window.addEventListener('scroll', handleScroll);
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Effetto parallasse minimal
  const heroOpacity = Math.max(0.8, 1 - scrollY / 1000);

  return (
    <div className="min-h-screen relative bg-gray-900">
      {/* Sfondo CSS professionale */}
      <div 
        className="fixed inset-0 pointer-events-none"
        style={{
          background: `linear-gradient(135deg, #0F172A 0%, #1E293B 30%, #334155 60%, #0F172A 100%)`,
          zIndex: -3,
        }}
      />
      
      {/* Pattern professionale più visibile */}
      <div 
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            radial-gradient(circle at 25% 25%, rgba(100, 116, 139, 0.3) 1px, transparent 1px),
            radial-gradient(circle at 75% 75%, rgba(100, 116, 139, 0.2) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px, 90px 90px',
          backgroundPosition: '0 0, 30px 30px',
          transform: `translateY(${scrollY * 0.1}px)`,
          transition: 'transform 0.1s ease-out',
          zIndex: -2,
        }}
      />
      
      {/* Grid lines sottili ma visibili */}
      <div 
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(90deg, rgba(100, 116, 139, 0.15) 1px, transparent 1px),
            linear-gradient(0deg, rgba(100, 116, 139, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '80px 80px',
          transform: `translate(${-scrollY * 0.05}px, ${scrollY * 0.08}px)`,
          transition: 'transform 0.1s ease-out',
          zIndex: -1,
        }}
      />
      
      {/* Navigation */}
      <div className="relative z-50">
        <Navigation />
      </div>
      
      {/* Main Content */}
      <div className="relative z-10">
        <div style={{ opacity: heroOpacity }}>
          <Hero />
        </div>
        
        <Services />
        <Projects />
        <Process />
        <About />
        <Contact />
        <Footer />
      </div>
    </div>
  );
};

export default MainApp;