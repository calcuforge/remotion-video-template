import { useCurrentFrame, useVideoConfig, interpolate, spring, Easing } from "remotion";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { wipe } from "@remotion/transitions/wipe";
import { none } from "@remotion/transitions/none";
import { evolvePath } from "@remotion/paths";

// Spring presets for different animation feels
export const SPRING_PRESETS = {
  gentle: { damping: 200, mass: 1 },
  snappy: { damping: 100, mass: 0.5 },
  bouncy: { damping: 80, mass: 0.8 },
};

/**
 * useEntrance — spring-based entrance animation with stagger and preset support.
 * Returns { opacity, translateY, scale, rotate } ready to apply as a style.
 */
export const useEntrance = (enabled, delay = 0, preset = "gentle") => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  if (!enabled) return { opacity: 1, translateY: 0, scale: 1, rotate: 0 };

  const config = SPRING_PRESETS[preset] || SPRING_PRESETS.gentle;
  const progress = spring({ frame, fps, delay, config, durationInFrames: 30 });

  return {
    opacity: interpolate(progress, [0, 1], [0, 1]),
    translateY: interpolate(progress, [0, 1], [40, 0]),
    scale: interpolate(progress, [0, 1], [0.95, 1]),
    rotate: 0,
  };
};

/**
 * useExit — fade-out toward the end of a section.
 * Pass the section duration in frames; fadeFrames defaults to 15.
 */
export const useExit = (enabled, sectionDuration, fadeFrames = 15) => {
  const frame = useCurrentFrame();

  if (!enabled) return { opacity: 1, translateY: 0, scale: 1 };

  const exitStart = Math.max(0, sectionDuration - fadeFrames);
  const progress = interpolate(frame, [exitStart, sectionDuration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.ease),
  });

  return {
    opacity: interpolate(progress, [0, 1], [1, 0]),
    translateY: interpolate(progress, [0, 1], [0, -20]),
    scale: interpolate(progress, [0, 1], [1, 0.97]),
  };
};

/**
 * useCounter — animate a number from 0 to target.
 */
export const useCounter = (target, delay = 0, durationFrames = 45) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = spring({ frame, fps, delay, config: { damping: 200 }, durationInFrames: durationFrames });
  return Math.round(interpolate(progress, [0, 1], [0, target]));
};

/**
 * useBarFill — animate a 0-100 percentage fill.
 */
export const useBarFill = (targetPct, delay = 0, durationFrames = 40) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = spring({ frame, fps, delay, config: { damping: 150 }, durationInFrames: durationFrames });
  return interpolate(progress, [0, 1], [0, targetPct]);
};

// --- Continuous animations ---

/**
 * useFloat — drifting vertical/horizontal oscillation for decorative elements.
 */
export const useFloat = (amplitude = 12, periodFrames = 120, phaseOffset = 0) => {
  const frame = useCurrentFrame();
  const angle = ((frame + phaseOffset) / periodFrames) * Math.PI * 2;
  return {
    translateY: Math.sin(angle) * amplitude,
    translateX: Math.cos(angle * 0.7) * (amplitude * 0.4),
  };
};

/**
 * usePulse — continuous subtle breathing for glows and orbs.
 */
export const usePulse = (minScale = 0.95, maxScale = 1.05, periodFrames = 90, phaseOffset = 0) => {
  const frame = useCurrentFrame();
  const t = ((frame + phaseOffset) / periodFrames) % 1;
  const scale = minScale + (maxScale - minScale) * (0.5 + 0.5 * Math.sin(t * Math.PI * 2));
  return { scale };
};

/**
 * useGradientShift — slowly rotating gradient angle for backgrounds.
 */
export const useGradientShift = (speed = 0.5, startAngle = 135) => {
  const frame = useCurrentFrame();
  const angle = startAngle + frame * speed;
  return { angle: angle % 360 };
};

/**
 * useOpacityWave — smooth opacity wave for sequential glow effects.
 */
