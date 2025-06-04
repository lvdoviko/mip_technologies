// src/sections/Services.jsx
import React, { useState, useEffect } from 'react';
import { useScrollAnimation } from '../hooks/useScrollAnimation';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { services } from '../data/services';

const Services = () => {
  useScrollAnimation();
  const [hoveredCard, setHoveredCard] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePos({
        x: (e.clientX / window.innerWidth) * 100,
        y: (e.clientY / window.innerHeight) * 100,
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Enhanced service icons con animazioni
  const serviceIcons = {
    0: (
      <div className="relative group">
        <div className="text-4xl transition-transform duration-300 group-hover:scale-110">⚡</div>
        <div className="absolute inset-0 bg-primary-400/20 rounded-lg blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      </div>
    ),
    1: (
      <div className="relative group">
        <div className="text-4xl transition-transform duration-300 group-hover:scale-110">🎯</div>
        <div className="absolute inset-0 bg-neon-blue/20 rounded-lg blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      </div>
    ),
    2: (
      <div className="relative group">
        <div className="text-4xl transition-transform duration-300 group-hover:scale-110">🧠</div>
        <div className="absolute inset-0 bg-neon-purple/20 rounded-lg blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      </div>
    ),
  };

  return (
    <section 
      id="servizi" 
      className="relative py-24 overflow-hidden"
      style={{
        background: `
          radial-gradient(ellipse at ${mousePos.x}% ${mousePos.y}%, rgba(0, 135, 255, 0.05) 0%, transparent 50%),
          linear-gradient(135deg, #ffffff 0%, #f8faff 50%, #ffffff 100%)
        `,
        transition: 'background 0.3s ease-out',
      }}
    >
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-30">
        <div 
          className="absolute inset-0"
          style={{
            backgroundImage: `
              radial-gradient(circle at 25% 25%, rgba(0, 135, 255, 0.1) 1px, transparent 1px),
              radial-gradient(circle at 75% 75%, rgba(139, 92, 246, 0.1) 1px, transparent 1px)
            `,
            backgroundSize: '60px 60px, 80px 80px',
            backgroundPosition: '0 0, 30px 30px',
          }}
        />
      </div>
      
      {/* Floating Elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div 
          className="absolute w-64 h-64 rounded-full opacity-5 bg-gradient-to-r from-primary-500 to-neon-blue animate-float"
          style={{ top: '10%', right: '10%' }}
        />
        <div 
          className="absolute w-48 h-48 rounded-full opacity-8 bg-gradient-to-r from-neon-purple to-accent-500 animate-float"
          style={{ bottom: '20%', left: '5%', animationDelay: '2s' }}
        />
      </div>
      
      <div className="container mx-auto max-w-7xl px-4 relative z-10">
        {/* Header Section */}
        <div className="text-center mb-20 animate-on-scroll">
          <div className="inline-flex items-center gap-3 mb-6 glass-card px-6 py-3 rounded-full">
            <span className="text-2xl animate-bounce-subtle">🚀</span>
            <span className="text-sm font-semibold text-primary-600 uppercase tracking-wider">
              I Nostri Servizi
            </span>
          </div>
          
          <h2 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-8 font-display">
            <span className="text-gray-900">Soluzioni</span>
            <br />
            <span className="text-gradient bg-gradient-to-r from-primary-500 via-neon-blue to-primary-600 bg-clip-text text-transparent">
              AI Complete
            </span>
          </h2>
          
          <p className="text-xl md:text-2xl text-gray-600 max-w-4xl mx-auto leading-relaxed">
            Trasformiamo il tuo business con{' '}
            <span className="text-gradient-accent font-semibold">intelligenza artificiale avanzata</span>.
            <br className="hidden md:block" />
            Ogni soluzione è progettata per massimizzare l'efficienza e l'innovazione.
          </p>
        </div>
        
        {/* Services Grid */}
        <div className="grid lg:grid-cols-3 gap-8 mb-16">
          {services.map((service, index) => (
            <Card
              key={index}
              variant="glass"
              hover={true}
              tilt={true}
              glow={hoveredCard === index}
              className={`
                group cursor-pointer transition-all duration-500
                ${hoveredCard === index ? 'scale-105 z-20' : 'hover:scale-102'}
                animate-on-scroll
              `}
              style={{ animationDelay: `${index * 200}ms` }}
              onMouseEnter={() => setHoveredCard(index)}
              onMouseLeave={() => setHoveredCard(null)}
            >
              {/* Service Icon */}
              <div className="mb-6">
                <div className="relative w-16 h-16 mx-auto lg:mx-0 mb-4">
                  <div className="absolute inset-0 bg-gradient-to-r from-primary-500/20 to-neon-blue/20 rounded-2xl rotate-3 group-hover:rotate-6 transition-transform duration-300"></div>
                  <div className="relative w-full h-full bg-gradient-to-r from-primary-50 to-neon-blue/10 rounded-2xl flex items-center justify-center border border-primary-200/50">
                    {serviceIcons[index] || (
                      <div className="text-4xl text-primary-600">{service.icon}</div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Service Content */}
              <div className="space-y-4">
                <h3 className="text-2xl lg:text-3xl font-bold text-gray-900 group-hover:text-primary-600 transition-colors duration-300">
                  {service.title}
                </h3>
                
                <p className="text-gray-600 leading-relaxed text-lg">
                  {service.description}
                </p>
                
                {/* Features List */}
                <div className="space-y-3 pt-4">
                  {service.features.map((feature, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-3 group/feature"
                    >
                      <div className="w-2 h-2 rounded-full bg-gradient-to-r from-primary-500 to-neon-blue group-hover/feature:scale-125 transition-transform duration-200"></div>
                      <span className="text-gray-700 group-hover/feature:text-primary-600 transition-colors duration-200">
                        {feature}
                      </span>
                    </div>
                  ))}
                </div>
                
                {/* Hover CTA */}
                <div className={`
                  pt-6 transition-all duration-300
                  ${hoveredCard === index ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
                `}>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="w-full group-hover:border-primary-500 group-hover:text-primary-600"
                  >
                    Scopri di più
                    <svg
                      className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform duration-200"
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
                  </Button>
                </div>
              </div>
              
              {/* Floating Particles per ogni card */}
              {hoveredCard === index && (
                <div className="absolute inset-0 pointer-events-none">
                  {[...Array(6)].map((_, i) => (
                    <div
                      key={i}
                      className={`
                        absolute w-1 h-1 rounded-full animate-float
                        ${i % 3 === 0 ? 'bg-primary-400/60' : 
                          i % 3 === 1 ? 'bg-neon-blue/60' : 'bg-neon-purple/60'}
                      `}
                      style={{
                        top: `${20 + i * 10}%`,
                        left: `${10 + i * 15}%`,
                        animationDelay: `${i * 0.3}s`,
                        animationDuration: `${2 + i * 0.5}s`,
                      }}
                    />
                  ))}
                </div>
              )}
              
              {/* Data Flow Lines */}
              {hoveredCard === index && (
                <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
                  <div 
                    className="absolute top-1/4 left-0 w-full h-px bg-gradient-to-r from-transparent via-primary-400/50 to-transparent animate-data-flow"
                  />
                  <div 
                    className="absolute bottom-1/3 left-0 w-full h-px bg-gradient-to-r from-transparent via-neon-blue/50 to-transparent animate-data-flow"
                    style={{ animationDelay: '1s' }}
                  />
                </div>
              )}
            </Card>
          ))}
        </div>
        
        {/* CTA Section */}
        <div className="text-center animate-on-scroll" style={{ animationDelay: '800ms' }}>
          <div className="glass-card p-8 md:p-12 rounded-3xl border border-white/30 max-w-4xl mx-auto">
            <h3 className="text-3xl md:text-4xl font-bold mb-6 text-gray-900">
              Pronto a trasformare il tuo business con l'AI?
            </h3>
            
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              Scopri come le nostre soluzioni possono rivoluzionare la tua azienda. 
              <span className="text-primary-600 font-semibold"> Consulenza gratuita</span> disponibile.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                href="#contatti" 
                variant="primary" 
                size="lg"
                glow={true}
                icon={<span className="text-xl">💡</span>}
              >
                Richiedi Consulenza Gratuita
              </Button>
              
              <Button 
                href="#progetti" 
                variant="glass" 
                size="lg"
                icon={<span className="text-xl">📊</span>}
              >
                Vedi i Nostri Progetti
              </Button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Background Glow Effect */}
      <div className={`
        absolute inset-0 transition-opacity duration-500 pointer-events-none
        ${hoveredCard !== null ? 'opacity-100' : 'opacity-0'}
      `}>
        <div className="absolute inset-0 bg-gradient-to-r from-primary-500/5 via-neon-blue/5 to-primary-500/5 blur-3xl"></div>
      </div>
    </section>
  );
};

export default Services;