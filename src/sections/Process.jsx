// src/sections/Process.jsx
import React, { useEffect, useState, useRef } from 'react';
import { steps } from '../data/process';
import ScrollFloat from '../components/animations/ScrollFloat'; 
import DescriptedText from '../components/ui/DescriptedText';

const Process = () => {
  const [activeStep, setActiveStep] = useState(null);
  const [offset, setOffset] = useState(0);
  const sectionRef = useRef(null);
  const cardsRef = useRef([]);

  // Scroll handling
  useEffect(() => {
    const handleScroll = () => {
      setOffset(window.scrollY);
      
      // Determine which card is in view
      if (sectionRef.current) {
        const sectionTop = sectionRef.current.getBoundingClientRect().top;
        const viewportHeight = window.innerHeight;
        
        if (sectionTop <= viewportHeight * 0.5 && sectionTop > -viewportHeight * 0.5) {
          cardsRef.current.forEach((card, index) => {
            if (card) {
              const cardRect = card.getBoundingClientRect();
              const cardCenter = cardRect.top + cardRect.height / 2;
              
              // If card center is near viewport center
              if (cardCenter > viewportHeight * 0.3 && cardCenter < viewportHeight * 0.7) {
                setActiveStep(index);
              }
            }
          });
        }
      }
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  // Intersection check for animation
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
          }
        });
      },
      { threshold: 0.2 }
    );
    
    cardsRef.current.forEach(card => {
      if (card) observer.observe(card);
    });
    
    return () => observer.disconnect();
  }, []);

  return (
    <section 
      id="methodology" 
      className="py-20 bg-black relative overflow-hidden"
      ref={sectionRef}
    >
      {/* Background grid */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-10"
        style={{
          backgroundImage: `
            linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px),
            linear-gradient(0deg, rgba(255,255,255,0.03) 1px, transparent 1px)
          `,
          backgroundSize: '80px 80px',
          transform: `translate(${offset * 0.04}px, ${offset * 0.05}px)`,
          transition: 'transform 0.2s ease-out',
        }}
      />
      
      <div className="container mx-auto max-w-7xl px-4 relative z-10">
        <div className="text-center mb-16">
          <ScrollFloat
            containerClassName="mb-6"
            textClassName="text-4xl md:text-5xl font-bold text-white"
            scrollStart="top bottom"
            scrollEnd="center center"
          >
            Our Proven Methodology
          </ScrollFloat>
          
          <p className="text-xl text-gray-400 max-w-3xl mx-auto">
            A systematic, results-driven approach that has delivered{' '}
            <span className="text-white font-semibold">transformational outcomes</span>{' '}
            for Fortune 500 companies worldwide
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 relative">
          {/* Horizontal timeline */}
          <div className="hidden lg:block absolute top-1/2 left-0 right-0 h-px bg-white/10 transform -translate-y-1/2 z-0"></div>
          
          {steps.map((step, index) => (
            <div
              key={index}
              ref={el => cardsRef.current[index] = el}
              className={`
                relative transition-all duration-500 opacity-0 transform translate-y-10
                ${index % 2 === 0 ? 'process-card-left' : 'process-card-right'}
              `}
              onMouseEnter={() => setActiveStep(index)}
              onMouseLeave={() => setActiveStep(null)}
            >
              {/* Card */}
              <div className={`
                h-full bg-black border border-white/20 rounded-none p-6 md:p-8
                transition-all duration-300 hover:-translate-y-2
                ${activeStep === index 
                  ? 'border-white shadow-[0_0_15px_rgba(255,255,255,0.1)] scale-105 z-10' 
                  : 'hover:border-white/50 hover:shadow-[0_0_10px_rgba(255,255,255,0.05)]'
                }
              `}>
                {/* Header Section */}
                <div className="flex items-center mb-6">
                  {/* Icon Container */}
                  <div className={`
                    w-12 h-12 bg-black border rounded-none flex items-center justify-center text-xl mr-4
                    transition-all duration-300
                    ${activeStep === index ? 'border-white text-white' : 'border-white/30 text-white/70'}
                  `}>
                    {step.icon}
                  </div>
                  
                  {/* Step Number */}
                  <div className="flex items-center">
                    <span className={`
                      text-4xl font-bold mr-3 transition-all duration-300
                      ${activeStep === index ? 'text-white/50' : 'text-white/20'}
                    `}>
                      {step.number}
                    </span>
                    <div className={`
                      w-6 h-6 rounded-none text-xs font-bold flex items-center justify-center
                      transition-all duration-300
                      ${activeStep === index 
                        ? 'bg-white text-black' 
                        : 'bg-black border border-white/50 text-white'
                      }
                    `}>
                      {index + 1}
                    </div>
                  </div>
                </div>
                
                {/* Content */}
                <div className="space-y-3">
                  {/* Title */}
                  <h3 className="text-xl font-bold text-white">
                    {step.title}
                  </h3>
                  
                  {/* Description with DescriptedText */}
                  <p className="text-gray-400 leading-relaxed">
                    <DescriptedText
                      text={step.description}
                      className="text-gray-400"
                      encryptedClassName="text-gray-600"
                      animateOn="view"
                      sequential={true}
                      speed={25}
                      maxIterations={15}
                    />
                  </p>
                </div>
                
                {/* Progress Indicator */}
                <div className="flex items-center gap-1 mt-6 pt-4 border-t border-white/10">
                  {[...Array(steps.length)].map((_, i) => (
                    <div
                      key={i}
                      className={`
                        w-2 h-2 transition-all duration-300
                        ${i === index 
                          ? 'bg-white' 
                          : i < index 
                            ? 'bg-white/50' 
                            : 'bg-transparent border border-white/30'
                        }
                      `}
                    />
                  ))}
                </div>
              </div>

              {/* Connection Line */}
              {index < steps.length - 1 && index % 3 !== 2 && (
                <div className="hidden lg:block absolute top-1/2 right-0 transform translate-x-4 -translate-y-1/2 z-10">
                  <div className="w-8 h-px bg-white/20"></div>
                </div>
              )}
            </div>
          ))}
        </div>
        
        {/* Bottom CTA */}
        <div className="text-center mt-16">
          <div className="max-w-3xl mx-auto bg-black border border-white/10 rounded-xl p-8 md:p-12">
            <h3 className="text-2xl md:text-3xl font-bold mb-4 text-white">
              Ready to Experience This Methodology?
            </h3>
            <p className="text-gray-400 mb-8">
              <DescriptedText
                text="Our systematic approach has delivered measurable results for companies across every major industry. Let's discuss how we can apply this proven methodology to accelerate your AI transformation."
                className="text-gray-400"
                encryptedClassName="text-gray-600"
                animateOn="view"
                sequential={true}
                speed={20}
              />
            </p>
            <a 
              href="#contact" 
              className="inline-flex items-center justify-center px-6 py-3 bg-black border border-white text-white rounded-none font-medium hover:bg-white hover:text-black transition-all duration-300"
            >
              Begin Your AI Journey
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Process;