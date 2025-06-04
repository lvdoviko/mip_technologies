// src/hooks/useScrollAnimation.js
import { useEffect } from 'react';

export const useScrollAnimation = () => {
  useEffect(() => {
    // Opzioni per l'Intersection Observer
    const options = {
      root: null, // viewport come reference
      rootMargin: '0px 0px -100px 0px', // attiva l'animazione un po' prima che l'elemento entri completamente nel viewport
      threshold: 0.1 // attiva quando almeno il 10% dell'elemento è visibile
    };

    // Gestione degli elementi con classe .animate-on-scroll
    const handleIntersect = (entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          // Ottieni l'indice per l'animazione a cascata
          const delay = entry.target.dataset.delay || 0;
          
          // Aggiungi la classe con un delay se specificato
          setTimeout(() => {
            entry.target.classList.add('visible');
          }, delay * 100);
          
          // Opzionalmente, smetti di osservare l'elemento dopo che è stato animato
          // observer.unobserve(entry.target);
        }
      });
    };

    // Crea l'observer
    const observer = new IntersectionObserver(handleIntersect, options);
    
    // Seleziona tutti gli elementi da animare
    const animateElements = document.querySelectorAll('.animate-on-scroll');
    
    // Assegna un indice progressivo a elementi che non hanno un delay definito
    let defaultIndex = 0;
    
    // Osserva ogni elemento
    animateElements.forEach(el => {
      if (!el.dataset.delay) {
        el.dataset.delay = defaultIndex;
        defaultIndex++;
      }
      observer.observe(el);
    });

    // Cleanup
    return () => observer.disconnect();
  }, []);
};

export default useScrollAnimation;