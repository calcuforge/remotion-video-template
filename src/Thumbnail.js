/**
 * Thumbnail.js — white centered thumbnail for multiple aspect ratios.
 *
 * Aspect ratios:
 *   - "16:9"  : 1920×1080 (Bilibili / YouTube)
 *   - "4:3"   : 1200×900  (Bilibili feed)
 *   - "3:4"   : 1080×1440 (Xiaohongshu)
 *   - "9:16"  : 1080×1920 (Shorts / Reels / Douyin cover)
 *
 * Customize title, subtitle, tags, icons via props in Root.js or Studio.
 */

import { AbsoluteFill } from "remotion";

const font = "'PingFang SC', 'Noto Sans SC', sans-serif";

export const Thumbnail = ({
  aspectRatio = "16:9",
  title = "Video Title",
  subtitle = "Subtitle goes here",
  tags = ["Tag A", "Tag B"],
  icons = ["🚀", "⚡", "🔥"],
}) => {
  const vertical = aspectRatio === "9:16";
  const compact = aspectRatio === "4:3";
  const tall = aspectRatio === "3:4";
  const titleSize = vertical ? 120 : tall ? 130 : compact ? 150 : 160;
  const subtitleSize = vertical ? 48 : tall ? 50 : compact ? 56 : 60;

  return (
    <AbsoluteFill style={{ background: "#ffffff", fontFamily: font }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          padding: 0,
          gap: 24,
        }}
      >
        <div style={{ display: "flex", flexWrap: "wrap", gap: 20, alignItems: "center", justifyContent: "center" }}>
          {tags.map((tag, i) => (
            <div
              key={i}
              style={{
                background: "rgba(249,115,22,0.1)",
                border: "3px solid rgba(249,115,22,0.3)",
                borderRadius: 24,
                padding: "14px 36px",
                fontSize: 44,
                fontWeight: 700,
                color: "#f97316",
              }}
            >
              {tag}
            </div>
          ))}
          {icons.map((icon, i) => (
            <span key={i} style={{ fontSize: 80 }}>{icon}</span>
          ))}
        </div>

        <div
          style={{
            fontSize: titleSize,
            fontWeight: 900,
            letterSpacing: 6,
            color: "#1a1a2e",
            lineHeight: 1.2,
            textAlign: "center",
          }}
        >
          {title}
        </div>

        <div
          style={{
            fontSize: subtitleSize,
            fontWeight: 700,
            color: "#666",
            letterSpacing: 2,
            textAlign: "center",
          }}
        >
          {subtitle}
        </div>
      </div>
    </AbsoluteFill>
  );
};

export default Thumbnail;
