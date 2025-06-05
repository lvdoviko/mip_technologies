// src/sections/Services.jsx
import React from 'react';
import { useScrollAnimation } from '../hooks/useScrollAnimation';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { services } from '../data/services';

const Services = () => {
  useScrollAnimation();

  return (
    <section id="servizi" className="py-24">
      <div className="container mx-auto max-w-6xl px-4">
        {/* Header Section */}
        <div className="text-center mb-16 animate-on-scroll">
          <div className="inline-flex items-center gap-2 bg-gray-800 text-gray-100 px-4 py-2 rounded-full text-sm font-medium mb-6 border border-gray-700">
            <div className="w-2 h-2 bg-primary-500 rounded-full"></div>
            I Nostri Servizi
          </div>
          
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-gray-100">
            Soluzioni
            <span className="text-gradient-rainbow block">AI Complete</span>
          </h2>
          
          <p className="text-lg md:text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
            Trasformiamo il tuo business con{' '}
            <span className="text-gray-100 font-semibold">intelligenza artificiale avanzata</span>.
            Ogni soluzione è progettata per massimizzare l'efficienza e l'innovazione.
          </p>
        </div>
        
        {/* Services Grid */}
        <div className="grid lg:grid-cols-3 gap-8 mb-16">
          {services.map((service, index) => (
            <Card
              key={index}
              className="animate-on-scroll"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {/* Service Icon */}
              <div className="mb-6">
                <div className="w-12 h-12 bg-primary-100 rounded-card flex items-center justify-center text-primary-600 text-2xl mb-4">
                  {service.icon}
                </div>
              </div>
              
              {/* Service Content */}
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-gray-900">
                  {service.title}
                </h3>
                
                <p className="text-gray-600 leading-relaxed">
                  {service.description}
                </p>
                
                {/* Features List */}
                <div className="space-y-2 pt-4">
                  {service.features.map((feature, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-3"
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-primary-500"></div>
                      <span className="text-gray-700 text-sm">
                        {feature}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          ))}
        </div>
        
        {/* CTA Section */}
        <div className="text-center animate-on-scroll" style={{ animationDelay: '400ms' }}>
          <Card className="max-w-4xl mx-auto bg-gray-800 border-gray-700">
            <h3 className="text-2xl md:text-3xl font-bold mb-4 text-gray-100">
              Pronto a trasformare il tuo business con l'AI?
            </h3>
            
            <p className="text-lg text-gray-300 mb-8 max-w-2xl mx-auto">
              Scopri come le nostre soluzioni possono rivoluzionare la tua azienda. 
              <span className="text-gray-100 font-semibold"> Consulenza gratuita</span> disponibile.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                href="#contatti" 
                variant="primary" 
                size="lg"
              >
                Richiedi Consulenza Gratuita
              </Button>
              
              <Button 
                href="#progetti" 
                variant="outline" 
                size="lg"
              >
                Vedi i Nostri Progetti
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default Services;