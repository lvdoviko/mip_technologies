import React, { useEffect, useMemo, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import './ScrollFloat.css';

gsap.registerPlugin(ScrollTrigger);

/**
 * RainbowScrollFloat - Versione migliorata con meno bianco nell'effetto arcobaleno
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
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [containerHeight, setContainerHeight] = useState('auto');
  
  // Verifica se l'utente preferisce reduced motion
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = () => setPrefersReducedMotion(mediaQuery.matches);
    mediaQuery.addEventListener('change', handleChange);
    
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);
  
  // Dividi il testo in caratteri per l'animazione
  const splitText = useMemo(() => {
    const text = typeof children === 'string' ? children : '';
    return text.split("").map((char, index) => (
      <span className="char" key={index} aria-hidden="true">
        {char === " " ? "\u00A0" : char}
      </span>
    ));
  }, [children]);
  
  // Misura l'altezza del testo per evitare layout shift
  useEffect(() => {
    if (containerRef.current) {
      // Salva temporaneamente lo stato dei caratteri
      const chars = containerRef.current.querySelectorAll('.char');
      const originalStyles = Array.from(chars).map(char => ({
        opacity: char.style.opacity,
        transform: char.style.transform
      }));
      
      // Imposta tutti i caratteri visibili per misurare l'altezza corretta
      chars.forEach(char => {
        char.style.opacity = '1';
        char.style.transform = 'none';
      });
      
      // Misura l'altezza
      const height = containerRef.current.offsetHeight;
      setContainerHeight(`${height}px`);
      
      // Ripristina lo stato originale
      chars.forEach((char, i) => {
        if (originalStyles[i]) {
          char.style.opacity = originalStyles[i].opacity;
          char.style.transform = originalStyles[i].transform;
        }
      });
    }
  }, [children]);
  
  // Configura l'animazione GSAP
  useEffect(() => {
    const el = containerRef.current;
    if (!el || prefersReducedMotion) return;
    
    const scroller =
      scrollContainerRef && scrollContainerRef.current
        ? scrollContainerRef.current
        : window;
    
    const charElements = el.querySelectorAll('.char');
    
    // Crea l'animazione GSAP
    const tl = gsap.fromTo(
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
    
    // Cleanup dell'animazione per evitare memory leak
    return () => {
      if (tl.scrollTrigger) {
        tl.scrollTrigger.kill();
      }
      tl.kill();
    };
  }, [
    scrollContainerRef, 
    animationDuration, 
    ease, 
    scrollStart, 
    scrollEnd, 
    stagger, 
    prefersReducedMotion
  ]);

  // Definisci gli stili per l'effetto arcobaleno con colori più vivaci e meno bianco
  const rainbowStyle = preserveRainbow ? {
    backgroundImage: large 
      ? `linear-gradient(
          90deg, 
          #ff0080, /* Rosa */
          #ff00ff, /* Magenta */
          #8000ff, /* Viola */
          #0070f3, /* Blu */
          #00bfff, /* Azzurro */
          #00ffff, /* Ciano */
          #00ff80, /* Verde acqua */
          #ffff00, /* Giallo */
          #ff8000, /* Arancione */
          #ff0080  /* Torna al rosa */
        )`
      : `linear-gradient(
          90deg, 
          #ff0080, /* Rosa */
          #ff00ff, /* Magenta */
          #8000ff, /* Viola */
          #0070F3, /* Blu */
          #00bfff, /* Azzurro */
          #00ffff, /* Ciano */
          #00ff80, /* Verde acqua */
          #ffff00, /* Giallo */
          #ff8000, /* Arancione */
          #ff0080  /* Torna al rosa */
        )`,
    backgroundSize: '200% 100%',
    backgroundClip: 'text',
    WebkitBackgroundClip: 'text',
    color: 'transparent',
    WebkitTextFillColor: 'transparent',
    display: 'inline-block',
    animation: prefersReducedMotion ? 'none' : 'gradient-animation 8s linear infinite',
    filter: large ? 'brightness(1.1) contrast(1.1)' : 'none',
    textShadow: large ? '0 0 30px rgba(128, 0, 255, 0.15)' : 'none'
  } : {};

  // Determina la classe di dimensione del testo
  const fontSizeClass = fontSize || (large ? 'text-5xl md:text-7xl lg:text-8xl' : 'text-4xl md:text-5xl');
  
  // Aggiungi classi per rimuovere i margini se richiesto
  const marginClasses = noMargin ? 'm-0 p-0' : '';
  
  // Versione semplificata se reduced motion è attivo
  if (prefersReducedMotion) {
    return (
      <h2 
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
            lineHeight: '1.1',
            display: 'inline-block',
            marginBottom: noMargin ? '-0.2em' : null,
          }}
        >
          {typeof children === 'string' ? children : children}
        </span>
        <span className="sr-only">{typeof children === 'string' ? children : ''}</span>
      </h2>
    );
  }
  
  return (
    <h2 
      ref={containerRef} 
      className={`scroll-float ${fontSizeClass} font-bold ${lineHeight} tracking-tighter ${marginClasses} ${containerClassName}`}
      style={{ 
        overflow: 'hidden',
        marginBottom: noMargin ? '0' : null,
        paddingBottom: noMargin ? '0' : null,
        height: containerHeight,
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
      
      {/* Testo accessibile per screen reader */}
      <span className="sr-only">{typeof children === 'string' ? children : ''}</span>
    </h2>
  );
};

export default RainbowScrollFloat;