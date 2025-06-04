// src/components/ui/AnimatedBackground.jsx
import React, { useEffect, useRef } from 'react';

const AnimatedBackground = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationFrameId;
    
    // Imposta le dimensioni del canvas al 100% della finestra
    const setCanvasSize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    
    // Aggiungi un event listener per il resize della finestra
    window.addEventListener('resize', setCanvasSize);
    setCanvasSize();
    
    // Crea un array di particelle
    const particlesArray = [];
    const numberOfParticles = 50; // Numero di particelle
    
    // Classe per le particelle
    class Particle {
      constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.size = Math.random() * 5 + 1; // Dimensione delle particelle tra 1 e 6
        this.speedX = Math.random() * 1 - 0.5; // Velocità orizzontale
        this.speedY = Math.random() * 1 - 0.5; // Velocità verticale
        this.color = `rgba(0, 102, 255, ${Math.random() * 0.3})`; // Colore primario
      }
      
      // Aggiorna la posizione della particella
      update() {
        this.x += this.speedX;
        this.y += this.speedY;
        
        // Rimbalzo ai bordi
        if (this.x > canvas.width || this.x < 0) {
          this.speedX = -this.speedX;
        }
        if (this.y > canvas.height || this.y < 0) {
          this.speedY = -this.speedY;
        }
      }
      
      // Disegna la particella
      draw() {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    
    // Inizializza le particelle
    const init = () => {
      for (let i = 0; i < numberOfParticles; i++) {
        particlesArray.push(new Particle());
      }
    };
    
    // Disegna e aggiorna le particelle
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Disegna linee di connessione tra particelle vicine
      for (let i = 0; i < particlesArray.length; i++) {
        for (let j = i; j < particlesArray.length; j++) {
          const dx = particlesArray[i].x - particlesArray[j].x;
          const dy = particlesArray[i].y - particlesArray[j].y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance < 100) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(0, 102, 255, ${0.1 - distance/1000})`;
            ctx.lineWidth = 0.5;
            ctx.moveTo(particlesArray[i].x, particlesArray[i].y);
            ctx.lineTo(particlesArray[j].x, particlesArray[j].y);
            ctx.stroke();
          }
        }
        
        particlesArray[i].update();
        particlesArray[i].draw();
      }
      
      animationFrameId = window.requestAnimationFrame(animate);
    };
    
    init();
    animate();
    
    // Cleanup al dismount del componente
    return () => {
      window.removeEventListener('resize', setCanvasSize);
      window.cancelAnimationFrame(animationFrameId);
    };
  }, []);
  
  return (
    <canvas 
      ref={canvasRef} 
      className="fixed top-0 left-0 w-full h-full pointer-events-none z-0"
      style={{ opacity: 0.2 }}
    />
  );
};

export default AnimatedBackground;