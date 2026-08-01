/**
 * Video.js — main composition.
 *
 * Demonstrates how to compose the component library into a narrated video.
 * Driven by `public/timing.json` (audio-master clock via TransitionSeries).
 *
 * To customize for your own video:
 *   1. Replace the strings inside each case block with your narration/visuals.
 *   2. Add or remove cases to match your sections — each case's `section.name`
 *      must match the `name` field in timing.json.
 *   3. Drop `podcast_audio.wav`, `podcast_audio.srt`, and (optionally)
 *      `bgm.mp3` into `public/` and toggle `enableAudio` / `enableSubtitles`
 *      in Studio (or in defaultVideoProps in Root.js).
 *
 * Audio-master clock:
 *   TransitionSeries renders sum(sections) - (N-1)*transitionFrames.
 *   We scale every section proportionally so the rendered total equals
 *   timing.total_frames, instead of stuffing all overlap frames into the
 *   first section (which would desync it).
 */

import React from "react";
import { Audio, staticFile, AbsoluteFill } from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";

import {
  Scale4K,
  FullBleedLayout,
  PaddedLayout,
  useEntrance,
  getPresentation,
  ChapterProgressBar,
  Subtitles,
  IconCard,
  Icon,
  ComparisonCard,
  Timeline,
  QuoteBlock,
  FeatureGrid,
  DataBar,
  StatCounter,
  FlowChart,
  DataTable,
  DiagramReveal,
  MovingGradient,
  FloatingShapes,
  GlowOrb,
  GridPattern,
  AccentLine,
  useTiming,
} from "./components/index.js";

