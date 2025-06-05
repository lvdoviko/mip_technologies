import { useEffect, useMemo, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import './ScrollFloat.css';

gsap.registerPlugin(ScrollTrigger);

/**
 * ScrollFloat - Versione migliorata con fix memory leak, supporto per accessibilità
 * e stabilità del layout
 */
const ScrollFloat = ({
  children,
  scrollContainerRef,
  containerClassName = "",
  textClassName = "",
  animationDuration = 1,
  ease = 'back.inOut(2)',
  scrollStart = 'center bottom+=50%',
  scrollEnd = 'bottom bottom-=40%',
  stagger = 0.03
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
  
  // Versione semplificata se reduced motion è attivo
  if (prefersReducedMotion) {
    return (
      <h2 className={`scroll-float ${containerClassName}`}>
        <span className={`scroll-float-text ${textClassName}`}>
          {typeof children === 'string' ? children : children}
        </span>
        <span className="sr-only">{typeof children === 'string' ? children : ''}</span>
      </h2>
    );
  }
  
  return (
    <h2 
      ref={containerRef} 
      className={`scroll-float ${containerClassName}`}
      style={{ 
        height: containerHeight,
        overflow: 'hidden',
      }}
    >
      <span className={`scroll-float-text ${textClassName}`}>
        {splitText}
      </span>
      
      {/* Testo accessibile per screen reader */}
      <span className="sr-only">{typeof children === 'string' ? children : ''}</span>
    </h2>
  );
};

export default ScrollFloat;