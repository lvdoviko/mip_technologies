// src/sections/Hero.jsx
import React, { useState, useEffect } from 'react';
import { useScrollAnimation } from '../hooks/useScrollAnimation';
import Button from '../components/ui/Button';

const Hero = () => {
  useScrollAnimation();
  const [offset, setOffset] = useState(0);
  const [typedText, setTypedText] = useState('');
  
  const phrases = [
    'Intelligenza Artificiale',
    'Machine Learning',
    'Soluzioni AI',
    'Deep Learning',
    'Innovation'
  ];
  const [currentPhrase, setCurrentPhrase] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setOffset(window.pageYOffset);
    };

    window.addEventListener('scroll', handleScroll);
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Typewriter effect minimal
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
          setTimeout(() => { isDeleting = true; }, 2000);
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

  return (
    <section className="min-h-screen flex items-center justify-center pt-20 relative overflow-hidden">
      {/* Content Container */}
      <div className="container mx-auto max-w-6xl px-4 text-center relative z-10">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 bg-gray-800 text-gray-100 px-4 py-2 rounded-full text-sm font-medium mb-8 animate-fade-in border border-gray-700">
          <div className="w-2 h-2 bg-primary-500 rounded-full animate-pulse-subtle"></div>
          Tecnologie AI Avanzate
        </div>
        
        {/* Main Heading */}
        <div className="mb-8 animate-slide-up">
          <h1 
            className="text-4xl md:text-6xl lg:text-7xl font-bold leading-tight mb-6 text-gray-100"
            style={{ 
              transform: `translateY(${-offset * 0.1}px)`,
              transition: 'transform 0.1s ease-out',
            }}
          >
            Il Futuro è
            <br />
            <span className="text-gradient-rainbow">
              {typedText}
              <span className="inline-block w-1 h-12 md:h-16 lg:h-20 bg-gradient-to-r from-pink-500 to-violet-500 ml-2 align-middle typewriter-cursor"></span>
            </span>
          </h1>
        </div>
        
        {/* Subtitle */}
        <div 
          className="animate-slide-up mb-12"
          style={{ 
            animationDelay: '0.2s',
            transform: `translateY(${-offset * 0.05}px)`,
            transition: 'transform 0.1s ease-out',
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
          className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-slide-up"
          style={{ 
            animationDelay: '0.4s',
          }}
        >
          <Button 
            href="#servizi" 
            variant="primary" 
            size="lg"
          >
            Scopri i Nostri Servizi
          </Button>
          
          <Button 
            href="#contatti" 
            variant="outline" 
            size="lg"
          >
            Richiedi Consulenza
          </Button>
        </div>
        
        {/* Scroll Indicator */}
        <div 
          className="absolute bottom-8 left-1/2 transform -translate-x-1/2"
          style={{ 
            opacity: Math.max(0, 1 - offset / 300),
            transition: 'opacity 0.3s ease-out',
          }}
        >
          <div className="w-6 h-10 border-2 border-gray-300 rounded-full flex justify-center">
            <div className="w-1 h-3 bg-gray-400 rounded-full mt-2 animate-pulse-subtle"></div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;