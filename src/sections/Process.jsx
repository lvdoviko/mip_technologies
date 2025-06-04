// src/sections/Process.jsx
import React, { useEffect, useState } from 'react';
import { useScrollAnimation } from '../hooks/useScrollAnimation';
import ProcessStepCard from '../components/ui/ProcessStepCard';
import { steps } from '../data/process';

const Process = () => {
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
    <section id="processo" className="py-20 bg-white relative overflow-hidden">
      {/* Elementi decorativi con parallasse */}
      <div 
        className="absolute left-10 top-40 w-32 h-32 border-2 border-primary/10 rounded-full"
        style={{ 
          transform: `translateY(${offset * 0.2}px)`,
          transition: 'transform 0.1s ease-out'
        }}
      />
      <div 
        className="absolute right-20 bottom-60 w-24 h-24 border-2 border-accent/10 rounded-full"
        style={{ 
          transform: `translateY(${-offset * 0.25}px)`,
          transition: 'transform 0.1s ease-out'
        }}
      />
      
      <div className="container mx-auto max-w-7xl px-4 relative z-10">
        <div className="text-center mb-16 animate-on-scroll">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">Il Nostro Processo</h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Un approccio metodico e strutturato per garantire il successo di ogni progetto
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 relative">
          {/* Linea temporale di sfondo per desktop */}
          <div className="hidden lg:block absolute top-1/2 left-0 right-0 h-0.5 bg-gray-100 transform -translate-y-1/2 z-0"></div>
          
          {steps.map((step, index) => (
            <ProcessStepCard
              key={index}
              step={step}
              index={index}
              totalSteps={steps.length}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default Process;