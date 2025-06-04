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
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };

    const handleMouseMove = (e) => {
      setMousePos({
        x: (e.clientX / window.innerWidth) * 100,
        y: (e.clientY / window.innerHeight) * 100,
      });
    };

    window.addEventListener('scroll', handleScroll);
    window.addEventListener('mousemove', handleMouseMove);
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  // Calcola valori di parallasse più sofisticati
  const heroOpacity = Math.max(0.3, 1 - scrollY / 800);
  const heroScale = Math.max(0.9, 1 - scrollY / 3000);
  const parallaxOffset = scrollY * 0.5;

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Sfondo Base con Gradiente AI */}
      <div 
        className="fixed inset-0 z-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(circle at ${mousePos.x}% ${mousePos.y}%, rgba(0, 212, 255, 0.1) 0%, transparent 50%),
            radial-gradient(circle at ${100 - mousePos.x}% ${100 - mousePos.y}%, rgba(139, 92, 246, 0.08) 0%, transparent 50%),
            linear-gradient(135deg, #ffffff 0%, #f8faff 30%, #e6f3ff 60%, #f0f9ff 100%)
          `,
          transition: 'background 0.3s ease-out',
        }}
      />

      {/* Neural Network Pattern - Layer 1 */}
      <div 
        className="fixed inset-0 z-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: `
            radial-gradient(circle at 25% 25%, #0087FF 1px, transparent 1px),
            radial-gradient(circle at 75% 75%, #8B5CF6 1px, transparent 1px),
            radial-gradient(circle at 50% 50%, #00D4FF 0.5px, transparent 0.5px)
          `,
          backgroundSize: '60px 60px, 80px 80px, 40px 40px',
          backgroundPosition: '0 0, 20px 20px, 10px 10px',
          transform: `translate(${scrollY * 0.1}px, ${scrollY * 0.05}px)`,
          transition: 'transform 0.1s ease-out',
        }}
      />

      {/* Circuit Lines - Layer 2 */}
      <div 
        className="fixed inset-0 z-0 pointer-events-none opacity-10"
        style={{
          backgroundImage: `
            linear-gradient(90deg, rgba(0, 135, 255, 0.3) 1px, transparent 1px),
            linear-gradient(0deg, rgba(0, 212, 255, 0.2) 1px, transparent 1px)
          `,
          backgroundSize: '100px 100px, 150px 150px',
          transform: `translate(${-scrollY * 0.08}px, ${scrollY * 0.12}px)`,
          transition: 'transform 0.1s ease-out',
        }}
      />

      {/* Floating AI Elements */}
      <div 
        className="fixed inset-0 z-0 pointer-events-none"
        style={{ transform: `translateY(${parallaxOffset}px)` }}
      >
        {/* Grande cerchio AI - sinistra */}
        <div 
          className="absolute w-96 h-96 rounded-full opacity-5"
          style={{
            top: '10%',
            left: '5%',
            background: `
              radial-gradient(circle, #0087FF 0%, transparent 70%),
              conic-gradient(from 0deg, #00D4FF, #8B5CF6, #EC4899, #00D4FF)
            `,
            transform: `
              translateY(${scrollY * 0.15}px) 
              rotate(${scrollY * 0.1}deg)
              scale(${1 + scrollY * 0.0002})
            `,
            transition: 'transform 0.1s ease-out',
          }}
        />

        {/* Cerchio AI - destra */}
        <div 
          className="absolute w-64 h-64 rounded-full opacity-8"
          style={{
            top: '60%',
            right: '8%',
            background: `
              conic-gradient(from 45deg, #8B5CF6, #EC4899, #FF6B35, #8B5CF6)
            `,
            transform: `
              translateY(${-scrollY * 0.2}px) 
              rotate(${-scrollY * 0.15}deg)
              scale(${1 + scrollY * 0.0001})
            `,
            transition: 'transform 0.1s ease-out',
          }}
        />

        {/* Piccoli elementi fluttuanti */}
        <div 
          className="absolute w-8 h-8 rounded-full bg-primary/20"
          style={{
            top: '30%',
            left: '15%',
            transform: `
              translateY(${Math.sin(scrollY * 0.01) * 20}px) 
              translateX(${Math.cos(scrollY * 0.008) * 15}px)
            `,
          }}
        />
        <div 
          className="absolute w-6 h-6 rounded-full bg-neon-purple/30"
          style={{
            top: '70%',
            left: '80%',
            transform: `
              translateY(${Math.sin(scrollY * 0.012 + 1) * 25}px) 
              translateX(${Math.cos(scrollY * 0.01 + 1) * 20}px)
            `,
          }}
        />
        <div 
          className="absolute w-4 h-4 rounded-full bg-accent/25"
          style={{
            top: '45%',
            right: '25%',
            transform: `
              translateY(${Math.sin(scrollY * 0.015 + 2) * 15}px) 
              translateX(${Math.cos(scrollY * 0.011 + 2) * 18}px)
            `,
          }}
        />
      </div>

      {/* Data Flow Lines */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="absolute h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent"
            style={{
              top: `${20 + i * 15}%`,
              left: '-100%',
              width: '200%',
              animation: `dataFlow ${3 + i * 0.5}s linear infinite`,
              animationDelay: `${i * 0.5}s`,
            }}
          />
        ))}
      </div>

      {/* Glassmorphism Navigation Overlay */}
      <div className="fixed top-0 w-full z-50">
        <Navigation />
      </div>
      
      {/* Main Content con Parallax */}
      <div 
        className="relative z-10"
        style={{ 
          opacity: heroOpacity,
          transform: `scale(${heroScale})`,
          transition: 'all 0.1s ease-out'
        }}
      >
        <Hero />
      </div>
      
      {/* Contenuto con effetti di profondità */}
      <div className="relative z-20">
        <Services />
        <Projects />
        <Process />
        <About />
        <Contact />
        <Footer />
      </div>

      {/* Overlay Pattern Dinamico */}
      <div 
        className="fixed inset-0 z-5 pointer-events-none mix-blend-overlay opacity-30"
        style={{
          background: `
            radial-gradient(circle at ${mousePos.x}% ${mousePos.y}%, 
              rgba(0, 135, 255, 0.1) 0%, 
              transparent 30%
            )
          `,
          transition: 'background 0.3s ease-out',
        }}
      />

      {/* Particelle Interattive */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className={`absolute w-1 h-1 rounded-full ${
              i % 3 === 0 ? 'bg-primary/40' : 
              i % 3 === 1 ? 'bg-neon-purple/40' : 'bg-accent/40'
            }`}
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              animation: `float ${3 + Math.random() * 4}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 2}s`,
              transform: `scale(${0.5 + Math.random() * 1.5})`,
            }}
          />
        ))}
      </div>

      {/* Ambient Glow Effects */}
      <div 
        className="fixed inset-0 z-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse at top left, rgba(0, 135, 255, 0.1) 0%, transparent 50%),
            radial-gradient(ellipse at bottom right, rgba(255, 107, 53, 0.1) 0%, transparent 50%),
            radial-gradient(ellipse at center, rgba(139, 92, 246, 0.05) 0%, transparent 70%)
          `,
          transform: `translateY(${scrollY * 0.3}px)`,
          transition: 'transform 0.1s ease-out',
        }}
      />
    </div>
  );
};

export default MainApp;