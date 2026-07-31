# Remotion Video Template

A general-purpose Remotion video template for explainer, documentary,
knowledge-sharing, product-introduction, and news-broadcast videos.

**Two rendering modes:**

- **YAML-config mode** (recommended) — drive the entire video from a
  `remotion_sections.yaml` file. Each section declares which component to
  render and what data to pass. No JavaScript editing required.
- **Legacy mode** — edit `public/timing.json` and hand-code section cases in
  `src/Video.js`.

Three output formats: **1080p horizontal (1920x1080), 4K horizontal
(3840x2160), and 1080p vertical (1080x1920)**.

- **Language**: JavaScript (JSX). No TypeScript.
- **Component library**: 14 YAML-configurable React components for quotes,
  feature grids, comparisons, stats, charts, timelines, flowcharts, code
  blocks, data tables, diagrams, animations, images, and video.
- **Audio-master clock**: section durations scale proportionally to match the
  total frame count.
- **Studio-editable**: the YAML config schema is exposed via Zod; Remotion
  Studio generates a UI for it automatically.

## Quick start

```bash
npm install
npm run studio          # opens Remotion Studio in your browser
```

Studio opens at <http://localhost:3000>. Select one of six compositions:

| Composition | Resolution | Mode |
|---|---|---|
| `YamlVideo` | 1920x1080 | YAML-config-driven |
| `YamlVideo4K` | 3840x2160 | YAML-config-driven |
| `YamlVideoVertical` | 1080x1920 | YAML-config-driven |
| `MainVideo` | 1920x1080 | Legacy (timing.json) |
| `MainVideo4K` | 3840x2160 | Legacy (timing.json) |
| `MainVideoVertical` | 1080x1920 | Legacy (timing.json) |

## YAML-config mode

### Config file format (`remotion_sections.yaml`)

```yaml
resolution: 1080P          # 1080P or 4K
orientation: horizontal    # horizontal (16:9) or vertical (9:16)
fps: 24.0

theme:
  primary_color: "#4f6ef7"
  background_color: "#ffffff"
  text_color: "#1a1a1a"
  accent_color: "#FF6B6B"
  transition_type: fade    # fade | slide | wipe | none
  transition_duration: 12  # frames

subtitle:
  font_size: 20
  list:
    - text: "Subtitle text"
      start_frame: 1
      end_frame: 120

stories:
  - story_name: "Chapter 1"
    story_id: story1
    section_list:              # each entry = one narration unit
      - audio: narration/ch1.wav  # narration audio (shared by all scenes below)
        scene_list:               # visual scenes under this narration
          - total_frame: 60
            remotion_component: AssetVideo
            remotion_data:
              src: assets/scene1.mp4
              role: background
            scene_id: scene1
          - total_frame: 60
            remotion_component: QuoteBlock
            remotion_data:
              heading: "Key Insight"
              quote: "The quote text to display."
              attribution: "Author Name"
            scene_id: scene2
```

Each `section_list` entry represents a **narration unit**: one `audio` file
spanning multiple `scene_list` entries. The audio plays continuously across
all scenes in its group.

### Rendering from a YAML config

```bash
# Install js-yaml (one-time)
npm install

# Render using the helper script
node render-yaml.mjs path/to/remotion_sections.yaml

# Specify output path and public dir
node render-yaml.mjs path/to/config.yaml --public-dir my-project/public --output out/video.mp4

# Open in Studio instead of rendering
node render-yaml.mjs path/to/config.yaml --studio
```

The script automatically selects the right Remotion composition (`YamlVideo`
/ `YamlVideo4K` / `YamlVideoVertical`) based on the `resolution` and
`orientation` fields in your YAML config.

You can also render directly with `npx remotion render` by passing the
parsed config as JSON props:

```bash
npx remotion render src/index.js YamlVideo out.mp4 \
  --public-dir public \
  --props '{"config":{...}}'
```

### Supported components and their `remotion_data`

