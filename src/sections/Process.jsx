import React, { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { steps } from '../data/process';
import ScrollFloat from '../components/animations/ScrollFloat'; 
import DescriptedText from '../components/ui/DescriptedText';

const Process = () => {
  const { t } = useTranslation();
  const [activeStep, setActiveStep] = useState(null);
  const [offset, setOffset] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const sectionRef = useRef(null);
  const cardsRef = useRef([]);

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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
      className="py-16 sm:py-20 bg-black relative overflow-hidden"
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
          transform: isMobile ? 'none' : `translate(${offset * 0.04}px, ${offset * 0.05}px)`,
          transition: 'transform 0.2s ease-out',
        }}
      />
      
      <div className="container mx-auto max-w-7xl px-4 relative z-10">
        <div className="text-center mb-12 sm:mb-16">
          {/* Mobile: Two lines, Desktop: One line */}
          {isMobile ? (
            <div className="mb-4 sm:mb-6">
              <h2 className="text-3xl font-bold text-white leading-tight">
                {t('process.title')}
              </h2>
            </div>
          ) : (
            <ScrollFloat
              containerClassName="mb-4 sm:mb-6"
              textClassName="text-4xl md:text-5xl font-bold text-white"
              scrollStart="top bottom"
              scrollEnd="center center"
            >
              {t('process.title')}
            </ScrollFloat>
          )}
          
          {/* Mobile: Show static text, Desktop: Show animated text */}
          {isMobile ? (
            <p className="text-lg sm:text-xl text-gray-400 max-w-3xl mx-auto leading-relaxed">
              {t('process.subtitle.part1')}{' '}
              <span className="text-white font-semibold">{t('process.subtitle.highlight')}</span>{' '}
              {t('process.subtitle.part2')}
            </p>
          ) : (
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">
              {t('process.subtitle.part1')}{' '}
              <DescriptedText
                text={t('process.subtitle.highlight')}
                className="text-white font-semibold"
                encryptedClassName="text-gray-500"
                animateOn="view"
                sequential={true}
                speed={30}
                maxIterations={15}
              />{' '}
              {t('process.subtitle.part2')}
            </p>
          )}
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 relative">
          {/* Horizontal timeline - hidden on mobile */}
          <div className="hidden lg:block absolute top-1/2 left-0 right-0 h-px bg-white/10 transform -translate-y-1/2 z-0"></div>
          
          {t('process.steps', { returnObjects: true }).map((step, index) => (
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
                h-full bg-black border border-white/20 rounded-none p-4 sm:p-6 md:p-8
                transition-all duration-300 hover:-translate-y-2
                ${activeStep === index 
                  ? 'border-white shadow-[0_0_15px_rgba(255,255,255,0.1)] scale-105 z-10' 
                  : 'hover:border-white/50 hover:shadow-[0_0_10px_rgba(255,255,255,0.05)]'
                }
              `}>
                {/* Header Section */}
                <div className="flex items-center mb-4 sm:mb-6">
                  {/* Icon Container */}
                  <div className={`
                    w-10 h-10 sm:w-12 sm:h-12 bg-black border rounded-none flex items-center justify-center text-lg sm:text-xl mr-3 sm:mr-4
                    transition-all duration-300
                    ${activeStep === index ? 'border-white text-white' : 'border-white/30 text-white/70'}
                  `}>
                    <div dangerouslySetInnerHTML={{ __html: step.icon }} />
                  </div>
                  
                  {/* Step Number */}
                  <div className="flex items-center">
                    <span className={`
                      text-2xl sm:text-4xl font-bold mr-2 sm:mr-3 transition-all duration-300
                      ${activeStep === index ? 'text-white/50' : 'text-white/20'}
                    `}>
                      {step.number}
                    </span>
                    <div className={`
                      w-5 h-5 sm:w-6 sm:h-6 rounded-none text-xs font-bold flex items-center justify-center
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
                  <h3 className="text-lg sm:text-xl font-bold text-white">
                    {step.title}
                  </h3>
                  
                  {/* Description - Static on mobile, animated on desktop */}
                  <div className="text-gray-400 leading-relaxed text-sm sm:text-base">
                    {isMobile ? (
                      step.description
                    ) : (
                      <DescriptedText
                        text={step.description}
                        className="text-gray-400"
                        encryptedClassName="text-gray-600"
                        animateOn="view"
                        sequential={true}
                        speed={25}
                        maxIterations={15}
                      />
                    )}
                  </div>
                </div>
                
                {/* Progress Indicator */}
                <div className="flex items-center gap-1 mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-white/10">
                  {[...Array(t('process.steps', { returnObjects: true }).length)].map((_, i) => (
                    <div
                      key={i}
                      className={`
                        w-1.5 h-1.5 sm:w-2 sm:h-2 transition-all duration-300
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

              {/* Connection Line - Only on desktop */}
              {index < t('process.steps', { returnObjects: true }).length - 1 && index % 3 !== 2 && (
                <div className="hidden lg:block absolute top-1/2 right-0 transform translate-x-4 -translate-y-1/2 z-10">
                  <div className="w-8 h-px bg-white/20"></div>
                </div>
              )}
            </div>
          ))}
        </div>
        
        {/* Bottom CTA */}
        <div className="text-center mt-12 sm:mt-16">
          <div className="max-w-3xl mx-auto bg-black border border-white/10 rounded-xl p-6 sm:p-8 md:p-12">
            <h3 className="text-xl sm:text-2xl md:text-3xl font-bold mb-4 text-white">
              {t('process.cta.title')}
            </h3>
            <div className="text-gray-400 mb-6 sm:mb-8 text-sm sm:text-base leading-relaxed">
              {isMobile ? (
                t('process.cta.description')
              ) : (
                <DescriptedText
                  text={t('process.cta.description')}
                  className="text-gray-400"
                  encryptedClassName="text-gray-600"
                  animateOn="view"
                  sequential={true}
                  speed={20}
                />
              )}
            </div>
            <a 
              href="#contact" 
              className="inline-flex items-center justify-center px-6 py-3 bg-black border border-white text-white rounded-none font-medium hover:bg-white hover:text-black transition-all duration-300 touch-manipulation"
            >
              {t('process.cta.button')}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Process;