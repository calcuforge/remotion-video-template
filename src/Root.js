/**
 * Root.js — Remotion composition registration.
 *
 * Compositions:
 *   - YamlVideo         : 1080p horizontal (1920×1080), YAML-config-driven
 *   - YamlVideo4K       : 4K horizontal (3840×2160), YAML-config-driven
 *   - YamlVideoVertical : 1080p vertical (1080×1920), YAML-config-driven
 *   - MainVideo         : 1080p horizontal, timing.json-driven (legacy)
 *   - MainVideo4K       : 4K horizontal, timing.json-driven (legacy)
 *   - MainVideoVertical : 1080p vertical, timing.json-driven (legacy)
 */

import { Composition } from "remotion";
import { z } from "zod";
import { Video } from "./Video.js";
import { YamlVideo } from "./YamlVideo.js";
import { fetchTimingData } from "./components/index.js";

// ---------------------------------------------------------------------------
// Legacy Zod schema — for the hardcoded Video.js composition (Studio panel)
// ---------------------------------------------------------------------------
export const videoSchema = z.object({
  primaryColor: z.string().describe("Primary color — titles, accents"),
  backgroundColor: z.string().describe("Background color"),
  textColor: z.string().describe("Body text color"),
  accentColor: z.string().describe("Accent color — highlights, CTA"),

  titleSize: z.number().min(72).max(120).describe("Title font size (hero/section title)"),
  subtitleSize: z.number().min(30).max(68).describe("Subtitle font size"),
  bodySize: z.number().min(24).max(40).describe("Body font size"),

  showProgressBar: z.boolean().describe("Show bottom chapter progress bar"),
  progressBarHeight: z.number().min(40).max(150).describe("Progress bar height (px)"),
  progressFontSize: z.number().min(16).max(60).describe("Progress bar label size"),
  progressActiveColor: z.string().describe("Active chapter color"),

  bgmVolume: z.number().min(0).max(0.3).step(0.01).describe("BGM volume"),
  enableAudio: z.boolean().describe("Play narration audio (podcast_audio.wav)"),
  enableSubtitles: z.boolean().describe("Render SRT subtitles (podcast_audio.srt)"),

  enableAnimations: z.boolean().describe("Enable entrance/exit animations"),

  transitionType: z.enum(["fade", "slide", "wipe", "none"]).describe("Chapter transition type"),
  transitionDuration: z.number().min(0).max(24).describe("Transition duration (frames; 24 = 1s)"),

  scaleFactor: z.number().min(1).max(2).describe("1=1080p, 2=4K"),
  orientation: z.enum(["horizontal", "vertical"]).describe("Video orientation"),

  iconStyle: z.enum(["lucide", "emoji", "mixed"]).describe("Icon style"),
  iconAnimation: z.enum(["entrance", "none"]).describe("Icon animation"),
});

const defaults1080p = {
  primaryColor: "#4f6ef7",
  backgroundColor: "#ffffff",
  textColor: "#1a1a1a",
  accentColor: "#FF6B6B",

  titleSize: 80,
  subtitleSize: 40,
  bodySize: 28,

  showProgressBar: true,
  progressBarHeight: 65,
  progressFontSize: 19,
  progressActiveColor: "#4f6ef7",

  bgmVolume: 0,
  enableAudio: false,
  enableSubtitles: false,

  enableAnimations: true,

  transitionType: "fade",
  transitionDuration: 15,

  scaleFactor: 1,
  orientation: "horizontal",

  iconStyle: "lucide",
  iconAnimation: "entrance",
};

// ---------------------------------------------------------------------------
// YAML config schema — validates the config prop passed to YamlVideo
// ---------------------------------------------------------------------------
const yamlConfigSchema = z.object({
  resolution: z.string().optional(),
  orientation: z.string().optional(),
  fps: z.number().optional(),
  theme: z.object({
    primary_color: z.string().optional(),
    background_color: z.string().optional(),
    text_color: z.string().optional(),
    accent_color: z.string().optional(),
    transition_type: z.string().optional(),
    transition_duration: z.number().optional(),
  }).optional(),
  subtitle: z.object({
    font_size: z.number().optional(),
    list: z.array(z.object({
      text: z.string(),
      start_frame: z.number(),
      end_frame: z.number(),
    })).optional(),
  }).optional(),
  stories: z.array(z.object({
    story_name: z.string().optional(),
    story_id: z.string().optional(),
    section_list: z.array(z.object({
      audio: z.string().optional(),
      scene_list: z.array(z.object({
        total_frame: z.number(),
        remotion_component: z.string(),
        remotion_data: z.any().optional(),
        scene_id: z.string().optional(),
      })).optional(),
    })).optional(),
  })).optional(),
});

// ─── Legacy metadata (timing.json) ──────────────────────────────────────
const calculateVideoMetadata = async ({ props }) => {
  const timing = await fetchTimingData();
  return { durationInFrames: timing.total_frames || 300, props };
};

