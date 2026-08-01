import { AbsoluteFill, Img, interpolate, useCurrentFrame } from "remotion";
import { useEntrance } from "./animations.js";
import { useAssets, getAsset, assetSrc } from "./useAssets.js";

/**
 * AssetImage — manifest-aware image renderer with designed default layouts per role.
 *
 * Usage:
 *   <AssetImage props={props} id="hero_bg" role="background" />
 *   <AssetImage props={props} id="app_shot" role="inline" caption="…" />
 *
 * `id` resolves through assets/manifest.json (via --public-dir); pass `src`
 * instead to bypass the manifest. Renders nothing when the asset is absent
 * or unresolved, so compositions stay safe on text-only videos.
 */
export const AssetImage = ({
  props,
  id,
  src,
  role = "inline",
  caption,
  kenBurns = true,
  dim = 0.35,
  delay = 0,
}) => {
  const manifest = useAssets();
  const frame = useCurrentFrame();
  const a = useEntrance(props.enableAnimations, delay, "gentle");

  const entry = id ? getAsset(manifest, id) : null;
  const resolvedSrc = src ?? (entry ? assetSrc(entry) : null);
  if (!resolvedSrc) return null;

  if (role === "background") {
    const scale =
      kenBurns && props.enableAnimations
        ? interpolate(frame, [0, 600], [1.04, 1.14], { extrapolateRight: "clamp" })
        : 1;
    return (
      <AbsoluteFill>
        <Img
          src={resolvedSrc}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            transform: `scale(${scale})`,
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
        style={{ width: "100%", display: "block" }}
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
