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
import { Audio, AbsoluteFill, Sequence, staticFile, useCurrentFrame } from "remotion";
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
  KenBurnsImage,
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
  KenBurnsImage,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Flatten the nested structure into:
 *  - scenes: flat array of all scene objects (for TransitionSeries visuals)
 *  - audioTracks: narration-level audio with start frame (for overlay rendering)
 *
 * New YAML structure:
 *   stories[].section_list[] = { audio, scene_list[]: { total_frame, remotion_component, ... } }
 */
const flattenStories = (stories) => {
  const scenes = [];
  const audioTracks = [];
  let frameCursor = 0;

  for (const story of stories || []) {
    for (const section of story.section_list || []) {
      const narrationStart = frameCursor;
      const sceneList = section.scene_list || [];
      // Index (in the flat `scenes` array) of this section's first scene — used
      // to align the narration audio with the scene's rendered start frame.
      const firstSceneIndex = scenes.length;

      for (const scene of sceneList) {
        scenes.push({
          ...scene,
          story_name: story.story_name,
          story_id: story.story_id,
        });
        frameCursor += scene.total_frame || 0;
      }

      // Narration-level audio spans all its scenes
      if (section.audio) {
        audioTracks.push({
          src: section.audio,
          startFrame: narrationStart,
          durationFrames: frameCursor - narrationStart,
          firstSceneIndex,
        });
      }
    }
  }

  return { scenes, audioTracks };
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
  const ASSET_COMPONENTS = ["AssetImage", "AssetVideo", "KenBurnsImage"];
  const isBackgroundAsset = ASSET_COMPONENTS.includes(componentName) && data.role === "background";

  // Resolve src for asset components
  let resolvedData = { ...data };
  if (ASSET_COMPONENTS.includes(componentName)) {
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
  // Defensive: if two subtitles overlap (e.g. a hand-authored config), show
  // only the most recent one — never stack a lingering previous subtitle.
  const current = active.reduce((a, b) => (b.start_frame > a.start_frame ? b : a));

  return (
    <div style={{
      position: "absolute", bottom: 80, left: 0, right: 0,
      display: "flex", flexDirection: "column", alignItems: "center",
      gap: 8, pointerEvents: "none", zIndex: 100,
    }}>
      <span style={{
        fontSize,
        color: "#fff",
        background: "rgba(0,0,0,0.75)",
        padding: "8px 24px",
        borderRadius: 8,
        textAlign: "center",
        maxWidth: "85%",
        textShadow: "0 1px 3px rgba(0,0,0,0.6)",
      }}>
        {current.text}
      </span>
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
  const { scenes, audioTracks } = flattenStories(config.stories || []);
  const transitionFrames = themeProps.transitionDuration;

  // Build chapter list for the progress bar — one segment per STORY
  const chapters = [];
  let chapterFrameCursor = 0;
  for (const story of config.stories || []) {
    let storyFrames = 0;
    for (const section of story.section_list || []) {
      for (const scene of section.scene_list || []) {
        storyFrames += scene.total_frame || 0;
      }
    }
    chapters.push({
      name: story.story_id || `story_${chapters.length}`,
      label: story.story_name || story.story_id || `Story ${chapters.length + 1}`,
      start_frame: chapterFrameCursor,
      duration_frames: storyFrames || 120,
    });
    chapterFrameCursor += storyFrames;
  }

  const totalFrames = scenes.reduce((sum, s) => sum + (s.total_frame || 0), 0);
  const transitionCount = Math.max(0, scenes.length - 1);
  const effectiveTransitionFrames =
    themeProps.transitionType !== "none" && transitionFrames > 0 ? transitionFrames : 0;

  // Audio-master clock scaling
  const targetTotal = totalFrames + transitionCount * effectiveTransitionFrames;
  const audioScale = totalFrames > 0 ? targetTotal / totalFrames : 1;

  // Map subtitles (authored in raw audio frames, one per scene in scene order)
  // into rendered frame space. Two adjustments align them with the visuals:
  //   1. × audioScale — the timeline is stretched to accommodate transitions.
  //   2. − i·effectiveTransitionFrames — TransitionSeries overlaps each adjacent
  //      scene by the transition duration, so scene i actually starts i overlaps
  //      earlier than the naive scaled cumulative sum. Without this, subtitles
  //      (and audio) drift progressively LATER than the visuals.
  const subtitleList = (config.subtitle?.list || []).map((s, i) => ({
    ...s,
    start_frame: Math.max(0, Math.round((s.start_frame || 0) * audioScale) - i * effectiveTransitionFrames),
    end_frame: Math.max(0, Math.round((s.end_frame || 0) * audioScale) - i * effectiveTransitionFrames),
  }));
  // The per-index transition shift moves each subtitle earlier by a different
  // amount, which makes consecutive subtitles overlap by ~transitionFrames.
  // Overlap would render two subtitles at once (the previous one lingering
  // above the current). Clamp each subtitle's end to just before the next
  // subtitle's start so exactly one subtitle is ever active.
  for (let i = 0; i < subtitleList.length - 1; i++) {
    const nextStart = subtitleList[i + 1].start_frame;
    if (subtitleList[i].end_frame >= nextStart) {
      subtitleList[i].end_frame = Math.max(subtitleList[i].start_frame, nextStart - 1);
    }
  }

  return (
    <AbsoluteFill style={{ backgroundColor: themeProps.backgroundColor }}>
      <Scale4K orientation={themeProps.orientation} scaleFactor={themeProps.scaleFactor}>
        {/* Visual track: TransitionSeries of flat scenes */}
        <TransitionSeries>
          {scenes.map((scene, i) => {
            const duration = Math.max(15, Math.round((scene.total_frame || 0) * audioScale));
            return (
              <React.Fragment key={scene.scene_id || i}>
                <TransitionSeries.Sequence durationInFrames={duration}>
                  <SectionRenderer section={scene} themeProps={themeProps} frameOffset={0} />
                </TransitionSeries.Sequence>
                {i < scenes.length - 1 && transitionFrames > 0 && themeProps.transitionType !== "none" && (
                  <TransitionSeries.Transition
                    presentation={getPresentation(themeProps.transitionType)}
                    timing={linearTiming({ durationInFrames: transitionFrames })}
                  />
                )}
              </React.Fragment>
            );
          })}
        </TransitionSeries>

        {/* Audio track: narration-level audio overlaid at the rendered start frame
            of its section's first scene. The − firstSceneIndex·effectiveTransitionFrames
            term compensates for TransitionSeries overlaps so the narration begins
            exactly when its scene appears (otherwise audio drifts later than the visuals). */}
        {audioTracks.map((track, i) => {
          const scaledStart = Math.max(
            0,
            Math.round(track.startFrame * audioScale) - track.firstSceneIndex * effectiveTransitionFrames,
          );
          return (
            <Sequence key={`audio_${i}`} from={scaledStart} layout="none">
              <Audio src={resolveAssetSrc(track.src)} />
            </Sequence>
          );
        })}
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
