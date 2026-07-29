/**
 * YamlVideo.js — YAML-config-driven composition.
 *
 * Accepts a `config` prop (the parsed remotion_sections.yaml as a JS object)
 * and renders a full video by sequencing the section_list entries across all
 * stories. Each section specifies its own remotion_component and remotion_data.
 *
 * Usage:
 *   node render-yaml.mjs path/to/remotion_sections.yaml
 */

import React from "react";
import { Audio, AbsoluteFill, staticFile, useCurrentFrame } from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";

import {
  Scale4K,
  FullBleedLayout,
  PaddedLayout,
  useEntrance,
  getPresentation,
  ChapterProgressBar,
  Subtitles,
  QuoteBlock,
  FeatureGrid,
  IconCard,
  ComparisonCard,
  StatCounter,
  DataBar,
  Timeline,
  FlowChart,
  CodeBlock,
  DataTable,
  DiagramReveal,
  AnimationDemo,
  AssetImage,
  AssetVideo,
} from "./components/index.js";

// ---------------------------------------------------------------------------
// Component registry — maps remotion_component names to React components
// ---------------------------------------------------------------------------
const COMPONENT_MAP = {
  QuoteBlock,
  FeatureGrid,
  IconCard,
  ComparisonCard,
  StatCounter,
  DataBar,
  Timeline,
  FlowChart,
  CodeBlock,
  DataTable,
  DiagramReveal,
  AnimationDemo,
  AssetImage,
  AssetVideo,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Flatten all section_list entries across all stories into one array. */
const flattenSections = (stories) => {
  const result = [];
  for (const story of stories) {
    if (story.section_list) {
      for (const section of story.section_list) {
        result.push({ ...section, story_name: story.story_name, story_id: story.story_id });
      }
    }
  }
  return result;
};

/** Build theme-derived props object compatible with existing components. */
const buildThemeProps = (config) => {
  const t = config.theme || {};
  const isVertical = (config.orientation || "horizontal") === "vertical";
  return {
    primaryColor: t.primary_color || "#4f6ef7",
    backgroundColor: t.background_color || "#ffffff",
    textColor: t.text_color || "#1a1a1a",
    accentColor: t.accent_color || "#FF6B6B",
    transitionType: t.transition_type || "fade",
    transitionDuration: Math.round(t.transition_duration || 12),
    orientation: isVertical ? "vertical" : "horizontal",
    scaleFactor: config.resolution === "4K" ? 2 : 1,
    // Defaults for features not in the YAML theme
    enableAnimations: true,
    showProgressBar: true,
    progressBarHeight: 65,
    progressFontSize: 19,
    progressActiveColor: t.primary_color || "#4f6ef7",
    iconStyle: "lucide",
    iconAnimation: "entrance",
    bgmVolume: 0,
    enableAudio: false,
    enableSubtitles: false,
    titleSize: isVertical ? 96 : 80,
    subtitleSize: isVertical ? 48 : 40,
    bodySize: isVertical ? 36 : 28,
  };
};

/** Resolve an asset src — could be a path relative to public/ or an absolute path. */
const resolveAssetSrc = (src) => {
  if (!src) return null;
  // If it looks like an absolute URL or filesystem path, use as-is
  if (src.startsWith("http") || src.startsWith("/") || src.match(/^[A-Za-z]:/)) {
    return src;
  }
  // Otherwise treat as a file in the public directory
  return staticFile(src);
};

// ---------------------------------------------------------------------------
// Section renderer
// ---------------------------------------------------------------------------
const SectionRenderer = ({ section, themeProps, frameOffset }) => {
  const componentName = section.remotion_component;
  const Component = COMPONENT_MAP[componentName];
  const data = typeof section.remotion_data === "string"
    ? JSON.parse(section.remotion_data)
    : (section.remotion_data || {});

  const { opacity, translateY, scale } = useEntrance(themeProps.enableAnimations);

  if (!Component) {
    return (
      <PaddedLayout bg={themeProps.backgroundColor} orientation={themeProps.orientation}>
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          opacity, transform: `translateY(${translateY}px) scale(${scale})`,
          padding: themeProps.orientation === "vertical" ? "120px 60px 160px" : "60px 100px 120px",
        }}>
          <h2 style={{ fontSize: 48, color: themeProps.textColor }}>
            Unknown component: {componentName}
          </h2>
        </div>
      </PaddedLayout>
    );
  }

  // AssetImage / AssetVideo with background role render full-bleed
  const isBackgroundAsset =
    (componentName === "AssetImage" || componentName === "AssetVideo") &&
    data.role === "background";

  // Resolve src for asset components
  let resolvedData = { ...data };
  if (componentName === "AssetImage" || componentName === "AssetVideo") {
    if (data.src) {
      resolvedData.src = resolveAssetSrc(data.src);
    }
  }

  const inner = <Component props={themeProps} {...resolvedData} />;

  if (isBackgroundAsset) {
    return (
      <FullBleedLayout bg={themeProps.backgroundColor}>
        {inner}
      </FullBleedLayout>
    );
  }

  return (
    <PaddedLayout bg={themeProps.backgroundColor} orientation={themeProps.orientation}>
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", flexDirection: "column", justifyContent: "center",
        padding: themeProps.orientation === "vertical" ? "120px 60px 160px" : "60px 100px 120px",
        opacity, transform: `translateY(${translateY}px) scale(${scale})`,
      }}>
        {data.heading && (
          <h2 style={{
            fontSize: themeProps.titleSize,
            fontWeight: 700,
            color: themeProps.primaryColor,
            textAlign: "center",
            marginBottom: themeProps.orientation === "vertical" ? 32 : 40,
          }}>
            {data.heading}
          </h2>
        )}
        {inner}
      </div>
    </PaddedLayout>
  );
};

