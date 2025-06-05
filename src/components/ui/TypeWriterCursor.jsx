import React, { useState, useEffect, useRef } from 'react';

/**
 * TypewriterCursor - Versione migliorata che include l'intero typewriter
 * con supporto per accessibilità e layout stabile
 *
 * Props:
 * - phrases: array di stringhe da mostrare
 * - typingSpeed: velocità di digitazione in ms
 * - deletingSpeed: velocità di cancellazione in ms
 * - delayAfterPhrase: tempo di attesa dopo aver completato una frase
 * - className: classe CSS per il testo
 * - cursorClassName: classe aggiuntiva per il cursore
 * - fixedHeight: se true, mantiene l'altezza stabile (previene layout shift)
 * - height: altezza personalizzabile del cursore
 * - width: larghezza personalizzabile del cursore
 * - color: colore personalizzabile del cursore
 * - verticalOffset: offset verticale per allineare il cursore
 */
const TypewriterCursor = ({ 
  // Proprietà originali
  blinking = true,
  height = "h-8 md:h-12 lg:h-16", // Altezza personalizzabile
  width = "w-0.5", // Larghezza personalizzabile
  color = "bg-white", // Colore personalizzabile
  verticalOffset = "0.05em", // Valore leggermente positivo per abbassare il cursore
  
  // Nuove proprietà per typewriter completo
  phrases = [],
  typingSpeed = 80,
  deletingSpeed = 40,
  delayAfterPhrase = 2000,
  className = '',
  cursorClassName = '',
  fixedHeight = true,
  containerStyle = {},
  onPhraseChange = null,
}) => {
  const [currentText, setCurrentText] = useState('');
  const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0);
  const [isTyping, setIsTyping] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const containerRef = useRef(null);
  const [containerHeight, setContainerHeight] = useState('auto');
  
  // Verifica se l'utente preferisce reduced motion
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = () => setPrefersReducedMotion(mediaQuery.matches);
    mediaQuery.addEventListener('change', handleChange);
    
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);
  
  // Determina la frase più lunga per calcolare la dimensione del container
  const longestPhrase = phrases.length > 0 
    ? phrases.reduce((longest, phrase) => phrase.length > longest.length ? phrase : longest, '') 
    : '';
  
  // Misura l'altezza del container
  useEffect(() => {
    if (fixedHeight && containerRef.current && phrases.length > 0) {
      // Salva temporaneamente il testo corrente
      const originalText = currentText;
      
      // Imposta il testo alla frase più lunga per misurare l'altezza corretta
      setCurrentText(longestPhrase);
      
      // Usa setTimeout per dare tempo al DOM di aggiornarsi
      setTimeout(() => {
        if (containerRef.current) {
          const height = containerRef.current.offsetHeight;
          setContainerHeight(`${height}px`);
          
          // Ripristina il testo originale
          setCurrentText(originalText);
        }
      }, 0);
    }
  }, [fixedHeight, longestPhrase, phrases]);
  
  // Se l'utente preferisce reduced motion, mostra direttamente la frase corrente
  useEffect(() => {
    if (prefersReducedMotion && phrases.length > 0) {
      setCurrentText(phrases[currentPhraseIndex] || '');
    }
  }, [prefersReducedMotion, phrases, currentPhraseIndex]);
  
  // Gestisce l'effetto typewriter
  useEffect(() => {
    if (prefersReducedMotion || phrases.length === 0) return;
    
    const currentPhrase = phrases[currentPhraseIndex];
    
    let timeout;
    
    if (isTyping && !isDeleting) {
      // Typing
      if (currentText.length < currentPhrase.length) {
        timeout = setTimeout(() => {
          setCurrentText(currentPhrase.substring(0, currentText.length + 1));
        }, typingSpeed);
      } else {
        // Finished typing
        setIsTyping(false);
        timeout = setTimeout(() => {
          setIsDeleting(true);
        }, delayAfterPhrase);
      }
    } else if (isDeleting) {
      // Deleting
      if (currentText.length > 0) {
        timeout = setTimeout(() => {
          setCurrentText(currentText.substring(0, currentText.length - 1));
        }, deletingSpeed);
      } else {
        // Finished deleting
        setIsDeleting(false);
        setIsTyping(true);
        
        // Move to next phrase
        const nextPhraseIndex = (currentPhraseIndex + 1) % phrases.length;
        setCurrentPhraseIndex(nextPhraseIndex);
        
        // Trigger callback if provided
        if (onPhraseChange) {
          onPhraseChange(nextPhraseIndex, phrases[nextPhraseIndex]);
        }
      }
    }
    
    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [
    currentText, 
    isTyping, 
    isDeleting, 
    currentPhraseIndex, 
    phrases, 
    typingSpeed, 
    deletingSpeed, 
    delayAfterPhrase,
    prefersReducedMotion,
    onPhraseChange
  ]);
  
  // Se utilizzato in modalità solo cursore (vecchio comportamento)
  if (phrases.length === 0) {
    return (
      <span 
        className={`inline-block ${width} ${height} ${color} ml-1 ${blinking ? 'animate-blink' : ''} ${cursorClassName}`}
        style={{ 
          animationDuration: '800ms', 
          animationIterationCount: 'infinite',
          verticalAlign: 'middle',
          transform: 'translateY(0%)', // Nessuno spostamento verticale con transform
          position: 'relative',
          top: verticalOffset, // Valore positivo per abbassare leggermente il cursore
          display: 'inline-block'
        }}
      />
    );
  }
  
  // Versione accessibile per screen reader
  const accessibleText = `Typewriter text: ${phrases.join('. ')}`;
  
  return (
    <div 
      ref={containerRef}
      className="typewriter-container"
      style={{ 
        display: 'inline-block',
        height: fixedHeight ? containerHeight : 'auto',
        ...containerStyle
      }}
    >
      {/* Testo accessibile per screen reader */}
      <span className="sr-only">{accessibleText}</span>
      
      {/* Testo visibile con cursore */}
      <span 
        className={`typewriter-text ${className}`} 
        aria-hidden="true"
      >
        {currentText}
        <span 
          className={`inline-block ${width} ${height} ${color} ml-1 ${blinking && isTyping ? 'animate-blink' : ''} ${cursorClassName}`}
          style={{ 
            animationDuration: '800ms', 
            animationIterationCount: 'infinite',
            verticalAlign: 'middle',
            transform: 'translateY(0%)',
            position: 'relative',
            top: verticalOffset,
            display: 'inline-block'
          }}
          aria-hidden="true"
        />
      </span>
    </div>
  );
};

export default TypewriterCursor;