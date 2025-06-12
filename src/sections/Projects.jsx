import React, { useEffect, useState } from 'react';
import { useScrollAnimation } from '../hooks/useScrollAnimation';
import ProjectCard from '../components/ui/ProjectCard';
import { projects } from '../data/projects';
import ScrollFloat from '../components/animations/ScrollFloat';
import AlbatroveShowcase from '../components/showcase/AlbatroveShowcase';

const Projects = ({ prefersReducedMotion = false }) => {
  useScrollAnimation();
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setOffset(window.scrollY);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Animation observer for scroll-triggered animations
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const delay = entry.target.getAttribute('data-delay') || 0;
            setTimeout(() => {
              entry.target.classList.add('visible');
            }, delay * 100);
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -100px 0px' }
    );
    
    const animateElements = document.querySelectorAll('.animate-on-scroll');
    animateElements.forEach(el => observer.observe(el));
    
    return () => observer.disconnect();
  }, []);

  return (
    <section id="case-studies" className="py-8 sm:py-12 bg-black">
      <div className="container mx-auto max-w-7xl px-4">
        {/* Section Header */}
        <div className="text-center mb-8 sm:mb-12">
          <ScrollFloat
            containerClassName="mb-4"
            textClassName="text-3xl sm:text-4xl md:text-5xl font-bold text-white"
            scrollStart="top bottom"
            scrollEnd="center center"
          >
            Proven Success Stories
          </ScrollFloat>
          
          <p className="text-lg sm:text-xl text-gray-400 max-w-3xl mx-auto leading-relaxed">
            Discover how industry leaders achieved{' '}
            <span className="text-white font-semibold">transformational results</span>{' '}
            through our AI-powered solutions
          </p>
        </div>
        
        {/* Featured Project: Albatrove Showcase */}
        <div className="mb-16 sm:mb-20">
          <AlbatroveShowcase prefersReducedMotion={prefersReducedMotion} />
        </div>
        
        {/* Other Projects Grid - Hidden for now to focus on Albatrove */}
        <div className="hidden grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {projects.map((project, index) => (
            <ProjectCard
              key={index}
              project={project}
              index={index}
            />
          ))}
        </div>
        
        {/* CTA Section */}
        <div className="text-center animate-on-scroll">
          <div className="bg-black rounded-none p-6 sm:p-8 md:p-12 max-w-4xl mx-auto border border-white/10">
            <h3 className="text-xl sm:text-2xl md:text-3xl font-bold mb-4 text-white">
              Ready to Write Your Success Story?
            </h3>
            <p className="text-base sm:text-lg text-gray-300 mb-6 sm:mb-8 max-w-2xl mx-auto leading-relaxed">
              Join these industry leaders and unlock the transformative power of AI for your organization. 
              Let's discuss how we can deliver similar breakthrough results for your business.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a 
                href="#contact" 
                className="px-6 py-3 bg-black border border-white text-white rounded-none font-medium hover:bg-white hover:text-black transition-all duration-300 touch-manipulation"
              >
                Start Your Transformation
              </a>
              <a 
                href="#methodology" 
                className="px-6 py-3 bg-transparent border border-white/50 text-white rounded-none font-medium hover:border-white hover:bg-black/30 transition-all duration-300 touch-manipulation"
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