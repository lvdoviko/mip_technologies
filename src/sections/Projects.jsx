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
    <section id="case-studies" className="py-20 bg-gray-50 relative overflow-hidden">
      {/* Decorative elements that move with scroll */}
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
          <h2 className="text-4xl md:text-5xl font-bold mb-6">Proven Success Stories</h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Discover how industry leaders achieved{' '}
            <span className="text-gray-900 font-semibold">transformational results</span>{' '}
            through our AI-powered solutions
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
        
        {/* CTA Section */}
        <div className="text-center mt-16 animate-on-scroll">
          <div className="bg-gray-800 rounded-xl p-8 md:p-12 max-w-4xl mx-auto">
            <h3 className="text-2xl md:text-3xl font-bold mb-4 text-white">
              Ready to Write Your Success Story?
            </h3>
            <p className="text-gray-300 mb-8 max-w-2xl mx-auto">
              Join these industry leaders and unlock the transformative power of AI for your organization. 
              Let's discuss how we can deliver similar breakthrough results for your business.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a 
                href="#contact" 
                className="px-8 py-4 bg-white text-gray-900 rounded-full font-medium hover:bg-gray-100 transition-colors duration-300"
              >
                Start Your Transformation
              </a>
              <a 
                href="#methodology" 
                className="px-8 py-4 bg-transparent text-white border border-white/30 rounded-full font-medium hover:border-white/50 transition-colors duration-300"
              >
                Explore Our Methodology
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Projects;