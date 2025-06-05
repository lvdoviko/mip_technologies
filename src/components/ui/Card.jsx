// src/components/ui/Card.jsx
import React from 'react';

const Card = ({ 
  children, 
  className = '',
  onClick,
  ...props 
}) => {
  const baseClasses = `
    bg-gray-800 rounded-card p-6 md:p-8
    border border-gray-700
    shadow-minimal hover:shadow-card
    transition-all duration-200
    hover-lift
    ${onClick ? 'cursor-pointer' : ''}
    ${className}
  `;

  return (
    <div 
      className={baseClasses}
      onClick={onClick}
      {...props}
    >
      {children}
    </div>
  );
};

export default Card;