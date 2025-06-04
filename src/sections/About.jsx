// src/sections/About.jsx
import React, { useState, useEffect } from 'react';
import { useScrollAnimation } from '../hooks/useScrollAnimation';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { values } from '../data/values';

const About = () => {
  useScrollAnimation();
  const [hoveredValue, setHoveredValue] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [scrollOffset, setScrollOffset] = useState(0);

  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePos({
        x: (e.clientX / window.innerWidth) * 100,
        y: (e.clientY / window.innerHeight) * 100,
      });
    };

    const handleScroll = () => {
      setScrollOffset(window.pageYOffset);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('scroll', handleScroll);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Enhanced value icons con animazioni
  const enhancedValues = values.map((value, index) => ({
    ...value,
    gradient: [
      'from-primary-500 to-neon-blue',
      'from-neon-blue to-neon-purple', 
      'from-neon-purple to-accent-500',
      'from-accent-500 to-neon-pink'
    ][index % 4],
    bgGradient: [
      'from-primary-50 to-neon-blue/10',
      'from-neon-blue/10 to-neon-purple/10',
      'from-neon-purple/10 to-accent-50',
      'from-accent-50 to-neon-pink/10'
    ][index % 4]
  }));

  return (
    <section 
      id="chi-siamo" 
      className="relative py-24 overflow-hidden"
      style={{
        background: `
          radial-gradient(ellipse at ${mousePos.x}% ${mousePos.y}%, rgba(139, 92, 246, 0.08) 0%, transparent 50%),
          radial-gradient(ellipse at ${100 - mousePos.x}% ${100 - mousePos.y}%, rgba(0, 135, 255, 0.06) 0%, transparent 50%),
          linear-gradient(135deg, #f8faff 0%, #ffffff 30%, #f0f9ff 70%, #ffffff 100%)
        `,
        transition: 'background 0.3s ease-out',
      }}
    >
      {/* Advanced Background Patterns */}
      <div className="absolute inset-0 opacity-30">
        {/* Neural Network Grid */}
        <div 
          className="absolute inset-0"
          style={{
            backgroundImage: `
              radial-gradient(circle at 20% 20%, rgba(0, 135, 255, 0.15) 1px, transparent 1px),
              radial-gradient(circle at 80% 80%, rgba(139, 92, 246, 0.15) 1px, transparent 1px),
              radial-gradient(circle at 50% 50%, rgba(0, 212, 255, 0.1) 0.5px, transparent 0.5px)
            `,
            backgroundSize: '80px 80px, 120px 120px, 60px 60px',
            backgroundPosition: '0 0, 40px 40px, 20px 20px',
            transform: `translate(${Math.sin(scrollOffset * 0.001) * 20}px, ${Math.cos(scrollOffset * 0.001) * 15}px)`,
          }}
        />
        
        {/* Circuit Connections */}
        <div 
          className="absolute inset-0"
          style={{
            backgroundImage: `
              linear-gradient(45deg, rgba(0, 135, 255, 0.1) 1px, transparent 1px),
              linear-gradient(-45deg, rgba(139, 92, 246, 0.1) 1px, transparent 1px)
            `,
            backgroundSize: '100px 100px, 150px 150px',
            transform: `translate(${scrollOffset * 0.05}px, ${-scrollOffset * 0.03}px)`,
          }}
        />
      </div>
      
      {/* Floating AI Elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div 
          className="absolute w-80 h-80 rounded-full opacity-5 bg-gradient-to-r from-primary-500 via-neon-blue to-neon-purple animate-float"
          style={{ 
            top: '5%', 
            right: '5%',
            animationDuration: '8s',
            transform: `translateY(${scrollOffset * 0.1}px) rotate(${scrollOffset * 0.05}deg)`
          }}
        />
        <div 
          className="absolute w-64 h-64 rounded-full opacity-8 bg-gradient-to-r from-neon-purple via-accent-500 to-neon-pink animate-float"
          style={{ 
            bottom: '10%', 
            left: '0%',
            animationDuration: '10s',
            animationDelay: '3s',
            transform: `translateY(${-scrollOffset * 0.08}px) rotate(${-scrollOffset * 0.03}deg)`
          }}
        />
        
        {/* Data Stream Lines */}
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute h-px bg-gradient-to-r from-transparent via-primary-400/20 to-transparent animate-data-flow"
            style={{
              top: `${20 + i * 12}%`,
              left: '-100%',
              width: '200%',
              animationDelay: `${i * 0.8}s`,
              animationDuration: `${4 + i * 0.5}s`,
            }}
          />
        ))}
      </div>
      
      <div className="container mx-auto max-w-7xl px-4 relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 xl:gap-24 items-center">
          {/* Content Side */}
          <div className="animate-on-scroll space-y-8">
            {/* Badge */}
            <div className="inline-flex items-center gap-3 glass-card px-6 py-3 rounded-full">
              <span className="text-2xl animate-bounce-subtle">🧠</span>
              <span className="text-sm font-semibold text-primary-600 uppercase tracking-wider">
                Chi Siamo
              </span>
            </div>
            
            {/* Main Heading */}
            <div className="space-y-6">
              <h2 className="text-5xl md:text-6xl lg:text-7xl font-bold font-display leading-tight">
                <span className="text-gray-900">Innovazione</span>
                <br />
                <span className="text-gradient bg-gradient-to-r from-primary-500 via-neon-blue to-neon-purple bg-clip-text text-transparent">
                  AI-Powered
                </span>
              </h2>
              
              {/* Enhanced Description */}
              <div className="space-y-6">
                <p className="text-xl md:text-2xl text-gray-600 leading-relaxed">
                  <span className="text-gradient-accent font-semibold">MIP Technologies</span> è una società innovativa specializzata nello sviluppo e implementazione di{' '}
                  <span className="text-primary-600 font-semibold">soluzioni di intelligenza artificiale</span>.
                </p>
                
                <p className="text-lg md:text-xl text-gray-600 leading-relaxed">
                  Il nostro team di esperti combina competenze tecniche avanzate con una profonda comprensione delle esigenze aziendali, creando soluzioni che{' '}
                  <span className="text-gradient font-semibold">trasformano il futuro</span>.
                </p>
                
                <div className="glass-card p-6 rounded-2xl border border-primary-100/50">
                  <p className="text-lg text-gray-700 leading-relaxed italic">
                    "Crediamo che l'AI non sia solo una tecnologia, ma uno{' '}
                    <span className="text-primary-600 font-semibold">strumento per trasformare</span>{' '}
                    il modo in cui le aziende operano, crescono e innovano."
                  </p>
                </div>
              </div>
            </div>
            
            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Button 
                href="#contatti" 
                variant="primary" 
                size="lg"
                glow={true}
                icon={<span className="text-xl">🚀</span>}
              >
                Scopri di più
              </Button>
              
              <Button 
                href="#servizi" 
                variant="glass" 
                size="lg"
                icon={<span className="text-xl">⚡</span>}
              >
                I Nostri Servizi
              </Button>
            </div>
            
            {/* Stats */}
            <div className="grid grid-cols-3 gap-6 pt-8">
              {[
                { number: '50+', label: 'Progetti AI' },
                { number: '95%', label: 'Soddisfazione Clienti' },
                { number: '24/7', label: 'Supporto Tecnico' }
              ].map((stat, index) => (
                <div 
                  key={index}
                  className="text-center group cursor-pointer"
                  style={{ animationDelay: `${index * 200}ms` }}
                >
                  <div className={`
                    text-3xl md:text-4xl font-bold mb-2 
                    bg-gradient-to-r from-primary-500 to-neon-blue bg-clip-text text-transparent
                    group-hover:scale-110 transition-transform duration-300
                  `}>
                    {stat.number}
                  </div>
                  <div className="text-sm text-gray-600 group-hover:text-primary-600 transition-colors duration-300">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Values Grid */}
          <div className="grid grid-cols-2 gap-6">
            {enhancedValues.map((value, index) => (
              <Card
                key={index}
                variant="glass"
                hover={true}
                tilt={true}
                glow={hoveredValue === index}
                className={`
                  group cursor-pointer transition-all duration-500
                  ${hoveredValue === index ? 'scale-105 z-20' : ''}
                  animate-on-scroll
                `}
                style={{ 
                  animationDelay: `${(index + 1) * 150}ms`,
                }}
                onMouseEnter={() => setHoveredValue(index)}
                onMouseLeave={() => setHoveredValue(null)}
              >
                {/* Icon Container */}
                <div className="relative mb-4 group/icon">
                  <div className="relative w-14 h-14">
                    {/* Icon Background */}
                    <div className={`
                      absolute inset-0 bg-gradient-to-r ${value.bgGradient} 
                      rounded-2xl rotate-3 group-hover/icon:rotate-6 
                      transition-transform duration-300
                    `}></div>
                    <div className="absolute inset-1 bg-gradient-to-r from-white to-primary-50/50 rounded-2xl"></div>
                    
                    {/* Icon */}
                    <div className="relative w-full h-full flex items-center justify-center text-2xl group-hover/icon:scale-110 transition-transform duration-300">
                      <div className="relative">
                        {value.icon}
                        {/* Icon Glow */}
                        <div className={`
                          absolute inset-0 text-2xl transition-opacity duration-300
                          ${hoveredValue === index ? 'opacity-100' : 'opacity-0'}
                          text-primary-400 blur-sm
                        `}>
                          {value.icon}
                        </div>
                      </div>
                    </div>
                    
                    {/* Floating Particles */}
                    {hoveredValue === index && (
                      <div className="absolute inset-0">
                        {[...Array(3)].map((_, i) => (
                          <div
                            key={i}
                            className={`
                              absolute w-1 h-1 rounded-full animate-float
                              ${i % 2 === 0 ? 'bg-primary-400/60' : 'bg-neon-blue/60'}
                            `}
                            style={{
                              top: `${20 + i * 20}%`,
                              right: `${-15 + i * 10}%`,
                              animationDelay: `${i * 0.4}s`,
                              animationDuration: `${2 + i * 0.5}s`,
                            }}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Content */}
                <div className="space-y-3">
                  <h3 className={`
                    text-lg lg:text-xl font-bold font-display
                    transition-all duration-300
                    ${hoveredValue === index ? 'text-primary-600 transform translate-x-1' : 'text-gray-900'}
                  `}>
                    {value.title}
                  </h3>
                  
                  <p className="text-gray-600 text-sm leading-relaxed group-hover:text-gray-700 transition-colors duration-300">
                    {value.description}
                  </p>
                </div>
                
                {/* Progress Bar */}
                <div className={`
                  mt-4 h-1 bg-gray-200 rounded-full overflow-hidden
                  transition-all duration-300
                  ${hoveredValue === index ? 'opacity-100' : 'opacity-0'}
                `}>
                  <div 
                    className={`
                      h-full bg-gradient-to-r ${value.gradient} rounded-full
                      transition-all duration-1000 ease-out
                    `}
                    style={{ 
                      width: hoveredValue === index ? '100%' : '0%',
                      transitionDelay: hoveredValue === index ? '200ms' : '0ms'
                    }}
                  />
                </div>
                
                {/* Floating Elements per carta attiva */}
                {hoveredValue === index && (
                  <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
                    {/* Data Flow Line */}
                    <div 
                      className={`
                        absolute top-1/3 left-0 w-full h-px 
                        bg-gradient-to-r from-transparent via-primary-400/40 to-transparent 
                        animate-data-flow
                      `}
                    />
                    
                    {/* Circuit Pattern */}
                    <div className="absolute inset-0 opacity-10">
                      <div 
                        className="absolute inset-0"
                        style={{
                          backgroundImage: `
                            radial-gradient(circle at 25% 25%, #0087FF 1px, transparent 1px),
                            radial-gradient(circle at 75% 75%, #8B5CF6 1px, transparent 1px)
                          `,
                          backgroundSize: '25px 25px, 35px 35px',
                          animation: 'float 4s ease-in-out infinite',
                        }}
                      />
                    </div>
                  </div>
                )}
                
                {/* Border Glow */}
                <div className={`
                  absolute inset-0 rounded-2xl transition-opacity duration-300 p-[1px] -z-10
                  ${hoveredValue === index ? 'opacity-100' : 'opacity-0'}
                  bg-gradient-to-r ${value.gradient} animate-gradient-shift
                `}>
                  <div className="w-full h-full rounded-2xl bg-white/95 backdrop-blur-xl" />
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
      
      {/* Global Glow Effect */}
      <div className={`
        absolute inset-0 transition-opacity duration-1000 pointer-events-none
        ${hoveredValue !== null ? 'opacity-100' : 'opacity-0'}
      `}>
        <div className="absolute inset-0 bg-gradient-to-r from-primary-500/3 via-neon-blue/3 to-neon-purple/3 blur-3xl"></div>
      </div>
      
      {/* AI Visualization Corner */}
      <div className={`
        absolute bottom-8 right-8 transition-all duration-500
        ${hoveredValue !== null ? 'opacity-100 scale-100' : 'opacity-50 scale-90'}
      `}>
        <div className="relative w-24 h-24">
          {/* Rotating Rings */}
          <div className="absolute inset-0 border border-primary-300/30 rounded-full animate-spin-slow"></div>
          <div className="absolute inset-2 border border-neon-blue/30 rounded-full animate-spin-reverse"></div>
          <div className="absolute inset-4 border border-neon-purple/30 rounded-full animate-spin-slow"></div>
          
          {/* Center AI */}
          <div className="absolute inset-8 bg-gradient-to-r from-primary-500 to-neon-blue rounded-full flex items-center justify-center text-white font-bold text-sm animate-pulse-glow">
            AI
          </div>
        </div>
      </div>
    </section>
  );
};

export default About;