// ----------------------------------------------------------------------------
// Section renderer — one case per section type.
// Add cases here to match your timing.json sections. Each case receives
// the section's name and the editable Studio props.
// ----------------------------------------------------------------------------
const SectionComponent = ({ section, props }) => {
  const { opacity, translateY, scale } = useEntrance(props.enableAnimations);
  const animStyle = {
    opacity,
    transform: `translateY(${translateY}px) scale(${scale})`,
  };
  const v = props.orientation === "vertical";
  // Reserve bottom space for burned-in subtitles if enabled
  const sectionPadding = v ? "120px 60px 160px" : "60px 100px 120px";

  switch (section.name) {
    // ─── Hero / Title ───────────────────────────────────────────────────
    // Best for: opening title card, brand intro, video thesis
    case "hero":
      return (
        <FullBleedLayout bg={props.backgroundColor}>
          <MovingGradient color1={props.primaryColor} color2={props.accentColor} />
          <FloatingShapes color={props.primaryColor} count={4} opacity={0.05} shape="ring" />
          <div style={{
            position: "absolute", inset: 0,
            display: "flex", flexDirection: "column",
            justifyContent: "center", alignItems: "center",
            textAlign: "center", padding: v ? "0 60px" : 0,
            ...animStyle,
          }}>
            <h1 style={{
              fontSize: props.titleSize, fontWeight: 800,
              color: props.primaryColor,
              lineHeight: v ? 1.3 : 1.1,
              textShadow: `0 2px 16px ${props.primaryColor}15`,
            }}>
              Your Video Title
            </h1>
            <p style={{
              fontSize: props.subtitleSize, color: props.textColor,
              marginTop: v ? 32 : 20, opacity: 0.6, fontWeight: 500,
            }}>
              A subtitle or one-line hook goes here
            </p>
          </div>
        </FullBleedLayout>
      );

    // ─── Overview / Table of Contents ──────────────────────────────────
    // Best for: agenda, "today we'll cover", episode intro
    case "overview":
      return (
        <PaddedLayout bg="#fafafa" orientation={props.orientation}>
          <div style={{
            position: "absolute", inset: 0,
            padding: sectionPadding,
            display: "flex", flexDirection: "column", justifyContent: "center",
            ...animStyle,
          }}>
            <h2 style={{
              fontSize: v ? 72 : 80, fontWeight: 700,
              marginBottom: 12, color: props.primaryColor, textAlign: "center",
            }}>
              In This Episode
            </h2>
            <p style={{
              fontSize: v ? 34 : 30, color: props.textColor,
              opacity: 0.5, marginBottom: v ? 24 : 20, textAlign: "center",
            }}>
              Three key takeaways
            </p>
            <div style={{
              display: "flex", flexDirection: "column",
              gap: v ? 24 : 20, width: "100%", maxWidth: v ? undefined : 900,
            }}>
              {[
                { icon: "lightbulb", title: "Point One", description: "Setup the problem" },
                { icon: "target", title: "Point Two", description: "Showcase the solution" },
                { icon: "check-circle", title: "Point Three", description: "Land the takeaway" },
              ].map((item, i) => (
                <IconCard key={i} props={props} icon={item.icon}
                  title={item.title} description={item.description} delay={i * 6} />
              ))}
            </div>
          </div>
        </PaddedLayout>
      );

    // ─── Comparison — A vs B ────────────────────────────────────────────
    // Best for: before/after, vs competitor, tradeoffs
    case "comparison":
      return (
        <PaddedLayout bg={props.backgroundColor} orientation={props.orientation}>
          <div style={{
            position: "absolute", inset: 0,
            padding: sectionPadding,
            display: "flex", flexDirection: "column", justifyContent: "center",
            ...animStyle,
          }}>
            <h2 style={{
              fontSize: v ? 72 : 80, fontWeight: 700,
              color: props.primaryColor, textAlign: "center", marginBottom: v ? 32 : 40,
            }}>
              Side by Side
            </h2>
            <ComparisonCard
              props={props}
              left={{ title: "Before", items: ["Manual process", "Hours per week", "Hard to scale"], highlight: false }}
              right={{ title: "After", items: ["Automated", "Minutes per week", "Scales linearly"], highlight: true }}
            />
          </div>
        </PaddedLayout>
      );

    // ─── Timeline — chronological milestones ───────────────────────────
    // Best for: history, project phases, narrative arc
    case "timeline":
      return (
        <PaddedLayout bg={props.backgroundColor} orientation={props.orientation}>
          <div style={{
            position: "absolute", inset: 0,
            padding: sectionPadding,
            display: "flex", flexDirection: "column", justifyContent: "center",
            ...animStyle,
          }}>
            <h2 style={{
              fontSize: v ? 72 : 80, fontWeight: 700,
              color: props.primaryColor, textAlign: "center", marginBottom: v ? 32 : 40,
            }}>
              Timeline
            </h2>
            <Timeline
              props={props}
              items={[
                { label: "2018", description: "Project founded" },
                { label: "2021", description: "Public launch" },
                { label: "2024", description: "One million users" },
                { label: "Today", description: "Where we are now" },
              ]}
            />
          </div>
        </PaddedLayout>
      );

    // ─── FlowChart — process steps with arrows ──────────────────────────
    // Best for: workflow, system architecture, step-by-step process
    case "flow":
      return (
        <PaddedLayout bg={props.backgroundColor} orientation={props.orientation}>
          <div style={{
            position: "absolute", inset: 0,
            padding: sectionPadding,
            display: "flex", flexDirection: "column", justifyContent: "center",
            ...animStyle,
          }}>
            <h2 style={{
              fontSize: v ? 72 : 80, fontWeight: 700,
              color: props.primaryColor, textAlign: "center", marginBottom: v ? 32 : 40,
            }}>
              How It Works
            </h2>
            <FlowChart
              props={props}
              steps={[
                { label: "Input", description: "Raw data", icon: "file-input" },
                { label: "Process", description: "Transform", icon: "cpu" },
                { label: "Output", description: "Final result", icon: "file-output" },
              ]}
            />
          </div>
        </PaddedLayout>
      );

    // ─── Quote — pull quote with attribution ───────────────────────────
    // Best for: expert quote, user testimonial, memorable line
    case "quote":
      return (
        <PaddedLayout bg={props.backgroundColor} orientation={props.orientation}>
          <div style={{
            position: "absolute", inset: 0,
            padding: sectionPadding,
            display: "flex", alignItems: "center", justifyContent: "center",
            ...animStyle,
          }}>
            <QuoteBlock
              props={props}
              quote="Design is not just what it looks like and feels like. Design is how it works."
              attribution="Steve Jobs"
            />
          </div>
        </PaddedLayout>
      );

    // ─── CodeBlock — terminal/code snippet ─────────────────────────────
    // Best for: dev walkthroughs, command demos, code explanation
    case "code":
      return (
        <PaddedLayout bg={props.backgroundColor} orientation={props.orientation}>
          <div style={{
            position: "absolute", inset: 0,
            padding: sectionPadding,
            display: "flex", flexDirection: "column", justifyContent: "center",
            maxWidth: 1100, margin: "0 auto",
            ...animStyle,
          }}>
            <h2 style={{
              fontSize: v ? 72 : 80, fontWeight: 700,
              color: props.primaryColor, textAlign: "center", marginBottom: v ? 32 : 40,
            }}>
              Quick Demo
            </h2>
            {/* Import CodeBlock from "./components" if you want a code snippet.
                Not imported here to avoid bloating the default bundle. */}
            <p style={{
              fontSize: v ? 34 : 30, color: props.textColor, opacity: 0.7,
              textAlign: "center",
            }}>
              Replace this section with a CodeBlock component for terminal/code demos.
            </p>
          </div>
        </PaddedLayout>
      );

    // ─── DataBar — bar chart ───────────────────────────────────────────
    // Best for: survey results, percentages, comparison bars
    case "data":
      return (
        <PaddedLayout bg={props.backgroundColor} orientation={props.orientation}>
          <div style={{
            position: "absolute", inset: 0,
            padding: sectionPadding,
            display: "flex", flexDirection: "column", justifyContent: "center",
            ...animStyle,
          }}>
            <h2 style={{
              fontSize: v ? 72 : 80, fontWeight: 700,
              color: props.primaryColor, textAlign: "center", marginBottom: v ? 32 : 40,
            }}>
              By the Numbers
            </h2>
            <DataBar
              props={props}
              items={[
                { label: "Category A", value: 82 },
                { label: "Category B", value: 64 },
                { label: "Category C", value: 47 },
                { label: "Category D", value: 28 },
              ]}
            />
          </div>
        </PaddedLayout>
      );

    // ─── DiagramReveal — animated SVG flow diagram ─────────────────────
    // Best for: system architecture, decision tree, org chart
    case "diagram":
      return (
        <PaddedLayout bg={props.backgroundColor} orientation={props.orientation}>
          <div style={{
            position: "absolute", inset: 0,
            padding: sectionPadding,
            display: "flex", flexDirection: "column", justifyContent: "center",
            maxWidth: 1100, margin: "0 auto",
            ...animStyle,
          }}>
            <h2 style={{
              fontSize: v ? 72 : 80, fontWeight: 700,
              color: props.primaryColor, textAlign: "center", marginBottom: v ? 32 : 40,
            }}>
              Architecture
            </h2>
            <DiagramReveal
              props={props}
              nodes={[
                { id: "input", label: "Input" },
                { id: "process", label: "Process" },
                { id: "output", label: "Output" },
              ]}
              edges={[
                { from: "input", to: "process" },
                { from: "process", to: "output" },
              ]}
            />
          </div>
        </PaddedLayout>
      );

    // ─── Summary / Conclusion ───────────────────────────────────────────
    case "summary":
      return (
        <FullBleedLayout bg={props.backgroundColor}>
          <GlowOrb color={props.primaryColor} size={500} opacity={0.08} blur={100} />
          <div style={{
            position: "absolute", inset: 0,
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            padding: sectionPadding, ...animStyle,
          }}>
            <div style={{
              background: `linear-gradient(135deg, ${props.primaryColor}10, ${props.accentColor}10)`,
              borderRadius: 28,
              padding: v ? "72px 60px" : "56px 72px",
              textAlign: "center",
              width: v ? "100%" : "auto",
              border: `1px solid ${props.primaryColor}20`,
              boxShadow: `0 4px 24px ${props.primaryColor}12, 0 8px 48px rgba(0,0,0,0.04)`,
            }}>
              <h2 style={{
                fontSize: v ? 60 : 52, fontWeight: 700,
                color: props.primaryColor, marginBottom: 28,
              }}>
                Key Takeaway
              </h2>
              <p style={{
                fontSize: v ? 36 : 32, color: props.textColor, lineHeight: 1.6,
              }}>
                Summarize the one thing viewers should remember.
              </p>
            </div>
          </div>
        </FullBleedLayout>
      );

    // ─── Outro / CTA ────────────────────────────────────────────────────
    case "outro":
      return (
        <FullBleedLayout bg={props.backgroundColor}>
          <MovingGradient color1={props.primaryColor} color2={props.accentColor} opacity={0.06} />
          <div style={{
            position: "absolute", inset: 0,
            display: "flex", flexDirection: "column",
            justifyContent: "center", alignItems: "center",
            ...animStyle,
          }}>
            <h2 style={{
              fontSize: v ? 72 : 80, fontWeight: 700,
              color: props.textColor, marginBottom: v ? 64 : 48,
            }}>
              Thanks for Watching
            </h2>
            <div style={{
              display: "flex", gap: v ? 56 : 40,
              flexDirection: v ? "column" : "row",
            }}>
              {[
                { icon: "thumbs-up", text: "Like" },
                { icon: "star", text: "Save" },
                { icon: "bell", text: "Subscribe" },
              ].map((item, i) => (
                <div key={i} style={{ textAlign: "center" }}>
                  <Icon name={item.icon} size={v ? 80 : 64} color={props.accentColor} animate="bounce" delay={i * 10} />
                  <div style={{ fontSize: v ? 32 : 26, color: "rgba(0,0,0,0.5)", marginTop: 10 }}>
                    {item.text}
                  </div>
                </div>
              ))}
            </div>
            <p style={{
              fontSize: v ? 44 : 36, color: props.primaryColor,
              marginTop: v ? 64 : 48,
            }}>
              See you next time!
            </p>
          </div>
        </FullBleedLayout>
      );

    // ─── Default — generic content section ─────────────────────────────
    default:
      return (
        <PaddedLayout bg={props.backgroundColor} orientation={props.orientation}>
          <div style={{
            position: "absolute", inset: 0,
            padding: sectionPadding,
            display: "flex", flexDirection: "column", justifyContent: "center",
            ...animStyle,
          }}>
            <h2 style={{
              fontSize: v ? 72 : 80, fontWeight: 700,
              color: props.primaryColor, textAlign: "center",
            }}>
              {section.label || section.name}
            </h2>
            <p style={{
              fontSize: v ? 34 : 30, color: props.textColor, opacity: 0.5,
              marginTop: 12, marginBottom: 20, textAlign: "center",
            }}>
              Section description goes here
            </p>
            <div style={{
              background: `linear-gradient(135deg, ${props.primaryColor}06, ${props.accentColor}06)`,
              borderRadius: 24, padding: v ? "40px 44px" : "40px 56px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.03), 0 8px 32px rgba(0,0,0,0.05)",
              border: `1px solid ${props.primaryColor}10`,
              width: "100%",
            }}>
              <p style={{
                fontSize: props.bodySize, color: props.textColor,
                fontWeight: 500, lineHeight: v ? 1.8 : 1.5,
              }}>
                Replace this default block with a component from the library,
                or add a new case to SectionComponent matching your section name.
              </p>
            </div>
          </div>
        </PaddedLayout>
      );
  }
};

