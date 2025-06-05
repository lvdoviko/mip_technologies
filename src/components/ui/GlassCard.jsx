// src/components/ui/GlassCard.jsx
import React, { useState, useEffect, useRef } from 'react';

const GlassCard = ({ 
  children, 
  className = '', 
  borderGlow = false,
  interactive = true,
  glowColor = 'rgba(59, 130, 246, 0.5)', // Colore blu predefinito
  onClick,
  ...props 
}) => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);
  const cardRef = useRef(null);
  
  // Gestione del movimento del mouse per l'effetto 3D
  const handleMouseMove = (e) => {
    if (!cardRef.current || !interactive) return;
    
    const card = cardRef.current;
    const rect = card.getBoundingClientRect();
    
    // Calcola la posizione relativa del mouse all'interno della card
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Normalizza la posizione (0-1)
    const normalizedX = x / rect.width;
    const normalizedY = y / rect.height;
    
    setPosition({ x: normalizedX, y: normalizedY });
  };
  
  // Gestione dell'entrata del mouse
  const handleMouseEnter = () => {
    setIsHovering(true);
  };
  
  // Gestione dell'uscita del mouse
  const handleMouseLeave = () => {
    setIsHovering(false);
    // Resetta la posizione gradualmente
    setTimeout(() => setPosition({ x: 0.5, y: 0.5 }), 100);
  };
  
  // Calcola gli angoli di rotazione basati sulla posizione del mouse
  const rotateX = isHovering && interactive ? (position.y - 0.5) * 10 : 0;
  const rotateY = isHovering && interactive ? (0.5 - position.x) * 10 : 0;
  
  // Calcola la posizione dell'highlight basata sulla posizione del mouse
  const highlightX = position.x * 100;
  const highlightY = position.y * 100;
  
  // Stile di base per l'effetto glassmorphism
  const glassStyle = {
    background: 'rgba(15, 23, 42, 0.6)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    transform: isHovering && interactive ? 
      `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.02)` : 
      'perspective(1000px) rotateX(0deg) rotateY(0deg) scale(1)',
    transition: 'all 0.2s ease-out',
    boxShadow: borderGlow ? 
      `0 0 15px ${glowColor}, 0 0 30px ${glowColor.replace('0.5', '0.2')}` : 
      '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    position: 'relative',
    overflow: 'hidden'
  };
  
  // Highlight interno quando il mouse si muove sulla card
  const highlightStyle = {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
    background: isHovering && interactive ? 
      `radial-gradient(circle at ${highlightX}% ${highlightY}%, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0) 50%)` :
      'none',
    opacity: isHovering ? 1 : 0,
    transition: 'opacity 0.3s ease-out'
  };
  
  // Classi di base
  const baseClasses = `
    rounded-xl p-6 md:p-8
    transition-all duration-300
    ${className}
  `;

  return (
    <div 
      ref={cardRef}
      className={baseClasses}
      style={glassStyle}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      {...props}
    >
      {/* Highlight interno che segue il mouse */}
      <div style={highlightStyle} />
      
      {/* Contenuto della card */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};

export default GlassCard;