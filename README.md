# Remotion Video Template

A general-purpose Remotion video template for explainer, documentary,
knowledge-sharing, product-introduction, and news-broadcast videos.
Renders 4K (3840×2160) horizontal or 2160×3840 vertical, with a 4K-native
subtitle layer and chapter progress bar.

- **Language**: JavaScript (JSX). No TypeScript.
- **Component library**: 30+ composable React components for sections,
  animations, backgrounds, charts, code blocks, diagrams, and more.
- **Audio-master clock**: section durations in `public/timing.json` drive
  the timeline; the composition scales sections to match the audio total.
- **Studio-editable**: colors, fonts, transitions, and toggles are exposed
  via a Zod schema; Remotion Studio generates a UI for them automatically.

## Quick start

```bash
npm install
npm run studio          # opens Remotion Studio in your browser
npm run render:4k       # renders public/output.mp4 at 4K
```

Studio opens at <http://localhost:3000>. Use the right-side panel to edit
colors, fonts, transitions, and toggles. The composition scrubs through
`public/timing.json` sections; each `name` maps to a case in `src/Video.js`.

## Project structure

```
remotion-video-template/
├── package.json
├── remotion.config.js
├── README.md
├── src/
│   ├── index.js          # registerRoot entry
│   ├── Root.js           # Compositions + Zod schema + default props
│   ├── Video.js          # Main composition (section switch)
│   ├── Thumbnail.js      # Thumbnail for 16:9 / 4:3 / 3:4 / 9:16
│   └── components/
│       ├── index.js             # barrel — import from "./components"
│       ├── layouts.js            # Scale4K, FullBleedLayout, PaddedLayout
│       ├── animations.js        # useEntrance, useExit, useCounter, ...
│       ├── AnimatedBackground.js
│       ├── SectionLayouts.js    # SplitLayout, StatHighlight, ZigzagCards, ...
│       ├── Icon.js / iconMap.js
│       ├── ChapterProgressBar.js
│       ├── Subtitles.js         # renders SRT inside Remotion — no FFmpeg
│       ├── ComparisonCard.js
│       ├── Timeline.js
│       ├── CodeBlock.js
│       ├── QuoteBlock.js
│       ├── FeatureGrid.js
│       ├── DataBar.js
│       ├── StatCounter.js
│       ├── FlowChart.js
│       ├── IconCard.js
│       ├── MediaSection.js
│       ├── DiagramReveal.js
│       ├── AudioWaveform.js
│       ├── LottieAnimation.js
│       ├── DataTable.js
│       ├── ErrorBoundary.js
│       ├── ShortIntroCard.js / ShortCTACard.js
│       ├── AssetImage.js / AssetVideo.js / OverlayLayer.js
│       ├── useTiming.js         # loads timing.json via staticFile
│       └── useAssets.js         # loads assets/manifest.json
└── public/
    ├── timing.json              # sample — 14 sections, 75s @ 30fps
    ├── podcast.txt              # sample narration script
    ├── podcast_audio.wav        # YOU provide (TTS output)
    ├── podcast_audio.srt        # YOU provide (subtitle file)
    ├── bgm.mp3                  # optional background music
    └── assets/
        └── manifest.json        # empty by default
```

## Customizing a video

### 1. Edit the script

Edit `public/podcast.txt` to draft your narration. The `[SECTION:xxx]`
markers define section names — those names MUST match the `name` fields in
`public/timing.json` so `Video.js` can map each section to its visual case.

### 2. Edit the timeline

`public/timing.json` drives the composition. Update `total_frames` and the
section list to match your actual audio timing. If you generate TTS audio,
produce this file from the real audio lengths (don't hand-estimate).

Each section needs: `name`, `label` (shown on the progress bar),
`start_time`, `end_time`, `duration` (seconds), `start_frame`,
`duration_frames` (at 30 fps).

### 3. Edit the visuals

Open `src/Video.js` and find the `SectionComponent` switch. Each case is
a section type — replace the placeholder strings inside each case with your
own content. Add or remove cases to match your `timing.json` sections.

The default `Video.js` ships with 14 section cases (hero, overview, stat,
feature, comparison, timeline, flow, quote, code, data, metrics, steps,
diagram, summary, outro). Delete the ones you don't need; copy/paste to
add more.

### 4. Add audio (optional)

Drop these files into `public/`:

- `podcast_audio.wav` — TTS narration audio
- `podcast_audio.srt` — subtitle file (SRT format)
- `bgm.mp3` — optional background music

Then in Remotion Studio's right panel (or in `defaultVideoProps` in
`Root.js`), toggle:

- `enableAudio` → plays `podcast_audio.wav`
- `enableSubtitles` → renders `podcast_audio.srt` inside Remotion
- `bgmVolume` → mix BGM in-render (set 0 to mix via FFmpeg post-render)

### 5. Add assets (optional)

For images, B-roll, or transparent overlays, register them in
`public/assets/manifest.json`:

```json
{
  "schema_version": 1,
  "assets": [
    {
      "id": "hero_bg",
      "section": "hero",
      "type": "image",
      "role": "background",
      "source": "user",
      "status": "resolved",
      "path": "hero_bg.jpg",
      "license": "CC0",
      "credit": "Photographer Name"
    }
  ]
}
```