Each section in `section_list` specifies a `remotion_component` and
`remotion_data`. The data format depends on the component:

#### QuoteBlock — pull quote with attribution

```yaml
remotion_component: QuoteBlock
remotion_data:
  heading: "Optional Section Title"
  quote: "The quote text goes here."
  attribution: "Author Name"
```

#### FeatureGrid — grid of icon cards (2-3 columns)

```yaml
remotion_component: FeatureGrid
remotion_data:
  heading: "Key Features"
  columns: 3          # optional, default 3
  items:
    - icon: zap
      title: "Fast"
      description: "Lightning-fast rendering"
    - icon: palette
      title: "Customizable"
      description: "Full control over visuals"
    - icon: code
      title: "Code-driven"
      description: "React components + YAML config"
```

#### IconCard — single key-point row

```yaml
remotion_component: IconCard
remotion_data:
  heading: "Section Title"
  icon: lightbulb
  title: "Key Point"
  description: "Supporting detail text."
```

#### ComparisonCard — side-by-side VS comparison

```yaml
remotion_component: ComparisonCard
remotion_data:
  heading: "Before vs After"
  left:
    title: "Before"
    items:
      - "Manual process"
      - "Hours per week"
      - "Hard to scale"
    highlight: false
  right:
    title: "After"
    items:
      - "Automated workflow"
      - "Minutes per week"
      - "Scales linearly"
    highlight: true
```

#### StatCounter — animated number counters

```yaml
remotion_component: StatCounter
remotion_data:
  heading: "Key Metrics"
  items:
    - value: 73
      suffix: "%"
      label: "Completion rate"
      icon: trending-up
    - value: 2.4
      suffix: "M"
      label: "Active users"
      icon: users
```

#### DataBar — horizontal bar chart

```yaml
remotion_component: DataBar
remotion_data:
  heading: "Survey Results"
  items:
    - label: "Category A"
      value: 82
    - label: "Category B"
      value: 64
    - label: "Category C"
      value: 47
```

Values are treated as percentages. Add `maxValue` to any item to switch to
absolute-value mode.

#### Timeline — vertical timeline with animated nodes

```yaml
remotion_component: Timeline
remotion_data:
  heading: "Project Timeline"
  items:
    - label: "2018"
      description: "Project founded"
    - label: "2021"
      description: "Public launch"
    - label: "2024"
      description: "One million users"
```

#### FlowChart — process steps with arrow connectors

```yaml
remotion_component: FlowChart
remotion_data:
  heading: "How It Works"
  steps:
    - label: "Input"
      description: "Raw data ingestion"
      icon: file-input
    - label: "Process"
      description: "Transform and analyze"
      icon: cpu
    - label: "Output"
      description: "Final result"
      icon: file-output
```

#### CodeBlock — macOS-style terminal window

```yaml
remotion_component: CodeBlock
remotion_data:
  heading: "Installation"
  title: "terminal"           # optional, default "terminal"
  lines:
    - "$ npm install my-package"
    - "$ npx my-package init"
    - "$ npx my-package start"
```

#### DataTable — animated table with zebra stripes

```yaml
remotion_component: DataTable
remotion_data:
  heading: "Comparison Table"
  headers:
    - "Name"
    - "Speed"
    - "Cost"
  rows:
    - ["Option A", "Fast", "$10"]
    - ["Option B", "Medium", "$5"]
    - ["Option C", "Slow", "Free"]
  highlightRows: [0]         # optional, 0-based indices to highlight
```

#### DiagramReveal — animated SVG node graph

```yaml
remotion_component: DiagramReveal
remotion_data:
  heading: "System Architecture"
  direction: vertical         # "vertical" (default) or "horizontal"
  nodes:
    - id: "input"
      label: "Input"
    - id: "process"
      label: "Process"
    - id: "output"
      label: "Output"
  edges:
    - from: "input"
      to: "process"
    - from: "process"
      to: "output"
```

