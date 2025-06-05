// src/components/ui/ProcessStepCard.jsx
import React from 'react';

const ProcessStepCard = ({ step, index, totalSteps }) => {
  const { number, title, description, icon } = step;
  
  // Alternare le animazioni per creare un effetto visivo interessante
  const getAnimationClass = () => {
    if (index % 3 === 0) return 'animate-from-left';
    if (index % 3 === 1) return 'animate-on-scroll';
    return 'animate-from-right';
  };

  return (
    <div
      className={`relative ${getAnimationClass()}`}
      data-delay={index}
      style={{ animationDelay: `${index * 100}ms` }}
    >
      {/* Main Card */}
      <div className="
        bg-gray-800 rounded-card p-6 md:p-8
        border border-gray-700 shadow-minimal hover:shadow-card
        transition-all duration-200 hover-lift
      ">
        {/* Header Section */}
        <div className="flex items-center mb-6">
          {/* Icon Container */}
          <div className="w-12 h-12 bg-gray-700 rounded-card flex items-center justify-center text-gray-100 text-xl mr-4">
            {icon}
          </div>
          
          {/* Step Number */}
          <div className="flex items-center">
            <span className="text-4xl font-bold text-gray-700 mr-3">
              {number}
            </span>
            <div className="w-6 h-6 rounded-full bg-primary-500 text-white text-xs font-bold flex items-center justify-center">
              {index + 1}
            </div>
          </div>
        </div>
        
        {/* Content */}
        <div className="space-y-3">
          {/* Title */}
          <h3 className="text-xl font-bold text-gray-100">
            {title}
          </h3>
          
          {/* Description */}
          <p className="text-gray-300 leading-relaxed">
            {description}
          </p>
        </div>
        
        {/* Progress Indicator */}
        <div className="flex items-center gap-1 mt-6 pt-4 border-t border-gray-700">
          {[...Array(totalSteps)].map((_, i) => (
            <div
              key={i}
              className={`
                w-2 h-2 rounded-full transition-colors duration-200
                ${i <= index ? 'bg-primary-500' : 'bg-gray-600'}
              `}
            />
          ))}
        </div>
      </div>

      {/* Connection Line */}
      {index < totalSteps - 1 && (
        <div className="hidden lg:block absolute top-1/2 right-0 transform translate-x-4 -translate-y-1/2 z-10">
          <div className="w-8 h-0.5 bg-gray-600 rounded-full"></div>
        </div>
      )}
    </div>
  );
};

export default ProcessStepCard;