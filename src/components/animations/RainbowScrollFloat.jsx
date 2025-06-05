import React, { useEffect, useMemo, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import './ScrollFloat.css';

gsap.registerPlugin(ScrollTrigger);

/**
 * RainbowScrollFloat - Componente che combina l'effetto di testo arcobaleno con l'animazione ScrollFloat
 * Mantiene la dimensione del testo e l'effetto gradiente mentre aggiunge l'animazione al testo
 * 
 * VERSIONE MIGLIORATA: Elimina i margini extra per una migliore integrazione con altri elementi
 */
const RainbowScrollFloat = ({
  children,
  scrollContainerRef,
  containerClassName = "",
  textClassName = "",
  animationDuration = 1,
  ease = 'back.inOut(2)',
  scrollStart = 'center bottom+=50%',
  scrollEnd = 'bottom bottom-=40%',
  stagger = 0.03,
  large = false, // Flag per testo grande, come nei titoli principali
  fontSize = "", // Dimensione del testo personalizzata (es. "text-5xl md:text-7xl lg:text-8xl")
  preserveRainbow = true, // Mantiene l'effetto arcobaleno
  lineHeight = "leading-tight", // Controlla l'altezza della linea
  noMargin = true // Se true, rimuove tutti i margini predefiniti
}) => {
  const containerRef = useRef(null);
  
  const splitText = useMemo(() => {
    const text = typeof children === 'string' ? children : '';
    return text.split("").map((char, index) => (
      <span className="char" key={index}>
        {char === " " ? "\u00A0" : char}
      </span>
    ));
  }, [children]);
  
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    
    const scroller =
      scrollContainerRef && scrollContainerRef.current
        ? scrollContainerRef.current
        : window;
    
    const charElements = el.querySelectorAll('.char');
    
    gsap.fromTo(
      charElements,
      {
        willChange: 'opacity, transform',
        opacity: 0,
        yPercent: 120,
        scaleY: 2.3,
        scaleX: 0.7,
        transformOrigin: '50% 0%'
      },
      {
        duration: animationDuration,
        ease: ease,
        opacity: 1,
        yPercent: 0,
        scaleY: 1,
        scaleX: 1,
        stagger: stagger,
        scrollTrigger: {
          trigger: el,
          scroller,
          start: scrollStart,
          end: scrollEnd,
          scrub: true
        }
      }
    );
  }, [scrollContainerRef, animationDuration, ease, scrollStart, scrollEnd, stagger]);

  // Definisci gli stili per l'effetto arcobaleno
  const rainbowStyle = preserveRainbow ? {
    backgroundImage: large 
      ? `linear-gradient(90deg, #ff0080, #ff8000, #ffff00, #00ff80, #00ffff, #0080ff, #8000ff, #ff0080)`
      : `linear-gradient(90deg, #ff0080, #7928CA, #0070F3, #00DFD8, #7928CA, #ff0080)`,
    backgroundSize: '200% 100%',
    backgroundClip: 'text',
    WebkitBackgroundClip: 'text',
    color: 'transparent',
    WebkitTextFillColor: 'transparent',
    display: 'inline-block',
    animation: 'gradient-animation 8s linear infinite',
    filter: large ? 'brightness(1.1) contrast(1.1)' : 'none',
    textShadow: large ? '0 0 30px rgba(128, 0, 255, 0.15)' : 'none'
  } : {};

  // Determina la classe di dimensione del testo
  const fontSizeClass = fontSize || (large ? 'text-5xl md:text-7xl lg:text-8xl' : 'text-4xl md:text-5xl');
  
  // Aggiungi classi per rimuovere i margini se richiesto
  const marginClasses = noMargin ? 'm-0 p-0' : '';
  
  return (
    <h2 
      ref={containerRef} 
      className={`scroll-float ${fontSizeClass} font-bold ${lineHeight} tracking-tighter ${marginClasses} ${containerClassName}`}
      style={{ 
        overflow: 'hidden',
        marginBottom: noMargin ? '0' : null,
        paddingBottom: noMargin ? '0' : null,
      }}
    >
      <span 
        className={`scroll-float-text ${textClassName}`}
        style={{
          ...rainbowStyle,
          lineHeight: '1.1', // Riduce ulteriormente l'altezza della linea per avvicinare il testo
          display: 'inline-block',
          marginBottom: noMargin ? '-0.2em' : null, // Riduce lo spazio sotto il testo
        }}
      >
        {splitText}
      </span>
    </h2>
  );
};

export default RainbowScrollFloat;