#### AnimationDemo — SVG animation showcase

```yaml
remotion_component: AnimationDemo
remotion_data:
  heading: "Animation Demo"
  type: shapes               # shapes | particles | waves | clock
  color: "#4f6ef7"           # optional, defaults to primaryColor
```

#### AssetImage — full-screen or inline image

```yaml
remotion_component: AssetImage
remotion_data:
  src: assets/photo.jpg      # path relative to public dir, or absolute
  role: background           # "background" (full-bleed) or "inline" (default)
  caption: "Photo caption"   # optional, inline mode only
```

For manifest-based lookup, use `id` instead of `src` (resolves through
`public/assets/manifest.json`).

#### KenBurnsImage — static image with cinematic zoom + pan

```yaml
remotion_component: KenBurnsImage
remotion_data:
  src: assets/photo.jpg      # path relative to public dir, or absolute
  role: background            # "background" (full-bleed) or "inline" (default)
  zoom: in                   # "in" (default) | "out" | "none"
  pan: left                  # "none" (default) | "left" | "right" | "up" | "down"
                             #   | "up-left" | "up-right" | "down-left" | "down-right"
  caption: "Photo caption"   # optional, inline mode only
  dim: 0.35                  # overlay darkness 0-1, background only (default 0.35)
  totalFrame: 120            # scene duration in frames — drives the zoom/pan speed
```

Applies a Ken Burns effect (slow zoom and/or pan) to a static image, adding cinematic
motion without the cost of video generation. Use when you want more visual engagement
than a static `AssetImage` but don't need a full `AssetVideo`.

- **zoom**: `in` zooms from 1.0× to 1.15×; `out` reverses it (1.15× → 1.0×).
  Diagonal pans (e.g., `up-left`) combine both axes.
- **totalFrame**: the scene's frame count; the zoom/pan interpolates over this
  entire duration so the motion is evenly paced. The pipeline auto-populates it.
- **dim**: controls the dark gradient overlay in background mode, leaving text
  readable on top of the image. Default 0.35.

#### AssetVideo — full-screen or inline video

```yaml
remotion_component: AssetVideo
remotion_data:
  src: assets/broll.mp4      # path relative to public dir, or absolute
  role: background           # "background" (full-bleed) or "inline" (default)
  muted: true                # optional, default true
```

### Audio

Each section can specify an `audio` field pointing to a narration audio file
(relative to the public directory). The audio plays during that section.

### Subtitles

Subtitles are defined in the top-level `subtitle.list` array. Each entry has
`text`, `start_frame`, and `end_frame`. They render as burned-in captions at
the bottom of the frame.

## Project structure

```
remotion-video-template/
├── package.json
├── remotion.config.js
├── render-yaml.mjs            # YAML → Remotion render helper
├── README.md
├── src/
│   ├── index.js               # registerRoot entry
│   ├── Root.js                # Compositions (Yaml* + legacy Main*)
│   ├── Video.js               # Legacy composition (timing.json-driven)
│   ├── YamlVideo.js           # YAML-config-driven composition
│   └── components/
│       ├── index.js           # barrel — import from "./components"
│       ├── layouts.js         # Scale4K, FullBleedLayout, PaddedLayout
│       ├── animations.js      # useEntrance, useCounter, useBarFill, ...
│       ├── AnimatedBackground.js
│       ├── Icon.js / iconMap.js
│       ├── ChapterProgressBar.js
│       ├── Subtitles.js
│       ├── QuoteBlock.js
│       ├── FeatureGrid.js
│       ├── IconCard.js
│       ├── ComparisonCard.js
│       ├── StatCounter.js
│       ├── DataBar.js
│       ├── Timeline.js
│       ├── FlowChart.js
│       ├── CodeBlock.js
│       ├── DataTable.js
│       ├── DiagramReveal.js
│       ├── AnimationDemo.js
│       ├── AssetImage.js / AssetVideo.js / KenBurnsImage.js
│       ├── ErrorBoundary.js
│       ├── useTiming.js       # loads timing.json via staticFile
│       └── useAssets.js       # loads assets/manifest.json
└── public/
    ├── timing.json            # legacy — for MainVideo* compositions
    ├── podcast.txt            # legacy — sample narration script
    ├── podcast_audio.wav      # YOU provide (TTS output)
    ├── podcast_audio.srt      # YOU provide (subtitle file)
    └── assets/
        └── manifest.json
```