export const useOpacityWave = (periodFrames = 180, min = 0.3, max = 0.8, phaseOffset = 0) => {
  const frame = useCurrentFrame();
  const t = ((frame + phaseOffset) / periodFrames) % 1;
  return min + (max - min) * (0.5 + 0.5 * Math.sin(t * Math.PI * 2));
};

// --- Text reveal animations ---

/**
 * useTextReveal — word-by-word reveal; returns words, visibleCount, progress.
 */
export const useTextReveal = (text, enabled, delay = 0, framesPerWord = 4) => {
  const frame = useCurrentFrame();
  if (!enabled) return { words: text.split(/\s+/), visibleCount: Infinity, progress: 1 };

  const words = text.split(/\s+/);
  const elapsed = Math.max(0, frame - delay);
  const visibleCount = Math.min(words.length, Math.floor(elapsed / framesPerWord) + 1);
  const progress = visibleCount / words.length;
  return { words, visibleCount, progress };
};

/**
 * useCharReveal — character-by-character reveal for hero titles.
 */
export const useCharReveal = (text, enabled, delay = 0, framesPerChar = 2) => {
  const frame = useCurrentFrame();
  if (!enabled) return { chars: text.split(""), visibleCount: Infinity, progress: 1 };

  const chars = text.split("");
  const elapsed = Math.max(0, frame - delay);
  const visibleCount = Math.min(chars.length, Math.floor(elapsed / framesPerChar) + 1);
  const progress = visibleCount / chars.length;
  return { chars, visibleCount, progress };
};

/**
 * staggerDelay — compute delay for item at given index.
 */
export const staggerDelay = (index, baseDelay = 0, interval = 6) =>
  baseDelay + index * interval;

// --- SVG path draw-on animations ---

/**
 * useDrawOn — progressively reveals an SVG path from 0% to 100%.
 * Returns { progress, strokeDasharray, strokeDashoffset } to apply to a <path>.
 */
export const useDrawOn = (path, enabled, delay = 0, durationFrames = 30, preset = "gentle") => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  if (!enabled || !path) return { progress: 1, strokeDasharray: "none", strokeDashoffset: 0 };

  const config = SPRING_PRESETS[preset] || SPRING_PRESETS.gentle;
  const progress = spring({ frame, fps, delay, config, durationInFrames: durationFrames });
  const evolved = evolvePath(progress, path);

  return {
    progress,
    strokeDasharray: evolved.strokeDasharray,
    strokeDashoffset: evolved.strokeDashoffset,
  };
};

/**
 * useStaggeredDrawOn — animates an array of SVG paths sequentially.
 */
export const useStaggeredDrawOn = (
  paths,
  enabled,
  delay = 0,
  durationPerPath = 20,
  staggerInterval = 8,
  preset = "gentle",
) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  if (!enabled) {
    return paths.map(() => ({ progress: 1, strokeDasharray: "none", strokeDashoffset: 0 }));
  }

  const config = SPRING_PRESETS[preset] || SPRING_PRESETS.gentle;

  return paths.map((path, i) => {
    if (!path) return { progress: 1, strokeDasharray: "none", strokeDashoffset: 0 };
    const pathDelay = delay + i * staggerInterval;
    const progress = spring({ frame, fps, delay: pathDelay, config, durationInFrames: durationPerPath });
    const evolved = evolvePath(progress, path);
    return {
      progress,
      strokeDasharray: evolved.strokeDasharray,
      strokeDashoffset: evolved.strokeDashoffset,
    };
  });
};

/**
 * getPresentation — map a transition type name to a Remotion TransitionSeries presentation.
 */
export const getPresentation = (type) => {
  switch (type) {
    case "fade": return fade();
    case "slide": return slide({ direction: "from-right" });
    case "wipe": return wipe({ direction: "from-right" });
    case "none": return none();
    default: return fade();
  }
};
