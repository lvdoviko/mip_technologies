import React, { useState, useEffect, useRef, useMemo } from 'react';
import RainbowGradientText from '../components/ui/RainbowGradientText';
import ScrollFloat from '../components/animations/ScrollFloat';
import RainbowScrollFloat from '../components/animations/RainbowScrollFloat';
import DescriptedText from '../components/ui/DescriptedText';

// Component for typing cursor with better vertical alignment
const TypewriterCursor = ({ blinking = true }) => {
  return (
    <span 
      className={`inline-block w-0.5 h-8 md:h-12 lg:h-16 bg-white ml-1 ${blinking ? 'animate-blink' : ''}`}
      style={{ 
        animationDuration: '800ms', 
        animationIterationCount: 'infinite',
        verticalAlign: 'middle',
        transform: 'translateY(0%)',
        position: 'relative',
        top: '0.05em',
        display: 'inline-block'
      }}
    />
  );
};

const Hero = () => {
  const [typedText, setTypedText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0);
  const [typingSpeed, setTypingSpeed] = useState(80);
  const [scrollY, setScrollY] = useState(0);
  
  const heroRef = useRef(null);
  const particlesContainerRef = useRef(null);
  
  // Store phrases array to avoid regeneration on each render
  const phrases = useMemo(() => [
    'AI-Powered Growth',
    'Intelligent Automation',
    'Data-Driven Insights',
    'Business Transformation',
    'Competitive Advantage'
  ], []);
  
  // Typing effect
  useEffect(() => {
    const currentPhrase = phrases[currentPhraseIndex];
    
    const timer = setTimeout(() => {
      if (!isDeleting) {
        setTypedText(currentPhrase.substring(0, typedText.length + 1));
        setTypingSpeed(80);
        
        if (typedText === currentPhrase) {
          setTypingSpeed(2000);
          setIsDeleting(true);
        }
      } else {
        setTypedText(currentPhrase.substring(0, typedText.length - 1));
        setTypingSpeed(40);
        
        if (typedText === '') {
          setIsDeleting(false);
          setCurrentPhraseIndex((currentPhraseIndex + 1) % phrases.length);
        }
      }
    }, typingSpeed);
    
    return () => clearTimeout(timer);
  }, [typedText, isDeleting, currentPhraseIndex, phrases, typingSpeed]);
  
  // Parallax effect on scroll
  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  // 3D particles effect following mouse
  useEffect(() => {
    if (!particlesContainerRef.current) return;
    
    const container = particlesContainerRef.current;
    const particles = Array.from(container.children);
    
    const handleMouseMove = (e) => {
      const { clientX, clientY } = e;
      const rect = container.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      
      const moveX = (clientX - centerX) / 50;
      const moveY = (clientY - centerY) / 50;
      
      particles.forEach((particle, index) => {
        const depth = parseFloat(particle.getAttribute('data-depth') || 1);
        const offsetX = moveX * depth;
        const offsetY = moveY * depth;
        
        particle.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
      });
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);
  
  // Find the longest phrase for fixed-height container calculation
  const longestPhrase = useMemo(() => {
    return phrases.reduce((longest, current) => 
      current.length > longest.length ? current : longest, '');
  }, [phrases]);
  
  return (
    <section 
      ref={heroRef}
      className="min-h-screen flex items-center justify-center pt-20 relative overflow-hidden"
      style={{ 
        background: 'linear-gradient(135deg, #0c0c0c 0%, #121212 50%, #141414 100%)'
      }}
    >
      {/* Interactive 3D particles */}
      <div 
        ref={particlesContainerRef}
        className="absolute inset-0 pointer-events-none overflow-hidden"
        style={{ perspective: '1000px' }}
      >
        {[...Array(20)].map((_, i) => {
          const size = Math.random() * 6 + 2;
          const depth = Math.random() * 2.5 + 0.5;
          const opacity = Math.random() * 0.12 + 0.03;
          const left = Math.random() * 100;
          const top = Math.random() * 100;
          
          return (
            <div
              key={i}
              data-depth={depth}
              className="absolute rounded-full"
              style={{
                width: `${size}px`,
                height: `${size}px`,
                left: `${left}%`,
                top: `${top}%`,
                backgroundColor: i % 3 === 0 ? 'rgba(79, 70, 229, 0.8)' : 
                               i % 3 === 1 ? 'rgba(59, 130, 246, 0.7)' : 
                               'rgba(236, 72, 153, 0.6)',
                boxShadow: `0 0 ${size * 2}px rgba(${i % 3 === 0 ? '79, 70, 229' : 
                                                     i % 3 === 1 ? '59, 130, 246' : 
                                                     '236, 72, 153'}, ${opacity})`,
                opacity: opacity * 2,
                transform: `translateZ(${depth * 100}px)`,
                transition: 'transform 0.2s ease-out',
              }}
            />
          );
        })}
      </div>
      
      {/* Technical grid background */}
      <div 
        className="absolute inset-0 pointer-events-none z-0"
        style={{
          backgroundImage: `
            linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px),
            linear-gradient(0deg, rgba(255,255,255,0.03) 1px, transparent 1px)
          `,
          backgroundSize: '80px 80px',
          transform: `translate(${scrollY * 0.05}px, ${scrollY * 0.05}px)`,
          transition: 'transform 0.2s ease-out',
        }}
      />
      
      {/* Content Container */}
      <div className="container mx-auto max-w-6xl px-4 text-center relative z-10">
        {/* Badge - Plain text without animation */}
        <div 
          className="inline-flex items-center gap-2 bg-gray-800/80 backdrop-blur-sm text-white px-5 py-2.5 rounded-full text-sm font-medium mb-8 border border-gray-700/50 shadow-xl"
          style={{ 
            transform: `translateY(${-scrollY * 0.1}px)`,
            transition: 'transform 0.3s ease-out, opacity 0.3s ease-out',
            opacity: Math.max(0, 1 - scrollY / 500),
          }}
        >
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
          Enterprise AI Solutions
        </div>
        
        {/* Main Heading with fixed height container */}
        <div 
          className="mb-12"
          style={{ 
            transform: `translateY(${-scrollY * 0.15}px)`,
            transition: 'transform 0.3s ease-out, opacity 0.3s ease-out',
            opacity: Math.max(0, 1 - scrollY / 700),
          }}
        >
          <div className="space-y-0">
            <RainbowScrollFloat
              fontSize="text-5xl md:text-7xl lg:text-8xl"
              containerClassName="tracking-tighter mb-0"
              animationDuration={1}
              ease="back.inOut(2)"
              scrollStart="center bottom+=50%"
              scrollEnd="bottom bottom-=40%"
              stagger={0.03}
              large={true}
              preserveRainbow={false}
              lineHeight="leading-none"
              noMargin={true}
            >
              Unlock the Power of
            </RainbowScrollFloat>
            
            {/* Fixed height container for the typewriter text */}
            <div className="tracking-tighter mt-0 flex items-center justify-center">
              {/* Calculate fixed height based on the tallest text to prevent layout shifts */}
              <div className="inline-flex items-center h-[4.5rem] md:h-[6.5rem] lg:h-[8.5rem] overflow-hidden"> 
                <RainbowGradientText large={true} className="tracking-tighter text-5xl md:text-7xl lg:text-8xl">
                  {typedText}
                </RainbowGradientText>
                <TypewriterCursor />
              </div>
            </div>
          </div>
        </div>
        
        {/* Subtitle with DescriptedText */}
        <div 
          className="mb-12"
          style={{ 
            transform: `translateY(${-scrollY * 0.1}px)`,
            transition: 'transform 0.3s ease-out, opacity 0.3s ease-out',
            opacity: Math.max(0, 1 - scrollY / 600),
          }}
        >
          <p className="text-xl md:text-2xl text-gray-300 max-w-4xl mx-auto leading-relaxed">
            <DescriptedText
              text="Transform your business with cutting-edge AI solutions that drive measurable growth and competitive advantage."
              className="text-gray-300"
              encryptedClassName="text-gray-500"
              animateOn="view"
              sequential={true}
              speed={15}
              maxIterations={20}
              parentClassName="text-xl md:text-2xl max-w-4xl mx-auto leading-relaxed"
            />
            <br className="hidden md:block" />
            <DescriptedText
              text="From strategy to implementation, we deliver AI that powers your success."
              className="text-gray-300"
              encryptedClassName="text-gray-500"
              animateOn="view"
              sequential={true}
              speed={15}
              maxIterations={15}
              parentClassName="text-xl md:text-2xl max-w-4xl mx-auto leading-relaxed"
            />
          </p>
        </div>
        
        {/* CTA Buttons */}
        <div
          className="flex flex-col sm:flex-row gap-5 justify-center items-center"
          style={{ 
            transform: `translateY(${-scrollY * 0.05}px)`,
            transition: 'transform 0.3s ease-out, opacity 0.3s ease-out',
            opacity: Math.max(0, 1 - scrollY / 800),
          }}
        >
          <a 
            href="#solutions" 
            className="
              inline-flex items-center justify-center
              px-6 py-3 rounded-none font-medium
              bg-transparent text-white
              border border-white/50 hover:border-white hover:bg-black/30
              transition-all duration-300 text-center
            "
          >
            Start Your AI Journey
          </a>
        </div>
        
        {/* Scroll Indicator */}
        <div 
          className="absolute -bottom-24 left-1/2 transform -translate-x-1/2"
          style={{ 
            opacity: Math.max(0, 1 - scrollY / 250),
            transition: 'opacity 0.3s ease-out',
          }}
        >
          <div className="w-8 h-14 border-2 border-white/30 rounded-full flex justify-center">
            <div className="w-1 h-4 bg-white/40 rounded-full mt-2 animate-bounce-subtle"></div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;