## Component library reference

Import from `./components` (or `./components/index.js`):

**Layouts** — `Scale4K`, `FullBleedLayout`, `PaddedLayout`

**Animation hooks** — `useEntrance`, `useExit`, `useCounter`, `useBarFill`,
`useFloat`, `usePulse`, `useGradientShift`, `useOpacityWave`,
`useTextReveal`, `useCharReveal`, `staggerDelay`, `useDrawOn`,
`useStaggeredDrawOn`, `getPresentation`

**Animated backgrounds** — `MovingGradient`, `FloatingShapes`,
`GridPattern`, `GlowOrb`, `AccentLine`

**Content components** — `QuoteBlock`, `FeatureGrid`, `IconCard`,
`ComparisonCard`, `StatCounter`, `DataBar`, `Timeline`, `FlowChart`,
`CodeBlock`, `DataTable`, `DiagramReveal`, `AnimationDemo`, `AssetImage`,
`AssetVideo`, `KenBurnsImage`

**Infrastructure** — `ChapterProgressBar`, `Subtitles`, `Icon`,
`ErrorBoundary`, `useTiming`, `useAssets`, `getAsset`, `getSectionAssets`,
`assetSrc`, `getLucideIcon`, `isEmoji`

## Studio-editable properties (legacy mode)

The `videoSchema` in `src/Root.js` exposes these for the `MainVideo*`
compositions:

| Category | Properties |
|---|---|
| **Colors** | primaryColor, backgroundColor, textColor, accentColor |
| **Typography** | titleSize (72-120), subtitleSize, bodySize |
| **Progress bar** | showProgressBar, progressBarHeight, progressFontSize, progressActiveColor |
| **Audio** | bgmVolume (0-0.3), enableAudio, enableSubtitles |
| **Animation** | enableAnimations |
| **Transitions** | transitionType (fade/slide/wipe/none), transitionDuration (0-30) |
| **Orientation** | horizontal / vertical |
| **Icons** | iconStyle (lucide/emoji/mixed), iconAnimation |

## Rendering

```bash
# YAML mode (recommended)
node render-yaml.mjs path/to/remotion_sections.yaml
node render-yaml.mjs config.yaml --public-dir my-project/public --output out.mp4

# Legacy mode
npx remotion render src/index.js MainVideo public/output_1080p.mp4 --public-dir public
npx remotion render src/index.js MainVideo4K public/output_4k.mp4 --public-dir public --video-bitrate 16M
npx remotion render src/index.js MainVideoVertical public/output_vertical.mp4 --public-dir public
```

Use `--public-dir` to point at a different asset folder per video so each
video keeps its own audio, assets, and config self-contained.

## Use cases

- **Explainer** — QuoteBlock → FeatureGrid → StatCounter → ComparisonCard →
  Timeline → DiagramReveal
- **Documentary** — AssetVideo → Timeline → QuoteBlock → FeatureGrid →
  DataBar → StatCounter
- **Knowledge sharing** — IconCard → FlowChart → CodeBlock → DiagramReveal →
  QuoteBlock
- **Product intro** — AssetImage → StatCounter → FeatureGrid →
  ComparisonCard → DataBar
- **Data report** — StatCounter → DataBar → DataTable → ComparisonCard →
  QuoteBlock

Mix and match components in your YAML config's `section_list` to fit your
format. The component library is fully decoupled — you can also drop
individual components into your own compositions.

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
