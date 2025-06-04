// src/sections/Hero.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useScrollAnimation } from '../hooks/useScrollAnimation';
import Button from '../components/ui/Button';

const Hero = () => {
  useScrollAnimation();
  const [offset, setOffset] = useState(0);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [typedText, setTypedText] = useState('');
  const canvasRef = useRef(null);
  
  const phrases = [
    'Intelligenza Artificiale',
    'Machine Learning',
    'Deep Learning',
    'Neural Networks',
    'AI Solutions'
  ];
  const [currentPhrase, setCurrentPhrase] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setOffset(window.pageYOffset);
    };

    const handleMouseMove = (e) => {
      setMousePos({
        x: (e.clientX / window.innerWidth) * 100,
        y: (e.clientY / window.innerHeight) * 100,
      });
    };

    window.addEventListener('scroll', handleScroll);
    window.addEventListener('mousemove', handleMouseMove);
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  // Typewriter effect
  useEffect(() => {
    let currentIndex = 0;
    let currentChar = 0;
    let isDeleting = false;
    
    const typeWriter = () => {
      const currentText = phrases[currentIndex];
      
      if (!isDeleting) {
        setTypedText(currentText.substring(0, currentChar + 1));
        currentChar++;
        
        if (currentChar === currentText.length) {
          setTimeout(() => { isDeleting = true; }, 2000);
        }
      } else {
        setTypedText(currentText.substring(0, currentChar - 1));
        currentChar--;
        
        if (currentChar === 0) {
          isDeleting = false;
          currentIndex = (currentIndex + 1) % phrases.length;
          setCurrentPhrase(currentIndex);
        }
      }
    };

    const timer = setInterval(typeWriter, isDeleting ? 50 : 150);
    return () => clearInterval(timer);
  }, [currentPhrase]);

  // Animated particles canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    let animationFrameId;
    
    const setCanvasSize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    
    window.addEventListener('resize', setCanvasSize);
    setCanvasSize();
    
    const particles = [];
    const particleCount = 50;
    
    class Particle {
      constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.size = Math.random() * 3 + 1;
        this.speedX = (Math.random() - 0.5) * 0.5;
        this.speedY = (Math.random() - 0.5) * 0.5;
        this.color = ['#0087FF', '#00D4FF', '#8B5CF6', '#EC4899'][Math.floor(Math.random() * 4)];
        this.opacity = Math.random() * 0.8 + 0.2;
      }
      
      update() {
        this.x += this.speedX;
        this.y += this.speedY;
        
        if (this.x > canvas.width || this.x < 0) this.speedX *= -1;
        if (this.y > canvas.height || this.y < 0) this.speedY *= -1;
      }
      
      draw() {
        ctx.save();
        ctx.globalAlpha = this.opacity;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        
        // Glow effect
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 20;
        ctx.fill();
        ctx.restore();
      }
    }
    
    // Initialize particles
    for (let i = 0; i < particleCount; i++) {
      particles.push(new Particle());
    }
    
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw connections
      particles.forEach((particle, index) => {
        particle.update();
        particle.draw();
        
        // Draw connections to nearby particles
        particles.slice(index + 1).forEach(otherParticle => {
          const dx = particle.x - otherParticle.x;
          const dy = particle.y - otherParticle.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance < 100) {
            ctx.save();
            ctx.globalAlpha = (100 - distance) / 100 * 0.3;
            ctx.strokeStyle = '#0087FF';
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(particle.x, particle.y);
            ctx.lineTo(otherParticle.x, otherParticle.y);
            ctx.stroke();
            ctx.restore();
          }
        });
      });
      
      animationFrameId = requestAnimationFrame(animate);
    };
    
    animate();
    
    return () => {
      window.removeEventListener('resize', setCanvasSize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Animated Background Canvas */}
      <canvas 
        ref={canvasRef}
        className="absolute inset-0 z-0 opacity-30"
      />
      
      {/* Dynamic Background */}
      <div 
        className="absolute inset-0 z-0"
        style={{
          background: `
            radial-gradient(ellipse at ${mousePos.x}% ${mousePos.y}%, rgba(0, 135, 255, 0.15) 0%, transparent 50%),
            radial-gradient(ellipse at ${100 - mousePos.x}% ${100 - mousePos.y}%, rgba(139, 92, 246, 0.1) 0%, transparent 50%),
            linear-gradient(135deg, #ffffff 0%, #f8faff 30%, #e6f3ff 60%, #f0f9ff 100%)
          `,
          transform: `translateY(${offset * 0.3}px)`,
          transition: 'background 0.3s ease-out, transform 0.1s ease-out',
        }}
      />
      
      {/* Floating AI Elements */}
      <div className="absolute inset-0 z-10 pointer-events-none">
        {/* Large AI Circle */}
        <div 
          className="absolute w-96 h-96 rounded-full opacity-10"
          style={{
            top: '10%',
            right: '10%',
            background: 'conic-gradient(from 0deg, #0087FF, #00D4FF, #8B5CF6, #EC4899, #0087FF)',
            transform: `rotate(${offset * 0.1}deg) scale(${1 + Math.sin(offset * 0.01) * 0.1})`,
            animation: 'spin-slow 30s linear infinite',
          }}
        />
        
        {/* Neural Network Pattern */}
        <div 
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `
              radial-gradient(circle at 20% 30%, #0087FF 1px, transparent 1px),
              radial-gradient(circle at 80% 70%, #8B5CF6 1px, transparent 1px),
              radial-gradient(circle at 60% 20%, #00D4FF 0.5px, transparent 0.5px)
            `,
            backgroundSize: '100px 100px, 150px 150px, 80px 80px',
            transform: `translate(${Math.sin(offset * 0.005) * 50}px, ${Math.cos(offset * 0.005) * 30}px)`,
          }}
        />
      </div>
      
      {/* Content Container */}
      <div className="container mx-auto max-w-7xl px-4 text-center relative z-20 pt-20">
        {/* Main Heading */}
        <div className="mb-8 animate-fade-up">
          <h1 
            className="text-5xl md:text-7xl lg:text-8xl font-bold leading-tight mb-6"
            style={{ 
              transform: `translateY(${-offset * 0.2}px)`,
              transition: 'transform 0.1s ease-out',
            }}
          >
            <span className="block text-gray-900 mb-2">
              Il Futuro è
            </span>
            <span 
              className="block text-gradient bg-gradient-to-r from-primary-500 via-neon-blue to-primary-600 bg-clip-text text-transparent font-display relative"
            >
              {typedText}
              <span className="animate-ping inline-block w-1 h-16 md:h-20 lg:h-24 bg-primary-500 ml-2 align-middle"></span>
            </span>
          </h1>
        </div>
        
        {/* Subtitle */}
        <div 
          className="animate-fade-up mb-12"
          style={{ 
            animationDelay: '0.3s',
            transform: `translateY(${-offset * 0.1}px)`,
            transition: 'transform 0.1s ease-out',
          }}
        >
          <p className="text-xl md:text-2xl lg:text-3xl text-gray-600 max-w-4xl mx-auto leading-relaxed">
            Trasformiamo le tue idee in{' '}
            <span className="text-gradient-accent font-semibold">soluzioni AI innovative</span>.
            <br className="hidden md:block" />
            Implementiamo, sviluppiamo e addestriamo modelli di intelligenza artificiale{' '}
            <span className="text-primary-600 font-semibold">su misura</span> per il tuo business.
          </p>
        </div>
        
        {/* CTA Buttons */}
        <div
          className="flex flex-col sm:flex-row gap-6 justify-center items-center animate-fade-up mb-16"
          style={{ 
            animationDelay: '0.6s',
            transform: `translateY(${-offset * 0.05}px)`,
            transition: 'transform 0.1s ease-out',
          }}
        >
          <Button 
            href="#servizi" 
            variant="primary" 
            size="lg"
            glow={true}
            icon={<span className="text-2xl">🚀</span>}
          >
            Scopri i Nostri Servizi
          </Button>
          
          <Button 
            href="#contatti" 
            variant="glass" 
            size="lg"
            tilt={true}
            icon={<span className="text-2xl">💬</span>}
          >
            Richiedi Consulenza
          </Button>
        </div>
        
        {/* AI Visualization */}
        <div
          className="relative animate-fade-up"
          style={{ 
            animationDelay: '1s',
            transform: `translateY(${-offset * 0.15}px)`,
            transition: 'transform 0.1s ease-out',
          }}
        >
          {/* Central AI Core */}
          <div className="relative mx-auto w-48 h-48 md:w-64 md:h-64">
            {/* Outer Ring */}
            <div 
              className="absolute inset-0 rounded-full border-2 border-primary-300/30"
              style={{
                animation: 'spin-slow 20s linear infinite',
              }}
            />
            
            {/* Middle Ring */}
            <div 
              className="absolute inset-4 rounded-full border-2 border-neon-blue/40"
              style={{
                animation: 'spin-reverse 15s linear infinite',
              }}
            />
            
            {/* Inner Ring */}
            <div 
              className="absolute inset-8 rounded-full border-2 border-neon-purple/50"
              style={{
                animation: 'spin-slow 10s linear infinite',
              }}
            />
            
            {/* AI Core */}
            <div className="absolute inset-12 md:inset-16 rounded-full bg-gradient-to-r from-primary-500 to-neon-blue flex items-center justify-center text-white text-4xl md:text-6xl font-bold shadow-glow-lg animate-pulse-glow">
              AI
            </div>
            
            {/* Orbiting Particles */}
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="absolute w-3 h-3 rounded-full bg-accent-400 shadow-glow-accent"
                style={{
                  top: '50%',
                  left: '50%',
                  transform: `
                    translate(-50%, -50%) 
                    rotate(${i * 45}deg) 
                    translateY(-80px) 
                    rotate(${-i * 45}deg)
                  `,
                  animation: `spin-slow ${20 + i * 2}s linear infinite`,
                }}
              />
            ))}
          </div>
          
          {/* Data Streams */}
          <div className="absolute inset-0 pointer-events-none">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="absolute h-px bg-gradient-to-r from-transparent via-primary-400 to-transparent opacity-60"
                style={{
                  top: `${30 + i * 8}%`,
                  left: '-50%',
                  width: '200%',
                  animation: `dataFlow ${3 + i * 0.5}s ease-in-out infinite`,
                  animationDelay: `${i * 0.3}s`,
                }}
              />
            ))}
          </div>
        </div>
        
        {/* Scroll Indicator */}
        <div 
          className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce-subtle"
          style={{ 
            opacity: Math.max(0, 1 - offset / 300),
            transition: 'opacity 0.3s ease-out',
          }}
        >
          <div className="w-6 h-10 border-2 border-primary-400 rounded-full flex justify-center">
            <div className="w-1 h-3 bg-primary-500 rounded-full mt-2 animate-bounce"></div>
          </div>
        </div>
      </div>
      
      {/* Ambient Light Effects */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse at top left, rgba(0, 135, 255, 0.1) 0%, transparent 50%),
            radial-gradient(ellipse at bottom right, rgba(255, 107, 53, 0.1) 0%, transparent 50%),
            radial-gradient(ellipse at center, rgba(139, 92, 246, 0.05) 0%, transparent 70%)
          `,
          transform: `translateY(${offset * 0.4}px)`,
          transition: 'transform 0.1s ease-out',
        }}
      />
    </section>
  );
};

export default Hero;