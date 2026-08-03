import { AbsoluteFill, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { useAudioData, visualizeAudio } from "@remotion/media-utils";
import { useEntrance } from "./animations.js";

const resolveSrc = (src) => {
  if (!src) return null;
  if (src.startsWith("http") || src.startsWith("/") || src.match(/^[A-Za-z]:/)) {
    return src;
  }
  return staticFile(src);
};

/**
 * AudioWaveform — real-time audio frequency visualization synced to a track
 * (narration or BGM), making the voice feel alive. bars / wave / dots modes;
 * anchored at the bottom/top edge or centered inline.
 *
 * audioSrc is required (relative to public dir, or absolute/http).
 * barCount must be a power of 2 (default 32).
 */
export const AudioWaveform = ({
  props,
  audioSrc,
  mode = "bars",
  position = "bottom",
  barCount = 32,
  height = 60,
  opacity = 0.4,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const v = props.orientation === "vertical";
  const src = resolveSrc(audioSrc);
  const audioData = src ? useAudioData(src) : null;
  const values = audioData
    ? visualizeAudio({ audioData, frame, fps, numberOfSamples: barCount, smoothing: true })
    : null;
  const a = useEntrance(props.enableAnimations, delay, "gentle");
  const color = props.primaryColor;
  const unit = 100 / barCount;

  // Static placeholder while the audio decodes so the scene never looks empty.
  const getVal = (i) => (values ? values[i] : 0.15 + 0.1 * Math.abs(Math.sin(i * 0.9)));

  const bars = (gap) =>
    Array.from({ length: barCount }, (_, i) => i).map((i) => {
      const val = getVal(i);
      if (mode === "wave") {
        return (
          <div key={i} style={{
            width: `${unit * 0.6}%`, height: Math.max(2, val * height),
            borderRadius: 99, background: color,
          }} />
        );
      }
      if (mode === "dots") {
        return (
          <div key={i} style={{
            width: `${unit * 0.6}%`, aspectRatio: "1",
            borderRadius: "50%", background: color,
          }} />
        );
      }
      return (
        <div key={i} style={{
          width: `${unit * 0.6}%`, height: Math.max(3, val * height),
          borderRadius: 99,
          background: `linear-gradient(to top, ${color}55, ${color})`,
        }} />
      );
    });

  const stripStyle = {
    left: 0, right: 0,
    [position === "top" ? "top" : "bottom"]: 0,
    height,
    display: "flex", alignItems: "center",
    justifyContent: "center",
    gap: v ? 3 : 4,
    opacity: opacity * a.opacity,
  };

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {position === "inline" ? (
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{
            width: v ? "88%" : "70%",
            position: "relative", height,
            display: "flex", alignItems: "center",
            justifyContent: "center", gap: v ? 3 : 4,
            opacity: opacity * a.opacity,
          }}>
            {bars(v ? 3 : 4)}
          </div>
        </div>
      ) : (
        <div style={stripStyle}>{bars(v ? 3 : 4)}</div>
      )}
    </AbsoluteFill>
  );
};
