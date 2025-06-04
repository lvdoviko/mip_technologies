// src/components/ui/Card.jsx
import React, { useState, useRef } from 'react';

const Card = ({ 
  children, 
  variant = 'default',
  hover = true,
  glow = false,
  tilt = false,
  glass = false,
  className = '',
  onClick,
  ...props 
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const cardRef = useRef(null);

  const handleMouseMove = (e) => {
    if (!cardRef.current || !tilt) return;
    
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setMousePosition({ x, y });
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setMousePosition({ x: 0, y: 0 });
  };

  const variants = {
    default: `
      bg-white border border-gray-100
      shadow-soft hover:shadow-medium
    `,
    
    glass: `
      glass-card 
      shadow-glass hover:shadow-glass-lg
      border border-white/20
      backdrop-blur-xl
    `,
    
    glow: `
      bg-white border border-primary-200/50
      shadow-soft hover:shadow-glow-md
      hover:border-primary-300/50
    `,
    
    neon: `
      bg-cyber-dark border border-neon-blue/30
      shadow-glow-neon hover:shadow-glow-lg
      hover:border-neon-blue/60
    `,
    
    gradient: `
      bg-gradient-to-br from-white to-primary-50/30
      border border-primary-100
      shadow-soft hover:shadow-large
    `,
    
    floating: `
      bg-white border border-gray-200/50
      shadow-large hover:shadow-xl
      hover:border-primary-200/50
    `,
    
    cyber: `
      bg-gradient-to-br from-cyber-gray to-cyber-dark
      border border-neon-purple/30
      shadow-glow-sm hover:shadow-glow-md
      text-white
    `
  };

  // Calcola transform per tilt effect
  const getTiltTransform = () => {
    if (!tilt || !isHovered || !cardRef.current) return '';
    
    const rect = cardRef.current.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    const rotateX = (mousePosition.y - centerY) / 10;
    const rotateY = (centerX - mousePosition.x) / 10;
    
    return `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(20px)`;
  };

  const baseClasses = `
    relative rounded-2xl p-6 md:p-8
    transition-all duration-300 ease-out
    cursor-pointer group overflow-hidden
    ${hover ? 'hover:-translate-y-2' : ''}
    ${tilt ? 'transform-gpu' : ''}
    ${variants[glass ? 'glass' : variant]}
    ${className}
  `;

  const cardStyle = {
    transform: isHovered && tilt ? getTiltTransform() : 
               isHovered && hover ? 'translateY(-8px)' : 'translateY(0)',
    ...props.style
  };

  return (
    <div 
      ref={cardRef}
      className={baseClasses}
      style={cardStyle}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      {...props}
    >
      {/* Background Gradient Overlay */}
      <div className={`
        absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300
        ${isHovered ? 'opacity-100' : ''}
        ${variant === 'default' ? 'bg-gradient-to-br from-primary-50/50 to-transparent' : ''}
        ${variant === 'glass' ? 'bg-gradient-to-br from-white/10 to-transparent' : ''}
        ${variant === 'neon' ? 'bg-gradient-to-br from-neon-blue/10 to-transparent' : ''}
      `} />
      
      {/* Shimmer Effect */}
      {hover && (
        <div className={`
          absolute inset-0 shimmer opacity-0 transition-opacity duration-300
          ${isHovered ? 'opacity-100' : ''}
        `} />
      )}
      
      {/* Glow Effect */}
      {glow && (
        <div className={`
          absolute inset-0 rounded-2xl transition-opacity duration-300
          ${isHovered ? 'opacity-100' : 'opacity-0'}
          bg-gradient-to-r from-primary-500/20 via-neon-blue/20 to-primary-500/20
          blur-xl -z-10 scale-110
        `} />
      )}
      
      {/* Border Glow per varianti speciali */}
      {(variant === 'neon' || variant === 'cyber') && (
        <div className={`
          absolute inset-0 rounded-2xl transition-opacity duration-300
          ${isHovered ? 'opacity-100' : 'opacity-0'}
          bg-gradient-to-r from-neon-blue via-neon-purple to-neon-pink
          p-[1px] -z-10
        `}>
          <div className="w-full h-full rounded-2xl bg-cyber-dark" />
        </div>
      )}
      
      {/* Floating Particles per glass variant */}
      {variant === 'glass' && isHovered && (
        <>
          <div 
            className="absolute w-2 h-2 bg-primary-400/60 rounded-full animate-float"
            style={{
              top: '20%',
              left: '15%',
              animationDelay: '0s'
            }}
          />
          <div 
            className="absolute w-1.5 h-1.5 bg-neon-purple/60 rounded-full animate-float"
            style={{
              top: '70%',
              right: '20%',
              animationDelay: '1s'
            }}
          />
          <div 
            className="absolute w-1 h-1 bg-accent-400/60 rounded-full animate-float"
            style={{
              top: '40%',
              right: '30%',
              animationDelay: '2s'
            }}
          />
        </>
      )}
      
      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
      
      {/* Corner Accent per variant cyber */}
      {variant === 'cyber' && (
        <>
          <div className="absolute top-0 left-0 w-8 h-8">
            <div className="absolute top-2 left-2 w-4 h-0.5 bg-neon-blue" />
            <div className="absolute top-2 left-2 w-0.5 h-4 bg-neon-blue" />
          </div>
          <div className="absolute bottom-0 right-0 w-8 h-8">
            <div className="absolute bottom-2 right-2 w-4 h-0.5 bg-neon-purple" />
            <div className="absolute bottom-2 right-2 w-0.5 h-4 bg-neon-purple" />
          </div>
        </>
      )}
      
      {/* Interactive Hover Highlight */}
      {tilt && (
        <div 
          className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
          style={{
            background: `
              radial-gradient(circle at ${mousePosition.x}px ${mousePosition.y}px, 
                rgba(0, 135, 255, 0.1) 0%, 
                transparent 50%
              )
            `
          }}
        />
      )}
      
      {/* Data Flow Lines per variant cyber */}
      {variant === 'cyber' && isHovered && (
        <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
          <div 
            className="absolute top-1/4 left-0 w-full h-px bg-gradient-to-r from-transparent via-neon-blue/50 to-transparent animate-data-flow"
            style={{ animationDuration: '2s' }}
          />
          <div 
            className="absolute bottom-1/3 left-0 w-full h-px bg-gradient-to-r from-transparent via-neon-purple/50 to-transparent animate-data-flow"
            style={{ animationDuration: '3s', animationDelay: '1s' }}
          />
        </div>
      )}
    </div>
  );
};

export default Card;