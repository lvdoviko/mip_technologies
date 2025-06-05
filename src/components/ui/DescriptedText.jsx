import { useEffect, useState, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'

/**
 * DecryptedText - Versione robusta che gestisce lo scrolling veloce e previene frammenti
 */
export default function DecryptedText({
  text,
  speed = 50,
  maxIterations = 10,
  sequential = false,
  revealDirection = 'start',
  useOriginalCharsOnly = false,
  characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!@#$%^&*()_+',
  className = '',
  parentClassName = '',
  encryptedClassName = '',
  animateOn = 'hover',
  skipButton = false,
  duration = 2000,
  ...props
}) {
  const [displayText, setDisplayText] = useState(text)
  const [isAnimating, setIsAnimating] = useState(false)
  const [revealedIndices, setRevealedIndices] = useState(new Set())
  const [hasViewAnimated, setHasViewAnimated] = useState(false)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)
  const [isManuallySkipped, setIsManuallySkipped] = useState(false)
  
  const containerRef = useRef(null)
  const animationRef = useRef({
    timer: null,
    completionTimer: null,
    isRunning: false,
    shouldComplete: false,
    startTime: null
  })
  const observerRef = useRef(null)
  const isMountedRef = useRef(true)

  // Verifica se l'utente preferisce reduced motion
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = () => setPrefersReducedMotion(mediaQuery.matches);
    mediaQuery.addEventListener('change', handleChange);
    
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Funzione robusta per la pulizia
  const cleanupAnimation = useCallback(() => {
    const anim = animationRef.current;
    if (anim.timer) {
      clearInterval(anim.timer);
      anim.timer = null;
    }
    if (anim.completionTimer) {
      clearTimeout(anim.completionTimer);
      anim.completionTimer = null;
    }
    anim.isRunning = false;
    anim.shouldComplete = false;
    anim.startTime = null;
  }, []);

  // Funzione che garantisce il completamento
  const forceCompletion = useCallback(() => {
    if (!isMountedRef.current) return;
    
    cleanupAnimation();
    setDisplayText(text);
    setIsAnimating(false);
    setRevealedIndices(new Set([...Array(text.length).keys()]));
  }, [text, cleanupAnimation]);

  // Funzione per avviare l'animazione in modo sicuro
  const startAnimation = useCallback(() => {
    if (!isMountedRef.current || prefersReducedMotion || isManuallySkipped) {
      forceCompletion();
      return;
    }

    // Previeni animazioni multiple simultanee
    if (animationRef.current.isRunning) {
      return;
    }

    cleanupAnimation();
    
    const anim = animationRef.current;
    anim.isRunning = true;
    anim.startTime = Date.now();
    anim.shouldComplete = false;

    setIsAnimating(true);
    setRevealedIndices(new Set());

    // Calcola timing più conservativo
    const safeSpeed = Math.max(speed, 20); // Velocità minima 20ms
    const maxDuration = Math.min(duration, 3000); // Durata massima 3s
    const estimatedTime = sequential 
      ? text.length * safeSpeed
      : maxIterations * safeSpeed;
    
    const completionTime = Math.min(estimatedTime * 1.2, maxDuration); // 20% buffer

    // Timer di sicurezza per completamento garantito
    anim.completionTimer = setTimeout(() => {
      if (isMountedRef.current && anim.isRunning) {
        anim.shouldComplete = true;
        forceCompletion();
      }
    }, completionTime);

    let currentIteration = 0;

    anim.timer = setInterval(() => {
      if (!isMountedRef.current || anim.shouldComplete) {
        forceCompletion();
        return;
      }

      setRevealedIndices((prevRevealed) => {
        if (sequential) {
          if (prevRevealed.size < text.length) {
            const nextIndex = getNextIndex(prevRevealed);
            const newRevealed = new Set(prevRevealed);
            newRevealed.add(nextIndex);
            
            if (isMountedRef.current) {
              setDisplayText(shuffleText(text, newRevealed));
            }
            
            // Completamento sequenziale
            if (newRevealed.size === text.length) {
              setTimeout(() => forceCompletion(), 0);
            }
            
            return newRevealed;
          } else {
            setTimeout(() => forceCompletion(), 0);
            return prevRevealed;
          }
        } else {
          // Modalità random
          if (isMountedRef.current) {
            setDisplayText(shuffleText(text, prevRevealed));
          }
          currentIteration++;
          
          if (currentIteration >= maxIterations) {
            setTimeout(() => forceCompletion(), 0);
          }
          
          return prevRevealed;
        }
      });
    }, safeSpeed);

  }, [text, speed, maxIterations, sequential, duration, prefersReducedMotion, isManuallySkipped, forceCompletion, cleanupAnimation]);

  const getNextIndex = (revealedSet) => {
    const textLength = text.length
    switch (revealDirection) {
      case 'start':
        return revealedSet.size
      case 'end':
        return textLength - 1 - revealedSet.size
      case 'center': {
        const middle = Math.floor(textLength / 2)
        const offset = Math.floor(revealedSet.size / 2)
        const nextIndex =
          revealedSet.size % 2 === 0
            ? middle + offset
            : middle - offset - 1

        if (nextIndex >= 0 && nextIndex < textLength && !revealedSet.has(nextIndex)) {
          return nextIndex
        }
        for (let i = 0; i < textLength; i++) {
          if (!revealedSet.has(i)) return i
        }
        return 0
      }
      default:
        return revealedSet.size
    }
  }

  const shuffleText = (originalText, currentRevealed) => {
    if (useOriginalCharsOnly) {
      const positions = originalText.split('').map((char, i) => ({
        char,
        isSpace: char === ' ',
        index: i,
        isRevealed: currentRevealed.has(i),
      }))

      const nonSpaceChars = positions
        .filter((p) => !p.isSpace && !p.isRevealed)
        .map((p) => p.char)

      for (let i = nonSpaceChars.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[nonSpaceChars[i], nonSpaceChars[j]] = [nonSpaceChars[j], nonSpaceChars[i]]
      }

      let charIndex = 0
      return positions
        .map((p) => {
          if (p.isSpace) return ' '
          if (p.isRevealed) return originalText[p.index]
          return nonSpaceChars[charIndex++] || p.char
        })
        .join('')
    } else {
      return originalText
        .split('')
        .map((char, i) => {
          if (char === ' ') return ' '
          if (currentRevealed.has(i)) return originalText[i]
          return characters[Math.floor(Math.random() * characters.length)]
        })
        .join('')
    }
  }

  // Gestione hover
  const handleMouseEnter = useCallback(() => {
    if (animateOn === 'hover') {
      startAnimation();
    }
  }, [animateOn, startAnimation]);

  const handleMouseLeave = useCallback(() => {
    if (animateOn === 'hover') {
      cleanupAnimation();
      setIsAnimating(false);
      setDisplayText(text);
      setRevealedIndices(new Set());
    }
  }, [animateOn, text, cleanupAnimation]);

  // Gestione skip
  const handleSkip = useCallback(() => {
    setIsManuallySkipped(true);
    forceCompletion();
  }, [forceCompletion]);

  // Intersection Observer robusto
  useEffect(() => {
    if (animateOn !== 'view' || hasViewAnimated || prefersReducedMotion) return;

    const observerCallback = (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && !hasViewAnimated && isMountedRef.current) {
          setHasViewAnimated(true);
          // Debounce per evitare trigger multipli
          setTimeout(() => {
            if (isMountedRef.current && !hasViewAnimated) {
              startAnimation();
            }
          }, 100);
        }
      });
    };

    const observerOptions = {
      root: null,
      rootMargin: '20px', // Margine per trigger anticipato
      threshold: 0.2, // Soglia più alta per maggiore stabilità
    };

    observerRef.current = new IntersectionObserver(observerCallback, observerOptions);
    const currentRef = containerRef.current;
    
    if (currentRef) {
      observerRef.current.observe(currentRef);
    }

    return () => {
      if (observerRef.current && currentRef) {
        observerRef.current.unobserve(currentRef);
      }
    };
  }, [animateOn, hasViewAnimated, prefersReducedMotion, startAnimation]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      cleanupAnimation();
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [cleanupAnimation]);

  // Reset quando il testo cambia
  useEffect(() => {
    setRevealedIndices(new Set());
    setHasViewAnimated(false);
    setIsManuallySkipped(false);
    setDisplayText(text);
    cleanupAnimation();
    setIsAnimating(false);
  }, [text, cleanupAnimation]);

  const hoverProps = animateOn === 'hover' && !prefersReducedMotion && !isManuallySkipped
    ? { onMouseEnter: handleMouseEnter, onMouseLeave: handleMouseLeave }
    : {};

  return (
    <motion.span
      ref={containerRef}
      className={`inline-block whitespace-pre-wrap ${parentClassName}`}
      {...hoverProps}
      {...props}
    >
      {/* Testo accessibile per screen reader */}
      <span className="sr-only">{text}</span>

      {/* Skip button */}
      {skipButton && isAnimating && (
        <button 
          onClick={handleSkip}
          className="ml-2 px-2 py-1 text-xs bg-black/30 border border-white/20 rounded-full hover:bg-black/50 focus:outline-none focus:ring-2 focus:ring-white/50"
          aria-label="Salta animazione"
        >
          Skip
        </button>
      )}

      <span aria-hidden="true">
        {displayText.split('').map((char, index) => {
          const isRevealed = revealedIndices.has(index) || !isAnimating || prefersReducedMotion || isManuallySkipped;

          return (
            <span
              key={index}
              className={isRevealed ? className : encryptedClassName}
            >
              {char}
            </span>
          );
        })}
      </span>
    </motion.span>
  );
}