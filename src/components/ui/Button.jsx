// src/components/ui/Button.jsx
import React from 'react';

const Button = ({ 
  children, 
  variant = 'primary', 
  size = 'md',
  className = '', 
  href, 
  disabled = false,
  ...props 
}) => {
  const sizes = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg',
  };

  const variants = {
    primary: `
      bg-gray-100 hover:bg-white
      text-gray-900 font-medium
      shadow-button hover:shadow-card
      border border-gray-200 hover:border-gray-300
    `,
    
    secondary: `
      bg-gray-800 hover:bg-gray-700
      text-gray-100 font-medium
      shadow-button hover:shadow-card
      border border-gray-700 hover:border-gray-600
    `,
    
    outline: `
      border border-gray-300 text-gray-100
      hover:bg-gray-100 hover:text-gray-900
      bg-transparent font-medium
      shadow-button hover:shadow-card
    `,
  };

  const baseClasses = `
    inline-flex items-center justify-center
    rounded-minimal font-medium
    transition-all duration-200
    cursor-pointer
    ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover-minimal'}
    ${sizes[size]}
    ${variants[variant]}
    ${className}
  `;

  const ButtonContent = () => (
    <span className="flex items-center justify-center gap-2">
      {children}
    </span>
  );

  const commonProps = {
    className: baseClasses,
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