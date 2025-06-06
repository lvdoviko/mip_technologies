import React, { useState } from 'react';
import DescriptedText from '../ui/DescriptedText';
import RainbowScrollFloat from '../animations/RainbowScrollFloat';

// Immagini fallback integrate
const FALLBACK_LOGO = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='100' viewBox='0 0 200 100'%3E%3Crect width='200' height='100' fill='%23202020'/%3E%3Ctext x='50%25' y='50%25' font-family='Arial' font-size='20' text-anchor='middle' fill='white' dominant-baseline='middle'%3EAlbatrove Logo%3C/text%3E%3C/svg%3E";
const FALLBACK_CONVERSATION = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='100' viewBox='0 0 200 100'%3E%3Crect width='200' height='100' fill='%23202020'/%3E%3Ctext x='50%25' y='50%25' font-family='Arial' font-size='16' text-anchor='middle' fill='white' dominant-baseline='middle'%3EAI Conversation%3C/text%3E%3C/svg%3E";

const AlbatroveShowcase = ({ prefersReducedMotion = false }) => {
  const [currentImage, setCurrentImage] = useState(0);
  
  // Array delle immagini disponibili
  const images = [
    { src: "/Albatrove-Logo.png", alt: "Albatrove Logo", fallback: FALLBACK_LOGO },
    { src: "/Albatrove-Conversation.png", alt: "Albatrove AI Conversation", fallback: FALLBACK_CONVERSATION }
  ];
  
  return (
    <div className="py-0">
      <div className="container mx-auto max-w-7xl px-4">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left side: Description */}
          <div>            
            <div className="mb-4">
              <RainbowScrollFloat
                fontSize="text-3xl md:text-4xl"
                containerClassName="font-bold mb-0"
                animationDuration={0.8}
                ease="back.out(1.7)"
                scrollStart="top bottom-=10%"
                scrollEnd="center center"
                stagger={0.025}
                noMargin={true}
              >
                Albatrove.com
              </RainbowScrollFloat>
            </div>
            
            <p className="text-lg text-gray-300 mb-6">
              <DescriptedText
                text="AI-powered travel planning through natural conversation. Albatrove helps users plan their perfect trip by chatting with an AI trained specifically for travel recommendations."
                className="text-gray-300"
                encryptedClassName="text-gray-500"
                animateOn="view"
                sequential={true}
                speed={20}
              />
            </p>
            
            <div className="space-y-4 text-gray-400">
              <p>• <DescriptedText text="70,000+ lines of code with complex database and caching systems" className="text-gray-400" animateOn="view" sequential={true} speed={15} /></p>
              <p>• <DescriptedText text="Custom-trained AI model for personalized travel recommendations" className="text-gray-400" animateOn="view" sequential={true} speed={15} /></p>
              <p>• <DescriptedText text="Launching soon - seamless travel planning through simple conversation" className="text-gray-400" animateOn="view" sequential={true} speed={15} /></p>
            </div>
            
            <div className="mt-8 flex space-x-4">
              <a 
                href="https://albatrove.com" 
                target="_blank"
                rel="noopener noreferrer" 
                className="inline-flex items-center justify-center px-6 py-3 bg-black border border-white text-white rounded-none font-medium hover:bg-white hover:text-black transition-all duration-300"
              >
                Visit Albatrove
              </a>
              
              <div className="flex space-x-2 items-center">
                <button 
                  onClick={() => setCurrentImage(0)} 
                  className={`w-3 h-3 rounded-full ${currentImage === 0 ? 'bg-white' : 'bg-gray-600'}`}
                  aria-label="View Logo"
                />
                <button 
                  onClick={() => setCurrentImage(1)} 
                  className={`w-3 h-3 rounded-full ${currentImage === 1 ? 'bg-white' : 'bg-gray-600'}`}
                  aria-label="View Conversation"
                />
              </div>
            </div>
          </div>
          
          {/* Right side: Fixed height image display */}
          <div className="flex items-center justify-center">
            <div className="relative w-full h-[300px] flex items-center justify-center">
              {images.map((image, index) => (
                <div 
                  key={index}
                  className={`transition-opacity duration-500 ${currentImage === index ? 'opacity-100' : 'opacity-0 absolute inset-0'} 
                    flex items-center justify-center`}
                >
                  <img
                    src={image.src}
                    alt={image.alt}
                    className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
                    style={{ height: '100%', width: 'auto' }}
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = image.fallback;
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AlbatroveShowcase;