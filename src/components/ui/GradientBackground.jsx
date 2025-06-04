// src/components/ui/GradientBackground.jsx
import React, { useEffect, useState } from 'react';

const GradientBackground = ({ 
  opacity = 0.2, 
  speed = 0.3 
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
        background: `
          radial-gradient(circle at 10% 20%, rgba(0, 102, 255, 0.05) 0%, rgba(0, 0, 0, 0) 20%),
          radial-gradient(circle at 80% 50%, rgba(255, 107, 53, 0.05) 0%, rgba(0, 0, 0, 0) 30%),
          radial-gradient(circle at 30% 70%, rgba(0, 102, 255, 0.05) 0%, rgba(0, 0, 0, 0) 25%),
          radial-gradient(circle at 90% 90%, rgba(255, 107, 53, 0.05) 0%, rgba(0, 0, 0, 0) 20%),
          linear-gradient(135deg, #ffffff 0%, #f8f9fa 50%, #ebf4ff 100%)
        `,
        backgroundSize: '100% 100%',
        transition: 'transform 0.1s ease-out',
      }}
    />
  );
};

export default GradientBackground;