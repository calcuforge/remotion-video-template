import { AbsoluteFill } from "remotion";

/**
 * Scale4K — 4K scaling wrapper.
 * Design at half resolution (1920×1080 or 1080×1920), auto-scale to 4K.
 * Wrap the entire composition body so all inner sizes can use 1080p-space numbers.
 */
export const Scale4K = ({ children, orientation = "horizontal" }) => {
  const isVertical = orientation === "vertical";
  const w = isVertical ? 1080 : 1920;
  const h = isVertical ? 1920 : 1080;
  return (
    <AbsoluteFill style={{ transform: "scale(2)", transformOrigin: "top left" }}>
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
