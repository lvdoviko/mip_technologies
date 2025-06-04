// src/components/ui/Button.jsx
import React, { useState } from 'react';

const Button = ({ 
  children, 
  variant = 'primary', 
  size = 'md',
  className = '', 
  href, 
  disabled = false,
  icon,
  glow = false,
  ...props 
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isClicked, setIsClicked] = useState(false);

  const sizes = {
    sm: 'px-6 py-3 text-sm',
    md: 'px-8 py-4 text-base',
    lg: 'px-10 py-5 text-lg',
    xl: 'px-12 py-6 text-xl',
  };

  const variants = {
    primary: `
      bg-gradient-to-r from-primary-500 to-primary-400
      hover:from-primary-600 hover:to-primary-500
      text-white font-semibold
      shadow-lg hover:shadow-glow-md
      border border-primary-400/20
      relative overflow-hidden
      ${glow ? 'animate-pulse-glow' : ''}
    `,
    
    secondary: `
      bg-gradient-to-r from-secondary-100 to-secondary-50
      hover:from-secondary-200 hover:to-secondary-100
      text-primary-600 font-semibold
      shadow-soft hover:shadow-medium
      border border-secondary-200
      relative overflow-hidden
    `,
    
    outline: `
      border-2 border-primary-500 text-primary-600
      hover:bg-primary-500 hover:text-white
      bg-transparent backdrop-blur-sm
      shadow-soft hover:shadow-glow-md
      relative overflow-hidden
      font-semibold
    `,
    
    glass: `
      glass-card text-primary-600
      hover:bg-white/20 font-semibold
      border border-white/30
      shadow-glass hover:shadow-glass-lg
      relative overflow-hidden
    `,
    
    neon: `
      bg-cyber-dark border border-neon-blue/50
      text-neon-blue font-bold
      hover:border-neon-blue hover:text-white
      hover:bg-neon-blue/10
      shadow-glow-neon hover:shadow-glow-lg
      relative overflow-hidden neon-text
    `,
    
    accent: `
      bg-gradient-to-r from-accent-500 to-accent-400
      hover:from-accent-600 hover:to-accent-500
      text-white font-semibold
      shadow-lg hover:shadow-glow-accent
      border border-accent-400/20
      relative overflow-hidden
    `
  };

  const baseClasses = `
    inline-flex items-center justify-center
    rounded-xl font-medium
    transition-all duration-300
    transform-gpu
    cursor-pointer
    relative
    group
    ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:-translate-y-1 active:translate-y-0'}
    ${sizes[size]}
    ${variants[variant]}
    ${className}
  `;

  const handleMouseEnter = () => setIsHovered(true);
  const handleMouseLeave = () => setIsHovered(false);
  const handleMouseDown = () => setIsClicked(true);
  const handleMouseUp = () => setIsClicked(false);

  const ButtonContent = () => (
    <>
      {/* Shimmer Effect */}
      <div className="absolute inset-0 shimmer opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      {/* Ripple Effect Background */}
      <div 
        className={`
          absolute inset-0 rounded-xl
          ${isClicked ? 'animate-click-shrink' : ''}
          transition-transform duration-100
        `}
      />
      
      {/* Glow Effect per variant neon */}
      {variant === 'neon' && (
        <div className="absolute inset-0 rounded-xl bg-neon-blue/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      )}
      
      {/* Content Container */}
      <div className="relative z-10 flex items-center justify-center gap-2">
        {icon && (
          <span className={`
            transition-transform duration-300
            ${isHovered ? 'translate-x-1' : ''}
          `}>
            {icon}
          </span>
        )}
        
        <span className={`
          transition-all duration-300
          ${isHovered && variant === 'neon' ? 'animate-neon-pulse' : ''}
        `}>
          {children}
        </span>
        
        {/* Arrow per effetto dinamico */}
        {(variant === 'primary' || variant === 'accent') && (
          <svg
            className={`
              w-4 h-4 ml-1 transition-all duration-300
              ${isHovered ? 'translate-x-1 opacity-100' : 'translate-x-0 opacity-70'}
            `}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 8l4 4m0 0l-4 4m4-4H3"
            />
          </svg>
        )}
      </div>
      
      {/* Floating Particles per variant glass */}
      {variant === 'glass' && isHovered && (
        <div className="floating-particles absolute inset-0" />
      )}
      
      {/* Gradient Overlay per hover effect */}
      <div className={`
        absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100
        transition-opacity duration-300
        ${variant === 'primary' ? 'bg-gradient-to-r from-white/10 to-transparent' : ''}
        ${variant === 'glass' ? 'bg-gradient-to-r from-white/20 to-transparent' : ''}
      `} />
    </>
  );

  const commonProps = {
    className: baseClasses,
    onMouseEnter: handleMouseEnter,
    onMouseLeave: handleMouseLeave,
    onMouseDown: handleMouseDown,
    onMouseUp: handleMouseUp,
    disabled,
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
    <button {...commonProps}>
      <ButtonContent />
    </button>
  );
};

export default Button;