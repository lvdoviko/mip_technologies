// src/components/ui/RainbowGradientText.jsx
import React, { useEffect, useRef, useState } from 'react';

const RainbowGradientText = ({ children, className = '', animate = true, large = false }) => {
  const textRef = useRef(null);
  const [gradientPosition, setGradientPosition] = useState(0);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  
  // Verifica se l'utente preferisce reduced motion
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = () => setPrefersReducedMotion(mediaQuery.matches);
    mediaQuery.addEventListener('change', handleChange);
    
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);
  
  useEffect(() => {
    if (!animate || prefersReducedMotion) return;
    
    let frame;
    let start = null;
    
    const animateGradient = (timestamp) => {
      if (!start) start = timestamp;
      const progress = (timestamp - start) / 10000; // 10 seconds per full cycle
      
      setGradientPosition((progress % 1) * 200);
      frame = requestAnimationFrame(animateGradient);
    };
    
    frame = requestAnimationFrame(animateGradient);
    
    return () => {
      cancelAnimationFrame(frame);
    };
  }, [animate, prefersReducedMotion]);

  // Gradiente animato più vivace con meno bianco e più colori vibranti
  const gradientStyle = {
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
    animation: (animate && !prefersReducedMotion) ? 'gradient-animation 8s linear infinite' : 'none',
    filter: large ? 'brightness(1.1) contrast(1.1)' : 'none',
    textShadow: large ? '0 0 30px rgba(128, 0, 255, 0.15)' : 'none',
    backgroundPosition: (animate && !prefersReducedMotion) ? `${gradientPosition}% 0` : '0% 0'
  };

  return (
    <span 
      ref={textRef}
      className={`font-bold ${className}`}
      style={gradientStyle}
    >
      {children}
    </span>
  );
};

export default RainbowGradientText;