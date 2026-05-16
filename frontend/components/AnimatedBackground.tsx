'use client';

import React, { useEffect, useRef } from 'react';

export default function AnimatedBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let particles: Particle[] = [];
    
    // 🚀 INCREASED DENSITY AND DISTANCE
    const PARTICLE_COUNT = 90;
    const CONNECTION_DISTANCE = 180;
    const PARTICLE_SPEED = 0.6;

    const resize = () => {
      // Added ! to satisfy TypeScript strict mode
      canvas!.width = window.innerWidth;
      canvas!.height = window.innerHeight;
    };

    class Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;

      constructor() {
        // Added ! to satisfy TypeScript strict mode
        this.x = Math.random() * canvas!.width;
        this.y = Math.random() * canvas!.height;
        this.vx = (Math.random() - 0.5) * PARTICLE_SPEED;
        this.vy = (Math.random() - 0.5) * PARTICLE_SPEED;
      }

      update() {
        this.x += this.vx;
        this.y += this.vy;
        // Added ! to satisfy TypeScript strict mode
        if (this.x < 0 || this.x > canvas!.width) this.vx *= -1;
        if (this.y < 0 || this.y > canvas!.height) this.vy *= -1;
      }

      draw() {
        if (!ctx) return;
        ctx.beginPath();
        ctx.arc(this.x, this.y, 2.5, 0, Math.PI * 2); 
        ctx.fillStyle = 'rgba(0, 240, 255, 0.8)';     
        ctx.shadowBlur = 10;
        ctx.shadowColor = 'rgba(0, 240, 255, 1)';
        ctx.fill();
      }
    }

    const init = () => {
      resize();
      particles = Array.from({ length: PARTICLE_COUNT }, () => new Particle());
    };

    const animate = () => {
      // Added ! to satisfy TypeScript strict mode
      ctx.clearRect(0, 0, canvas!.width, canvas!.height);

      particles.forEach(p => {
        p.update();
        p.draw();
      });

      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < CONNECTION_DISTANCE) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            
            const opacity = 1 - (distance / CONNECTION_DISTANCE);
            ctx.strokeStyle = `rgba(0, 240, 255, ${opacity * 0.4})`;
            ctx.lineWidth = 1.5;
            ctx.stroke();
          }
        }
      }
      animationFrameId = requestAnimationFrame(animate);
    };

    init();
    animate();
    window.addEventListener('resize', resize);

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas 
      ref={canvasRef} 
      className="fixed inset-0 pointer-events-none z-0 opacity-100" 
      style={{ background: 'radial-gradient(circle at center, #0B101E 0%, #05070A 100%)' }}
    />
  );
}