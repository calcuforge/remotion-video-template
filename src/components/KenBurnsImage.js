import { AbsoluteFill, Img, interpolate, useCurrentFrame } from "remotion";
import { useEntrance } from "./animations.js";
import { useAssets, getAsset, assetSrc } from "./useAssets.js";

const PAN_MAP = {
  none: { x: [0, 0], y: [0, 0] },
  left: { x: [0, 5], y: [0, 0] },
  right: { x: [0, -5], y: [0, 0] },
  up: { x: [0, 0], y: [0, 5] },
  down: { x: [0, 0], y: [0, -5] },
  "up-left": { x: [0, 5], y: [0, 5] },
  "up-right": { x: [0, -5], y: [0, 5] },
  "down-left": { x: [0, 5], y: [0, -5] },
  "down-right": { x: [0, -5], y: [0, -5] },
};

const DEFAULT_ZOOM_RANGE = { in: [1.0, 1.15], out: [1.15, 1.0], none: [1.0, 1.0] };
// Overscan applied while panning: a translate(%) shifts the image by a fraction
// of its own size, and at scale ≈ 1.0 that shift exposes the frame background
// at the edges. 1.1 (10% slack) comfortably covers the 5% max pan in PAN_MAP.
const OVERSCAN = 1.1;

/**
 * KenBurnsImage — static image with configurable Ken Burns effect (zoom + pan).
 *
 * Usage:
 *   <KenBurnsImage props={props} src="..." role="background" zoom="in" pan="left" />
 *
 * Props:
 *   src, id       — image source (direct path or manifest id)
 *   role          — "background" (full-bleed) or "inline" (default)
 *   caption       — text shown below image (inline role only)
 *   dim           — overlay darkness 0-1 (background only, default 0.35)
 *   delay         — entrance animation delay in frames
 *   zoom          — "in" (default) | "out" | "none"
 *   pan           — "none" (default) | "left" | "right" | "up" | "down"
 *                    | "up-left" | "up-right" | "down-left" | "down-right"
 *   totalFrame    — scene duration in frames (drives the interpolation range)
 */
export const KenBurnsImage = ({
  props,
  id,
  src,
  role = "inline",
  caption,
  dim = 0.35,
  delay = 0,
  zoom = "in",
  pan = "none",
  totalFrame = 600,
}) => {
  const manifest = useAssets();
  const frame = useCurrentFrame();
  const a = useEntrance(props.enableAnimations, delay, "gentle");

  const entry = id ? getAsset(manifest, id) : null;
  const resolvedSrc = src ?? (entry ? assetSrc(entry) : null);
  if (!resolvedSrc) return null;

  const zoomDir = Object.hasOwn(DEFAULT_ZOOM_RANGE, zoom) ? zoom : "in";
  const panDir = Object.hasOwn(PAN_MAP, pan) ? pan : "none";
  const duration = Math.max(1, totalFrame);
  const [zoomStart, zoomEnd] = DEFAULT_ZOOM_RANGE[zoomDir];
  const panCfg = PAN_MAP[panDir];
  const xStart = panCfg.x[0], xEnd = panCfg.x[1];
  const yStart = panCfg.y[0], yEnd = panCfg.y[1];

  const enabled = props.enableAnimations;
  const scaleVal = enabled
    ? interpolate(frame, [0, duration], [zoomStart, zoomEnd], { extrapolateRight: "clamp" })
    : 1;
  const tx = enabled
    ? interpolate(frame, [0, duration], [xStart, xEnd], { extrapolateRight: "clamp" })
    : 0;
  const ty = enabled
    ? interpolate(frame, [0, duration], [yStart, yEnd], { extrapolateRight: "clamp" })
    : 0;

  const overscan = panDir !== "none" ? OVERSCAN : 1;

  if (role === "background") {
    return (
      <AbsoluteFill>
        <Img
          src={resolvedSrc}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            transform: `scale(${scaleVal * overscan}) translate(${tx}%, ${ty}%)`,
          }}
        />
        <AbsoluteFill
          style={{
            background: `linear-gradient(180deg, rgba(0,0,0,${dim * 0.7}) 0%, rgba(0,0,0,${dim}) 100%)`,
          }}
        />
      </AbsoluteFill>
    );
  }

  return (
    <div
      style={{
        width: "100%",
        borderRadius: 24,
        overflow: "hidden",
        border: `1px solid ${props.primaryColor}20`,
        boxShadow: `0 4px 16px ${props.primaryColor}10, 0 8px 24px rgba(0,0,0,0.06)`,
        opacity: a.opacity,
        transform: `translateY(${a.translateY}px) scale(${a.scale})`,
      }}
    >
      <Img
        src={resolvedSrc}
        style={{
          width: "100%",
          display: "block",
          transform: `scale(${scaleVal * overscan}) translate(${tx}%, ${ty}%)`,
        }}
      />
      {caption && (
        <div style={{
          fontSize: 24, color: props.textColor, opacity: 0.6,
          padding: "12px 24px", textAlign: "center",
          background: "rgba(0,0,0,0.02)",
        }}>
          {caption}
        </div>
      )}
    </div>
  );
};
