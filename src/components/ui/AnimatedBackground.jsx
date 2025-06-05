import React, { useEffect, useRef, useState } from 'react';

/**
 * AnimatedBackground - Versione migliorata con risoluzione memory leak e
 * supporto per prefers-reduced-motion
 */
const AnimatedBackground = () => {
  const canvasRef = useRef(null);
  const requestRef = useRef(null);
  const particlesRef = useRef([]);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  
  // Controlla se l'utente preferisce reduced motion
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = () => setPrefersReducedMotion(mediaQuery.matches);
    mediaQuery.addEventListener('change', handleChange);
    
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    let particles = [];
    let gridPoints = [];
    
    // Impostazioni delle particelle
    const particleCount = prefersReducedMotion ? 50 : 100; // Meno particelle se reduced motion è attivo
    const particleColors = [
      'rgba(29, 78, 216, 0.2)',  // blu
      'rgba(107, 114, 128, 0.15)', // grigio
      'rgba(139, 92, 246, 0.15)', // viola
      'rgba(14, 165, 233, 0.15)', // azzurro
      'rgba(236, 72, 153, 0.1)'   // rosa
    ];
    
    // Griglia di punti
    const gridSpacing = 70;
    
    // Impostazione delle dimensioni del canvas
    const setCanvasSize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      
      // Scala il contesto per supportare high DPI
      ctx.scale(dpr, dpr);
      
      createGrid();
      initParticles();
    };
    
    // Crea una griglia di punti
    const createGrid = () => {
      gridPoints = [];
      const rows = Math.ceil(canvas.clientHeight / gridSpacing) + 1;
      const cols = Math.ceil(canvas.clientWidth / gridSpacing) + 1;
      
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          gridPoints.push({
            x: x * gridSpacing,
            y: y * gridSpacing,
            originX: x * gridSpacing,
            originY: y * gridSpacing,
            size: Math.random() * 1 + 0.5,
            color: 'rgba(255, 255, 255, 0.05)'
          });
        }
      }
    };
    
    // Classe per le particelle
    class Particle {
      constructor() {
        this.x = Math.random() * canvas.clientWidth;
        this.y = Math.random() * canvas.clientHeight;
        this.size = Math.random() * 2 + 0.5;
        this.speedX = Math.random() * 0.5 - 0.25;
        this.speedY = Math.random() * 0.5 - 0.25;
        this.color = particleColors[Math.floor(Math.random() * particleColors.length)];
        this.life = Math.random() * 100 + 150;
        this.alpha = Math.random() * 0.4 + 0.1;
      }
      
      update() {
        this.x += this.speedX;
        this.y += this.speedY;
        this.life--;
        
        // Bordi toroidali
        if (this.x < 0) this.x = canvas.clientWidth;
        if (this.x > canvas.clientWidth) this.x = 0;
        if (this.y < 0) this.y = canvas.clientHeight;
        if (this.y > canvas.clientHeight) this.y = 0;
      }
      
      draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
      }
      
      isDead() {
        return this.life <= 0;
      }
    }
    
    // Inizializza le particelle
    const initParticles = () => {
      particles = [];
      for (let i = 0; i < particleCount; i++) {
        particles.push(new Particle());
      }
      particlesRef.current = particles;
    };
    
    // Disegna e aggiorna le particelle
    const animate = () => {
      ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
      
      // Disegna la griglia di sfondo
      drawGrid();
      
      // Aggiorna e disegna le particelle
      particles.forEach((particle, index) => {
        if (!prefersReducedMotion) {
          particle.update();
        }
        particle.draw();
        
        if (particle.isDead()) {
          particles.splice(index, 1);
          particles.push(new Particle());
        }
      });
      
      // Disegna le connessioni tra particelle
      drawConnections();
      
      requestRef.current = requestAnimationFrame(animate);
    };
    
    // Disegna la griglia di sfondo
    const drawGrid = () => {
      gridPoints.forEach(point => {
        ctx.beginPath();
        ctx.arc(point.x, point.y, point.size, 0, Math.PI * 2);
        ctx.fillStyle = point.color;
        ctx.fill();
      });
    };
    
    // Disegna le connessioni tra particelle
    const drawConnections = () => {
      const maxDistance = 150;
      
      // Connessioni tra particelle
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance < maxDistance) {
            const opacity = (1 - distance / maxDistance) * 0.15;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(60, 130, 214, ${opacity})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }
      
      // Connessioni dalle particelle ai punti griglia vicini
      particles.forEach(particle => {
        gridPoints.forEach(point => {
          const dx = particle.x - point.x;
          const dy = particle.y - point.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance < maxDistance / 2) {
            const opacity = (1 - distance / (maxDistance / 2)) * 0.05;
            ctx.beginPath();
            ctx.moveTo(particle.x, particle.y);
            ctx.lineTo(point.x, point.y);
            ctx.strokeStyle = `rgba(60, 130, 214, ${opacity})`;
            ctx.lineWidth = 0.3;
            ctx.stroke();
          }
        });
      });
    };
    
    // Inizializzazione
    setCanvasSize();
    
    // Se l'utente preferisce reduced motion, disegna una volta sola e non animare
    if (prefersReducedMotion) {
      drawGrid();
      particles.forEach(particle => particle.draw());
      drawConnections();
    } else {
      // Altrimenti, avvia l'animazione
      requestRef.current = requestAnimationFrame(animate);
    }
    
    // Gestione del resize
    const handleResize = () => {
      setCanvasSize();
    };
    
    window.addEventListener('resize', handleResize);
    
    // Pulizia
    return () => {
      window.removeEventListener('resize', handleResize);
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
        requestRef.current = null;
      }
      // Rilascia esplicitamente le referenze
      particlesRef.current = [];
      particles = [];
      gridPoints = [];
    };
  }, [prefersReducedMotion]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed top-0 left-0 w-full h-full pointer-events-none z-0"
      style={{ 
        opacity: 0.3,
        filter: 'blur(1px)'
      }}
    />
  );
};

export default AnimatedBackground;