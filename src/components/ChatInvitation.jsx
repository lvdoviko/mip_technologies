// src/components/ChatInvitation.jsx
import React, { useState, useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { MessageCircle, X } from 'lucide-react';
import useReducedMotion from '../hooks/useReducedMotion';

const ChatInvitation = ({
  onChatOpen,
  delay = 3000, // 3 seconds delay
  autoHideDuration = 8000, // Hide after 8 seconds
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const invitationRef = useRef(null);
  const timeoutRef = useRef(null);
  const autoHideRef = useRef(null);
  const prefersReducedMotion = useReducedMotion();

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

  // GSAP entrance animation - static, no bouncing
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
        // Slide in from right (towards chat widget)
        gsap.fromTo(element,
          {
            opacity: 0,
            x: 30,
            scale: 0.95
          },
          {
            opacity: 1,
            x: 0,
            scale: 1,
            duration: 0.4,
            ease: 'power2.out'
          }
        );
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
        fixed bottom-3 right-20 sm:bottom-4 sm:right-24 z-40
        hidden lg:block
        bg-transparent backdrop-blur-md
        border border-white/50 hover:border-white
        rounded-none p-3 pr-6
        transition-all duration-300
        hover:bg-white/5
        max-w-xs
        cursor-pointer
        group
        relative
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
      {/* Chat bubble tail pointing right towards chat widget */}
      <div className="
        absolute top-1/2 -right-2 -translate-y-1/2
        w-0 h-0
        border-l-8 border-l-white/50
        border-t-4 border-t-transparent
        border-b-4 border-b-transparent
        group-hover:border-l-white
        transition-colors duration-300
      " />

      {/* Close button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleClose();
        }}
        className="
          absolute top-1 right-1
          p-0.5 rounded-none
          text-white/60 hover:text-white
          transition-colors duration-200
          hover:bg-white/10
        "
        aria-label="Dismiss invitation"
      >
        <X className="w-3 h-3" />
      </button>

      {/* Compact content */}
      <div className="pr-4">
        <p className="
          text-sm font-medium text-white
          font-inter mb-1
          leading-tight
        ">
          Need help?
        </p>
        <p className="
          text-xs text-white/80
          font-inter font-light
          leading-relaxed
        ">
          Ask me about our services
        </p>
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