// ---------------------------------------------------------------------------
// In-component subtitle renderer (simple, no SRT file needed)
// ---------------------------------------------------------------------------
const InlineSubtitles = ({ subtitles, fontSize = 40 }) => {
  const frame = useCurrentFrame();
  const active = (subtitles || []).filter(
    (s) => frame >= s.start_frame && frame <= s.end_frame
  );
  if (active.length === 0) return null;

  return (
    <div style={{
      position: "absolute", bottom: 80, left: 0, right: 0,
      display: "flex", flexDirection: "column", alignItems: "center",
      gap: 8, pointerEvents: "none", zIndex: 100,
    }}>
      {active.map((s, i) => (
        <span key={i} style={{
          fontSize,
          color: "#fff",
          background: "rgba(0,0,0,0.65)",
          padding: "8px 24px",
          borderRadius: 8,
          textAlign: "center",
          maxWidth: "85%",
        }}>
          {s.text}
        </span>
      ))}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Main composition
// ---------------------------------------------------------------------------
export const YamlVideo = ({ config }) => {
  if (!config) {
    return (
      <AbsoluteFill style={{ backgroundColor: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <h1 style={{ fontSize: 48, color: "#333" }}>No config provided</h1>
        <p style={{ fontSize: 24, color: "#666" }}>Pass a YAML config via --props or the render-yaml.mjs script.</p>
      </AbsoluteFill>
    );
  }

  const themeProps = buildThemeProps(config);
  const sections = flattenSections(config.stories || []);
  const transitionFrames = themeProps.transitionDuration;

  // Build chapter list for the progress bar
  const chapters = sections.map((s, i) => ({
    name: s.scene_id || `section_${i}`,
    label: s.story_name || s.remotion_component,
    start_frame: sections.slice(0, i).reduce((sum, sec) => sum + (sec.total_frame || 0), 0),
    duration_frames: s.total_frame || 120,
  }));

  const totalFrames = sections.reduce((sum, s) => sum + (s.total_frame || 0), 0);
  const transitionCount = Math.max(0, sections.length - 1);
  const effectiveTransitionFrames =
    themeProps.transitionType !== "none" && transitionFrames > 0 ? transitionFrames : 0;

  // Audio-master clock scaling
  const targetTotal = totalFrames + transitionCount * effectiveTransitionFrames;
  const audioScale = totalFrames > 0 ? targetTotal / totalFrames : 1;

  // Collect subtitle list from config
  const subtitleList = config.subtitle?.list || [];

  return (
    <AbsoluteFill style={{ backgroundColor: themeProps.backgroundColor }}>
      <Scale4K orientation={themeProps.orientation} scaleFactor={themeProps.scaleFactor}>
        <TransitionSeries>
          {sections.map((section, i) => {
            const duration = Math.max(15, Math.round((section.total_frame || 0) * audioScale));
            return (
              <React.Fragment key={section.scene_id || i}>
                <TransitionSeries.Sequence durationInFrames={duration}>
                  <SectionRenderer section={section} themeProps={themeProps} frameOffset={0} />
                  {/* Per-section narration audio */}
                  {section.audio && (
                    <Audio src={resolveAssetSrc(section.audio)} />
                  )}
                </TransitionSeries.Sequence>
                {i < sections.length - 1 && transitionFrames > 0 && themeProps.transitionType !== "none" && (
                  <TransitionSeries.Transition
                    presentation={getPresentation(themeProps.transitionType)}
                    timing={linearTiming({ durationInFrames: transitionFrames })}
                  />
                )}
              </React.Fragment>
            );
          })}
        </TransitionSeries>
      </Scale4K>

      {/* Progress bar at native resolution */}
      <ChapterProgressBar props={themeProps} chapters={chapters} totalFrames={totalFrames} />

      {/* Inline subtitles from YAML config */}
      <InlineSubtitles
        subtitles={subtitleList}
        fontSize={themeProps.scaleFactor * (config.subtitle?.font_size || 40)}
      />
    </AbsoluteFill>
  );
};

export default YamlVideo;
