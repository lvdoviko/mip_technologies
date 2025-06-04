// src/components/ui/ParallaxBackground.jsx
import React, { useEffect, useState } from 'react';

const ParallaxBackground = ({ 
  imageUrl = '/bg-pattern.png', // Immagine di default (assicurati di avere questa immagine nella cartella public)
  speed = 0.3, // Velocità dell'effetto parallasse (0-1)
  opacity = 0.1, // Opacità dell'immagine
}) => {
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setOffset(window.pageYOffset);
    };

    window.addEventListener('scroll', handleScroll);
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <div 
      className="fixed top-0 left-0 w-full h-full pointer-events-none z-0"
      style={{
        opacity: opacity,
        transform: `translateY(${offset * speed}px)`,
        backgroundImage: `url(${imageUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        transition: 'transform 0.1s ease-out',
      }}
    />
  );
};

export default ParallaxBackground;