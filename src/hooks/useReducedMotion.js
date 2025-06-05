import { useState, useEffect } from 'react';

/**
 * useReducedMotion - Hook personalizzato che rileva la preferenza dell'utente per reduced motion
 * 
 * @returns {boolean} - true se l'utente preferisce reduced motion, false altrimenti
 * 
 * Esempio d'uso:
 * ```jsx
 * const MyComponent = () => {
 *   const prefersReducedMotion = useReducedMotion();
 *   
 *   return (
 *     <div>
 *       {prefersReducedMotion 
 *         ? <SimpleVersion /> 
 *         : <AnimatedVersion />
 *       }
 *     </div>
 *   );
 * };
 * ```
 */
const useReducedMotion = () => {
  // Stato iniziale basato sulla preferenza attuale
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  
  useEffect(() => {
    // Verifica se il browser supporta la media query
    const mediaQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    
    // Se la media query non è supportata, restituisci false
    if (!mediaQuery) {
      setPrefersReducedMotion(false);
      return;
    }
    
    // Imposta lo stato iniziale
    setPrefersReducedMotion(mediaQuery.matches);
    
    // Handler per quando cambia la preferenza
    const handleChange = () => {
      setPrefersReducedMotion(mediaQuery.matches);
    };
    
    // Aggiungi listener per i cambiamenti
    // Utilizziamo addEventListener per compatibilità con browser più recenti
    // ma forniamo un fallback per browser più vecchi
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
    } else {
      // Fallback per vecchi browser
      mediaQuery.addListener(handleChange);
    }
    
    // Cleanup del listener
    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleChange);
      } else {
        // Fallback per vecchi browser
        mediaQuery.removeListener(handleChange);
      }
    };
  }, []);
  
  return prefersReducedMotion;
};

export default useReducedMotion;