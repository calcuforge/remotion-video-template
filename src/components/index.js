/**
 * Component library barrel — import from "../components".
 *
 * Layouts:
 *   Scale4K, FullBleedLayout, PaddedLayout
 *
 * Animations (hooks):
 *   useEntrance, useExit, useCounter, useBarFill,
 *   useFloat, usePulse, useGradientShift, useOpacityWave,
 *   useTextReveal, useCharReveal, staggerDelay,
 *   useDrawOn, useStaggeredDrawOn, getPresentation
 *
 * Animated backgrounds:
 *   MovingGradient, FloatingShapes, GridPattern, GlowOrb, AccentLine
 *
 * Content components:
 *   QuoteBlock, FeatureGrid, IconCard, ComparisonCard,
 *   StatCounter, DataBar, Timeline, FlowChart,
 *   CodeBlock, DataTable, DiagramReveal, AnimationDemo,
 *   AssetImage, AssetVideo
 *
 * Subtitles (renders SRT directly, no FFmpeg):
 *   Subtitles
 *
 * Timing / Assets (hooks + helpers):
 *   useTiming, fetchTimingData,
 *   useAssets, getAsset, getSectionAssets, assetSrc
 *
 * Transitions (re-exported from @remotion/transitions):
 *   TransitionSeries, linearTiming
 */

// Layouts
export { Scale4K, FullBleedLayout, PaddedLayout } from "./layouts.js";

// Animations
export {
  SPRING_PRESETS,
  useEntrance, useExit, useCounter, useBarFill, getPresentation,
  useFloat, usePulse, useGradientShift, useOpacityWave,
  useTextReveal, useCharReveal, staggerDelay,
  useDrawOn, useStaggeredDrawOn,
} from "./animations.js";

// Animated backgrounds
export {
  MovingGradient, FloatingShapes, GridPattern, GlowOrb, AccentLine,
} from "./AnimatedBackground.js";

// Content components
export { QuoteBlock } from "./QuoteBlock.js";
export { FeatureGrid } from "./FeatureGrid.js";
export { IconCard } from "./IconCard.js";
export { ComparisonCard } from "./ComparisonCard.js";
export { StatCounter } from "./StatCounter.js";
export { DataBar } from "./DataBar.js";
export { Timeline } from "./Timeline.js";
export { FlowChart } from "./FlowChart.js";
export { CodeBlock } from "./CodeBlock.js";
export { DataTable } from "./DataTable.js";
export { DiagramReveal } from "./DiagramReveal.js";
export { AnimationDemo } from "./AnimationDemo.js";
export { ChapterProgressBar } from "./ChapterProgressBar.js";
export { ErrorBoundary } from "./ErrorBoundary.js";
export { Icon } from "./Icon.js";
export { getLucideIcon, isEmoji } from "./iconMap.js";

// Subtitles (renders SRT inside Remotion — no FFmpeg needed)
export { Subtitles } from "./Subtitles.js";

// Timing (runtime loading via staticFile, supports --public-dir)
export { useTiming, fetchTimingData } from "./useTiming.js";

// Transitions (re-exported so per-video compositions outside this package can
// import them via this barrel's absolute path — bare "@remotion/transitions"
// imports only resolve within this package's node_modules tree)
export { TransitionSeries, linearTiming } from "@remotion/transitions";

// Asset manifest (assets/manifest.json via --public-dir)
export { useAssets, getAsset, getSectionAssets, assetSrc } from "./useAssets.js";
export { AssetImage } from "./AssetImage.js";
export { AssetVideo } from "./AssetVideo.js";
