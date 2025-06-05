// src/components/ui/ServiceCard.jsx
import React from 'react';

const ServiceCard = ({ icon, title, description, features, index }) => {
  return (
    <div 
      className="
        bg-gray-800 rounded-card p-6 md:p-8
        border border-gray-700 shadow-minimal hover:shadow-card
        transition-all duration-200 hover-lift
        animate-on-scroll
      "
      data-delay={index}
      style={{ animationDelay: `${index * 100}ms` }}
    >
      {/* Icon Section */}
      <div className="mb-6">
        <div className="w-12 h-12 bg-gray-700 rounded-card flex items-center justify-center text-gray-100 text-2xl">
          {icon}
        </div>
      </div>
      
      {/* Content */}
      <div className="space-y-4">
        {/* Title */}
        <h3 className="text-xl font-bold text-gray-100">
          {title}
        </h3>
        
        {/* Description */}
        <p className="text-gray-300 leading-relaxed">
          {description}
        </p>
        
        {/* Features */}
        <div className="space-y-2 pt-2">
          {features.map((feature, idx) => (
            <div
              key={idx}
              className="flex items-center gap-3"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-primary-500"></div>
              <span className="text-gray-300 text-sm">
                {feature}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ServiceCard;