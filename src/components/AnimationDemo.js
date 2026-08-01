import React from "react";
import { useEntrance, useFloat, usePulse, staggerDelay } from "./animations.js";

/**
 * AnimationDemo — SVG-based animation demonstrations.
 *
 * remotion_data:
 *   type: "shapes" | "particles" | "waves" | "clock"
 *   color: optional override for the animation color
 */

// ─── Floating geometric shapes ───────────────────────────────────────────
const ShapesDemo = ({ props, color }) => {
  const c = color || props.primaryColor;
  const shapes = [
    { type: "circle", cx: 120, cy: 120, r: 40 },
    { type: "rect", x: 280, y: 80, w: 70, h: 70, rx: 12 },
    { type: "polygon", points: "460,60 500,140 420,140" },
    { type: "circle", cx: 680, cy: 100, r: 30 },
    { type: "rect", x: 80, y: 250, w: 80, h: 80, rx: 16 },
    { type: "polygon", points: "340,240 380,320 300,320" },
    { type: "circle", cx: 560, cy: 280, r: 50 },
    { type: "rect", x: 700, y: 240, w: 60, h: 60, rx: 10 },
  ];

  return (
    <svg width="100%" viewBox="0 0 840 380" style={{ overflow: "visible" }}>
      {shapes.map((shape, i) => {
        const floatY = useFloat(0.6, 8 + i * 3, i * 50);
        const pulse = usePulse(0.02, 0.4 + i * 0.3, i * 30);
        const entrance = useEntrance(props.enableAnimations, staggerDelay(i, 0, 6));
        const opacity = entrance.opacity * (0.5 + pulse * 0.5);
        const yOffset = floatY * 12;

        const commonProps = {
          fill: c,
          opacity,
          transform: `translate(0, ${yOffset})`,
          style: { transition: "opacity 0.3s" },
        };

        switch (shape.type) {
          case "circle":
            return <circle key={i} cx={shape.cx} cy={shape.cy + yOffset} r={shape.r} {...commonProps} />;
          case "rect":
            return <rect key={i} x={shape.x} y={shape.y + yOffset} width={shape.w} height={shape.h} rx={shape.rx} {...commonProps} />;
          case "polygon":
            return <polygon key={i} points={shape.points} {...commonProps} transform={`translate(0, ${yOffset})`} />;
          default:
            return null;
        }
      })}
    </svg>
  );
};

// ─── Particle burst ──────────────────────────────────────────────────────
const ParticlesDemo = ({ props, color }) => {
  const c = color || props.primaryColor;
  const particleCount = 40;
  const cx = 420, cy = 200;

  return (
    <svg width="100%" viewBox="0 0 840 400" style={{ overflow: "visible" }}>
      {Array.from({ length: particleCount }, (_, i) => {
        const angle = (i / particleCount) * Math.PI * 2;
        const radius = 60 + (i % 3) * 50;
        const px = cx + Math.cos(angle) * radius;
        const py = cy + Math.sin(angle) * radius;
        const entrance = useEntrance(props.enableAnimations, staggerDelay(i, 5, 3), "bouncy");
        const pulse = usePulse(0.03, 0.5 + (i % 4) * 0.4, i * 20);
        const size = 4 + (i % 4) * 3;
        return (
          <circle
            key={i}
            cx={px}
            cy={py}
            r={size * (0.6 + pulse * 0.4)}
            fill={c}
            opacity={entrance.opacity * (0.3 + pulse * 0.7)}
          />
        );
      })}
      <circle cx={cx} cy={cy} r={30} fill={c} opacity={0.3}>
        <animate attributeName="r" values="30;38;30" dur="3s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.3;0.15;0.3" dur="3s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
};

// ─── Waveform bars ───────────────────────────────────────────────────────
const WavesDemo = ({ props, color }) => {
  const c = color || props.primaryColor;
  const barCount = 24;
  const barWidth = 20;
  const gap = 12;
  const totalWidth = barCount * (barWidth + gap);
  const startX = (840 - totalWidth) / 2;
  const baseY = 200;

  return (
    <svg width="100%" viewBox="0 0 840 400" style={{ overflow: "visible" }}>
      {Array.from({ length: barCount }, (_, i) => {
        const entrance = useEntrance(props.enableAnimations, staggerDelay(i, 0, 4), "bouncy");
        const barHeight = 20 + Math.sin((i / barCount) * Math.PI * 2) * 60;
        const x = startX + i * (barWidth + gap);
        return (
          <rect
            key={i}
            x={x}
            y={baseY - barHeight / 2}
            width={barWidth}
            height={barHeight}
            rx={barWidth / 2}
            fill={c}
            opacity={entrance.opacity * 0.7}
            transform={`scale(1, ${entrance.scale})`}
            style={{ transformOrigin: `${x + barWidth / 2}px ${baseY}px` }}
          >
            <animate
              attributeName="height"
              values={`${barHeight};${barHeight * (0.4 + Math.random() * 0.6)};${barHeight}`}
              dur={`${1.5 + Math.random() * 2}s`}
              repeatCount="indefinite"
            />
          </rect>
        );
      })}
    </svg>
  );
};

// ─── Clock / circular progress ───────────────────────────────────────────
const ClockDemo = ({ props, color }) => {
  const c = color || props.primaryColor;
  const cx = 420, cy = 200, r = 120;
  const circumference = 2 * Math.PI * r;
  const entrance = useEntrance(props.enableAnimations, 0, "gentle");

  return (
    <svg width="100%" viewBox="0 0 840 400" style={{ overflow: "visible" }}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={c} strokeWidth={6} opacity={0.1} />
      <circle
        cx={cx} cy={cy} r={r}
        fill="none" stroke={c} strokeWidth={6}
        strokeLinecap="round"
        strokeDasharray={`${circumference}`}
        opacity={entrance.opacity * 0.8}
        transform={`rotate(-90 ${cx} ${cy})`}
      >
        <animate
          attributeName="stroke-dashoffset"
          from={circumference}
          to={0}
          dur="4s"
          repeatCount="indefinite"
        />
      </circle>
      <text x={cx} y={cy - 10} textAnchor="middle" fill={c} fontSize={48} fontWeight={700} opacity={entrance.opacity}>
        <animate
          attributeName="opacity"
          values="1;0.6;1"
          dur="2s"
          repeatCount="indefinite"
        />
        SVG
      </text>
      <text x={cx} y={cy + 30} textAnchor="middle" fill={c} fontSize={20} opacity={0.5}>
        Animation
      </text>
    </svg>
  );
};

// ─── Main component ──────────────────────────────────────────────────────
const DEMOS = {
  shapes: ShapesDemo,
  particles: ParticlesDemo,
  waves: WavesDemo,
  clock: ClockDemo,
};

export const AnimationDemo = ({ props, type = "shapes", color }) => {
  const Demo = DEMOS[type] || ShapesDemo;
  return (
    <div style={{ width: "100%" }}>
      <Demo props={props} color={color} />
    </div>
  );
};
