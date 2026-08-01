import { useCurrentFrame, interpolate } from "remotion";
import { getLucideIcon, isEmoji } from "./iconMap.js";

/**
 * Icon — animated icon renderer supporting Lucide SVG icons and emoji.
 *
 * `name` can be any kebab-case or PascalCase Lucide icon name (e.g. "rocket",
 * "arrow-right", "Lightbulb") or a short emoji string (≤4 chars).
 *
 * Animations: "none" | "entrance" | "pulse" | "bounce".
 */
export const Icon = ({
  name,
  size = 56,
  color = "currentColor",
  animate = "entrance",
  delay = 0,
  strokeWidth = 2,
}) => {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - delay);

  let opacity = 1;
  let scale = 1;
  let translateY = 0;

  if (animate === "entrance") {
    opacity = interpolate(f, [0, 12], [0, 1], { extrapolateRight: "clamp" });
    scale = interpolate(f, [0, 15], [0.5, 1], { extrapolateRight: "clamp" });
    translateY = interpolate(f, [0, 15], [20, 0], { extrapolateRight: "clamp" });
  } else if (animate === "pulse") {
    scale = interpolate(f % 60, [0, 30, 60], [1, 1.08, 1]);
  } else if (animate === "bounce") {
    opacity = interpolate(f, [0, 8], [0, 1], { extrapolateRight: "clamp" });
    const bounce = interpolate(f, [0, 10, 20, 25], [40, -10, 5, 0], { extrapolateRight: "clamp" });
    translateY = bounce;
    scale = interpolate(f, [0, 10, 20], [0.3, 1.1, 1], { extrapolateRight: "clamp" });
  }

  const style = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: size,
    height: size,
    opacity,
    transform: `translateY(${translateY}px) scale(${scale})`,
  };

  if (isEmoji(name)) {
    return (
      <span style={{ ...style, fontSize: size * 0.85, lineHeight: 1 }}>
        {name}
      </span>
    );
  }

  const LucideIcon = getLucideIcon(name);
  if (LucideIcon) {
    return (
      <span style={style}>
        <LucideIcon size={size} color={color} strokeWidth={strokeWidth} />
      </span>
    );
  }

  // Fallback: show name as text (useful when debugging)
  return (
    <span style={{ ...style, fontSize: size * 0.4, color: "#999" }}>
      [{name}]
    </span>
  );
};
