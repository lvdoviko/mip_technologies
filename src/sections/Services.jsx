import React, { useState, useRef, useEffect } from 'react';

// Temporary import of rainbow text component
const RainbowGradientText = ({ children, className = '', large = false }) => {
  return (
    <span 
      className={`font-bold ${className}`}
      style={{
        backgroundImage: large 
          ? `linear-gradient(90deg, #ff0080, #ff8000, #ffff00, #00ff80, #00ffff, #0080ff, #8000ff, #ff0080)`
          : `linear-gradient(90deg, #ff0080, #7928CA, #0070F3, #00DFD8, #7928CA, #ff0080)`,
        backgroundSize: '200% 100%',
        backgroundClip: 'text',
        WebkitBackgroundClip: 'text',
        color: 'transparent',
        WebkitTextFillColor: 'transparent',
        display: 'inline-block',
        animation: 'gradient-animation 8s linear infinite',
        filter: large ? 'brightness(1.1) contrast(1.1)' : 'none',
        textShadow: large ? '0 0 30px rgba(128, 0, 255, 0.15)' : 'none'
      }}
    >
      {children}
    </span>
  );
};

// Realistic services data
const servicesData = [
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M16.2398 7.76001L14.1198 14.12L7.75977 16.24L9.87977 9.88001L16.2398 7.76001Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    title: "AI Integration for Web Applications",
    description: "Add intelligent features to your existing web applications. We help you integrate AI capabilities that enhance user experience and automate key processes without rebuilding everything.",
    features: ["Smart Feature Integration", "API Development", "Performance Optimization", "Scalable Architecture"],
    color: "#0070F3"
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M21 16V8.00002C20.9996 7.6493 20.9071 7.30483 20.7315 7.00119C20.556 6.69754 20.3037 6.44539 20 6.27002L13 2.27002C12.696 2.09449 12.3511 2.00208 12 2.00208C11.6489 2.00208 11.304 2.09449 11 2.27002L4 6.27002C3.69626 6.44539 3.44398 6.69754 3.26846 7.00119C3.09294 7.30483 3.00036 7.6493 3 8.00002V16C3.00036 16.3508 3.09294 16.6952 3.26846 16.9989C3.44398 17.3025 3.69626 17.5547 4 17.73L11 21.73C11.304 21.9056 11.6489 21.998 12 21.998C12.3511 21.998 12.696 21.9056 13 21.73L20 17.73C20.3037 17.5547 20.556 17.3025 20.7315 16.9989C20.9071 16.6952 20.9996 16.3508 21 16Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M3.27002 6.96L12 12.01L20.73 6.96" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M12 22.08V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    title: "AI-First Web Application Development",
    description: "Build modern web applications designed with AI at their core. From intelligent interfaces to automated workflows, we create applications that work smarter from day one.",
    features: ["AI-Driven Design", "Intelligent User Experience", "Modern Tech Stack", "Responsive Design"],
    color: "#7928CA"
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    title: "Custom AI Solutions",
    description: "Develop AI models and solutions tailored to your specific business needs. We work with your data and requirements to create intelligent systems that solve your unique challenges.",
    features: ["Custom Model Development", "Data Analysis & Training", "Business-Specific Solutions", "Ongoing Support"],
    color: "#FF0080"
  }
];

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
          
          {/* Description */}
          <p className="text-gray-400 leading-relaxed">
            {description}
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
                  {feature}
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
            What We Do
          </div>
          
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-white leading-tight tracking-tight">
            AI Solutions
            <RainbowGradientText large={true} className="block mt-2">
              That Actually Work
            </RainbowGradientText>
          </h2>
          
          <p className="text-lg md:text-xl text-gray-400 max-w-3xl mx-auto leading-relaxed">
            We build{' '}
            <span className="text-white font-semibold">practical AI solutions</span>{' '}
            that integrate smoothly with your business and deliver real value to your users.
          </p>
        </div>
        
        {/* Services Grid */}
        <div className="grid lg:grid-cols-3 gap-8 mb-16">
          {servicesData.map((service, index) => (
            <ServiceCard
              key={index}
              service={service}
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
              max-w-4xl mx-auto rounded-xl p-10
              backdrop-blur-sm border border-white/10 bg-white/5
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
              Ready to Add AI to Your Project?
            </h3>
            
            <p className="text-lg text-gray-300 mb-8 max-w-2xl mx-auto relative z-10">
              Whether you want to enhance an existing application or build something completely new,{' '}
              <span className="text-white font-semibold">let's explore what's possible</span>{' '}
              with your specific needs and goals.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-5 justify-center relative z-10">
              <a 
                href="#contact" 
                className="
                  inline-flex items-center justify-center
                  px-8 py-4 rounded-full font-medium text-base
                  bg-white hover:bg-gray-100
                  text-black
                  transition-all duration-300
                  shadow-lg shadow-white/10
                  transform hover:-translate-y-0.5
                "
              >
                Discuss Your Project
              </a>
              
              <a
                href="#case-studies" 
                className="
                  inline-flex items-center justify-center
                  px-8 py-4 rounded-full font-medium text-base
                  bg-transparent text-white hover:text-white
                  border border-white/20 hover:border-white/40
                  transition-all duration-300
                  shadow-lg shadow-white/5
                  transform hover:-translate-y-0.5
                "
              >
                See Our Projects
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