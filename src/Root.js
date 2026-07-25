/**
 * Root.js — Remotion composition registration.
 *
 * Compositions registered:
 *   - MainVideo        : 4K horizontal (3840×2160), 16:9, 30fps
 *   - MainVideoVertical: 4K vertical (2160×3840), 9:16, 30fps
 *   - Thumbnail16x9     : 1920×1080 still
 *   - Thumbnail4x3      : 1200×900 still
 *   - Thumbnail3x4      : 1080×1440 still (Xiaohongshu-style)
 *   - Thumbnail9x16    : 1080×1920 still (Douyin/Shorts cover)
 *
 * The videoSchema (Zod) below drives Remotion Studio's right-side editable
 * properties panel — change colors, sizes, transitions, etc. live.
 */

import { Composition, Still } from "remotion";
import { z } from "zod";
import { Video } from "./Video.js";
import { Thumbnail } from "./Thumbnail.js";
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

  // Typography (1080p design space, auto-scale(2) to 4K)
  titleSize: z.number().min(72).max(120).describe("Title font size (hero/section title)"),
  subtitleSize: z.number().min(30).max(68).describe("Subtitle font size"),
  bodySize: z.number().min(24).max(40).describe("Body font size"),

  // Progress bar (native 4K, outside scale(2))
  showProgressBar: z.boolean().describe("Show bottom chapter progress bar"),
  progressBarHeight: z.number().min(80).max(150).describe("Progress bar height (4K px)"),
  progressFontSize: z.number().min(28).max(60).describe("Progress bar label size"),
  progressActiveColor: z.string().describe("Active chapter color"),

  // Audio
  bgmVolume: z.number().min(0).max(0.3).step(0.01).describe("BGM volume (0 = off; studio-only, set 0 to mix via FFmpeg)"),
  enableAudio: z.boolean().describe("Play narration audio (podcast_audio.wav)"),
  enableSubtitles: z.boolean().describe("Render SRT subtitles (podcast_audio.srt)"),

  // Animation
  enableAnimations: z.boolean().describe("Enable entrance/exit animations"),

  // Transitions
  transitionType: z.enum(["fade", "slide", "wipe", "none"]).describe("Chapter transition type"),
  transitionDuration: z.number().min(0).max(30).describe("Transition duration (frames; 30 = 1s)"),

  // Orientation
  orientation: z.enum(["horizontal", "vertical"]).describe("Video orientation"),

  // Iconography
  iconStyle: z.enum(["lucide", "emoji", "mixed"]).describe("Icon style"),
  iconAnimation: z.enum(["entrance", "none"]).describe("Icon animation"),
});

// Default props — change in Studio or here. Audio/subtitles are OFF by default;
// drop podcast_audio.wav / podcast_audio.srt into public/ then toggle on.
export const defaultVideoProps = {
  // Colors — neutral indigo, easy to recolor in Studio
  primaryColor: "#4f6ef7",
  backgroundColor: "#ffffff",
  textColor: "#1a1a1a",
  accentColor: "#FF6B6B",

  // Typography (1080p design space)
  titleSize: 80,
  subtitleSize: 40,
  bodySize: 28,

  // Progress bar
  showProgressBar: true,
  progressBarHeight: 130,
  progressFontSize: 38,
  progressActiveColor: "#4f6ef7",

  // Audio — disabled by default; drop podcast_audio.wav / .srt into public/ and toggle on
  bgmVolume: 0,
  enableAudio: false,
  enableSubtitles: false,

  // Animation
  enableAnimations: true,

  // Transitions
  transitionType: "fade",
  transitionDuration: 15,

  // Orientation
  orientation: "horizontal",

  // Icons
  iconStyle: "lucide",
  iconAnimation: "entrance",
};

// Dynamic duration from timing.json (loaded at render time via --public-dir)
const calculateVideoMetadata = async ({ props }) => {
  const timing = await fetchTimingData();
  return { durationInFrames: timing.total_frames || 300, props };
};

export const RemotionRoot = () => {
  return (
    <>
      <Composition
        id="MainVideo"
        component={Video}
        durationInFrames={300}
        calculateMetadata={calculateVideoMetadata}
        fps={30}
        width={3840}
        height={2160}
        schema={videoSchema}
        defaultProps={defaultVideoProps}
      />

      <Composition
        id="MainVideoVertical"
        component={Video}
        durationInFrames={300}
        calculateMetadata={calculateVideoMetadata}
        fps={30}
        width={2160}
        height={3840}
        schema={videoSchema}
        defaultProps={{
          ...defaultVideoProps,
          orientation: "vertical",
          showProgressBar: false,
          titleSize: 96,
          subtitleSize: 48,
          bodySize: 36,
        }}
      />

      <Still
        id="Thumbnail16x9"
        component={Thumbnail}
        width={1920}
        height={1080}
        defaultProps={{ aspectRatio: "16:9" }}
      />

      <Still
        id="Thumbnail4x3"
        component={Thumbnail}
        width={1200}
        height={900}
        defaultProps={{ aspectRatio: "4:3" }}
      />

      <Still
        id="Thumbnail3x4"
        component={Thumbnail}
        width={1080}
        height={1440}
        defaultProps={{ aspectRatio: "3:4" }}
      />

      <Still
        id="Thumbnail9x16"
        component={Thumbnail}
        width={1080}
        height={1920}
        defaultProps={{ aspectRatio: "9:16" }}
      />
    </>
  );
};
