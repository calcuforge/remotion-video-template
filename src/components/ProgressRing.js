import { AbsoluteFill } from "remotion";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { useEntrance } from "./animations.js";
import { GlowOrb } from "./AnimatedBackground.js";

/**
 * ProgressRing — animated donut progress (completion rate, share, adoption).
 * `value` is 0-100; the arc sweeps in over ~60 frames; center shows the number.
 *
 * props: { value, label, unit?, suffix?, size?, delay? }
 */
export const ProgressRing = ({
  props,
  value = 0,
  label,
  unit = "",
  suffix = "",
  size,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const v = props.orientation === "vertical";
  const a = useEntrance(props.enableAnimations, delay, "gentle");

  const ringSize = size ?? (v ? 200 : 260);
  const stroke = Math.max(10, ringSize * 0.09);
  const r = (ringSize - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const pct = Math.min(100, Math.max(0, Number(value) || 0));

  const progress = spring({
    frame, fps,
    delay: delay + 5,
    config: { damping: 120 },
    durationInFrames: 60,
  });
  const shown = interpolate(progress, [0, 1], [0, pct]);

  return (
    <AbsoluteFill style={{ backgroundColor: props.backgroundColor }}>
      <GlowOrb color={props.primaryColor} size={500} opacity={0.08} blur={100} />
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        opacity: a.opacity, transform: `translateY(${a.translateY}px) scale(${a.scale})`,
      }}>
        <svg width={ringSize} height={ringSize} viewBox={`0 0 ${ringSize} ${ringSize}`}>
          <circle
            cx={ringSize / 2} cy={ringSize / 2} r={r}
            fill="none" stroke={`${props.primaryColor}12`} strokeWidth={stroke}
          />
          <circle
            cx={ringSize / 2} cy={ringSize / 2} r={r}
            fill="none" stroke={props.primaryColor} strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - shown / 100)}
            transform={`rotate(-90 ${ringSize / 2} ${ringSize / 2})`}
            style={{ filter: `drop-shadow(0 0 12px ${props.primaryColor}55)` }}
          />
        </svg>
        <div style={{
          position: "absolute",
          display: "flex", alignItems: "baseline", gap: 4,
        }}>
          <span style={{
            fontSize: v ? 52 : 64, fontWeight: 900, color: props.primaryColor,
            lineHeight: 1, letterSpacing: -2,
          }}>
            {Math.round(shown)}
          </span>
          {suffix && (
            <span style={{ fontSize: v ? 28 : 32, fontWeight: 600, color: props.primaryColor, opacity: 0.7 }}>
              {suffix}
            </span>
          )}
          {unit && (
            <span style={{ fontSize: v ? 22 : 24, fontWeight: 500, color: props.textColor, opacity: 0.6 }}>
              {unit}
            </span>
          )}
        </div>
        <p style={{
          fontSize: v ? 26 : 28, fontWeight: 600, color: props.textColor,
          marginTop: ringSize * 0.52, opacity: 0.85,
        }}>
          {label}
        </p>
      </div>
    </AbsoluteFill>
  );
};
