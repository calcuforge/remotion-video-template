/**
 * Subtitles — renders SRT subtitles directly inside Remotion.
 *
 * Two display modes:
 *   - "outline": text with CSS text-shadow outline
 *   - "background" (default): dark text on a semi-transparent light background bar
 *
 * Usage (outside Scale4K, alongside ChapterProgressBar):
 *   <Subtitles src={staticFile("podcast_audio.srt")} />
 *   <Subtitles src={staticFile("podcast_audio.srt")} mode="outline" />
 *
 * Sizes below are in the 4K (3840×2160) pixel space because this component
 * sits OUTSIDE the Scale4K wrapper.
 */

import React from "react";
import { useCurrentFrame, useVideoConfig, delayRender, continueRender } from "remotion";

const parseSrtTime = (t) => {
  const [hms, ms] = t.trim().split(",");
  const [h, m, s] = hms.split(":").map(Number);
  return h * 3600000 + m * 60000 + s * 1000 + Number(ms);
};

const parseSrt = (raw) => {
  const entries = [];
  const blocks = raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim().split(/\n\n+/);
  for (const block of blocks) {
    const lines = block.trim().split("\n");
    if (lines.length < 3) continue;
    const index = parseInt(lines[0], 10);
    const timeParts = lines[1].split("-->");
    if (timeParts.length !== 2) continue;
    const startMs = parseSrtTime(timeParts[0]);
    const endMs = parseSrtTime(timeParts[1]);
    const text = lines.slice(2).join(" ").trim();
    if (text) entries.push({ index, startMs, endMs, text });
  }
  return entries;
};

const srtCache = {};

const useSrt = (src) => {
  const [entries, setEntries] = React.useState(() => srtCache[src] ?? []);
  const [handle] = React.useState(() => delayRender(`Subtitles: loading ${src}`));

  React.useEffect(() => {
    let cancelled = false;
    if (srtCache[src]) {
      setEntries(srtCache[src]);
      continueRender(handle);
      return () => { cancelled = true; };
    }
    fetch(src)
      .then((r) => r.text())
      .then((raw) => {
        if (cancelled) return;
        const parsed = parseSrt(raw);
        srtCache[src] = parsed;
        setEntries(parsed);
        continueRender(handle);
      })
      .catch((err) => {
        if (!cancelled) {
          console.warn(`Subtitles: failed to load ${src}`, err);
          continueRender(handle);
        }
      });
    return () => { cancelled = true; };
  }, [src, handle]);

  return entries;
};

export const Subtitles = ({
  src,
  mode = "background",
  fontSize = 80,
  color = "#1a1a1a",
  outlineColor = "#ffffff",
  outlineWidth = 6,
  bgColor = "rgba(240, 240, 240, 0.85)",
  bgPadding = "16px 40px",
  bgBorderRadius = 16,
  bottomOffset = 56,
  maxWidth = 3400,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const currentMs = (frame / fps) * 1000;

  const entries = useSrt(src);
  const current = entries.find((e) => currentMs >= e.startMs && currentMs <= e.endMs);

  if (!current) return null;

  const isOutline = mode === "outline";

  const textStyle = {
    maxWidth,
    textAlign: "center",
    fontFamily: '"PingFang SC", "Noto Sans SC", sans-serif',
    fontSize,
    fontWeight: 600,
    color,
    lineHeight: 1.4,
    ...(isOutline
      ? {
          textShadow: [
            `${outlineWidth}px 0 0 ${outlineColor}`,
            `-${outlineWidth}px 0 0 ${outlineColor}`,
            `0 ${outlineWidth}px 0 ${outlineColor}`,
            `0 -${outlineWidth}px 0 ${outlineColor}`,
            `${outlineWidth}px ${outlineWidth}px 0 ${outlineColor}`,
            `-${outlineWidth}px ${outlineWidth}px 0 ${outlineColor}`,
            `${outlineWidth}px -${outlineWidth}px 0 ${outlineColor}`,
            `-${outlineWidth}px -${outlineWidth}px 0 ${outlineColor}`,
          ].join(", "),
        }
      : {
          backgroundColor: bgColor,
          padding: bgPadding,
          borderRadius: bgBorderRadius,
        }),
  };

  return (
    <div
      style={{
        position: "absolute",
        bottom: bottomOffset,
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-end",
        pointerEvents: "none",
        zIndex: 100,
      }}
    >
      <div style={textStyle}>
        {current.text}
      </div>
    </div>
  );
};
