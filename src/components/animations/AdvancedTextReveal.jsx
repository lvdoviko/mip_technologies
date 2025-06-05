import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import ScrollFloat from './ScrollFloat';

gsap.registerPlugin(ScrollTrigger);

/**
 * Componente avanzato per animare sezioni di testo con effetti multipli
 * Combina ScrollFloat con altre animazioni GSAP
 */
const AdvancedTextReveal = ({
  title,
  subtitle,
  description,
  align = 'center',
  theme = 'light',
  titleClassName = '',
  subtitleClassName = '',
  descriptionClassName = '',
}) => {
  const sectionRef = useRef(null);
  const subtitleRef = useRef(null);
  const descriptionRef = useRef(null);
  
  // Configurazione del tema
  const textColors = {
    light: {
      title: 'text-white',
      subtitle: 'text-gray-300',
      description: 'text-gray-400',
    },
    dark: {
      title: 'text-gray-900',
      subtitle: 'text-gray-700',
      description: 'text-gray-600',
    },
    gradient: {
      title: 'text-gradient-rainbow',
      subtitle: 'text-gradient',
      description: 'text-gray-400',
    },
  };
  
  // Allineamento del testo
  const textAlign = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  };
  
  // Effetto animazione per sottotitolo e descrizione
  useEffect(() => {
    if (!subtitleRef.current || !descriptionRef.current) return;
    
    // Animazione per il sottotitolo
    gsap.fromTo(
      subtitleRef.current,
      {
        opacity: 0,
        y: 30,
      },
      {
        opacity: 1,
        y: 0,
        duration: 1,
        delay: 0.3, // Ritardo dopo l'animazione del titolo
        ease: 'power3.out',
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top bottom-=10%',
          end: 'center center',
          scrub: false, // Animazione singola, non continua con lo scroll
          toggleActions: 'play none none reverse', // play, reverse, reset, etc.
        },
      }
    );
    
    // Animazione per la descrizione
    gsap.fromTo(
      descriptionRef.current,
      {
        opacity: 0,
        y: 40,
      },
      {
        opacity: 1,
        y: 0,
        duration: 1,
        delay: 0.5, // Ritardo dopo l'animazione del sottotitolo
        ease: 'power2.out',
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top bottom-=10%',
          end: 'center center',
          scrub: false,
          toggleActions: 'play none none reverse',
        },
      }
    );
  }, []);
  
  return (
    <div 
      ref={sectionRef}
      className={`space-y-6 ${textAlign[align]}`}
    >
      {/* Titolo con ScrollFloat */}
      <ScrollFloat
        containerClassName={`text-4xl md:text-5xl font-bold leading-tight ${textColors[theme].title} ${titleClassName}`}
        animationDuration={0.8}
        ease="back.out(1.7)"
        scrollStart="top bottom-=10%"
        scrollEnd="center center"
        stagger={0.025}
      >
        {title}
      </ScrollFloat>
      
      {/* Sottotitolo */}
      <div 
        ref={subtitleRef}
        className={`text-xl md:text-2xl font-semibold ${textColors[theme].subtitle} ${subtitleClassName} opacity-0`}
      >
        {subtitle}
      </div>
      
      {/* Descrizione */}
      <div 
        ref={descriptionRef}
        className={`max-w-3xl mx-auto leading-relaxed ${textColors[theme].description} ${descriptionClassName} opacity-0`}
      >
        {description}
      </div>
    </div>
  );
};

export default AdvancedTextReveal;