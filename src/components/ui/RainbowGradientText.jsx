// src/components/ui/RainbowGradientText.jsx
import React, { useEffect, useRef, useState } from 'react';

const RainbowGradientText = ({ children, className = '', animate = true, large = false }) => {
  const textRef = useRef(null);
  const [gradientPosition, setGradientPosition] = useState(0);
  
  useEffect(() => {
    if (!animate) return;
    
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
  }, [animate]);

  // Gradiente animato più ricco per un effetto arcobaleno premium
  const gradientStyle = {
    backgroundImage: large 
      ? `linear-gradient(
          90deg, 
          #ff0080 ${gradientPosition - 100}%, 
          #ff8000 ${gradientPosition - 50}%, 
          #ffff00 ${gradientPosition}%, 
          #00ff80 ${gradientPosition + 50}%, 
          #00ffff ${gradientPosition + 100}%, 
          #0080ff ${gradientPosition + 150}%, 
          #8000ff ${gradientPosition + 200}%, 
          #ff0080 ${gradientPosition + 250}%
        )`
      : `linear-gradient(
          90deg, 
          #ff0080 ${gradientPosition - 100}%, 
          #7928CA ${gradientPosition - 50}%, 
          #0070F3 ${gradientPosition}%, 
          #00DFD8 ${gradientPosition + 50}%, 
          #7928CA ${gradientPosition + 100}%, 
          #ff0080 ${gradientPosition + 150}%
        )`,
    backgroundSize: '200% 100%',
    backgroundClip: 'text',
    WebkitBackgroundClip: 'text',
    color: 'transparent',
    WebkitTextFillColor: 'transparent',
    display: 'inline-block',
    transition: animate ? 'none' : 'background-position 1s ease',
    filter: large ? 'brightness(1.1) contrast(1.1)' : 'none',
    textShadow: large ? '0 0 30px rgba(128, 0, 255, 0.15)' : 'none'
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

// Esporta SOLO il componente, senza la demo
export default RainbowGradientText;