// ----------------------------------------------------------------------------
// Main Video component
// ----------------------------------------------------------------------------
export const Video = (props) => {
  const timing = useTiming();
  const sections = timing.sections;
  const transitionFrames = props.transitionDuration;
  const transitionCount = Math.max(0, sections.length - 1);
  const effectiveTransitionFrames =
    props.transitionType !== "none" && transitionFrames > 0 ? transitionFrames : 0;

  // Audio-master clock: TransitionSeries renders sum(sections) - (N-1)*overlap.
  // Scale every section proportionally so the rendered total equals timing.total_frames.
  const originalTotal = sections.reduce((sum, s) => sum + (s.duration_frames || 0), 0);
  const targetTotal = timing.total_frames + transitionCount * effectiveTransitionFrames;
  const audioScale = originalTotal > 0 ? targetTotal / originalTotal : 1;

  const compensatedSections = sections.map((s) => ({
    ...s,
    duration_frames: Math.max(15, Math.round((s.duration_frames || 0) * audioScale)),
  }));

  // Absorb rounding error into the last section so total matches exactly.
  const scaledTotal = compensatedSections.reduce((sum, s) => sum + s.duration_frames, 0);
  const diff = targetTotal - scaledTotal;
  if (compensatedSections.length > 0) {
    const last = compensatedSections[compensatedSections.length - 1];
    last.duration_frames = Math.max(15, last.duration_frames + diff);
  }

  return (
    <AbsoluteFill style={{ backgroundColor: props.backgroundColor }}>
      <Scale4K orientation={props.orientation} scaleFactor={props.scaleFactor}>
        <TransitionSeries>
          {compensatedSections.map((section, i) => (
            <React.Fragment key={section.name}>
              <TransitionSeries.Sequence durationInFrames={section.duration_frames}>
                <SectionComponent section={section} props={props} />
              </TransitionSeries.Sequence>
              {i < sections.length - 1 && transitionFrames > 0 && props.transitionType !== "none" && (
                <TransitionSeries.Transition
                  presentation={getPresentation(props.transitionType)}
                  timing={linearTiming({ durationInFrames: transitionFrames })}
                />
              )}
            </React.Fragment>
          ))}
        </TransitionSeries>
      </Scale4K>

      {/* Progress bar — outside scale, renders at native resolution */}
      <ChapterProgressBar props={props} chapters={timing.sections} />

      {/* Subtitles — outside scale, font scaled to native resolution. */}
      {props.enableSubtitles && (
        <Subtitles
          src={staticFile("podcast_audio.srt")}
          fontSize={props.scaleFactor * 40}
          bgBorderRadius={props.scaleFactor * 8}
          bottomOffset={props.scaleFactor * 28}
        />
      )}

      {/* BGM — only when bgmVolume > 0. Mix via FFmpeg post-render to avoid
          double-BGM if you also enable this in Studio. */}
      {props.bgmVolume > 0 && (
        <Audio src={staticFile("bgm.mp3")} volume={props.bgmVolume} />
      )}

      {/* Narration audio — the master clock */}
      {props.enableAudio && (
        <Audio src={staticFile("podcast_audio.wav")} />
      )}
    </AbsoluteFill>
  );
};

export default Video;
