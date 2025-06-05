// src/sections/About.jsx
import React, { useState, useRef, useEffect } from 'react';
import { values } from '../data/values';

const About = () => {
  const [activeCard, setActiveCard] = useState(null);
  const [offset, setOffset] = useState(0);
  const cardsRef = useRef([]);
  const sectionRef = useRef(null);

  // Scroll handling and parallax
  useEffect(() => {
    const handleScroll = () => {
      setOffset(window.scrollY);
      
      // Activate cards based on scroll
      if (sectionRef.current) {
        const sectionTop = sectionRef.current.getBoundingClientRect().top;
        const viewportHeight = window.innerHeight;
        
        if (sectionTop <= viewportHeight * 0.5 && sectionTop > -viewportHeight * 0.5) {
          cardsRef.current.forEach((card, index) => {
            if (card) {
              const cardRect = card.getBoundingClientRect();
              const cardCenter = cardRect.top + cardRect.height / 2;
              
              if (cardCenter > viewportHeight * 0.3 && cardCenter < viewportHeight * 0.7) {
                setActiveCard(index);
              }
            }
          });
        }
      }
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  // Animation on entry
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
    
    const contentElements = document.querySelectorAll('.about-animate');
    contentElements.forEach(el => observer.observe(el));
    
    cardsRef.current.forEach(card => {
      if (card) observer.observe(card);
    });
    
    return () => observer.disconnect();
  }, []);

  return (
    <section 
      id="company" 
      className="py-24 bg-black relative overflow-hidden"
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
      
      {/* Subtle colored gradients */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-5"
        style={{
          background: `
            radial-gradient(circle at 20% 20%, rgba(99, 102, 241, 0.3) 0%, transparent 70%),
            radial-gradient(circle at 80% 80%, rgba(236, 72, 153, 0.3) 0%, transparent 70%)
          `,
          transform: `translateY(${offset * 0.1}px)`,
          transition: 'transform 0.2s ease-out',
        }}
      />
      
      <div className="container mx-auto max-w-6xl px-4 relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Content Side */}
          <div className="about-animate opacity-0 transform translate-y-10 transition-all duration-700">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-black border border-white/20 text-white px-4 py-2 rounded-none text-sm font-medium mb-8">
              <div className="w-2 h-2 bg-white"></div>
              Who We Are
            </div>
            
            {/* Main Heading */}
            <div className="space-y-6">
              <h2 className="text-4xl md:text-5xl font-bold leading-tight text-white">
                Building Smarter
                <span className="text-gradient-rainbow block mt-2">Web Solutions</span>
              </h2>
              
              {/* Enhanced Description */}
              <div className="space-y-6">
                <p className="text-lg md:text-xl text-gray-300 leading-relaxed">
                  <span className="text-white font-semibold">MIP Technologies</span> is a passionate team of developers who believe{' '}
                  <span className="text-white font-semibold">artificial intelligence</span>{' '}
                  should be accessible and practical for all businesses.
                </p>
                
                <p className="text-gray-400 leading-relaxed">
                  We're focused on creating{' '}
                  <span className="text-white font-semibold">intelligent web applications</span>{' '}
                  that solve real problems. Our approach combines modern development practices with cutting-edge AI to build solutions that are both powerful and user-friendly.
                </p>
                
                <div className="bg-black border border-white/20 rounded-none p-6 transition-all duration-300 hover:border-white/50">
                  <p className="text-gray-300 leading-relaxed italic">
                    "We believe great AI solutions should feel natural and helpful, not overwhelming. Our goal is to{' '}
                    <span className="text-white font-semibold">make intelligent technology</span>{' '}
                    work seamlessly in your business, enhancing what you do rather than complicating it."
                  </p>
                </div>
              </div>
            </div>
            
            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 pt-8 about-animate opacity-0 transform translate-y-10 transition-all duration-700" style={{ transitionDelay: '200ms' }}>
              <a 
                href="#contact" 
                className="px-6 py-3 bg-black border border-white text-white rounded-none font-medium hover:bg-white hover:text-black transition-all duration-300 text-center"
              >
                Work With Us
              </a>
              
              <a 
                href="#solutions" 
                className="px-6 py-3 bg-transparent border border-white/50 text-white rounded-none font-medium hover:border-white hover:bg-black/30 transition-all duration-300 text-center"
              >
                See Our Work
              </a>
            </div>
          </div>
          
          {/* Values Grid */}
          <div className="grid grid-cols-2 gap-6">
            {values.map((value, index) => (
              <div
                key={index}
                ref={el => cardsRef.current[index] = el}
                className={`
                  opacity-0 transform translate-y-10 transition-all duration-500
                  ${index % 2 === 0 ? 'value-card-left' : 'value-card-right'}
                `}
                style={{ transitionDelay: `${index * 100}ms` }}
                onMouseEnter={() => setActiveCard(index)}
                onMouseLeave={() => setActiveCard(null)}
              >
                <div className={`
                  h-full bg-black border rounded-none p-6 transition-all duration-300
                  ${activeCard === index 
                    ? 'border-white shadow-[0_0_15px_rgba(255,255,255,0.1)] scale-105' 
                    : 'border-white/20 hover:border-white/50 hover:-translate-y-2'
                  }
                `}>
                  {/* Icon Container */}
                  <div className={`
                    mb-4 w-12 h-12 flex items-center justify-center
                    transition-all duration-300
                    ${activeCard === index 
                      ? 'bg-white text-black' 
                      : 'bg-black border border-white/30 text-white'
                    }
                  `}>
                    {value.icon}
                  </div>
                  
                  {/* Content */}
                  <div className="space-y-3">
                    <h3 className="text-lg font-bold text-white">
                      {value.title}
                    </h3>
                    
                    <p className="text-gray-400 text-sm leading-relaxed">
                      {value.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default About;