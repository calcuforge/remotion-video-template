import { AbsoluteFill, OffthreadVideo } from "remotion";
import { useAssets, getAsset, assetSrc } from "./useAssets.js";

/**
 * OverlayLayer — transparent animation overlay (e.g. WebM VP9 with alpha).
 *
 * Place inside a section's Sequence so the overlay starts with the slide:
 *   <OverlayLayer src="animations/growth_chart.webm" />
 *
 * For the manifest flow:
 *   <OverlayLayer id="growth_chart" />
 *
 * Format contract: WebM VP9 with alpha (yuva420p), 24 fps, 3840×2160,
 * duration matching the section window. WebM previews natively in Studio;
 * `transparent` extracts alpha frames during render. Renders nothing when
 * the asset is unresolved.
 */
export const OverlayLayer = ({
  id,
  src,
  style,
}) => {
  const manifest = useAssets();
  const entry = id ? getAsset(manifest, id) : null;
  const resolvedSrc = src ?? (entry ? assetSrc(entry) : null);
  if (!resolvedSrc) return null;

  return (
    <AbsoluteFill style={{ pointerEvents: "none", ...style }}>
      <OffthreadVideo
        src={resolvedSrc}
        transparent
        muted
        style={{ width: "100%", height: "100%" }}
      />
    </AbsoluteFill>
  );
};
