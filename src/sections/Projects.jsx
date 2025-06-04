// src/sections/Projects.jsx
import React, { useEffect, useState } from 'react';
import { useScrollAnimation } from '../hooks/useScrollAnimation';
import ProjectCard from '../components/ui/ProjectCard';
import { projects } from '../data/projects';

const Projects = () => {
  useScrollAnimation();
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setOffset(window.scrollY);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <section id="progetti" className="py-20 bg-gray-50 relative overflow-hidden">
      {/* Elementi decorativi che si muovono con lo scroll */}
      <div 
        className="absolute -left-20 top-20 w-40 h-40 rounded-full bg-primary/5"
        style={{ 
          transform: `translateY(${offset * 0.2}px) rotate(${offset * 0.05}deg)`,
          transition: 'transform 0.1s ease-out'
        }}
      />
      <div 
        className="absolute -right-20 bottom-40 w-60 h-60 rounded-full bg-accent/5"
        style={{ 
          transform: `translateY(${-offset * 0.15}px) rotate(${-offset * 0.03}deg)`,
          transition: 'transform 0.1s ease-out'
        }}
      />
      
      <div className="container mx-auto max-w-7xl px-4 relative z-10">
        <div className="text-center mb-16 animate-on-scroll">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">Progetti Realizzati</h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Scopri come abbiamo trasformato le idee dei nostri clienti in soluzioni AI innovative
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {projects.map((project, index) => (
            <ProjectCard
              key={index}
              project={project}
              index={index}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default Projects;