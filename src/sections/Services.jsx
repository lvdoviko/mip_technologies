import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import RainbowGradientText from '../components/ui/RainbowGradientText';
import ScrollFloat from '../components/animations/ScrollFloat';
import RainbowScrollFloat from '../components/animations/RainbowScrollFloat';
import DescriptedText from '../components/ui/DescriptedText';

// Icons for services (kept static)
const serviceIcons = [
  (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M16.2398 7.76001L14.1198 14.12L7.75977 16.24L9.87977 9.88001L16.2398 7.76001Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M21 16V8.00002C20.9996 7.6493 20.9071 7.30483 20.7315 7.00119C20.556 6.69754 20.3037 6.44539 20 6.27002L13 2.27002C12.696 2.09449 12.3511 2.00208 12 2.00208C11.6489 2.00208 11.304 2.09449 11 2.27002L4 6.27002C3.69626 6.44539 3.44398 6.69754 3.26846 7.00119C3.09294 7.30483 3.00036 7.6493 3 8.00002V16C3.00036 16.3508 3.09294 16.6952 3.26846 16.9989C3.44398 17.3025 3.69626 17.5547 4 17.73L11 21.73C11.304 21.9056 11.6489 21.998 12 21.998C12.3511 21.998 12.696 21.9056 13 21.73L20 17.73C20.3037 17.5547 20.556 17.3025 20.7315 16.9989C20.9071 16.6952 20.9996 16.3508 21 16Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M3.27002 6.96L12 12.01L20.73 6.96" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M12 22.08V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
];

const serviceColors = ["#0070F3", "#7928CA", "#FF0080"];

// Card Component
const ServiceCard = ({ service, index, onMouseEnter, isActive }) => {
  const { icon, title, description, features, color } = service;
  
  return (
    <div 
      className={`
        relative overflow-hidden rounded-xl p-8 
        backdrop-blur-sm border border-white/10
        transition-all duration-500
        ${isActive 
          ? 'bg-white/5 border-white/20 shadow-xl shadow-white/5 transform -translate-y-2' 
          : 'bg-black/30 hover:bg-white/5 hover:border-white/20 hover:shadow-lg hover:shadow-white/5 hover:-translate-y-1'
        }
      `}
      onMouseEnter={() => onMouseEnter(index)}
      style={{ 
        transitionDelay: `${index * 50}ms`,
      }}
    >
      {/* Background light blob */}
      <div 
        className="absolute -inset-0.5 opacity-0 transition-opacity duration-500 z-0 pointer-events-none"
        style={{
          opacity: isActive ? 0.05 : 0,
          background: `radial-gradient(circle at center, ${color}, transparent 70%)`,
        }}
      />
      
      {/* Card Content */}
      <div className="relative z-10">
        {/* Icon Section */}
        <div 
          className="w-12 h-12 rounded-lg flex items-center justify-center mb-6 transition-all duration-300"
          style={{ 
            backgroundColor: `${color}10`,
            color: color,
            boxShadow: isActive ? `0 0 20px ${color}20` : 'none'
          }}
        >
          {icon}
        </div>
        
        {/* Content */}
        <div className="space-y-4">
          {/* Title */}
          <h3 className="text-xl font-bold text-white">
            {title}
          </h3>
          
          {/* Description with DescriptedText */}
          <p className="text-gray-400 leading-relaxed">
            <DescriptedText
              text={description}
              className="text-gray-400"
              encryptedClassName="text-gray-600"
              animateOn="view"
              sequential={true}
              speed={25}
              maxIterations={15}
            />
          </p>
          
          {/* Features */}
          <div className="space-y-2 pt-2">
            {features.map((feature, idx) => (
              <div
                key={idx}
                className="flex items-center gap-3"
              >
                <div 
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: color }}
                ></div>
                <span className="text-gray-300 text-sm">
                  <DescriptedText
                    text={feature}
                    className="text-gray-300 text-sm"
                    encryptedClassName="text-gray-500 text-sm"
                    animateOn="view"
                    sequential={true}
                    speed={20}
                    maxIterations={10}
                  />
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const Services = () => {
  const { t } = useTranslation();
  const [activeCard, setActiveCard] = useState(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const sectionRef = useRef(null);
  
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!sectionRef.current) return;
      
      const rect = sectionRef.current.getBoundingClientRect();
      setMousePosition({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);
  
  // Add CSS styles for gradient animation
  useEffect(() => {
    const styleElement = document.createElement('style');
    styleElement.textContent = `
      @keyframes gradient-animation {
        0% { background-position: 0% 50%; }
        100% { background-position: 200% 50%; }
      }
    `;
    document.head.appendChild(styleElement);
    
    return () => {
      document.head.removeChild(styleElement);
    };
  }, []);

  return (
    <section 
      id="solutions" 
      className="py-24 relative"
      ref={sectionRef}
    >
      {/* Spotlight effect following mouse */}
      <div 
        className="absolute pointer-events-none opacity-30"
        style={{
          left: `${mousePosition.x}px`,
          top: `${mousePosition.y}px`,
          width: '600px',
          height: '600px',
          transform: 'translate(-50%, -50%)',
          background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)',
          transition: 'left 0.3s ease-out, top 0.3s ease-out',
          display: activeCard !== null ? 'block' : 'none'
        }}
      />
      
      <div className="container mx-auto max-w-6xl px-4">
        {/* Header Section */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-white/5 backdrop-blur-sm text-white px-5 py-2.5 rounded-full text-sm font-medium mb-6 border border-white/10">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            {t('services.badge')}
          </div>
          
          {/* Contenitore per i titoli con spaziatura ridotta */}
          <div className="space-y-0">
            {/* Utilizziamo RainbowScrollFloat senza margine in basso */}
            <RainbowScrollFloat
              fontSize="text-4xl md:text-5xl"
              containerClassName="font-bold leading-tight tracking-tight mb-0"
              animationDuration={1}
              ease="back.inOut(2)"
              scrollStart="center bottom+=50%"
              scrollEnd="bottom bottom-=40%"
              stagger={0.03}
              preserveRainbow={false}
            >
              {t('services.title.line1')}
            </RainbowScrollFloat>
            
            {/* Il sottotitolo arcobaleno senza margine superiore */}
            <div className="mt-0">
              <RainbowGradientText large={true} className="block text-4xl md:text-5xl font-bold">
                {t('services.title.line2')}
              </RainbowGradientText>
            </div>
          </div>
          
          {/* Una distanza prima del testo descrittivo */}
          <p className="text-lg md:text-xl text-gray-400 max-w-3xl mx-auto leading-relaxed mt-4">
            {t('services.subtitle.part1')}{' '}
            <DescriptedText 
              text={t('services.subtitle.highlight')} 
              className="text-white font-semibold"
              animateOn="view"
              sequential={true}
              speed={30}
            />{' '}
            {t('services.subtitle.part2')}
          </p>
        </div>
        
        {/* Services Grid */}
        <div className="grid lg:grid-cols-3 gap-8 mb-16">
          {t('services.items', { returnObjects: true }).map((service, index) => (
            <ServiceCard
              key={index}
              service={{
                ...service,
                icon: serviceIcons[index],
                color: serviceColors[index]
              }}
              index={index}
              onMouseEnter={setActiveCard}
              isActive={activeCard === index}
            />
          ))}
        </div>
        
        {/* CTA Section */}
        <div className="text-center">
          <div 
            className="
              max-w-4xl mx-auto rounded-none p-10
              backdrop-blur-sm border border-white/10 bg-black/30
              relative overflow-hidden
            "
          >
            {/* Background light effect */}
            <div
              className="absolute inset-0 pointer-events-none opacity-20"
              style={{
                background: `
                  radial-gradient(circle at 20% 20%, rgba(99, 102, 241, 0.15) 0%, transparent 70%),
                  radial-gradient(circle at 80% 80%, rgba(236, 72, 153, 0.15) 0%, transparent 70%)
                `
              }}
            />
            
            <h3 className="text-2xl md:text-3xl font-bold mb-4 text-white relative z-10">
              {t('services.cta.title')}
            </h3>
            
            <p className="text-lg text-gray-300 mb-8 max-w-2xl mx-auto relative z-10">
              <DescriptedText
                text={t('services.cta.description')}
                className="text-gray-300"
                encryptedClassName="text-gray-500"
                animateOn="view"
                sequential={true}
                speed={20}
                maxIterations={15}
              />
            </p>
            
            <div className="flex flex-col sm:flex-row gap-5 justify-center relative z-10">
              <a 
                href="#contact" 
                className="
                  inline-flex items-center justify-center
                  px-6 py-3 rounded-none font-medium
                  bg-black text-white hover:bg-white hover:text-black
                  transition-all duration-300
                  border border-white text-center
                "
              >
                {t('services.cta.primaryButton')}
              </a>
              
              <a
                href="#case-studies" 
                className="
                  inline-flex items-center justify-center
                  px-6 py-3 rounded-none font-medium
                  bg-transparent text-white
                  border border-white/50 hover:border-white hover:bg-black/30
                  transition-all duration-300 text-center
                "
              >
                {t('services.cta.secondaryButton')}
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default function ModernizedServices() {
  return <Services />;
}