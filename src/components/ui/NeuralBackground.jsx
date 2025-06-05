// src/components/ui/NeuralBackground.jsx
import React, { useEffect, useRef, useState } from 'react';

const NeuralBackground = () => {
  const canvasRef = useRef(null);
  const [scrollY, setScrollY] = useState(0);
  const [mousePosition, setMousePosition] = useState({ x: undefined, y: undefined, active: false });
  
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let nodes = [];
    
    // Imposta le dimensioni del canvas al 100% della finestra
    const setCanvasSize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      // Ricalcola il numero di nodi in base alla dimensione dello schermo
      initNodes();
    };
    
    // Configurazione rete neurale
    const config = {
      nodeCount: Math.min(Math.floor(window.innerWidth / 30), 100), // Numero adattivo di nodi
      nodeSize: 1.5,
      nodeColor: '#3B82F6', // Blu primario
      accentColor: 'rgba(219, 39, 119, 0.8)', // Rosa accent
      connectDistance: 150,
      lineOpacityDivisor: 15,
      speed: 0.3,
      depth: true, // Effetto 3D di profondità
      mousePush: true, // I nodi reagiscono al mouse
      mouseRadius: 150
    };
    
    // Classe per i nodi
    class Node {
      constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.z = Math.random() * 300 + 100; // Profondità 3D tra 100-400
        this.vx = (Math.random() - 0.5) * config.speed;
        this.vy = (Math.random() - 0.5) * config.speed;
        this.vz = (Math.random() - 0.5) * config.speed * 0.5; // Movimento più lento sull'asse z
        this.size = config.nodeSize * (400 / (this.z + 100)); // Dimensione basata sulla profondità
        this.origSize = this.size;
        this.color = config.nodeColor;
        this.highlighted = false;
      }
      
      update() {
        // Muove il nodo
        this.x += this.vx;
        this.y += this.vy;
        if (config.depth) this.z += this.vz;
        
        // Dimensione basata sulla profondità z
        if (config.depth) {
          this.size = config.nodeSize * (400 / (this.z + 100));
        }
        
        // Controllo dei confini con rimbalzo
        if (this.x < 0 || this.x > canvas.width) this.vx *= -1;
        if (this.y < 0 || this.y > canvas.height) this.vy *= -1;
        if (config.depth) {
          if (this.z < 100 || this.z > 400) this.vz *= -1;
        }
        
        // Resetta lo stato di evidenziazione
        this.highlighted = false;
      }
      
      draw() {
        const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.size * 2);
        
        if (this.highlighted) {
          gradient.addColorStop(0, config.accentColor); // Nucleo rosa quando evidenziato
          gradient.addColorStop(1, 'rgba(219, 39, 119, 0)');
        } else {
          const opacity = config.depth ? 0.3 + (400 - this.z) / 400 * 0.7 : 0.6;
          gradient.addColorStop(0, `rgba(59, 130, 246, ${opacity})`); // Nucleo blu
          gradient.addColorStop(1, 'rgba(59, 130, 246, 0)');
        }
        
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size * 2, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
      }
    }
    
    // Inizializza i nodi
    function initNodes() {
      nodes = []; // Pulisce i nodi esistenti
      
      // Crea nuovi nodi in base alla configurazione
      for (let i = 0; i < config.nodeCount; i++) {
        nodes.push(new Node());
      }
    }
    
    // Connetti i nodi con linee
    function connectNodes() {
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dz = config.depth ? nodes[i].z - nodes[j].z : 0;
          
          // Calcolo della distanza 3D
          const distance = Math.sqrt(dx*dx + dy*dy + dz*dz);
          
          if (distance < config.connectDistance) {
            // Calcola l'opacità in base alla distanza e alla profondità z
            const baseOpacity = 1 - distance / config.connectDistance;
            const zFactor = config.depth ? 
              (800 - nodes[i].z - nodes[j].z) / 800 : 1;
            
            const opacity = baseOpacity * zFactor * 0.5;
            
            // Disegna la linea di connessione
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            
            // Colore diverso per i nodi evidenziati
            if (nodes[i].highlighted && nodes[j].highlighted) {
              ctx.strokeStyle = `rgba(219, 39, 119, ${opacity})`;
            } else {
              ctx.strokeStyle = `rgba(59, 130, 246, ${opacity})`;
            }
            
            ctx.lineWidth = config.depth ? 
              (400 - (nodes[i].z + nodes[j].z) / 2) / 400 : 1;
            ctx.stroke();
            
            // Imposta lo stato evidenziato se uno dei nodi è vicino al cursore
            if (mousePosition.active && config.mousePush) {
              if (nodes[i].highlighted || nodes[j].highlighted) {
                nodes[i].highlighted = true;
                nodes[j].highlighted = true;
              }
            }
          }
        }
      }
    }
    
    // Controlla la prossimità del mouse
    function handleMouseInteraction() {
      if (!mousePosition.active || !config.mousePush) return;
      
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        const dx = mousePosition.x - node.x;
        const dy = mousePosition.y - node.y;
        const distance = Math.sqrt(dx*dx + dy*dy);
        
        if (distance < config.mouseRadius) {
          // Evidenzia i nodi vicini al cursore
          node.highlighted = true;
          
          // Spingi i nodi lontano dal cursore
          const force = (config.mouseRadius - distance) / config.mouseRadius;
          const angle = Math.atan2(dy, dx);
          
          node.vx -= Math.cos(angle) * force * 0.2;
          node.vy -= Math.sin(angle) * force * 0.2;
        }
      }
    }
    
    // Loop di animazione
    function animate() {
      // Pulisce il canvas con un effetto di dissolvenza
      ctx.fillStyle = 'rgba(15, 23, 42, 0.15)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Aggiorna e disegna i nodi
      for (let i = 0; i < nodes.length; i++) {
        nodes[i].update();
        nodes[i].draw();
      }
      
      // Gestisci l'interazione del mouse
      handleMouseInteraction();
      
      // Connetti i nodi
      connectNodes();
      
      animationFrameId = window.requestAnimationFrame(animate);
    }
    
    // Gestione dello scroll per effetto parallasse
    const handleScroll = () => {
      setScrollY(window.scrollY);
      
      for (let i = 0; i < nodes.length; i++) {
        // Leggero movimento parallasse basato sullo scroll
        nodes[i].y -= window.scrollY * 0.0005 * (Math.random() * 0.5 + 0.5);
        
        // Resetta i nodi che si spostano fuori dallo schermo
        if (nodes[i].y < -50) {
          nodes[i].y = canvas.height + 50;
          nodes[i].x = Math.random() * canvas.width;
        } else if (nodes[i].y > canvas.height + 50) {
          nodes[i].y = -50;
          nodes[i].x = Math.random() * canvas.width;
        }
      }
    };
    
    // Gestione del movimento del mouse
    const handleMouseMove = (e) => {
      setMousePosition({
        x: e.clientX,
        y: e.clientY,
        active: true
      });
    };
    
    const handleMouseLeave = () => {
      setMousePosition({
        ...mousePosition,
        active: false
      });
    };
    
    // Aggiungi event listeners
    window.addEventListener('resize', setCanvasSize);
    window.addEventListener('scroll', handleScroll);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);
    
    // Inizializza e avvia l'animazione
    setCanvasSize();
    animate();
    
    // Cleanup al dismount del componente
    return () => {
      window.removeEventListener('resize', setCanvasSize);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      window.cancelAnimationFrame(animationFrameId);
    };
  }, []);
  
  return (
    <canvas 
      ref={canvasRef} 
      className="fixed top-0 left-0 w-full h-full pointer-events-none z-0"
      style={{ opacity: 0.6 }}
    />
  );
};

export default NeuralBackground;