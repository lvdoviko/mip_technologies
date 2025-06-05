import React from 'react';

/**
 * Componente cursore per effetto macchina da scrivere
 * Versione con allineamento verticale regolato finemente
 */
const TypewriterCursor = ({ 
  blinking = true,
  height = "h-8 md:h-12 lg:h-16", // Altezza personalizzabile
  width = "w-0.5", // Larghezza personalizzabile
  color = "bg-white", // Colore personalizzabile
  verticalOffset = "0.05em", // Valore leggermente positivo per abbassare il cursore
}) => {
  return (
    <span 
      className={`inline-block ${width} ${height} ${color} ml-1 ${blinking ? 'animate-blink' : ''}`}
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
};

export default TypewriterCursor;