import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import RainbowGradientText from '../components/ui/RainbowGradientText';
import RainbowScrollFloat from '../components/animations/RainbowScrollFloat';
import DescriptedText from '../components/ui/DescriptedText';

// Enhanced TypewriterCursor component with mobile optimization
const TypewriterCursor = ({ blinking = true, isMobile = false }) => {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = () => setPrefersReducedMotion(mediaQuery.matches);
    mediaQuery.addEventListener('change', handleChange);
    
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Much smaller height for mobile to reduce gap
  const heightClass = isMobile 
    ? 'h-4 sm:h-8 md:h-12 lg:h-16' 
    : 'h-8 md:h-12 lg:h-16';

  return (
    <span 
      className={`inline-block w-0.5 ${heightClass} bg-white ml-1 ${
        blinking && !prefersReducedMotion ? 'animate-typewriter-blink' : ''
      }`}
      style={{ 
        animationDuration: '800ms', 
        animationIterationCount: 'infinite',
        verticalAlign: 'middle',
        transform: 'translateY(-2px)',
        position: 'relative',
        display: 'inline-block'
      }}
      aria-hidden="true"
    />
  );
};

const Hero = ({ prefersReducedMotion: propReducedMotion = false }) => {
  const { t } = useTranslation();
  const [typedText, setTypedText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0);
  const [typingSpeed, setTypingSpeed] = useState(80);
  const [scrollY, setScrollY] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(propReducedMotion);
  const [isVisible, setIsVisible] = useState(false);
  
  const heroRef = useRef(null);
  const particlesContainerRef = useRef(null);
  const typewriterTimeoutRef = useRef(null);
  
  // Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Check for reduced motion preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches || propReducedMotion);

    const handleChange = () => setPrefersReducedMotion(mediaQuery.matches);
    mediaQuery.addEventListener('change', handleChange);
    
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [propReducedMotion]);

  // Store phrases array to avoid regeneration on each render - Always in English
  const phrases = useMemo(() => [
    'AI-Powered Growth',
    'Intelligent Automation',
    'Data-Driven Insights',
    'Business Transformation',
    'Competitive Advantage'
  ], []);
  
  // Cleanup function for typewriter
  const cleanupTypewriter = useCallback(() => {
    if (typewriterTimeoutRef.current) {
      clearTimeout(typewriterTimeoutRef.current);
      typewriterTimeoutRef.current = null;
    }
  }, []);

  // Enhanced typing effect with mobile optimization
  useEffect(() => {
    if (prefersReducedMotion) {
      setTypedText(phrases[currentPhraseIndex]);
      return;
    }

    const currentPhrase = phrases[currentPhraseIndex];
    const mobileSpeedMultiplier = isMobile ? 1.2 : 1;
    
    cleanupTypewriter();
    
    typewriterTimeoutRef.current = setTimeout(() => {
      if (!isDeleting) {
        setTypedText(currentPhrase.substring(0, typedText.length + 1));
        setTypingSpeed(80 * mobileSpeedMultiplier);
        
        if (typedText === currentPhrase) {
          setTypingSpeed(2000);
          setIsDeleting(true);
        }
      } else {
        setTypedText(currentPhrase.substring(0, typedText.length - 1));
        setTypingSpeed(40 * mobileSpeedMultiplier);
        
        if (typedText === '') {
          setIsDeleting(false);
          setCurrentPhraseIndex((currentPhraseIndex + 1) % phrases.length);
        }
      }
    }, typingSpeed);
    
    return cleanupTypewriter;
  }, [typedText, isDeleting, currentPhraseIndex, phrases, typingSpeed, isMobile, prefersReducedMotion, cleanupTypewriter]);
  
  // Optimized scroll handling
  useEffect(() => {
    if (isMobile) return; // Disable parallax on mobile for performance
    
    let ticking = false;
    
    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          setScrollY(window.scrollY);
          ticking = false;
        });
        ticking = true;
      }
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isMobile]);
  
  // Optimized 3D particles effect
  useEffect(() => {
    if (!particlesContainerRef.current || isMobile || prefersReducedMotion) return;
    
    const container = particlesContainerRef.current;
    const particles = Array.from(container.children);
    let rafId = null;
    
    const handleMouseMove = (e) => {
      if (rafId) return;
      
      rafId = requestAnimationFrame(() => {
        const { clientX, clientY } = e;
        const rect = container.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        const moveX = (clientX - centerX) / 50;
        const moveY = (clientY - centerY) / 50;
        
        particles.forEach((particle) => {
          const depth = parseFloat(particle.getAttribute('data-depth') || 1);
          const offsetX = moveX * depth;
          const offsetY = moveY * depth;
          
          particle.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
        });
        
        rafId = null;
      });
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
    };
  }, [isMobile, prefersReducedMotion]);
  
  // Intersection observer for fade-in effect
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
          }
        });
      },
      { threshold: 0.1 }
    );

    if (heroRef.current) {
      observer.observe(heroRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Calculate parallax transforms
  const getParallaxTransform = (factor) => {
    if (isMobile || prefersReducedMotion) return 'none';
    return `translateY(${-scrollY * factor}px)`;
  };

  const getParallaxOpacity = (maxScroll) => {
    if (isMobile) return 1;
    return Math.max(0, 1 - scrollY / maxScroll);
  };

  return (
    <section 
      ref={heroRef}
      className={`min-h-screen flex items-center justify-center pt-16 sm:pt-20 relative overflow-hidden ${
        isMobile ? 'hero-mobile' : ''
      }`}
      style={{ 
        background: 'linear-gradient(135deg, #0c0c0c 0%, #121212 50%, #141414 100%)'
      }}
    >
      {/* Interactive 3D particles - reduced count on mobile */}
      <div 
        ref={particlesContainerRef}
        className="absolute inset-0 pointer-events-none overflow-hidden"
        style={{ 
          perspective: '1000px',
          opacity: isVisible ? 1 : 0,
          transition: 'opacity 1s ease-out'
        }}
      >
        {[...Array(isMobile ? 8 : 20)].map((_, i) => {
          const size = Math.random() * (isMobile ? 4 : 6) + 2;
          const depth = Math.random() * 2.5 + 0.5;
          const opacity = Math.random() * 0.12 + 0.03;
          const left = Math.random() * 100;
          const top = Math.random() * 100;
          
          return (
            <div
              key={i}
              data-depth={depth}
              className="absolute rounded-full will-change-transform"
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
          backgroundSize: isMobile ? '60px 60px' : '80px 80px',
          transform: getParallaxTransform(0.05),
          transition: 'transform 0.2s ease-out',
          opacity: isVisible ? 1 : 0,
        }}
      />
      
      {/* Content Container */}
      <div className="container mx-auto max-w-6xl px-4 sm:px-6 text-center relative z-10">
        {/* Badge */}
        <div 
          className={`inline-flex items-center gap-2 bg-gray-800/80 backdrop-blur-sm text-white px-3 sm:px-5 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-medium mb-6 sm:mb-8 border border-gray-700/50 shadow-xl ${
            isVisible ? 'animate-fade-in' : 'opacity-0'
          }`}
          style={{ 
            transform: getParallaxTransform(0.1),
            opacity: getParallaxOpacity(500),
            animationDelay: '0.2s'
          }}
        >
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
          {t('hero.badge')}
        </div>
        
        {/* Main Heading with MUCH tighter spacing on mobile */}
        <div 
          className={`mb-6 sm:mb-12 ${isVisible ? 'animate-fade-in' : 'opacity-0'}`}
          style={{ 
            transform: getParallaxTransform(0.15),
            opacity: getParallaxOpacity(700),
            animationDelay: '0.4s'
          }}
        >
          {/* Tighter spacing container for mobile */}
          <div className={`${isMobile ? 'space-y-1' : 'space-y-0'}`}>
            <RainbowScrollFloat
              fontSize="text-3xl sm:text-5xl md:text-7xl lg:text-8xl"
              containerClassName="tracking-tighter mb-0"
              animationDuration={1}
              ease="back.inOut(2)"
              scrollStart="center bottom+=50%"
              scrollEnd="bottom bottom-=40%"
              stagger={0.03}
              large={true}
              preserveRainbow={false}
              lineHeight="leading-tight sm:leading-none"
              noMargin={true}
            >
              {t('hero.title')}
            </RainbowScrollFloat>
            
            {/* MUCH smaller fixed height container for mobile to eliminate gap */}
            <div className="tracking-tighter mt-0 flex items-center justify-center">
              <div className={`inline-flex items-center overflow-hidden ${
                isMobile 
                  ? 'h-[2rem]' // Very small height on mobile (32px)
                  : 'h-[4.5rem] sm:h-[4.5rem] md:h-[6.5rem] lg:h-[8.5rem]'
              }`}> 
                <RainbowGradientText 
                  large={true} 
                  className={`tracking-tighter ${
                    isMobile 
                      ? 'text-2xl' // Smaller text on mobile to fit smaller container
                      : 'text-3xl sm:text-5xl md:text-7xl lg:text-8xl'
                  }`}
                  animate={!prefersReducedMotion}
                >
                  {typedText}
                </RainbowGradientText>
                <TypewriterCursor isMobile={isMobile} blinking={!prefersReducedMotion} />
              </div>
            </div>
          </div>
        </div>
        
        {/* Subtitle with DescriptedText - Reduced margin on mobile */}
        <div 
          className={`mb-6 sm:mb-12 ${isVisible ? 'animate-fade-in' : 'opacity-0'}`}
          style={{ 
            transform: getParallaxTransform(0.1),
            opacity: getParallaxOpacity(600),
            animationDelay: '0.6s'
          }}
        >
          <div className="text-base sm:text-xl md:text-2xl text-gray-300 max-w-4xl mx-auto leading-relaxed space-y-2 sm:space-y-0">
            <DescriptedText
              text={t('hero.subtitle.line1')}
              className="text-gray-300"
              encryptedClassName="text-gray-500"
              animateOn="view"
              sequential={true}
              speed={isMobile ? 40 : 20}
              maxIterations={isMobile ? 15 : 20}
              delay={800}
              parentClassName="text-base sm:text-xl md:text-2xl max-w-4xl mx-auto leading-relaxed block sm:inline"
            />
            <br className="hidden sm:block" />
            <DescriptedText
              text={t('hero.subtitle.line2')}
              className="text-gray-300"
              encryptedClassName="text-gray-500"
              animateOn="view"
              sequential={true}
              speed={isMobile ? 40 : 20}
              maxIterations={isMobile ? 12 : 15}
              delay={1200}
              parentClassName="text-base sm:text-xl md:text-2xl max-w-4xl mx-auto leading-relaxed block sm:inline"
            />
          </div>
        </div>
        
        {/* CTA Buttons - Mobile optimized */}
        <div
          className={`flex flex-col sm:flex-row gap-3 sm:gap-5 justify-center items-center px-4 ${
            isVisible ? 'animate-fade-in' : 'opacity-0'
          }`}
          style={{ 
            transform: getParallaxTransform(0.05),
            opacity: getParallaxOpacity(800),
            animationDelay: '0.8s'
          }}
        >
          <a 
            href="#solutions" 
            className="
              inline-flex items-center justify-center
              px-6 py-3 sm:py-3 rounded-none font-medium
              bg-transparent text-white w-full sm:w-auto
              border border-white/50 hover:border-white hover:bg-black/30
              transition-all duration-300 text-center text-sm sm:text-base
              touch-manipulation btn-touch
            "
            onClick={(e) => {
              e.preventDefault();
              document.getElementById('solutions')?.scrollIntoView({ 
                behavior: 'smooth' 
              });
            }}
          >
            {t('hero.cta')}
          </a>
        </div>
        
        {/* Scroll Indicator - Hidden on mobile */}
        <div 
          className={`absolute -bottom-16 sm:-bottom-24 left-1/2 transform -translate-x-1/2 ${
            isMobile ? 'hidden' : 'block'
          } ${isVisible ? 'animate-fade-in' : 'opacity-0'}`}
          style={{ 
            opacity: getParallaxOpacity(250),
            transition: 'opacity 0.3s ease-out',
            animationDelay: '1s'
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