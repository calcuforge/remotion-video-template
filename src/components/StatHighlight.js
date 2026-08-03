import { AbsoluteFill } from "remotion";
import { useEntrance } from "./animations.js";
import { GlowOrb, GridPattern } from "./AnimatedBackground.js";
import { Icon } from "./Icon.js";

/**
 * StatHighlight — full-bleed hero number for a key metric, milestone or
 * impact figure. A 160px animated number on a glow + dot-grid backdrop makes
 * one number the whole scene's point.
 *
 * props: { value, unit?, label, description?, icon?, delay? }
 */
export const StatHighlight = ({
  props,
  value,
  unit = "",
  label,
  description,
  icon,
  delay = 0,
}) => {
  const v = props.orientation === "vertical";
  const a = useEntrance(props.enableAnimations, delay, "bouncy");

  return (
    <AbsoluteFill style={{ backgroundColor: props.backgroundColor }}>
      <GlowOrb color={props.primaryColor} size={600} opacity={0.1} blur={100} />
      <GridPattern color={props.primaryColor} opacity={0.03} variant="dots" />
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        textAlign: "center",
        opacity: a.opacity, transform: `translateY(${a.translateY}px) scale(${a.scale})`,
      }}>
        {icon && (
          <div style={{ marginBottom: 16 }}>
            <Icon name={icon} size={v ? 64 : 72} color={props.primaryColor} delay={delay + 5} />
          </div>
        )}
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <span style={{
            fontSize: v ? 120 : 160, fontWeight: 900, color: props.primaryColor,
            lineHeight: 1, letterSpacing: -4,
          }}>
            {value}
          </span>
          {unit && (
            <span style={{ fontSize: v ? 40 : 48, fontWeight: 600, color: props.primaryColor, opacity: 0.7 }}>
              {unit}
            </span>
          )}
        </div>
        <p style={{
          fontSize: v ? 36 : 40, fontWeight: 700, color: props.textColor, marginTop: 16,
        }}>
          {label}
        </p>
        {description && (
          <p style={{
            fontSize: v ? 26 : 28, color: props.textColor, opacity: 0.5,
            marginTop: 12, maxWidth: 700,
          }}>
            {description}
          </p>
        )}
      </div>
    </AbsoluteFill>
  );
};
