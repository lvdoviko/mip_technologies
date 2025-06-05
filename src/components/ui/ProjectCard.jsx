// src/components/ui/ProjectCard.jsx
import React from 'react';

const ProjectCard = ({ project, index }) => {
  const { title, description, tech, category, image } = project;
  
  // Alternare l'animazione da sinistra e destra
  const animationClass = index % 2 === 0 ? 'animate-from-left' : 'animate-from-right';
  
  return (
    <div 
      className={`
        bg-gray-800 rounded-card p-6 md:p-8
        border border-gray-700 shadow-minimal hover:shadow-card
        transition-all duration-200 hover-lift
        ${animationClass}
      `}
      data-delay={index}
      style={{ animationDelay: `${index * 100}ms` }}
    >
      {/* Header Section */}
      <div className="flex items-start justify-between mb-6">
        {/* Project Icon */}
        <div className="w-12 h-12 bg-gray-700 rounded-card flex items-center justify-center text-gray-100 text-2xl">
          {image}
        </div>
        
        {/* Category Badge */}
        <div className="px-3 py-1 bg-gray-700 text-gray-300 rounded-full text-sm font-medium border border-gray-600">
          {category}
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
        
        {/* Tech Stack */}
        <div className="flex flex-wrap gap-2 pt-2">
          {tech.map((item, idx) => (
            <span
              key={idx}
              className="
                px-2 py-1 rounded text-xs font-medium
                bg-gray-700 text-gray-300 border border-gray-600
                hover:bg-gray-600 hover:text-gray-100
                transition-colors duration-200
              "
            >
              {item}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ProjectCard;