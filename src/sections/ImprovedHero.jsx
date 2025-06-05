// src/sections/ImprovedHero.jsx
import React, { useState, useEffect, useRef } from 'react';
import RainbowText from '../components/ui/RainbowText';
import AdvancedButton from '../components/ui/AdvancedButton';
import GlassCard from '../components/ui/GlassCard';

const ImprovedHero = () => {
  const [offset, setOffset] = useState(0);
  const [typedText, setTypedText] = useState('');
  const [isTyping, setIsTyping] = useState(true);
  const heroRef = useRef(null);
  
  const phrases = [
    'Intelligenza Artificiale',
    'Machine Learning',
    'Soluzioni AI',
    'Deep Learning',
    'Innovation'
  ];
  const [currentPhrase, setCurrentPhrase] = useState(0);

  // Gestione dello scroll
  useEffect(() => {
    const handleScroll = () => {
      setOffset(window.pageYOffset);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Effetto 3D parallasse basato sulla posizione del mouse
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!heroRef.current) return;
      
      const heroRect = heroRef.current.getBoundingClientRect();
      
      // Calcola la posizione relativa del mouse rispetto al centro della sezione
      const centerX = heroRect.width / 2;
      const centerY = heroRect.height / 2;
      const mouseX = e.clientX - heroRect.left;
      const mouseY = e.clientY - heroRect.top;
      
      // Normalizza i valori tra -1 e 1
      const normalizedX = (mouseX - centerX) / centerX;
      const normalizedY = (mouseY - centerY) / centerY;
      
      setMousePosition({ x: normalizedX, y: normalizedY });
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Effetto typewriter avanzato
  useEffect(() => {
    let currentIndex = 0;
    let currentChar = 0;
    let isDeleting = false;
    
    const typeWriter = () => {
      const currentText = phrases[currentIndex];
      
      if (!isDeleting) {
        setTypedText(currentText.substring(0, currentChar + 1));
        currentChar++;
        
        if (currentChar === currentText.length) {
          setIsTyping(false);
          setTimeout(() => { 
            isDeleting = true; 
            setIsTyping(true);
          }, 2000);
        }
      } else {
        setTypedText(currentText.substring(0, currentChar - 1));
        currentChar--;
        
        if (currentChar === 0) {
          isDeleting = false;
          currentIndex = (currentIndex + 1) % phrases.length;
          setCurrentPhrase(currentIndex);
        }
      }
    };

    const timer = setInterval(typeWriter, isDeleting ? 50 : 120);
    return () => clearInterval(timer);
  }, [currentPhrase]);

  // Calcola le trasformazioni basate sulla posizione del mouse per l'effetto 3D
  const getParallaxStyle = (depth) => {
    const moveX = mousePosition.x * depth;
    const moveY = mousePosition.y * depth;
    
    return {
      transform: `translate(${moveX}px, ${moveY}px)`,
      transition: 'transform 0.1s ease-out'
    };
  };
  
  // Stile per l'effetto scroll parallasse
  const getScrollParallaxStyle = (depth) => {
    return {
      transform: `translateY(${-offset * depth}px)`,
      transition: 'transform 0.1s ease-out'
    };
  };

  return (
    <section 
      ref={heroRef}
      className="min-h-screen flex items-center justify-center pt-20 relative overflow-hidden"
    >
      {/* Elementi decorativi di sfondo */}
      <div 
        className="absolute top-1/4 left-1/5 w-64 h-64 rounded-full bg-blue-500/5"
        style={{ 
          ...getParallaxStyle(15),
          ...getScrollParallaxStyle(0.05),
          filter: 'blur(40px)'
        }}
      />
      
      <div 
        className="absolute bottom-1/4 right-1/5 w-96 h-96 rounded-full bg-purple-500/5"
        style={{ 
          ...getParallaxStyle(25),
          ...getScrollParallaxStyle(0.08),
          filter: 'blur(50px)'
        }}
      />
      
      <div 
        className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full h-full"
        style={{ 
          background: 'radial-gradient(circle at center, rgba(59, 130, 246, 0.1) 0%, rgba(15, 23, 42, 0) 50%)',
          ...getParallaxStyle(5)
        }}
      />
      
      {/* Content Container */}
      <div className="container mx-auto max-w-6xl px-4 text-center relative z-10">
        {/* Badge */}
        <GlassCard 
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium mb-8 mx-auto"
          borderGlow={true}
          glowColor="rgba(59, 130, 246, 0.3)"
          style={getParallaxStyle(8)}
        >
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
          Tecnologie AI Avanzate
        </GlassCard>
        
        {/* Main Heading */}
        <div 
          className="mb-8"
          style={getScrollParallaxStyle(0.1)}
        >
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold leading-tight mb-6 text-gray-100">
            Il Futuro è
            <br />
            <span className="relative inline-block">
              <RainbowText size="inherit" animated={true} speed={5}>
                {typedText}
              </RainbowText>
              <span 
                className={`inline-block w-1 h-12 md:h-16 lg:h-20 bg-gradient-to-r from-pink-500 to-violet-500 ml-2 align-middle ${isTyping ? 'typewriter-cursor' : 'opacity-0'}`}
              ></span>
            </span>
          </h1>
        </div>
        
        {/* Subtitle */}
        <div 
          className="mb-12"
          style={{ 
            ...getParallaxStyle(4),
            ...getScrollParallaxStyle(0.05)
          }}
        >
          <p className="text-lg md:text-xl lg:text-2xl text-gray-300 max-w-4xl mx-auto leading-relaxed">
            Trasformiamo le tue idee in{' '}
            <span className="text-gray-100 font-semibold">soluzioni innovative</span>.
            <br className="hidden md:block" />
            Implementiamo e sviluppiamo modelli di intelligenza artificiale{' '}
            <span className="text-gray-100 font-semibold">su misura</span> per il tuo business.
          </p>
        </div>
        
        {/* CTA Buttons */}
        <div
          className="flex flex-col sm:flex-row gap-4 justify-center items-center"
          style={getParallaxStyle(10)}
        >
          <AdvancedButton 
            href="#servizi" 
            variant="primary" 
            size="lg"
            glow={true}
            hoverEffect="shine"
          >
            Scopri i Nostri Servizi
          </AdvancedButton>
          
          <AdvancedButton 
            href="#contatti" 
            variant="glass" 
            size="lg"
            hoverEffect="scale"
          >
            Richiedi Consulenza
          </AdvancedButton>
        </div>
        
        {/* Scroll Indicator */}
        <div 
            className="absolute bottom-4 left-1/2 transform -translate-x-1/2"
            style={{ 
                opacity: Math.max(0, 1 - offset / 300),
                transition: 'opacity 0.3s ease-out',
                marginBottom: "2rem", // Aggiunto margine per abbassarlo ulteriormente
            }}
        >
            <div className="w-6 h-10 border-2 border-gray-300 rounded-full flex justify-center">
                <div className="w-1 h-3 bg-gray-400 rounded-full mt-2 animate-bounce"></div>
            </div>
        </div>
      </div>
    </section>
  );
};

export default ImprovedHero;