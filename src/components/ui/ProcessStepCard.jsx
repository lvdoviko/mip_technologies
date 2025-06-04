// src/components/ui/ProcessStepCard.jsx
import React, { useState, useRef } from 'react';

const ProcessStepCard = ({ step, index, totalSteps }) => {
  const { number, title, description, icon } = step;
  const [isHovered, setIsHovered] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const cardRef = useRef(null);
  
  // Alternare le animazioni per creare un effetto visivo interessante
  const getAnimationClass = () => {
    if (index % 3 === 0) return 'animate-from-left';
    if (index % 3 === 1) return 'animate-on-scroll';
    return 'animate-from-right';
  };

  const handleMouseMove = (e) => {
    if (!cardRef.current) return;
    
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

  // Calcola transform per hover effect
  const getHoverTransform = () => {
    if (!isHovered || !cardRef.current) return '';
    
    const rect = cardRef.current.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    const rotateX = (mousePosition.y - centerY) / 25;
    const rotateY = (centerX - mousePosition.x) / 25;
    
    return `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(20px) scale(1.02)`;
  };

  // Step colors progression
  const getStepColors = () => {
    const colors = [
      { primary: 'from-primary-500 to-neon-blue', bg: 'from-primary-50 to-neon-blue/10' },
      { primary: 'from-neon-blue to-neon-purple', bg: 'from-neon-blue/10 to-neon-purple/10' },
      { primary: 'from-neon-purple to-accent-500', bg: 'from-neon-purple/10 to-accent-50' },
      { primary: 'from-accent-500 to-neon-pink', bg: 'from-accent-50 to-neon-pink/10' },
    ];
    return colors[index % colors.length];
  };

  const stepColors = getStepColors();

  return (
    <div
      className={`relative ${getAnimationClass()}`}
      data-delay={index}
    >
      {/* Main Card */}
      <div 
        ref={cardRef}
        className={`
          relative p-8 rounded-3xl transition-all duration-500 ease-out
          group cursor-pointer overflow-hidden
          glass-card border border-white/30 backdrop-blur-2xl
          hover:-translate-y-2 transform-gpu
          shadow-soft hover:shadow-glass-lg
        `}
        style={{ 
          transform: isHovered ? getHoverTransform() : '',
          animationDelay: `${index * 200}ms`,
        }}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* Background Effects */}
        <div className={`
          absolute inset-0 rounded-3xl transition-opacity duration-500
          ${isHovered ? 'opacity-100' : 'opacity-0'}
          bg-gradient-to-br ${stepColors.bg}
          blur-xl -z-10 scale-110
        `} />
        
        {/* Interactive Background */}
        <div 
          className={`
            absolute inset-0 rounded-3xl opacity-0 transition-opacity duration-300
            ${isHovered ? 'opacity-100' : ''}
          `}
          style={{
            background: `
              radial-gradient(circle at ${mousePosition.x}px ${mousePosition.y}px, 
                rgba(0, 135, 255, 0.1) 0%, 
                transparent 50%
              )
            `,
          }}
        />
        
        {/* Header Section */}
        <div className="flex items-center mb-6">
          {/* Icon Container */}
          <div className="relative mr-4 group/icon">
            <div className="relative w-12 h-12">
              {/* Icon Background */}
              <div className={`
                absolute inset-0 bg-gradient-to-r ${stepColors.primary} opacity-20 
                rounded-xl rotate-3 group-hover/icon:rotate-6 
                transition-transform duration-300
              `}></div>
              <div className="absolute inset-1 bg-gradient-to-r from-white to-primary-50/50 rounded-xl"></div>
              
              {/* Icon */}
              <div className="relative w-full h-full flex items-center justify-center text-2xl group-hover/icon:scale-110 transition-transform duration-300">
                <div className="relative">
                  {icon}
                  {/* Icon Glow */}
                  <div className={`
                    absolute inset-0 text-2xl transition-opacity duration-300
                    ${isHovered ? 'opacity-100' : 'opacity-0'}
                    text-primary-400 blur-sm
                  `}>
                    {icon}
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Step Number */}
          <div className="relative">
            <div className={`
              text-6xl font-bold opacity-10 transition-all duration-300
              ${isHovered ? 'opacity-20 scale-110' : ''}
              bg-gradient-to-r ${stepColors.primary} bg-clip-text text-transparent
            `}>
              {number}
            </div>
            
            {/* Animated Step Indicator */}
            <div className={`
              absolute top-2 left-2 w-8 h-8 rounded-full
              border-2 border-primary-300 flex items-center justify-center
              transition-all duration-300 group-hover:scale-110
              ${isHovered ? 'border-primary-500 bg-primary-50' : ''}
            `}>
              <div className={`
                w-3 h-3 rounded-full bg-gradient-to-r ${stepColors.primary}
                transition-all duration-300
                ${isHovered ? 'scale-125 animate-pulse-glow' : ''}
              `}></div>
            </div>
          </div>
        </div>
        
        {/* Content */}
        <div className="relative z-10 space-y-4">
          {/* Title */}
          <h3 className={`
            text-2xl lg:text-3xl font-bold font-display
            transition-all duration-300
            ${isHovered ? 'text-primary-600 transform translate-x-2' : 'text-gray-900'}
          `}>
            {title}
          </h3>
          
          {/* Description */}
          <p className="text-gray-600 leading-relaxed text-lg group-hover:text-gray-700 transition-colors duration-300">
            {description}
          </p>
        </div>
        
        {/* Floating Elements */}
        {isHovered && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-3xl">
            {/* Circuit Lines */}
            <div 
              className={`
                absolute top-1/3 left-0 w-full h-px 
                bg-gradient-to-r from-transparent via-primary-400/40 to-transparent 
                animate-data-flow
              `}
              style={{ animationDuration: '2s' }}
            />
            
            {/* Floating Particles */}
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className={`
                  absolute w-1 h-1 rounded-full animate-float
                  ${i % 2 === 0 ? 'bg-primary-400/60' : 'bg-neon-blue/60'}
                `}
                style={{
                  top: `${30 + (i * 10)}%`,
                  left: `${20 + (i * 15)}%`,
                  animationDelay: `${i * 0.4}s`,
                  animationDuration: `${2 + i * 0.3}s`,
                }}
              />
            ))}
          </div>
        )}
        
        {/* Progress Indicator */}
        <div className={`
          absolute bottom-4 right-4 transition-all duration-300
          ${isHovered ? 'opacity-100 scale-100' : 'opacity-60 scale-90'}
        `}>
          <div className="flex items-center gap-1">
            {[...Array(totalSteps)].map((_, i) => (
              <div
                key={i}
                className={`
                  w-2 h-2 rounded-full transition-all duration-300
                  ${i <= index 
                    ? `bg-gradient-to-r ${stepColors.primary}` 
                    : 'bg-gray-300'
                  }
                  ${i === index ? 'scale-125 animate-pulse-glow' : ''}
                `}
              />
            ))}
          </div>
        </div>
        
        {/* Border Glow */}
        <div className={`
          absolute inset-0 rounded-3xl transition-opacity duration-300 p-[1px] -z-10
          ${isHovered ? 'opacity-100' : 'opacity-0'}
          bg-gradient-to-r ${stepColors.primary} animate-gradient-shift
        `}>
          <div className="w-full h-full rounded-3xl bg-white/95 backdrop-blur-xl" />
        </div>
        
        {/* Shimmer Effect */}
        <div className={`
          absolute inset-0 shimmer rounded-3xl opacity-0 transition-opacity duration-300
          ${isHovered ? 'opacity-100' : ''}
        `} />
      </div>

      {/* Connection Line */}
      {index < totalSteps - 1 && (
        <div className="hidden lg:block absolute top-1/2 right-0 transform translate-x-4 -translate-y-1/2 z-10">
          <div className="relative w-12 h-1">
            {/* Static Line */}
            <div className="absolute inset-0 bg-gray-200 rounded-full"></div>
            
            {/* Animated Line */}
            <div 
              className={`
                absolute inset-0 rounded-full transition-all duration-500
                bg-gradient-to-r ${stepColors.primary}
                animate-data-flow opacity-0 group-hover:opacity-100
              `}
              style={{ 
                animationDelay: `${index * 200 + 500}ms`,
                animationDuration: '2s',
              }}
            />
            
            {/* Connection Nodes */}
            <div className="absolute -left-1 top-1/2 transform -translate-y-1/2 w-3 h-3 bg-white border-2 border-primary-300 rounded-full"></div>
            <div className="absolute -right-1 top-1/2 transform -translate-y-1/2 w-3 h-3 bg-white border-2 border-primary-300 rounded-full"></div>
            
            {/* Data Flow Particles */}
            {isHovered && (
              <div 
                className="absolute top-1/2 left-0 w-2 h-2 bg-primary-400 rounded-full animate-data-flow"
                style={{ animationDuration: '1.5s' }}
              />
            )}
          </div>
        </div>
      )}
      
      {/* Neural Network Connections */}
      {isHovered && index < totalSteps - 1 && (
        <div className="absolute top-0 right-0 w-20 h-full pointer-events-none overflow-hidden">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className={`
                absolute h-px bg-gradient-to-r from-primary-400/30 to-transparent
                animate-data-flow
              `}
              style={{
                top: `${30 + i * 20}%`,
                width: '100%',
                animationDelay: `${i * 0.5}s`,
                animationDuration: '3s',
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default ProcessStepCard;