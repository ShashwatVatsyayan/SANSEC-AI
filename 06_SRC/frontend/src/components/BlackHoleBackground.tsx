import React, { useEffect, useRef } from "react";

export const BlackHoleBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener("resize", handleResize);

    // Cosmic dust particle system swirling into gravitational vortex
    const particleCount = 220;
    const particles: Array<{
      x: number;
      y: number;
      radius: number;
      angle: number;
      distance: number;
      speed: number;
      color: string;
      alpha: number;
      pulseSpeed: number;
    }> = [];

    const colors = [
      "rgba(226, 177, 60, ",   // Gold accretion
      "rgba(255, 140, 0, ",    // Luminous amber
      "rgba(69, 162, 158, ",   // Cosmic teal
      "rgba(168, 85, 247, ",   // Gravitational purple
      "rgba(244, 114, 182, ",  // Deep magenta
      "rgba(255, 255, 255, "   // Star dust
    ];

    const centerX = () => width / 2;
    const centerY = () => height * 0.48;

    for (let i = 0; i < particleCount; i++) {
      const distance = Math.random() * Math.max(width, height) * 0.55 + 30;
      particles.push({
        x: 0,
        y: 0,
        radius: Math.random() * 2.2 + 0.4,
        angle: Math.random() * Math.PI * 2,
        distance: distance,
        speed: (Math.random() * 0.004 + 0.001) * (180 / (distance + 40)),
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: Math.random() * 0.75 + 0.25,
        pulseSpeed: Math.random() * 0.02 + 0.005
      });
    }

    let time = 0;

    const render = () => {
      time += 0.008;
      ctx.clearRect(0, 0, width, height);

      const cx = centerX();
      const cy = centerY();

      const baseRadius = Math.min(width, height) * 0.11;
      const eventHorizonRadius = Math.max(70, Math.min(baseRadius, 140));

      // Outer Gravitational Nebula Glow
      const outerGlow = ctx.createRadialGradient(cx, cy, eventHorizonRadius * 0.4, cx, cy, eventHorizonRadius * 4.2);
      outerGlow.addColorStop(0, "rgba(226, 177, 60, 0.35)");
      outerGlow.addColorStop(0.25, "rgba(255, 120, 0, 0.2)");
      outerGlow.addColorStop(0.55, "rgba(147, 51, 234, 0.12)");
      outerGlow.addColorStop(0.85, "rgba(14, 165, 233, 0.05)");
      outerGlow.addColorStop(1, "rgba(5, 7, 14, 0)");

      ctx.fillStyle = outerGlow;
      ctx.beginPath();
      ctx.arc(cx, cy, eventHorizonRadius * 4.2, 0, Math.PI * 2);
      ctx.fill();

      // Rotating Elliptical Accretion Disk Ring
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(time * 0.15);
      ctx.scale(1, 0.32);

      const ringGrad = ctx.createRadialGradient(0, 0, eventHorizonRadius * 0.85, 0, 0, eventHorizonRadius * 2.8);
      ringGrad.addColorStop(0, "rgba(255, 255, 255, 0.95)");
      ringGrad.addColorStop(0.15, "rgba(226, 177, 60, 0.85)");
      ringGrad.addColorStop(0.4, "rgba(236, 72, 153, 0.45)");
      ringGrad.addColorStop(0.7, "rgba(99, 102, 241, 0.2)");
      ringGrad.addColorStop(1, "rgba(5, 7, 14, 0)");

      ctx.fillStyle = ringGrad;
      ctx.beginPath();
      ctx.arc(0, 0, eventHorizonRadius * 2.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Black Hole Singularity Core (Void Event Horizon)
      const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, eventHorizonRadius);
      coreGrad.addColorStop(0, "#020307");
      coreGrad.addColorStop(0.88, "#020307");
      coreGrad.addColorStop(0.96, "rgba(226, 177, 60, 0.7)");
      coreGrad.addColorStop(1, "rgba(255, 255, 255, 0)");

      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, eventHorizonRadius * 1.04, 0, Math.PI * 2);
      ctx.fill();

      // Animate Cosmic Dust Swirling along Geodesics
      particles.forEach((p) => {
        p.angle += p.speed;
        p.distance -= 0.18;

        if (p.distance < eventHorizonRadius * 0.82) {
          p.distance = Math.max(width, height) * 0.55 + Math.random() * 80;
          p.angle = Math.random() * Math.PI * 2;
        }

        const px = cx + Math.cos(p.angle) * p.distance;
        const py = cy + Math.sin(p.angle) * (p.distance * 0.38);

        const currentAlpha = Math.sin(time * p.pulseSpeed + p.angle) * 0.35 + p.alpha;

        ctx.fillStyle = p.color + Math.max(0.12, Math.min(1, currentAlpha)) + ")";
        ctx.beginPath();
        ctx.arc(px, py, p.radius, 0, Math.PI * 2);
        ctx.fill();
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas 
      ref={canvasRef} 
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        zIndex: 0,
        pointerEvents: "none"
      }}
    />
  );
};
