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
 * Section layouts (pre-built combinations):
 *   SplitLayout, StatHighlight, ZigzagCards, CenteredShowcase,
 *   MetricsRow, StepProgress
 *
 * Content components:
 *   ComparisonCard, Timeline, CodeBlock, QuoteBlock, FeatureGrid,
 *   DataBar, StatCounter, FlowChart, IconCard, ChapterProgressBar,
 *   MediaSection, MediaGrid, DiagramReveal, AudioWaveform,
 *   LottieAnimation, DataTable, ErrorBoundary, Icon
 *
 * Short-form cards:
 *   ShortIntroCard, ShortCTACard
 *
 * Subtitles (renders SRT directly, no FFmpeg):
 *   Subtitles
 *
 * Timing / Assets (hooks + helpers):
 *   useTiming, fetchTimingData,
 *   useAssets, getAsset, getSectionAssets, assetSrc,
 *   AssetImage, AssetVideo, OverlayLayer
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

// Section layout presets
export {
  SplitLayout, StatHighlight, ZigzagCards,
  CenteredShowcase, MetricsRow, StepProgress,
} from "./SectionLayouts.js";

// Content components
export { ComparisonCard } from "./ComparisonCard.js";
export { Timeline } from "./Timeline.js";
export { CodeBlock } from "./CodeBlock.js";
export { QuoteBlock } from "./QuoteBlock.js";
export { FeatureGrid } from "./FeatureGrid.js";
export { DataBar } from "./DataBar.js";
export { StatCounter } from "./StatCounter.js";
export { FlowChart } from "./FlowChart.js";
export { IconCard } from "./IconCard.js";
export { ChapterProgressBar } from "./ChapterProgressBar.js";
export { MediaSection, MediaGrid } from "./MediaSection.js";
export { DiagramReveal } from "./DiagramReveal.js";
export { AudioWaveform } from "./AudioWaveform.js";
export { LottieAnimation } from "./LottieAnimation.js";
export { DataTable } from "./DataTable.js";
export { ErrorBoundary } from "./ErrorBoundary.js";
export { Icon } from "./Icon.js";
export { getLucideIcon, isEmoji } from "./iconMap.js";
export { ShortIntroCard } from "./ShortIntroCard.js";
export { ShortCTACard } from "./ShortCTACard.js";

// Subtitles (renders SRT directly inside Remotion — no FFmpeg needed)
export { Subtitles } from "./Subtitles.js";

// Timing (runtime loading via staticFile, supports --public-dir)
export { useTiming, fetchTimingData } from "./useTiming.js";

// Asset manifest (assets/manifest.json via --public-dir)
export { useAssets, getAsset, getSectionAssets, assetSrc } from "./useAssets.js";
export { AssetImage } from "./AssetImage.js";
export { AssetVideo } from "./AssetVideo.js";
export { OverlayLayer } from "./OverlayLayer.js";
