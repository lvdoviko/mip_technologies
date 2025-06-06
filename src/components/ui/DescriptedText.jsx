import { useEffect, useState, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'

/**
 * DecryptedText - Versione con font professionale
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
  professionalFont = true, // Nuova prop per font professionale
  ...props
}) {
  const [displayText, setDisplayText] = useState(text)
  const [isHovering, setIsHovering] = useState(false)
  const [hasViewAnimated, setHasViewAnimated] = useState(false)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)
  const [isManuallySkipped, setIsManuallySkipped] = useState(false)
  
  const containerRef = useRef(null)
  const animationStateRef = useRef({
    isRunning: false,
    intervalId: null,
    timeoutId: null,
    revealedIndices: new Set(),
    currentIteration: 0,
    shouldStop: false
  })

  // Font professionale - puoi scegliere tra questi
  const professionalFontClass = professionalFont ? 'font-mono tracking-wide' : '';
  // Altre opzioni:
  // 'font-serif' per Times/Georgia
  // 'font-sans tracking-tight' per una versione più pulita di Inter
  // 'font-mono tracking-wider text-sm' per font monospace più leggibile

  // Verifica se l'utente preferisce reduced motion
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = () => setPrefersReducedMotion(mediaQuery.matches);
    mediaQuery.addEventListener('change', handleChange);
    
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Funzione di pulizia totale
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

  // Funzione di completamento garantito
  const completeAnimation = useCallback(() => {
    stopAnimation();
    setDisplayText(text);
  }, [text, stopAnimation]);

  // Funzione principale di animazione
  const startDecryption = useCallback(() => {
    if (prefersReducedMotion || isManuallySkipped) {
      completeAnimation();
      return;
    }

    // Ferma qualsiasi animazione in corso
    stopAnimation();
    
    const state = animationStateRef.current;
    state.isRunning = true;
    state.shouldStop = false;
    state.revealedIndices = new Set();
    state.currentIteration = 0;

    // Calcola parametri sicuri
    const safeSpeed = Math.max(speed, 30);
    const maxTime = Math.min(duration, 4000);
    
    // Timer di sicurezza per completamento garantito
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
        // Modalità sequenziale
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
        // Modalità random
        const newText = generateDisplayText(text, state.revealedIndices);
        setDisplayText(newText);
        
        state.currentIteration++;
        if (state.currentIteration >= maxIterations) {
          completeAnimation();
          return;
        }
      }
    };

    // Avvia l'animazione
    state.intervalId = setInterval(runAnimation, safeSpeed);
    
  }, [text, speed, maxIterations, sequential, duration, prefersReducedMotion, isManuallySkipped, completeAnimation, stopAnimation]);

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
      
      // Shuffle disponibili
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

  // Gestione hover
  const handleMouseEnter = useCallback(() => {
    if (animateOn === 'hover') {
      setIsHovering(true);
      startDecryption();
    }
  }, [animateOn, startDecryption]);

  const handleMouseLeave = useCallback(() => {
    if (animateOn === 'hover') {
      setIsHovering(false);
      stopAnimation();
      setDisplayText(text);
    }
  }, [animateOn, text, stopAnimation]);

  // Gestione skip
  const handleSkip = useCallback(() => {
    setIsManuallySkipped(true);
    completeAnimation();
  }, [completeAnimation]);

  // Intersection Observer per animazione su vista
  useEffect(() => {
    if (animateOn !== 'view' || hasViewAnimated || prefersReducedMotion || isManuallySkipped) {
      return;
    }

    const observerCallback = (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && !hasViewAnimated) {
          setHasViewAnimated(true);
          startDecryption();
        }
      });
    };

    const observerOptions = {
      root: null,
      rootMargin: '50px',
      threshold: 0.3,
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
  }, [animateOn, hasViewAnimated, prefersReducedMotion, isManuallySkipped, startDecryption]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAnimation();
    };
  }, [stopAnimation]);

  // Reset quando il testo cambia
  useEffect(() => {
    stopAnimation();
    setHasViewAnimated(false);
    setIsManuallySkipped(false);
    setDisplayText(text);
  }, [text, stopAnimation]);

  const hoverProps = animateOn === 'hover' && !prefersReducedMotion && !isManuallySkipped
    ? { onMouseEnter: handleMouseEnter, onMouseLeave: handleMouseLeave }
    : {};

  const isAnimating = animationStateRef.current.isRunning;

  return (
    <motion.span
      ref={containerRef}
      className={`inline-block whitespace-pre-wrap ${professionalFontClass} ${parentClassName}`}
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
          const revealedIndices = animationStateRef.current.revealedIndices;
          const isRevealed = revealedIndices.has(index) || !isAnimating || prefersReducedMotion || isManuallySkipped;

          return (
            <span
              key={index}
              className={`${professionalFontClass} ${isRevealed ? className : encryptedClassName}`}
            >
              {char}
            </span>
          );
        })}
      </span>
    </motion.span>
  );
}