// src/components/ui/AdvancedButton.jsx
import React, { useState, useRef, useEffect } from 'react';

const AdvancedButton = ({ 
  children, 
  variant = 'primary',
  size = 'md',
  className = '', 
  href, 
  disabled = false,
  glow = false,
  hoverEffect = 'scale', // 'scale', 'shine', 'magnetic', 'pulse'
  ...props 
}) => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);
  const buttonRef = useRef(null);
  
  const sizes = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg',
  };

  const variants = {
    primary: `
      bg-gradient-to-br from-blue-500 to-indigo-600
      text-white font-medium
      border border-blue-400
      shadow-lg shadow-blue-500/20
    `,
    
    secondary: `
      bg-gradient-to-br from-gray-800 to-gray-900
      text-white font-medium
      border border-gray-700
      shadow-lg shadow-gray-900/20
    `,
    
    accent: `
      bg-gradient-to-br from-purple-500 to-pink-500
      text-white font-medium
      border border-purple-400
      shadow-lg shadow-purple-500/20
    `,
    
    outline: `
      bg-transparent 
      text-white font-medium
      border border-gray-300
      shadow-lg
      hover:border-white
    `,
    
    glass: `
      bg-white/10 backdrop-blur-md
      text-white font-medium
      border border-white/20
      shadow-lg
    `,
  };
  
  // Gestione del movimento del mouse per l'effetto magnetico
  const handleMouseMove = (e) => {
    if (!buttonRef.current || hoverEffect !== 'magnetic' || disabled) return;
    
    const button = buttonRef.current;
    const rect = button.getBoundingClientRect();
    
    // Calcola la posizione relativa del mouse all'interno del pulsante
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    
    // Limita lo spostamento
    const maxMove = 10;
    const moveX = Math.max(-maxMove, Math.min(maxMove, x / 8));
    const moveY = Math.max(-maxMove, Math.min(maxMove, y / 8));
    
    setPosition({ x: moveX, y: moveY });
  };
  
  // Gestione dell'entrata del mouse
  const handleMouseEnter = () => {
    if (disabled) return;
    setIsHovering(true);
  };
  
  // Gestione dell'uscita del mouse
  const handleMouseLeave = () => {
    if (disabled) return;
    setIsHovering(false);
    setPosition({ x: 0, y: 0 });
  };
  
  // Reset dopo il click per l'effetto pulse
  const handleClick = (e) => {
    if (disabled) {
      e.preventDefault();
      return;
    }
    
    if (hoverEffect === 'pulse') {
      // Trigger dell'animazione pulse
      const button = buttonRef.current;
      button.classList.remove('animate-pulse-once');
      void button.offsetWidth; // Forza il reflow
      button.classList.add('animate-pulse-once');
    }
    
    if (props.onClick) {
      props.onClick(e);
    }
  };
  
  // Stile per l'effetto glow
  const glowStyle = glow ? {
    boxShadow: isHovering ? 
      `0 0 20px 5px ${variant === 'primary' ? 'rgba(59, 130, 246, 0.6)' : 
                      variant === 'accent' ? 'rgba(168, 85, 247, 0.6)' : 
                      'rgba(255, 255, 255, 0.3)'}` : 
      'none',
    transition: 'box-shadow 0.3s ease-out'
  } : {};
  
  // Stile per l'effetto magnetico
  const magneticStyle = hoverEffect === 'magnetic' && isHovering && !disabled ? {
    transform: `translate(${position.x}px, ${position.y}px)`,
    transition: 'transform 0.1s ease-out'
  } : {};
  
  // Classe di scaling
  const scaleClass = hoverEffect === 'scale' && !disabled ? 
    'hover:scale-105 active:scale-95' : '';
  
  // Classe per l'effetto shine
  const shineClass = hoverEffect === 'shine' && !disabled ? 
    'shine-effect overflow-hidden' : '';
  
  // Aggiungi una regola CSS per l'effetto shine
  useEffect(() => {
    if (hoverEffect === 'shine') {
      const style = document.createElement('style');
      style.innerHTML = `
        .shine-effect {
          position: relative;
          overflow: hidden;
        }
        .shine-effect::after {
          content: '';
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: linear-gradient(
            to bottom right, 
            rgba(255, 255, 255, 0) 0%,
            rgba(255, 255, 255, 0) 40%,
            rgba(255, 255, 255, 0.4) 50%,
            rgba(255, 255, 255, 0) 60%,
            rgba(255, 255, 255, 0) 100%
          );
          transform: rotate(30deg);
          transition: transform 0.7s;
          opacity: 0;
          pointer-events: none;
        }
        .shine-effect:hover::after {
          transform: rotate(30deg) translate(300px, 300px);
          opacity: 1;
        }
        
        @keyframes pulse-once {
          0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.7); }
          70% { transform: scale(1.05); box-shadow: 0 0 0 10px rgba(255, 255, 255, 0); }
          100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255, 255, 255, 0); }
        }
        
        .animate-pulse-once {
          animation: pulse-once 0.5s ease-out forwards;
        }
      `;
      document.head.appendChild(style);
      
      return () => {
        document.head.removeChild(style);
      };
    }
  }, [hoverEffect]);
  
  // Classi di base
  const baseClasses = `
    inline-flex items-center justify-center
    rounded-lg font-medium
    transition-all duration-300
    ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}
    ${sizes[size]}
    ${variants[variant]}
    ${scaleClass}
    ${shineClass}
    ${className}
  `;

  const ButtonContent = () => (
    <span className="flex items-center justify-center gap-2 relative z-10">
      {children}
    </span>
  );

  const commonProps = {
    className: baseClasses,
    style: { ...glowStyle, ...magneticStyle },
    ref: buttonRef,
    disabled,
    onMouseMove: handleMouseMove,
    onMouseEnter: handleMouseEnter,
    onMouseLeave: handleMouseLeave,
    onClick: handleClick,
    ...props
  };

  if (href && !disabled) {
    return (
      <a href={href} {...commonProps}>
        <ButtonContent />
      </a>
    );
  }
  
  return (
    <button type="button" {...commonProps}>
      <ButtonContent />
    </button>
  );
};

export default AdvancedButton;