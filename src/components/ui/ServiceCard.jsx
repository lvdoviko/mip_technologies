// src/components/ui/ServiceCard.jsx
import React, { useState, useRef } from 'react';

const ServiceCard = ({ icon, title, description, features, index }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const cardRef = useRef(null);

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
    
    const rotateX = (mousePosition.y - centerY) / 15;
    const rotateY = (centerX - mousePosition.x) / 15;
    
    return `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(20px)`;
  };

  return (
    <div 
      ref={cardRef}
      className={`
        relative p-8 rounded-3xl transition-all duration-500 ease-out
        group cursor-pointer overflow-hidden animate-on-scroll
        glass-card border border-white/30 backdrop-blur-2xl
        hover:-translate-y-3 hover:scale-105 transform-gpu
      `}
      style={{ 
        animationDelay: `${index * 200}ms`,
        transform: isHovered ? getTiltTransform() : 'translateY(0)',
      }}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      data-delay={index}
    >
      {/* Background Glow Effect */}
      <div className={`
        absolute inset-0 rounded-3xl transition-opacity duration-500
        ${isHovered ? 'opacity-100' : 'opacity-0'}
        bg-gradient-to-br from-primary-500/10 via-neon-blue/10 to-primary-500/10
        blur-xl -z-10 scale-110
      `} />
      
      {/* Dynamic Background */}
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
      
      {/* Border Gradient */}
      <div className={`
        absolute inset-0 rounded-3xl transition-opacity duration-300 p-[1px] -z-10
        ${isHovered ? 'opacity-100' : 'opacity-0'}
        bg-gradient-to-r from-primary-500 via-neon-blue to-primary-500
        animate-gradient-shift
      `}>
        <div className="w-full h-full rounded-3xl bg-white/90 backdrop-blur-xl" />
      </div>
      
      {/* Icon Section */}
      <div className="relative mb-6">
        <div className="relative w-20 h-20 mx-auto group-hover:scale-110 transition-transform duration-500">
          {/* Icon Background */}
          <div className="absolute inset-0 bg-gradient-to-r from-primary-100 to-neon-blue/20 rounded-2xl rotate-3 group-hover:rotate-6 transition-transform duration-300"></div>
          <div className="absolute inset-1 bg-gradient-to-r from-primary-50 to-white rounded-2xl"></div>
          
          {/* Icon */}
          <div className="relative w-full h-full flex items-center justify-center text-5xl group-hover:scale-110 transition-transform duration-300">
            <div className="relative">
              {icon}
              {/* Icon Glow */}
              <div className={`
                absolute inset-0 text-5xl transition-opacity duration-300
                ${isHovered ? 'opacity-100' : 'opacity-0'}
                text-primary-400 blur-sm
              `}>
                {icon}
              </div>
            </div>
          </div>
          
          {/* Orbiting Particles */}
          {isHovered && (
            <div className="absolute inset-0">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="absolute w-2 h-2 rounded-full bg-primary-400/60"
                  style={{
                    top: '50%',
                    left: '50%',
                    transform: `
                      translate(-50%, -50%) 
                      rotate(${i * 90}deg) 
                      translateY(-40px) 
                      rotate(${-i * 90}deg)
                    `,
                    animation: `spin-slow ${10 + i}s linear infinite`,
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* Content */}
      <div className="relative z-10 space-y-4">
        {/* Title */}
        <h3 className="text-2xl lg:text-3xl font-bold text-gray-900 group-hover:text-primary-600 transition-colors duration-300 font-display">
          {title}
        </h3>
        
        {/* Description */}
        <p className="text-gray-600 leading-relaxed text-lg group-hover:text-gray-700 transition-colors duration-300">
          {description}
        </p>
        
        {/* Features */}
        <div className="space-y-3 pt-4">
          {features.map((feature, idx) => (
            <div
              key={idx}
              className="flex items-center gap-3 group/feature"
              style={{
                opacity: isHovered ? 1 : 0.8,
                transform: isHovered ? 'translateX(5px)' : 'translateX(0)',
                transition: `all 0.3s ease ${idx * 100}ms`,
              }}
            >
              {/* Feature Bullet */}
              <div className="relative">
                <div className="w-2 h-2 rounded-full bg-gradient-to-r from-primary-500 to-neon-blue group-hover/feature:scale-125 transition-transform duration-200"></div>
                
                {/* Bullet Glow */}
                {isHovered && (
                  <div className="absolute inset-0 w-2 h-2 rounded-full bg-primary-400 blur-sm animate-pulse-glow"></div>
                )}
              </div>
              
              {/* Feature Text */}
              <span className="text-gray-700 group-hover/feature:text-primary-600 transition-colors duration-200 font-medium">
                {feature}
              </span>
            </div>
          ))}
        </div>
      </div>
      
      {/* Floating Elements */}
      {isHovered && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-3xl">
          {/* Floating Particles */}
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className={`
                absolute w-1 h-1 rounded-full animate-float
                ${i % 3 === 0 ? 'bg-primary-400/60' : 
                  i % 3 === 1 ? 'bg-neon-blue/60' : 'bg-neon-purple/60'}
              `}
              style={{
                top: `${20 + (i * 8)}%`,
                left: `${15 + (i * 10)}%`,
                animationDelay: `${i * 0.3}s`,
                animationDuration: `${3 + i * 0.5}s`,
              }}
            />
          ))}
          
          {/* Data Flow Lines */}
          <div 
            className="absolute top-1/4 left-0 w-full h-px bg-gradient-to-r from-transparent via-primary-400/30 to-transparent animate-data-flow"
            style={{ animationDuration: '3s' }}
          />
          <div 
            className="absolute bottom-1/3 left-0 w-full h-px bg-gradient-to-r from-transparent via-neon-blue/30 to-transparent animate-data-flow"
            style={{ animationDuration: '4s', animationDelay: '1s' }}
          />
        </div>
      )}
      
      {/* Corner Accents */}
      <div className={`
        absolute top-4 left-4 w-6 h-6 transition-opacity duration-300
        ${isHovered ? 'opacity-100' : 'opacity-0'}
      `}>
        <div className="absolute top-0 left-0 w-3 h-0.5 bg-primary-500"></div>
        <div className="absolute top-0 left-0 w-0.5 h-3 bg-primary-500"></div>
      </div>
      
      <div className={`
        absolute bottom-4 right-4 w-6 h-6 transition-opacity duration-300
        ${isHovered ? 'opacity-100' : 'opacity-0'}
      `}>
        <div className="absolute bottom-0 right-0 w-3 h-0.5 bg-neon-blue"></div>
        <div className="absolute bottom-0 right-0 w-0.5 h-3 bg-neon-blue"></div>
      </div>
      
      {/* Shimmer Effect */}
      <div className={`
        absolute inset-0 shimmer rounded-3xl opacity-0 transition-opacity duration-300
        ${isHovered ? 'opacity-100' : ''}
      `} />
      
      {/* Neural Network Pattern */}
      {isHovered && (
        <div className="absolute inset-0 opacity-20 pointer-events-none rounded-3xl overflow-hidden">
          <div 
            className="absolute inset-0"
            style={{
              backgroundImage: `
                radial-gradient(circle at 25% 25%, #0087FF 1px, transparent 1px),
                radial-gradient(circle at 75% 75%, #8B5CF6 1px, transparent 1px)
              `,
              backgroundSize: '40px 40px, 60px 60px',
              backgroundPosition: '0 0, 20px 20px',
              animation: 'float 6s ease-in-out infinite',
            }}
          />
        </div>
      )}
    </div>
  );
};

export default ServiceCard;