// ─── YAML config metadata (compute duration from sections) ──────────────
const calculateYamlMetadata = ({ props }) => {
  const config = props.config || {};

  // Flatten all scenes
  const allScenes = [];
  for (const story of config.stories || []) {
    for (const section of story.section_list || []) {
      for (const scene of section.scene_list || []) {
        allScenes.push(scene);
      }
    }
  }

  if (allScenes.length === 0) {
    return { durationInFrames: 300, props };
  }

  // Mirror YamlVideo.js exactly: the TransitionSeries renders each scene at
  // round(total_frame * audioScale) and overlaps adjacent scenes by the
  // transition duration, so its real duration is the stretched scene sum MINUS
  // the transition overlaps. Using the naive sum + transition frames here would
  // make the composition longer than the rendered content (a silent freeze at
  // the end) and desync the audio-master clock.
  const totalFrames = allScenes.reduce((sum, s) => sum + (s.total_frame || 0), 0);
  const transitionCount = allScenes.length - 1;
  const transitionType = config.theme?.transition_type || "fade";
  const transitionFrames = Math.round(config.theme?.transition_duration || 12);
  const effectiveTransitionFrames =
    transitionType !== "none" && transitionFrames > 0 ? transitionFrames : 0;
  const targetTotal = totalFrames + transitionCount * effectiveTransitionFrames;
  const audioScale = totalFrames > 0 ? targetTotal / totalFrames : 1;

  let visualTotal = 0;
  for (const scene of allScenes) {
    visualTotal += Math.max(15, Math.round((scene.total_frame || 0) * audioScale));
  }
  visualTotal -= transitionCount * effectiveTransitionFrames;

  return { durationInFrames: Math.max(1, visualTotal), props };
};

// ─── Default YAML config (enough to show something in Studio) ───────────
const defaultYamlConfig = {
  resolution: "1080P",
  orientation: "horizontal",
  fps: 24,
  theme: {
    primary_color: "#4f6ef7",
    background_color: "#ffffff",
    text_color: "#1a1a1a",
    accent_color: "#FF6B6B",
    transition_type: "fade",
    transition_duration: 12,
  },
  stories: [
    {
      story_name: "Sample Story",
      story_id: "story1",
      section_list: [
        {
          audio: "",
          scene_list: [
            {
              total_frame: 120,
              remotion_component: "QuoteBlock",
              remotion_data: {
                heading: "Welcome",
                quote: "This is a sample section rendered from YAML config.",
                attribution: "YamlVideo",
              },
              scene_id: "scene1",
            },
            {
              total_frame: 120,
              remotion_component: "FeatureGrid",
              remotion_data: {
                heading: "Features",
                items: [
                  { icon: "zap", title: "Fast", description: "Quick rendering" },
                  { icon: "palette", title: "Customizable", description: "Full control" },
                  { icon: "code", title: "Code-driven", description: "React + YAML" },
                ],
              },
              scene_id: "scene2",
            },
          ],
        },
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// Composition Registration
// ---------------------------------------------------------------------------
export const RemotionRoot = () => {
  return (
    <>
      {/* ── YAML-config-driven compositions ──────────────────────────── */}
      <Composition
        id="YamlVideo"
        component={YamlVideo}
        durationInFrames={300}
        calculateMetadata={calculateYamlMetadata}
        fps={24}
        width={1920}
        height={1080}
        schema={yamlConfigSchema}
        defaultProps={{ config: defaultYamlConfig }}
      />

      <Composition
        id="YamlVideo4K"
        component={YamlVideo}
        durationInFrames={300}
        calculateMetadata={calculateYamlMetadata}
        fps={24}
        width={3840}
        height={2160}
        schema={yamlConfigSchema}
        defaultProps={{
          config: {
            ...defaultYamlConfig,
            resolution: "4K",
          },
        }}
      />

      <Composition
        id="YamlVideoVertical"
        component={YamlVideo}
        durationInFrames={300}
        calculateMetadata={calculateYamlMetadata}
        fps={24}
        width={1080}
        height={1920}
        schema={yamlConfigSchema}
        defaultProps={{
          config: {
            ...defaultYamlConfig,
            orientation: "vertical",
          },
        }}
      />

      {/* ── Legacy timing.json-driven compositions ───────────────────── */}
      <Composition
        id="MainVideo"
        component={Video}
        durationInFrames={300}
        calculateMetadata={calculateVideoMetadata}
        fps={24}
        width={1920}
        height={1080}
        schema={videoSchema}
        defaultProps={defaults1080p}
      />

      <Composition
        id="MainVideo4K"
        component={Video}
        durationInFrames={300}
        calculateMetadata={calculateVideoMetadata}
        fps={24}
        width={3840}
        height={2160}
        schema={videoSchema}
        defaultProps={{
          ...defaults1080p,
          scaleFactor: 2,
          progressBarHeight: 130,
          progressFontSize: 38,
        }}
      />

      <Composition
        id="MainVideoVertical"
        component={Video}
        durationInFrames={300}
        calculateMetadata={calculateVideoMetadata}
        fps={24}
        width={1080}
        height={1920}
        schema={videoSchema}
        defaultProps={{
          ...defaults1080p,
          orientation: "vertical",
          showProgressBar: false,
          titleSize: 96,
          subtitleSize: 48,
          bodySize: 36,
          progressBarHeight: 65,
          progressFontSize: 19,
        }}
      />
    </>
  );
};
