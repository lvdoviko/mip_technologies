// src/components/ui/Logo.jsx
import React from 'react';

const Logo = ({ variant = 'light', size = 'md', className = '' }) => {
  const sizes = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
  };

  return (
    <img
      src="/BlockMIP.png"
      alt="MIP Technologies Logo"
      className={`${sizes[size]} mr-3 hover:scale-110 transition-transform duration-300 ${className}`}
      style={{ objectFit: 'contain' }}
    />
  );
};

export default Logo;