/**
 * Root.js — Remotion composition registration.
 *
 * Compositions:
 *   - MainVideo        : 1080p horizontal (1920×1080), 16:9, 30fps
 *   - MainVideo4K      : 4K horizontal (3840×2160), 16:9, 30fps
 *   - MainVideoVertical: 1080p vertical (1080×1920), 9:16, 30fps
 *
 * The videoSchema (Zod) below drives Remotion Studio's right-side editable
 * properties panel — change colors, sizes, transitions, etc. live.
 */

import { Composition } from "remotion";
import { z } from "zod";
import { Video } from "./Video.js";
import { fetchTimingData } from "./components/index.js";

/**
 * Zod schema for Remotion Studio's editable properties panel.
 * Studio reads this schema and generates UI controls automatically.
 */
export const videoSchema = z.object({
  // Colors
  primaryColor: z.string().describe("Primary color — titles, accents"),
  backgroundColor: z.string().describe("Background color"),
  textColor: z.string().describe("Body text color"),
  accentColor: z.string().describe("Accent color — highlights, CTA"),

  // Typography (1920×1080 design space; same for 1080p and 4K)
  titleSize: z.number().min(72).max(120).describe("Title font size (hero/section title)"),
  subtitleSize: z.number().min(30).max(68).describe("Subtitle font size"),
  bodySize: z.number().min(24).max(40).describe("Body font size"),

  // Progress bar (native resolution; halve these for 1080p vs 4K)
  showProgressBar: z.boolean().describe("Show bottom chapter progress bar"),
  progressBarHeight: z.number().min(40).max(150).describe("Progress bar height (px)"),
  progressFontSize: z.number().min(16).max(60).describe("Progress bar label size"),
  progressActiveColor: z.string().describe("Active chapter color"),

  // Audio
  bgmVolume: z.number().min(0).max(0.3).step(0.01).describe("BGM volume (0 = off; set 0 to mix via FFmpeg)"),
  enableAudio: z.boolean().describe("Play narration audio (podcast_audio.wav)"),
  enableSubtitles: z.boolean().describe("Render SRT subtitles (podcast_audio.srt)"),

  // Animation
  enableAnimations: z.boolean().describe("Enable entrance/exit animations"),

  // Transitions
  transitionType: z.enum(["fade", "slide", "wipe", "none"]).describe("Chapter transition type"),
  transitionDuration: z.number().min(0).max(30).describe("Transition duration (frames; 30 = 1s)"),

  // Internal — set per composition, not user-editable
  scaleFactor: z.number().min(1).max(2).describe("1=1080p, 2=4K"),
  orientation: z.enum(["horizontal", "vertical"]).describe("Video orientation"),

  // Iconography
  iconStyle: z.enum(["lucide", "emoji", "mixed"]).describe("Icon style"),
  iconAnimation: z.enum(["entrance", "none"]).describe("Icon animation"),
});

// 1080p defaults — progress bar sizes are for native 1920×1080
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

const calculateVideoMetadata = async ({ props }) => {
  const timing = await fetchTimingData();
  return { durationInFrames: timing.total_frames || 300, props };
};

export const RemotionRoot = () => {
  return (
    <>
      {/* 1080p Horizontal (16:9) */}
      <Composition
        id="MainVideo"
        component={Video}
        durationInFrames={300}
        calculateMetadata={calculateVideoMetadata}
        fps={30}
        width={1920}
        height={1080}
        schema={videoSchema}
        defaultProps={defaults1080p}
      />

      {/* 4K Horizontal (16:9) — same design, scale(2) to 3840×2160 */}
      <Composition
        id="MainVideo4K"
        component={Video}
        durationInFrames={300}
        calculateMetadata={calculateVideoMetadata}
        fps={30}
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

      {/* 1080p Vertical (9:16) */}
      <Composition
        id="MainVideoVertical"
        component={Video}
        durationInFrames={300}
        calculateMetadata={calculateVideoMetadata}
        fps={30}
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