Then use `<AssetImage props={props} id="hero_bg" role="background" />`
inside the section's case in `Video.js`. Components only render assets
with `status: "resolved"` and a non-empty `path`.

## Studio-editable properties

The `videoSchema` in `src/Root.js` exposes:

| Category | Properties |
|----------|------------|
| **Colors** | primaryColor, backgroundColor, textColor, accentColor |
| **Typography** | titleSize (72-120), subtitleSize, bodySize |
| **Progress bar** | showProgressBar, progressBarHeight, progressFontSize, progressActiveColor |
| **Audio** | bgmVolume (0-0.3), enableAudio, enableSubtitles |
| **Animation** | enableAnimations |
| **Transitions** | transitionType (fade/slide/wipe/none), transitionDuration (0-30) |
| **Orientation** | horizontal / vertical |
| **Icons** | iconStyle (lucide/emoji/mixed), iconAnimation |

## Compositions registered in Root.js

| ID | Type | Resolution | Notes |
|----|------|------------|-------|
| `MainVideo` | Composition | 3840×2160 | 4K horizontal, 30fps, duration from timing.json |
| `MainVideoVertical` | Composition | 2160×3840 | 4K vertical (9:16) |
| `Thumbnail16x9` | Still | 1920×1080 | YouTube / Bilibili cover |
| `Thumbnail4x3` | Still | 1200×900 | Bilibili feed |
| `Thumbnail3x4` | Still | 1080×1440 | Xiaohongshu cover |
| `Thumbnail9x16` | Still | 1080×1920 | Shorts / Reels / Douyin cover |

## Rendering

```bash
# Horizontal 4K
npx remotion render src/index.js MainVideo public/output.mp4 --public-dir public --video-bitrate 16M

# Vertical 4K
npx remotion render src/index.js MainVideoVertical public/output_vertical.mp4 --public-dir public --video-bitrate 16M

# Thumbnails
npx remotion still src/index.js Thumbnail16x9 public/thumbnail_16x9.png --public-dir public
npx remotion still src/index.js Thumbnail4x3 public/thumbnail_4x3.png --public-dir public
npx remotion still src/index.js Thumbnail3x4 public/thumbnail_3x4.png --public-dir public
npx remotion still src/index.js Thumbnail9x16 public/thumbnail_9x16.png --public-dir public
```

Use `--public-dir` to point at a different asset folder per video
(e.g. `videos/my-video/`), so each video keeps its own audio, SRT, and
assets self-contained.

## Component library reference

Import from `./components` (or `./components/index.js`). The full list:

**Layouts** — `Scale4K`, `FullBleedLayout`, `PaddedLayout`

**Animation hooks** — `useEntrance`, `useExit`, `useCounter`, `useBarFill`,
`useFloat`, `usePulse`, `useGradientShift`, `useOpacityWave`,
`useTextReveal`, `useCharReveal`, `staggerDelay`, `useDrawOn`,
`useStaggeredDrawOn`, `getPresentation`

**Animated backgrounds** — `MovingGradient`, `FloatingShapes`,
`GridPattern`, `GlowOrb`, `AccentLine`

**Section layouts** (pre-built combinations) — `SplitLayout`, `StatHighlight`,
`ZigzagCards`, `CenteredShowcase`, `MetricsRow`, `StepProgress`

**Content components** — `ComparisonCard`, `Timeline`, `CodeBlock`,
`QuoteBlock`, `FeatureGrid`, `DataBar`, `StatCounter`, `FlowChart`,
`IconCard`, `ChapterProgressBar`, `MediaSection`, `MediaGrid`,
`DiagramReveal`, `AudioWaveform`, `LottieAnimation`, `DataTable`,
`ErrorBoundary`, `Icon`

**Short-form cards** — `ShortIntroCard`, `ShortCTACard`

**Subtitles** — `Subtitles` (renders SRT inside Remotion, no FFmpeg)

**Asset helpers** — `useAssets`, `getAsset`, `getSectionAssets`, `assetSrc`,
`AssetImage`, `AssetVideo`, `OverlayLayer`

**Timing** — `useTiming`, `fetchTimingData`

## Use cases

This template fits:

- **科普 / Explainer** — hero → overview → stat → feature → comparison →
  quote → summary → outro
- **纪录片 / Documentary** — hero → timeline → quote → feature → metrics →
  summary → outro
- **知识分享 / Knowledge sharing** — hero → overview → steps → flow →
  diagram → quote → summary → outro
- **产品介绍 / Product intro** — hero → stat → feature → comparison →
  metrics → steps → summary → outro
- **新闻日报 / News brief** — hero → overview → stat → data → metrics →
  timeline → quote → outro

Mix and match section cases in `Video.js` to fit your format. The
component library is fully decoupled — you can also drop individual
components into your own compositions.

## Requirements

- Node.js 18+
- For rendering: a working Chrome/Chromium (Remotion downloads one
  automatically on first render)

## License

MIT — see `LICENSE`.

## Acknowledgments

Component library ported from
[Agents365-ai/video-podcast-maker](https://github.com/Agents365-ai/video-podcast-maker)
(CC BY-NC 4.0). Ported from TypeScript to JavaScript and decoupled from
the original skill/workflow layer to ship as a standalone Remotion template.
