import React from 'react';
import RainbowScrollFloat from '../animations/RainbowScrollFloat';

// Fallback for conversation image only
const FALLBACK_CONVERSATION = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'%3E%3Crect width='400' height='300' fill='%23202020'/%3E%3Ctext x='50%25' y='50%25' font-family='Arial' font-size='18' text-anchor='middle' fill='white' dominant-baseline='middle'%3EAlbatrove AI Conversation%3C/text%3E%3C/svg%3E";

// Fallback for logo
const FALLBACK_LOGO = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 40 40'%3E%3Crect width='40' height='40' fill='%23202020'/%3E%3Ctext x='50%25' y='50%25' font-family='Arial' font-size='12' text-anchor='middle' fill='white' dominant-baseline='middle'%3EA%3C/text%3E%3C/svg%3E";

const AlbatroveShowcase = ({ prefersReducedMotion = false }) => {
  return (
    <div className="py-0">
      <div className="container mx-auto max-w-7xl px-4">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          {/* Left side: Description */}
          <div>            
            {/* Logo + Title combination - mobile responsive */}
            <div className="mb-6">
              <div className="flex items-center gap-3 sm:gap-4 mb-4 flex-wrap">
                {/* Logo */}
                <div className="flex-shrink-0">
                  <img
                    src="/Albatrove-Logo.png"
                    alt="Albatrove Logo"
                    className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 object-contain"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = FALLBACK_LOGO;
                    }}
                  />
                </div>
                
                {/* Title */}
                <div className="flex-1 min-w-0">
                  <RainbowScrollFloat
                    fontSize="text-2xl sm:text-3xl md:text-4xl"
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
              </div>
            </div>
            
            {/* Description */}
            <p className="text-base sm:text-lg text-gray-300 mb-6 leading-relaxed">
              AI-powered travel planning through natural conversation. Albatrove helps users plan their perfect trip by chatting with an AI trained specifically for travel recommendations.
            </p>
            
            {/* Business impact bullet points */}
            <div className="space-y-3 sm:space-y-4 text-gray-400 mb-8">
              <p className="text-sm sm:text-base leading-relaxed">
                • Innovative neural network architecture delivering personalized travel experiences with 93% user satisfaction in beta testing
              </p>
              <p className="text-sm sm:text-base leading-relaxed">
                • Proprietary AI model trained on 4.5+ million travel data points for exceptional recommendation quality
              </p>
              <p className="text-sm sm:text-base leading-relaxed">
                • Launching soon with proven 78% reduction in travel planning time during closed beta tests
              </p>
            </div>
            
            {/* CTA Button */}
            <div className="flex flex-col sm:flex-row gap-4">
              <a 
                href="https://albatrove.com" 
                target="_blank"
                rel="noopener noreferrer" 
                className="inline-flex items-center justify-center px-6 py-3 bg-black border border-white text-white rounded-none font-medium hover:bg-white hover:text-black transition-all duration-300 text-center touch-manipulation"
              >
                Visit Albatrove
              </a>
            </div>
          </div>
          
          {/* Right side: Single conversation image */}
          <div className="flex items-center justify-center">
            <div className="relative w-full h-[250px] sm:h-[300px] lg:h-[350px] flex items-center justify-center">
              <img
                src="/Albatrove-Conversation.PNG"
                alt="Albatrove AI Conversation Interface"
                className="max-w-full max-h-full object-contain rounded-lg shadow-lg border border-white/10"
                style={{ height: '100%', width: 'auto' }}
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = FALLBACK_CONVERSATION;
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AlbatroveShowcase;