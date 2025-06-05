import React, { useEffect, useRef } from 'react';

const ImmersiveBackground = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let particles = [];
    
    // Impostazioni delle particelle
    const particleCount = 100;
    const particleColors = [
      'rgba(29, 78, 216, 0.2)',  // blu
      'rgba(107, 114, 128, 0.15)', // grigio
      'rgba(139, 92, 246, 0.15)', // viola
      'rgba(14, 165, 233, 0.15)', // azzurro
      'rgba(236, 72, 153, 0.1)'   // rosa
    ];
    
    // Griglia di punti
    const gridSpacing = 70;
    let gridPoints = [];
    
    // Impostazione delle dimensioni del canvas
    const setCanvasSize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      createGrid();
    };
    
    // Crea una griglia di punti
    const createGrid = () => {
      gridPoints = [];
      const rows = Math.ceil(canvas.height / gridSpacing) + 1;
      const cols = Math.ceil(canvas.width / gridSpacing) + 1;
      
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
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
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
        if (this.x < 0) this.x = canvas.width;
        if (this.x > canvas.width) this.x = 0;
        if (this.y < 0) this.y = canvas.height;
        if (this.y > canvas.height) this.y = 0;
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
    };
    
    // Disegna e aggiorna le particelle
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Disegna la griglia di sfondo
      drawGrid();
      
      // Aggiorna e disegna le particelle
      particles.forEach((particle, index) => {
        particle.update();
        particle.draw();
        
        if (particle.isDead()) {
          particles.splice(index, 1);
          particles.push(new Particle());
        }
      });
      
      // Disegna le connessioni tra particelle
      drawConnections();
      
      animationFrameId = requestAnimationFrame(animate);
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
    window.addEventListener('resize', setCanvasSize);
    setCanvasSize();
    initParticles();
    animate();
    
    // Pulizia
    return () => {
      window.removeEventListener('resize', setCanvasSize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

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

export default function AnimatedBackground() {
  return <ImmersiveBackground />;
}