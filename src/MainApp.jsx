// src/MainApp.jsx
import React, { useEffect, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Navigation from './components/layout/Navigation';
import Footer from './components/layout/Footer';
import Hero from './sections/Hero';
import Services from './sections/Services';
import Projects from './sections/Projects';
import Process from './sections/Process';
import About from './sections/About';
import Contact from './sections/Contact';
import AnimatedBackground from './components/ui/AnimatedBackground';
import useReducedMotion from './hooks/useReducedMotion'; // Importa il nuovo hook
import './styles/globals.css';

// Registra i plugin GSAP
gsap.registerPlugin(ScrollTrigger);

const MainApp = () => {
  const [scrollY, setScrollY] = useState(0);
  const [isScrolled, setIsScrolled] = useState(false);
  const prefersReducedMotion = useReducedMotion(); // Usa il nuovo hook

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      setScrollY(currentScrollY);
      setIsScrolled(currentScrollY > 50);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <div className="min-h-screen relative bg-black text-white">
      {/* Sfondo base */}
      <div 
        className="fixed inset-0 pointer-events-none"
        style={{
          background: `linear-gradient(135deg, #000000 0%, #0a0a0a 50%, #111111 100%)`,
          zIndex: -10,
        }}
      />
      
      {/* Noise texture sottile */}
      <div 
        className="fixed inset-0 pointer-events-none opacity-40"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.1'/%3E%3C/svg%3E")`,
          zIndex: -9,
        }}
      />
      
      {/* Sfumature colorate sottili */}
      <div 
        className="fixed inset-0 pointer-events-none opacity-30"
        style={{
          background: `
            radial-gradient(circle at 20% 20%, rgba(99, 102, 241, 0.03) 0%, transparent 50%),
            radial-gradient(circle at 80% 40%, rgba(236, 72, 153, 0.03) 0%, transparent 50%),
            radial-gradient(circle at 10% 60%, rgba(14, 165, 233, 0.03) 0%, transparent 40%),
            radial-gradient(circle at 70% 90%, rgba(139, 92, 246, 0.03) 0%, transparent 40%)
          `,
          zIndex: -8,
          transform: prefersReducedMotion ? 'none' : `translateY(${scrollY * 0.05}px)`,
          transition: 'transform 0.2s ease-out',
        }}
      />
      
      {/* Griglia moderna */}
      <div 
        className="fixed inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: `
            linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px),
            linear-gradient(0deg, rgba(255,255,255,0.03) 1px, transparent 1px)
          `,
          backgroundSize: '80px 80px',
          transform: prefersReducedMotion ? 'none' : `translate(${scrollY * 0.04}px, ${scrollY * 0.05}px)`,
          transition: 'transform 0.2s ease-out',
          zIndex: -7,
        }}
      />
      
      {/* Animated Background con particelle */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <AnimatedBackground />
      </div>
      
      {/* Navigation con effetto scroll */}
      <div className="relative z-50">
        <Navigation isScrolled={isScrolled} />
      </div>
      
      {/* Main Content */}
      <div className="relative z-10">
        <div style={{ opacity: Math.max(0.8, 1 - scrollY / 1000) }}>
          <Hero prefersReducedMotion={prefersReducedMotion} />
        </div>
        
        <Services prefersReducedMotion={prefersReducedMotion} />
        <Projects prefersReducedMotion={prefersReducedMotion} />
        <Process prefersReducedMotion={prefersReducedMotion} />
        <About prefersReducedMotion={prefersReducedMotion} />
        <Contact prefersReducedMotion={prefersReducedMotion} />
        <Footer />
      </div>
    </div>
  );
};

export default MainApp;