import { AbsoluteFill } from "remotion";

/**
 * ScaleToTarget — resolution-agnostic scaling wrapper.
 * Design at a fixed logical size (1920×1080 or 1080×1920), then scale up.
 *
 *   scaleFactor=1 → 1080p (design IS the output)
 *   scaleFactor=2 → 4K   (design × 2)
 *
 * Wrap the entire composition body so all inner sizes use the same
 * logical numbers regardless of output resolution.
 */
export const Scale4K = ({ children, orientation = "horizontal", scaleFactor = 1 }) => {
  const isVertical = orientation === "vertical";
  const w = isVertical ? 1080 : 1920;
  const h = isVertical ? 1920 : 1080;
  return (
    <AbsoluteFill style={{ transform: `scale(${scaleFactor})`, transformOrigin: "top left" }}>
      <div style={{ width: w, height: h, position: "relative", overflow: "hidden" }}>
        {children}
      </div>
    </AbsoluteFill>
  );
};

/**
 * FullBleedLayout — no padding, for hero titles and full-frame visuals.
 */
export const FullBleedLayout = ({ children, bg, style }) => (
  <AbsoluteFill style={{ backgroundColor: bg || "#FFFFFF", padding: 0, ...style }}>
    {children}
  </AbsoluteFill>
);

/**
 * PaddedLayout — body content with breathing room.
 * Vertical uses tighter horizontal padding for the taller aspect ratio.
 */
export const PaddedLayout = ({ children, bg, style, orientation = "horizontal" }) => {
  const padding = orientation === "vertical" ? "20px 24px" : "20px 30px";
  return (
    <AbsoluteFill style={{ backgroundColor: bg || "#FFFFFF", padding, ...style }}>
      {children}
    </AbsoluteFill>
  );
};
