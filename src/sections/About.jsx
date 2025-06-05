// src/sections/About.jsx
import React from 'react';
import { useScrollAnimation } from '../hooks/useScrollAnimation';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { values } from '../data/values';

const About = () => {
  useScrollAnimation();

  return (
    <section id="chi-siamo" className="py-24">
      <div className="container mx-auto max-w-6xl px-4">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Content Side */}
          <div className="animate-on-scroll space-y-8">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-gray-800 text-gray-100 px-4 py-2 rounded-full text-sm font-medium border border-gray-700">
              <div className="w-2 h-2 bg-primary-500 rounded-full"></div>
              Chi Siamo
            </div>
            
            {/* Main Heading */}
            <div className="space-y-6">
              <h2 className="text-4xl md:text-5xl font-bold leading-tight text-gray-100">
                Innovazione
                <span className="text-gradient-rainbow block">AI-Powered</span>
              </h2>
              
              {/* Enhanced Description */}
              <div className="space-y-6">
                <p className="text-lg md:text-xl text-gray-300 leading-relaxed">
                  <span className="text-gray-100 font-semibold">MIP Technologies</span> è una società innovativa specializzata nello sviluppo e implementazione di{' '}
                  <span className="text-gray-100 font-semibold">soluzioni di intelligenza artificiale</span>.
                </p>
                
                <p className="text-gray-300 leading-relaxed">
                  Il nostro team di esperti combina competenze tecniche avanzate con una profonda comprensione delle esigenze aziendali, creando soluzioni che{' '}
                  <span className="text-gray-100 font-semibold">trasformano il futuro</span>.
                </p>
                
                <Card className="bg-gray-800 border-gray-700">
                  <p className="text-gray-300 leading-relaxed italic">
                    "Crediamo che l'AI non sia solo una tecnologia, ma uno{' '}
                    <span className="text-gray-100 font-semibold">strumento per trasformare</span>{' '}
                    il modo in cui le aziende operano, crescono e innovano."
                  </p>
                </Card>
              </div>
            </div>
            
            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Button 
                href="#contatti" 
                variant="primary" 
                size="lg"
              >
                Scopri di più
              </Button>
              
              <Button 
                href="#servizi" 
                variant="outline" 
                size="lg"
              >
                I Nostri Servizi
              </Button>
            </div>
          </div>
          
          {/* Values Grid */}
          <div className="grid grid-cols-2 gap-6">
            {values.map((value, index) => (
              <Card
                key={index}
                className="animate-on-scroll"
                style={{ 
                  animationDelay: `${(index + 1) * 100}ms`,
                }}
              >
                {/* Icon Container */}
                <div className="mb-4">
                  <div className="w-12 h-12 bg-gray-700 rounded-card flex items-center justify-center text-gray-100 text-xl">
                    {value.icon}
                  </div>
                </div>
                
                {/* Content */}
                <div className="space-y-3">
                  <h3 className="text-lg font-bold text-gray-100">
                    {value.title}
                  </h3>
                  
                  <p className="text-gray-300 text-sm leading-relaxed">
                    {value.description}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default About;