import React, { useEffect, useState, useRef, useCallback } from 'react';

/**
 * DescriptedText - Mobile-optimized with compact spacing
 */
export default function DescriptedText({
  text,
  speed = 50,
  maxIterations = 10,
  sequential = false,
  revealDirection = 'start',
  useOriginalCharsOnly = false,
  characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+',
  className = '',
  parentClassName = '',
  encryptedClassName = '',
  animateOn = 'view',
  skipButton = false,
  duration = 2000,
  professionalFont = true,
  delay = 0,
  ...props
}) {
  const [displayText, setDisplayText] = useState(text);
  const [isHovering, setIsHovering] = useState(false);
  const [hasViewAnimated, setHasViewAnimated] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [isManuallySkipped, setIsManuallySkipped] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isIntersecting, setIsIntersecting] = useState(false);
  
  const containerRef = useRef(null);
  const animationStateRef = useRef({
    isRunning: false,
    intervalId: null,
    timeoutId: null,
    revealedIndices: new Set(),
    currentIteration: 0,
    shouldStop: false
  });

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768 || 'ontouchstart' in window);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Check for reduced motion preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = () => setPrefersReducedMotion(mediaQuery.matches);
    mediaQuery.addEventListener('change', handleChange);
    
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Professional font with mobile optimization - more compact on mobile
  const professionalFontClass = professionalFont 
    ? `font-mono tracking-wide ${isMobile ? 'text-sm leading-snug' : ''}` 
    : '';

  // Complete animation cleanup
  const stopAnimation = useCallback(() => {
    const state = animationStateRef.current;
    
    if (state.intervalId) {
      clearInterval(state.intervalId);
      state.intervalId = null;
    }
    
    if (state.timeoutId) {
      clearTimeout(state.timeoutId);
      state.timeoutId = null;
    }
    
    state.isRunning = false;
    state.shouldStop = true;
    state.currentIteration = 0;
    state.revealedIndices = new Set();
  }, []);

  // Complete animation immediately
  const completeAnimation = useCallback(() => {
    stopAnimation();
    setDisplayText(text);
  }, [text, stopAnimation]);

  // Main animation function with faster mobile performance
  const startDecryption = useCallback(() => {
    // Skip animation based on conditions
    if (prefersReducedMotion || isManuallySkipped) {
      completeAnimation();
      return;
    }

    // Stop any running animation
    stopAnimation();
    
    const state = animationStateRef.current;
    state.isRunning = true;
    state.shouldStop = false;
    state.revealedIndices = new Set();
    state.currentIteration = 0;

    // Mobile-optimized parameters - faster on mobile
    const mobileSpeedMultiplier = isMobile ? 1.5 : 1;
    const safeSpeed = Math.max(speed * mobileSpeedMultiplier, 25);
    const maxTime = Math.min(duration, isMobile ? 2000 : 3000); // Shorter on mobile
    
    // Safety timeout for guaranteed completion
    state.timeoutId = setTimeout(() => {
      completeAnimation();
    }, maxTime);

    const runAnimation = () => {
      const state = animationStateRef.current;
      
      if (state.shouldStop || !state.isRunning) {
        completeAnimation();
        return;
      }

      if (sequential) {
        // Sequential reveal mode
        if (state.revealedIndices.size < text.length) {
          const nextIndex = getNextIndex(state.revealedIndices);
          state.revealedIndices.add(nextIndex);
          
          const newText = generateDisplayText(text, state.revealedIndices);
          setDisplayText(newText);
          
          if (state.revealedIndices.size >= text.length) {
            completeAnimation();
            return;
          }
        } else {
          completeAnimation();
          return;
        }
      } else {
        // Random reveal mode - fewer iterations on mobile
        const mobileMaxIterations = isMobile ? Math.min(maxIterations, 8) : maxIterations;
        const newText = generateDisplayText(text, state.revealedIndices);
        setDisplayText(newText);
        
        state.currentIteration++;
        if (state.currentIteration >= mobileMaxIterations) {
          completeAnimation();
          return;
        }
      }
    };

    // Start animation with delay if specified
    if (delay > 0) {
      setTimeout(() => {
        if (state.isRunning) {
          state.intervalId = setInterval(runAnimation, safeSpeed);
        }
      }, delay);
    } else {
      state.intervalId = setInterval(runAnimation, safeSpeed);
    }
    
  }, [text, speed, maxIterations, sequential, duration, prefersReducedMotion, isManuallySkipped, isMobile, delay, completeAnimation, stopAnimation]);

  const getNextIndex = (revealedSet) => {
    const textLength = text.length;
    
    switch (revealDirection) {
      case 'start':
        return revealedSet.size;
      case 'end':
        return textLength - 1 - revealedSet.size;
      case 'center': {
        const middle = Math.floor(textLength / 2);
        const offset = Math.floor(revealedSet.size / 2);
        const nextIndex = revealedSet.size % 2 === 0
          ? middle + offset
          : middle - offset - 1;

        if (nextIndex >= 0 && nextIndex < textLength && !revealedSet.has(nextIndex)) {
          return nextIndex;
        }
        
        // Fallback: find first unrevealed character
        for (let i = 0; i < textLength; i++) {
          if (!revealedSet.has(i)) return i;
        }
        return 0;
      }
      default:
        return revealedSet.size;
    }
  };

  const generateDisplayText = (originalText, revealedIndices) => {
    if (useOriginalCharsOnly) {
      const chars = originalText.split('');
      const nonSpacePositions = chars
        .map((char, i) => ({ char, index: i, isSpace: char === ' ' }))
        .filter(item => !item.isSpace && !revealedIndices.has(item.index));
      
      const availableChars = nonSpacePositions.map(item => item.char);
      
      // Shuffle available characters
      for (let i = availableChars.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [availableChars[i], availableChars[j]] = [availableChars[j], availableChars[i]];
      }
      
      let charIndex = 0;
      return chars.map((char, i) => {
        if (char === ' ') return ' ';
        if (revealedIndices.has(i)) return originalText[i];
        return availableChars[charIndex++] || char;
      }).join('');
      
    } else {
      return originalText
        .split('')
        .map((char, i) => {
          if (char === ' ') return ' ';
          if (revealedIndices.has(i)) return originalText[i];
          return characters[Math.floor(Math.random() * characters.length)];
        })
        .join('');
    }
  };

  // Touch-friendly hover handlers
  const handleMouseEnter = useCallback(() => {
    if (animateOn === 'hover' && !isMobile) {
      setIsHovering(true);
      startDecryption();
    }
  }, [animateOn, isMobile, startDecryption]);

  const handleMouseLeave = useCallback(() => {
    if (animateOn === 'hover' && !isMobile) {
      setIsHovering(false);
      stopAnimation();
      setDisplayText(text);
    }
  }, [animateOn, isMobile, text, stopAnimation]);

  // Touch handlers for mobile
  const handleTouchStart = useCallback(() => {
    if (animateOn === 'hover' && isMobile) {
      setIsHovering(true);
      startDecryption();
    }
  }, [animateOn, isMobile, startDecryption]);

  // Skip animation handler
  const handleSkip = useCallback(() => {
    setIsManuallySkipped(true);
    completeAnimation();
  }, [completeAnimation]);

  // Intersection Observer for view-based animation - more aggressive on mobile
  useEffect(() => {
    if (animateOn !== 'view' || hasViewAnimated || prefersReducedMotion || isManuallySkipped) {
      return;
    }

    const observerCallback = (entries) => {
      entries.forEach((entry) => {
        setIsIntersecting(entry.isIntersecting);
        if (entry.isIntersecting && !hasViewAnimated) {
          setHasViewAnimated(true);
          // Shorter delay for mobile for faster perceived performance
          const triggerDelay = isMobile ? 50 : 100;
          setTimeout(() => {
            startDecryption();
          }, triggerDelay);
        }
      });
    };

    const observerOptions = {
      root: null,
      rootMargin: isMobile ? '20px' : '50px',
      threshold: isMobile ? 0.1 : 0.2,
    };

    const observer = new IntersectionObserver(observerCallback, observerOptions);
    const currentRef = containerRef.current;
    
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (observer && currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [animateOn, hasViewAnimated, prefersReducedMotion, isManuallySkipped, isMobile, startDecryption]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAnimation();
    };
  }, [stopAnimation]);

  // Reset when text changes
  useEffect(() => {
    stopAnimation();
    setHasViewAnimated(false);
    setIsManuallySkipped(false);
    setDisplayText(text);
  }, [text, stopAnimation]);

  // Event handlers based on device type
  const interactionProps = {};
  if (animateOn === 'hover' && !prefersReducedMotion && !isManuallySkipped) {
    if (isMobile) {
      interactionProps.onTouchStart = handleTouchStart;
    } else {
      interactionProps.onMouseEnter = handleMouseEnter;
      interactionProps.onMouseLeave = handleMouseLeave;
    }
  }

  const isAnimating = animationStateRef.current.isRunning;

  return (
    <span
      ref={containerRef}
      className={`descriptext-container inline-block whitespace-pre-wrap ${professionalFontClass} ${parentClassName} ${
        isAnimating ? 'animating' : ''
      }`}
      style={{
        // Tighter line height on mobile to reduce spacing
        lineHeight: isMobile ? '1.4' : undefined
      }}
      {...interactionProps}
      {...props}
    >
      {/* Screen reader accessible text */}
      <span className="sr-only">{text}</span>

      {/* Skip button - smaller and more compact on mobile */}
      {skipButton && isAnimating && (
        <button 
          onClick={handleSkip}
          className={`descriptext-skip-btn ml-1 px-2 py-1 text-xs bg-black/30 border border-white/20 rounded-full hover:bg-black/50 focus:outline-none focus:ring-2 focus:ring-white/50 ${
            isMobile ? 'text-xs px-2 py-1' : ''
          }`}
          style={{
            fontSize: isMobile ? '10px' : undefined,
            minHeight: isMobile ? '24px' : undefined
          }}
          aria-label="Skip animation"
        >
          Skip
        </button>
      )}

      <span aria-hidden="true">
        {displayText.split('').map((char, index) => {
          const revealedIndices = animationStateRef.current.revealedIndices;
          const isRevealed = revealedIndices.has(index) || !isAnimating || prefersReducedMotion || isManuallySkipped;

          return (
            <span
              key={index}
              className={`${professionalFontClass} ${isRevealed ? className : encryptedClassName} ${
                isMobile ? 'inline-block' : ''
              }`}
              style={isMobile ? { 
                lineHeight: '1.4',
                letterSpacing: '0.01em' // Tighter letter spacing on mobile
              } : undefined}
            >
              {char}
            </span>
          );
        })}
      </span>
    </span>
  );
}