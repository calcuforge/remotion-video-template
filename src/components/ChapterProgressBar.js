import { useCurrentFrame } from "remotion";
import { useTiming } from "./useTiming.js";

/**
 * ChapterProgressBar — bottom progress bar showing chapter timeline.
 * Renders OUTSIDE Scale4K so it draws at native 4K resolution.
 *
 * Driven by timing.json's sections (each section is one chapter segment).
 * Set `showProgressBar: false` in props to hide.
 */
export const ChapterProgressBar = ({ props, chapters, totalFrames: totalFramesOverride }) => {
  const frame = useCurrentFrame();
  const timing = useTiming(true);
  const totalFrames = totalFramesOverride ?? timing.total_frames;
  const progress = totalFrames > 0 ? frame / totalFrames : 0;

  if (!props.showProgressBar) return null;

  const barHeight = props.progressBarHeight ?? 65;
  // Pill must fit inside the bar: bar = borderTop 2 + gutters + master strip 5.
  // 65 → 46px pill, 130 → 111px pill, always leaves air above the strip.
  const cardHeight = Math.max(24, barHeight - 19);

  return (
    <div
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        height: barHeight,
        background: "#fff",
        borderTop: "2px solid #e5e7eb",
        display: "flex",
        alignItems: "center",
        padding: "0 60px",
        gap: 20,
        fontFamily: "PingFang SC, Microsoft YaHei, sans-serif",
      }}
    >
      {(chapters || []).map((ch) => {
        const chStart = totalFrames > 0 ? ch.start_frame / totalFrames : 0;
        const chEnd = totalFrames > 0
          ? (ch.start_frame + ch.duration_frames) / totalFrames
          : 0;
        const isActive = progress >= chStart && progress < chEnd;
        const isPast = progress >= chEnd;
        const chProgress = isActive
          ? (progress - chStart) / (chEnd - chStart)
          : isPast ? 1 : 0;

        return (
          <div
            key={ch.name}
            style={{
              flex: ch.duration_frames,
              height: cardHeight,
              borderRadius: cardHeight / 2,
              boxSizing: "border-box",
              position: "relative",
              overflow: "hidden",
              background: isActive
                ? props.progressActiveColor
                : isPast ? "#f3f4f6" : "#f9fafb",
              border: isActive ? "none" : "2px solid #e5e7eb",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {isActive && (
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: `${chProgress * 100}%`,
                  background: "rgba(255,255,255,0.25)",
                  borderRadius: cardHeight / 2,
                }}
              />
            )}
            <span
              style={{
                position: "relative",
                zIndex: 1,
                color: isActive ? "#fff" : isPast ? "#374151" : "#9ca3af",
                fontSize: props.progressFontSize,
                fontWeight: isActive ? 700 : 500,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                padding: "0 20px",
              }}
            >
              {ch.label || ch.name}
            </span>
          </div>
        );
      })}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 5,
          background: "#e5e7eb",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${progress * 100}%`,
            background: props.progressActiveColor,
          }}
        />
      </div>
    </div>
  );
};
