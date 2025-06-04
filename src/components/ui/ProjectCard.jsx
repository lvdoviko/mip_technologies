// src/components/ui/ProjectCard.jsx
import React, { useState, useRef } from 'react';

const ProjectCard = ({ project, index }) => {
  const { title, description, tech, category, image } = project;
  const [isHovered, setIsHovered] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const cardRef = useRef(null);
  
  // Alternare l'animazione da sinistra e destra
  const animationClass = index % 2 === 0 ? 'animate-from-left' : 'animate-from-right';
  
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

  // Calcola transform per tilt effect
  const getTiltTransform = () => {
    if (!isHovered || !cardRef.current) return '';
    
    const rect = cardRef.current.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    const rotateX = (mousePosition.y - centerY) / 20;
    const rotateY = (centerX - mousePosition.x) / 20;
    
    return `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(30px)`;
  };

  // Colori categoria
  const categoryColors = {
    'Web App': 'from-primary-500 to-neon-blue',
    'AI Model': 'from-neon-purple to-neon-pink',
    'Automation': 'from-accent-500 to-neon-pink',
    'Machine Learning': 'from-neon-blue to-primary-500',
    'Deep Learning': 'from-neon-purple to-primary-600',
    'Analytics': 'from-accent-400 to-primary-500',
  };

  const categoryGradient = categoryColors[category] || 'from-primary-500 to-neon-blue';

  return (
    <div 
      ref={cardRef}
      className={`
        relative p-8 rounded-3xl transition-all duration-500 ease-out
        group cursor-pointer overflow-hidden ${animationClass}
        glass-card border border-white/30 backdrop-blur-2xl
        hover:-translate-y-4 hover:scale-105 transform-gpu
        shadow-soft hover:shadow-glass-lg
      `}
      style={{ 
        animationDelay: `${index * 150}ms`,
        transform: isHovered ? getTiltTransform() : '',
      }}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      data-delay={index}
    >
      {/* Background Effects */}
      <div className={`
        absolute inset-0 rounded-3xl transition-opacity duration-500
        ${isHovered ? 'opacity-100' : 'opacity-0'}
        bg-gradient-to-br from-primary-500/5 via-neon-blue/5 to-primary-500/5
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
              rgba(0, 135, 255, 0.08) 0%, 
              transparent 60%
            )
          `,
        }}
      />
      
      {/* Header Section */}
      <div className="flex items-start justify-between mb-6">
        {/* Project Icon */}
        <div className="relative group/icon">
          <div className="relative w-16 h-16">
            {/* Icon Background */}
            <div className={`
              absolute inset-0 bg-gradient-to-r ${categoryGradient} opacity-20 
              rounded-2xl rotate-3 group-hover/icon:rotate-6 
              transition-transform duration-300
            `}></div>
            <div className="absolute inset-1 bg-gradient-to-r from-white to-primary-50/50 rounded-2xl"></div>
            
            {/* Icon */}
            <div className="relative w-full h-full flex items-center justify-center text-3xl group-hover/icon:scale-110 transition-transform duration-300">
              <div className="relative">
                {image}
                {/* Icon Glow */}
                <div className={`
                  absolute inset-0 text-3xl transition-opacity duration-300
                  ${isHovered ? 'opacity-100' : 'opacity-0'}
                  text-primary-400 blur-sm
                `}>
                  {image}
                </div>
              </div>
            </div>
            
            {/* Floating Dots */}
            {isHovered && (
              <div className="absolute inset-0">
                {[...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    className="absolute w-1.5 h-1.5 rounded-full bg-primary-400/60 animate-float"
                    style={{
                      top: `${20 + i * 20}%`,
                      right: `${-20 + i * 10}%`,
                      animationDelay: `${i * 0.5}s`,
                      animationDuration: `${2 + i * 0.5}s`,
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
        
        {/* Category Badge */}
        <div className={`
          relative px-4 py-2 rounded-full text-sm font-semibold
          transition-all duration-300 group-hover:scale-105
          overflow-hidden
        `}>
          {/* Badge Background */}
          <div className={`
            absolute inset-0 bg-gradient-to-r ${categoryGradient} opacity-10
            group-hover:opacity-20 transition-opacity duration-300
          `}></div>
          <div className={`
            absolute inset-0 border border-primary-200/50 rounded-full
            group-hover:border-primary-300/70 transition-colors duration-300
          `}></div>
          
          {/* Badge Text */}
          <span className={`
            relative z-10 bg-gradient-to-r ${categoryGradient} 
            bg-clip-text text-transparent font-bold
          `}>
            {category}
          </span>
          
          {/* Badge Shimmer */}
          {isHovered && (
            <div className="absolute inset-0 shimmer rounded-full"></div>
          )}
        </div>
      </div>
      
      {/* Content */}
      <div className="relative z-10 space-y-4">
        {/* Title */}
        <h3 className={`
          text-2xl lg:text-3xl font-bold font-display
          transition-all duration-300
          ${isHovered ? 'text-primary-600 transform translate-x-1' : 'text-gray-900'}
        `}>
          {title}
        </h3>
        
        {/* Description */}
        <p className="text-gray-600 leading-relaxed text-lg group-hover:text-gray-700 transition-colors duration-300">
          {description}
        </p>
        
        {/* Tech Stack */}
        <div className="flex flex-wrap gap-2 pt-4">
          {tech.map((item, idx) => (
            <div
              key={idx}
              className={`
                relative px-3 py-1.5 rounded-lg text-xs font-medium
                bg-gray-100 text-gray-700 
                hover:bg-primary-50 hover:text-primary-700
                transition-all duration-300 cursor-pointer
                overflow-hidden group/tech
              `}
              style={{
                opacity: isHovered ? 1 : 0.8,
                transform: isHovered ? `translateY(-2px)` : 'translateY(0)',
                transition: `all 0.3s ease ${idx * 50}ms`,
              }}
            >
              {/* Tech Background */}
              <div className="absolute inset-0 bg-gradient-to-r from-primary-50 to-neon-blue/10 opacity-0 group-hover/tech:opacity-100 transition-opacity duration-300"></div>
              
              {/* Tech Text */}
              <span className="relative z-10">{item}</span>
              
              {/* Tech Shimmer */}
              <div className="absolute inset-0 shimmer opacity-0 group-hover/tech:opacity-100 transition-opacity duration-300"></div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Floating Elements */}
      {isHovered && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-3xl">
          {/* Data Flow Lines */}
          <div 
            className="absolute top-1/3 left-0 w-full h-px bg-gradient-to-r from-transparent via-primary-400/40 to-transparent animate-data-flow"
            style={{ animationDuration: '2.5s' }}
          />
          <div 
            className="absolute bottom-1/4 left-0 w-full h-px bg-gradient-to-r from-transparent via-neon-blue/40 to-transparent animate-data-flow"
            style={{ animationDuration: '3.5s', animationDelay: '1s' }}
          />
          
          {/* Circuit Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div 
              className="absolute inset-0"
              style={{
                backgroundImage: `
                  linear-gradient(90deg, rgba(0, 135, 255, 0.3) 1px, transparent 1px),
                  linear-gradient(0deg, rgba(0, 212, 255, 0.2) 1px, transparent 1px)
                `,
                backgroundSize: '30px 30px, 40px 40px',
                animation: 'float 8s ease-in-out infinite',
              }}
            />
          </div>
        </div>
      )}
      
      {/* Corner Tech Elements */}
      <div className={`
        absolute top-4 right-4 w-8 h-8 transition-all duration-300
        ${isHovered ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}
      `}>
        <div className="absolute inset-0 bg-gradient-to-br from-primary-400/30 to-neon-blue/30 rounded-lg animate-pulse-glow"></div>
        <div className="absolute inset-1 bg-white rounded-lg flex items-center justify-center">
          <div className="w-2 h-2 bg-gradient-to-r from-primary-500 to-neon-blue rounded-full"></div>
        </div>
      </div>
      
      <div className={`
        absolute bottom-4 left-4 transition-all duration-300
        ${isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}
      `}>
        <div className="flex items-center gap-1">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="w-1 h-1 rounded-full bg-gradient-to-r from-accent-400 to-neon-pink animate-pulse"
              style={{ animationDelay: `${i * 0.3}s` }}
            />
          ))}
        </div>
      </div>
      
      {/* Border Glow */}
      <div className={`
        absolute inset-0 rounded-3xl transition-opacity duration-300 p-[1px] -z-10
        ${isHovered ? 'opacity-100' : 'opacity-0'}
        bg-gradient-to-r ${categoryGradient} animate-gradient-shift
      `}>
        <div className="w-full h-full rounded-3xl bg-white/95 backdrop-blur-xl" />
      </div>
      
      {/* Shimmer Effect */}
      <div className={`
        absolute inset-0 shimmer rounded-3xl opacity-0 transition-opacity duration-300
        ${isHovered ? 'opacity-100' : ''}
      `} />
    </div>
  );
};

export default ProjectCard;