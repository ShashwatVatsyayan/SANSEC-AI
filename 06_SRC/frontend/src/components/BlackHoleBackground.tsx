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

    const centerX = () => width / 2;
    const centerY = () => height * 0.48;

    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Draw base aesthetic singularity
    const drawCore = (time: number = 0) => {
      ctx.clearRect(0, 0, width, height);
      const cx = centerX();
      const cy = centerY();
      const baseRadius = Math.min(width, height) * 0.11;
      const eventHorizonRadius = Math.max(65, Math.min(baseRadius, 130));

      // Outer Gravitational Nebula Glow - calm, refined cybersecurity palette
      const outerGlow = ctx.createRadialGradient(
        cx,
        cy,
        eventHorizonRadius * 0.4,
        cx,
        cy,
        eventHorizonRadius * 3.8
      );
      outerGlow.addColorStop(0, "rgba(239, 68, 68, 0.16)");
      outerGlow.addColorStop(0.3, "rgba(185, 28, 28, 0.08)");
      outerGlow.addColorStop(0.7, "rgba(14, 165, 233, 0.03)");
      outerGlow.addColorStop(1, "rgba(8, 10, 15, 0)");

      ctx.fillStyle = outerGlow;
      ctx.beginPath();
      ctx.arc(cx, cy, eventHorizonRadius * 3.8, 0, Math.PI * 2);
      ctx.fill();

      // Elliptical Accretion Disk Ring
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(time * 0.08);
      ctx.scale(1, 0.28);

      const ringGrad = ctx.createRadialGradient(
        0,
        0,
        eventHorizonRadius * 0.85,
        0,
        0,
        eventHorizonRadius * 2.4
      );
      ringGrad.addColorStop(0, "rgba(255, 255, 255, 0.7)");
      ringGrad.addColorStop(0.2, "rgba(239, 68, 68, 0.55)");
      ringGrad.addColorStop(0.6, "rgba(56, 189, 248, 0.15)");
      ringGrad.addColorStop(1, "rgba(8, 10, 15, 0)");

      ctx.fillStyle = ringGrad;
      ctx.beginPath();
      ctx.arc(0, 0, eventHorizonRadius * 2.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Singularity Core (Void Event Horizon)
      const coreGrad = ctx.createRadialGradient(
        cx,
        cy,
        0,
        cx,
        cy,
        eventHorizonRadius
      );
      coreGrad.addColorStop(0, "#05070c");
      coreGrad.addColorStop(0.9, "#05070c");
      coreGrad.addColorStop(0.98, "rgba(239, 68, 68, 0.45)");
      coreGrad.addColorStop(1, "rgba(255, 255, 255, 0)");

      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, eventHorizonRadius * 1.02, 0, Math.PI * 2);
      ctx.fill();

      return eventHorizonRadius;
    };

    if (prefersReducedMotion) {
      drawCore(0);
      return () => {
        window.removeEventListener("resize", handleResize);
      };
    }

    // Gentle, low-noise particle field (50 particles, refined palette)
    const particleCount = 50;
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
      "rgba(239, 68, 68, ",    // Crimson core
      "rgba(20, 184, 166, ",   // Cyber teal
      "rgba(56, 189, 248, ",   // Cyber blue
      "rgba(241, 245, 249, "   // Star dust
    ];

    for (let i = 0; i < particleCount; i++) {
      const distance = Math.random() * Math.max(width, height) * 0.45 + 30;
      particles.push({
        x: 0,
        y: 0,
        radius: Math.random() * 1.5 + 0.4,
        angle: Math.random() * Math.PI * 2,
        distance,
        speed: (Math.random() * 0.002 + 0.0006) * (140 / (distance + 40)),
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: Math.random() * 0.5 + 0.2,
        pulseSpeed: Math.random() * 0.01 + 0.003
      });
    }

    let time = 0;

    const render = () => {
      time += 0.004;
      const eventHorizonRadius = drawCore(time);
      const cx = centerX();
      const cy = centerY();

      particles.forEach((p) => {
        p.angle += p.speed;
        p.distance -= 0.12;

        if (p.distance < eventHorizonRadius * 0.8) {
          p.distance = Math.max(width, height) * 0.45 + Math.random() * 60;
          p.angle = Math.random() * Math.PI * 2;
        }

        const px = cx + Math.cos(p.angle) * p.distance;
        const py = cy + Math.sin(p.angle) * (p.distance * 0.32);
        const currentAlpha = Math.sin(time * p.pulseSpeed + p.angle) * 0.25 + p.alpha;

        ctx.fillStyle = p.color + Math.max(0.08, Math.min(0.85, currentAlpha)) + ")";
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
      className="black-hole-bg"
      data-html2canvas-ignore="true"
      aria-hidden="true"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        zIndex: -10,
        pointerEvents: "none"
      }}
    />
  );
};
