"use client";

import { useEffect, useRef } from "react";

type Shard = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  rotation: number;
  spin: number;
  opacity: number;
  hue: number;
  points: { x: number; y: number }[];
  glint: number;
};

function randomShard(width: number, height: number, burst = false): Shard {
  const cx = width * 0.5;
  const cy = height * 0.42;
  const angle = Math.random() * Math.PI * 2;
  const dist = burst ? Math.random() * 40 : Math.random() * Math.min(width, height) * 0.45;
  const x = cx + Math.cos(angle) * dist;
  const y = cy + Math.sin(angle) * dist;
  const speed = burst ? 1.2 + Math.random() * 2.8 : 0.15 + Math.random() * 0.55;
  const size = 6 + Math.random() * 22;
  const sides = 3 + Math.floor(Math.random() * 2);
  const points: { x: number; y: number }[] = [];
  for (let i = 0; i < sides; i++) {
    const a = (i / sides) * Math.PI * 2 + Math.random() * 0.4;
    const r = size * (0.55 + Math.random() * 0.55);
    points.push({ x: Math.cos(a) * r, y: Math.sin(a) * r });
  }
  return {
    x,
    y,
    vx: Math.cos(angle) * speed * (burst ? 1 : 0.35),
    vy: Math.sin(angle) * speed * (burst ? 1 : 0.35) - (burst ? 0.8 : 0.25),
    size,
    rotation: Math.random() * Math.PI * 2,
    spin: (Math.random() - 0.5) * 0.04,
    opacity: burst ? 0.95 : 0.35 + Math.random() * 0.55,
    hue: 185 + Math.random() * 35,
    points,
    glint: Math.random() * Math.PI * 2,
  };
}

function drawShard(ctx: CanvasRenderingContext2D, shard: Shard, time: number) {
  ctx.save();
  ctx.translate(shard.x, shard.y);
  ctx.rotate(shard.rotation);
  ctx.globalAlpha = shard.opacity;

  const gradient = ctx.createLinearGradient(-shard.size, -shard.size, shard.size, shard.size);
  gradient.addColorStop(0, `hsla(${shard.hue}, 100%, 92%, 0.95)`);
  gradient.addColorStop(0.45, `hsla(${shard.hue}, 95%, 72%, 0.75)`);
  gradient.addColorStop(1, `hsla(${shard.hue + 20}, 90%, 55%, 0.35)`);

  ctx.beginPath();
  ctx.moveTo(shard.points[0].x, shard.points[0].y);
  for (let i = 1; i < shard.points.length; i++) {
    ctx.lineTo(shard.points[i].x, shard.points[i].y);
  }
  ctx.closePath();
  ctx.fillStyle = gradient;
  ctx.fill();
  ctx.strokeStyle = `hsla(${shard.hue}, 100%, 96%, 0.85)`;
  ctx.lineWidth = 1;
  ctx.stroke();

  const glintX = Math.cos(shard.glint + time * 0.002) * shard.size * 0.35;
  const glintY = Math.sin(shard.glint + time * 0.002) * shard.size * 0.35;
  ctx.beginPath();
  ctx.arc(glintX, glintY, 1.8, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,255,255,0.95)";
  ctx.fill();

  ctx.restore();
}

export function SaoCrystalParticles({ active }: { active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const shardsRef = useRef<Shard[]>([]);
  const frameRef = useRef<number>(0);
  const burstDoneRef = useRef(false);

  useEffect(() => {
    if (!active) {
      shardsRef.current = [];
      burstDoneRef.current = false;
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    window.addEventListener("resize", resize);

    if (!burstDoneRef.current) {
      for (let i = 0; i < 90; i++) {
        shardsRef.current.push(randomShard(window.innerWidth, window.innerHeight, true));
      }
      burstDoneRef.current = true;
    }

    const tick = (time: number) => {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

      if (shardsRef.current.length < 110) {
        shardsRef.current.push(randomShard(window.innerWidth, window.innerHeight, false));
      }

      for (const shard of shardsRef.current) {
        shard.x += shard.vx;
        shard.y += shard.vy;
        shard.vy -= 0.008;
        shard.vx *= 0.998;
        shard.rotation += shard.spin;
        shard.opacity *= 0.9985;

        if (
          shard.opacity < 0.08 ||
          shard.y < -60 ||
          shard.x < -60 ||
          shard.x > window.innerWidth + 60 ||
          shard.y > window.innerHeight + 60
        ) {
          Object.assign(shard, randomShard(window.innerWidth, window.innerHeight, Math.random() > 0.65));
        }

        drawShard(ctx, shard, time);
      }

      frameRef.current = requestAnimationFrame(tick);
    };

    frameRef.current = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(frameRef.current);
    };
  }, [active]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      className="sao-victory-particles pointer-events-none fixed inset-0 z-[10000]"
      aria-hidden="true"
    />
  );
}
