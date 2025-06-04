// src/components/ui/Logo.jsx
import React from 'react';

const Logo = ({ variant = 'light', size = 'md' }) => {
  const sizes = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
  };

  return (
    <img
      src={variant === 'light' ? '/logo_mip_nero.png' : '/logo_mip_bianco.png'}
      alt="MIP Technologies Logo"
      className={`${sizes[size]} mr-3 hover:scale-110 transition-transform duration-300`}
      style={{ objectFit: 'contain' }}
    />
  );
};

export default Logo;