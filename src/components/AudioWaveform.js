import { useCurrentFrame, useVideoConfig, staticFile } from "remotion";
import { useAudioData, visualizeAudio } from "@remotion/media-utils";

/**
 * AudioWaveform — real-time audio frequency visualization synced to an audio file.
 *
 * Modes:
 *   - "bars"  : vertical bar spectrum
 *   - "wave"  : filled SVG wave shape
 *   - "dots"  : pulsing dot row
 *
 * Positions: "bottom" | "top" | "inline" (inline uses width:100%, no absolute).
 *
 * `barCount` must be a power of 2 (32, 64, 128, 256) per @remotion/media-utils.
 */
export const AudioWaveform = ({
  props,
  audioSrc = "podcast_audio.wav",
  mode = "bars",
  position = "bottom",
  barCount = 32,
  height = 60,
  color,
  opacity = 0.4,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const audioData = useAudioData(staticFile(audioSrc));

  if (!audioData) return null;

  const visualization = visualizeAudio({
    audioData,
    frame,
    fps,
    numberOfSamples: barCount,
    smoothing: true,
  });

  const fillColor = color ?? props.primaryColor;

  const positionStyle =
    position === "bottom"
      ? { position: "absolute", bottom: 0, left: 0, right: 0 }
      : position === "top"
        ? { position: "absolute", top: 0, left: 0, right: 0 }
        : { width: "100%" };

  return (
    <div style={{ ...positionStyle, height, display: "flex", alignItems: "flex-end",
      justifyContent: "center", gap: mode === "dots" ? 4 : 2, padding: "0 20px", opacity }}>
      {mode === "bars" && visualization.map((v, i) => {
        const barHeight = Math.max(2, v * height * 0.9);
        return (
          <div key={i} style={{
            flex: 1, height: barHeight, backgroundColor: fillColor, borderRadius: 2,
          }} />
        );
      })}

      {mode === "wave" && (
        <svg width="100%" height={height} viewBox={`0 0 ${visualization.length} ${height}`} preserveAspectRatio="none">
          <path
            d={`M 0 ${height} ` +
              visualization.map((v, i) => `L ${i} ${height - v * height * 0.85}`).join(" ") +
              ` L ${visualization.length - 1} ${height} Z`}
            fill={fillColor}
            opacity={0.6}
          />
          <path
            d={`M 0 ${height - visualization[0] * height * 0.85} ` +
              visualization.map((v, i) => `L ${i} ${height - v * height * 0.85}`).join(" ")}
            fill="none"
            stroke={fillColor}
            strokeWidth={1.5}
          />
        </svg>
      )}

      {mode === "dots" && visualization.map((v, i) => {
        const dotSize = Math.max(3, v * 16);
        return (
          <div key={i} style={{
            width: dotSize, height: dotSize, borderRadius: "50%",
            backgroundColor: fillColor,
            opacity: 0.3 + v * 0.7,
            alignSelf: "center",
          }} />
        );
      })}
    </div>
  );
};
