// src/components/ChatInvitation.jsx
import React, { useState, useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { MessageCircle, X } from 'lucide-react';
import useReducedMotion from '../hooks/useReducedMotion';

const ChatInvitation = ({
  onChatOpen,
  delay = 3000, // 3 seconds delay
  autoHideDuration = 8000, // Hide after 8 seconds
  position = 'bottom-left'
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const invitationRef = useRef(null);
  const timeoutRef = useRef(null);
  const autoHideRef = useRef(null);
  const prefersReducedMotion = useReducedMotion();

  // Position classes mapping
  const positionClasses = {
    'bottom-left': 'bottom-4 left-4 sm:bottom-6 sm:left-6',
    'bottom-right': 'bottom-4 right-4 sm:bottom-6 sm:right-6',
    'top-left': 'top-20 left-4 sm:top-24 sm:left-6',
    'top-right': 'top-20 right-4 sm:top-24 sm:right-6'
  };

  // Show invitation after delay
  useEffect(() => {
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, delay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (autoHideRef.current) {
        clearTimeout(autoHideRef.current);
      }
    };
  }, [delay]);

  // Auto-hide after duration
  useEffect(() => {
    if (isVisible && !isClosing) {
      autoHideRef.current = setTimeout(() => {
        handleClose();
      }, autoHideDuration);
    }

    return () => {
      if (autoHideRef.current) {
        clearTimeout(autoHideRef.current);
      }
    };
  }, [isVisible, isClosing, autoHideDuration]);

  // GSAP entrance animation
  useEffect(() => {
    if (isVisible && invitationRef.current) {
      const element = invitationRef.current;

      if (prefersReducedMotion) {
        // Simple fade for reduced motion
        gsap.fromTo(element,
          { opacity: 0 },
          { opacity: 1, duration: 0.3, ease: 'power2.out' }
        );
      } else {
        // Sophisticated entrance animation
        gsap.fromTo(element,
          {
            opacity: 0,
            y: 50,
            scale: 0.8,
            rotationY: -15
          },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            rotationY: 0,
            duration: 0.6,
            ease: 'back.out(1.7)'
          }
        );

        // Subtle float animation
        gsap.to(element, {
          y: -3,
          duration: 2,
          yoyo: true,
          repeat: -1,
          ease: 'power2.inOut'
        });
      }
    }
  }, [isVisible, prefersReducedMotion]);

  // Handle close with animation
  const handleClose = () => {
    if (isClosing || !invitationRef.current) return;

    setIsClosing(true);

    if (prefersReducedMotion) {
      gsap.to(invitationRef.current, {
        opacity: 0,
        duration: 0.2,
        onComplete: () => setIsVisible(false)
      });
    } else {
      gsap.to(invitationRef.current, {
        opacity: 0,
        y: 20,
        scale: 0.9,
        duration: 0.4,
        ease: 'power2.in',
        onComplete: () => setIsVisible(false)
      });
    }
  };

  // Handle chat open
  const handleChatOpen = () => {
    handleClose();
    onChatOpen?.();
  };

  if (!isVisible) return null;

  return (
    <div
      ref={invitationRef}
      className={`
        fixed ${positionClasses[position]} z-40
        bg-transparent backdrop-blur-md
        border border-white/50 hover:border-white
        rounded-none p-4
        transition-all duration-300
        hover:bg-white/5
        max-w-sm
        cursor-pointer
        group
      `}
      onClick={handleChatOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleChatOpen();
        }
        if (e.key === 'Escape') {
          handleClose();
        }
      }}
      aria-label="Open AI assistant chat"
    >
      {/* Close button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleClose();
        }}
        className="
          absolute top-2 right-2
          p-1 rounded-none
          text-white/60 hover:text-white
          transition-colors duration-200
          hover:bg-white/10
        "
        aria-label="Dismiss invitation"
      >
        <X className="w-3 h-3" />
      </button>

      {/* Main content */}
      <div className="flex items-start space-x-3 pr-6">
        {/* AI Icon */}
        <div className="
          flex-shrink-0
          p-2 rounded-none
          bg-white/10 border border-white/20
          group-hover:bg-white/20 group-hover:border-white/40
          transition-all duration-300
        ">
          <MessageCircle className="w-4 h-4 text-white" />
        </div>

        {/* Text content */}
        <div className="flex-1 min-w-0">
          <h3 className="
            text-sm font-medium text-white
            font-inter mb-1
            leading-tight
          ">
            Hi! I'm your AI assistant
          </h3>
          <p className="
            text-xs text-white/80
            font-inter font-light
            leading-relaxed
          ">
            Ask me anything about MIP Technologies' services, projects, or how we can help with your next innovation.
          </p>
        </div>
      </div>

      {/* Subtle pulse indicator */}
      <div className="
        absolute -top-1 -left-1
        w-2 h-2 rounded-none
        bg-blue-400
        animate-pulse
      " />
    </div>
  );
};

export default ChatInvitation;