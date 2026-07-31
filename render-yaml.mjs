/**
 * render-yaml.mjs — Convert a remotion_sections.yaml config to JSON props and
 * render it with Remotion.
 *
 * Rendering strategy (optimized): the composition is bundled once, then rendered
 * in frame-range SEGMENTS in parallel (each segment uses Remotion's default
 * per-render concurrency), and the segments are concatenated with ffmpeg. This
 * roughly multiplies throughput vs a single render (which only uses ~half the
 * CPU cores by default) while keeping memory usage per render low. Short videos
 * (≤ one segment) are rendered in a single pass.
 *
 * Usage:
 *   node render-yaml.mjs <path-to-yaml-config> [--public-dir <dir>] [--output <path>]
 *                        [--segment-frames <n>] [--segment-workers <n>]
 *
 * Examples:
 *   node render-yaml.mjs ../explainer-video-maker/.../remotion_sections.yaml
 *   node render-yaml.mjs config.yaml --public-dir my-project/public --output out/my-video.mp4
 *
 * The composition (YamlVideo / YamlVideo4K / YamlVideoVertical) is selected
 * automatically based on the resolution and orientation fields in the YAML.
 */

import {
  readFileSync,
  writeFileSync,
  unlinkSync,
  existsSync,
  mkdtempSync,
  rmSync,
} from "node:fs";
import { resolve, dirname, basename, join } from "node:path";
import { execSync } from "node:child_process";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { load } from "js-yaml";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";

// ─── CLI argument parsing ────────────────────────────────────────────────
const args = process.argv.slice(2);
if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
  console.log(`Usage: node render-yaml.mjs <yaml-config-path> [options]

Options:
  --public-dir <dir>       Public directory for static files (default: public/)
  --output <path>          Output video path (default: public/output_yaml.mp4)
  --segment-frames <n>     Frames per render segment (default: 600). The video is
                           split into segments of this size, rendered in parallel,
                           then concatenated. Videos ≤ one segment render in one pass.
  --segment-workers <n>    Max segments rendered concurrently (default: 2). Each
                           segment uses Remotion's default per-render concurrency.
  --studio                 Open in Remotion Studio instead of rendering
  --help, -h               Show this help

The composition (YamlVideo / YamlVideo4K / YamlVideoVertical) is selected
automatically based on the resolution and orientation fields in the YAML.`);
  process.exit(0);
}

const yamlPath = resolve(args[0]);
if (!existsSync(yamlPath)) {
  console.error(`Error: YAML config file not found: ${yamlPath}`);
  process.exit(1);
}

let publicDir = "public";
let outputPath = "public/output_yaml.mp4";
let studioMode = false;
let segmentFrames = 600;
let segmentWorkers = 2;

for (let i = 1; i < args.length; i++) {
  if (args[i] === "--public-dir" && i + 1 < args.length) {
    publicDir = args[++i];
  } else if (args[i] === "--output" && i + 1 < args.length) {
    outputPath = args[++i];
  } else if (args[i] === "--segment-frames" && i + 1 < args.length) {
    segmentFrames = Math.max(1, parseInt(args[++i], 10) || 600);
  } else if (args[i] === "--segment-workers" && i + 1 < args.length) {
    segmentWorkers = Math.max(1, parseInt(args[++i], 10) || 2);
  } else if (args[i] === "--studio") {
    studioMode = true;
  }
}

// ─── Read & parse YAML ───────────────────────────────────────────────────
console.log(`Reading YAML config: ${yamlPath}`);
let yamlContent = readFileSync(yamlPath, "utf-8");

// Pre-process: strip trailing commas from YAML value lines.
// Common mistake when writing JSON-style syntax inside YAML.
// Skips lines containing { or [ (inline JSON / flow-style mappings).
yamlContent = yamlContent
  .split("\n")
  .map((line) => {
    if (line.includes("{") || line.includes("[")) return line;
    return line.replace(/^(\s+[\w-]+:\s+.*?)\s*,(\s*(?:#.*)?)$/, "$1$2");
  })
  .join("\n");

const config = load(yamlContent);

// ─── Determine composition ───────────────────────────────────────────────
const resolution = (config.resolution || "1080P").toUpperCase();
const orientation = config.orientation || "horizontal";

let compositionId;
if (resolution === "4K" && orientation === "vertical") {
  console.error("Error: 4K vertical is not supported. Use 1080P for vertical.");
  process.exit(1);
} else if (resolution === "4K") {
  compositionId = "YamlVideo4K";
} else if (orientation === "vertical") {
  compositionId = "YamlVideoVertical";
} else {
  compositionId = "YamlVideo";
}

// ─── Resolve asset paths ─────────────────────────────────────────────────
// Convert relative paths in remotion_data to be relative to public dir
const resolveDataPaths = (data, componentName) => {
  if (!data || typeof data !== "object") return data;
  const result = { ...data };

  if ((componentName === "AssetImage" || componentName === "AssetVideo") && data.src) {
    // Keep src as-is; it will be resolved at runtime via staticFile()
  }

  return result;
};

// Walk through stories and resolve paths
if (config.stories) {
  for (const story of config.stories) {
    if (story.section_list) {
      for (const section of story.section_list) {
        if (section.remotion_data) {
          section.remotion_data = resolveDataPaths(
            section.remotion_data,
            section.remotion_component,
          );
        }
      }
    }
  }
}

// ─── Paths ───────────────────────────────────────────────────────────────
const outputAbsolute = resolve(outputPath);
const publicAbsolute = resolve(publicDir);
const projectRoot = resolve(fileURLToPath(new URL(".", import.meta.url)));
const entryPoint = join(projectRoot, "src", "index.js");
const inputProps = { config };
const fps = config.fps || 24;

// ─── Studio mode ─────────────────────────────────────────────────────────
if (studioMode) {
  const propsPath = join(dirname(yamlPath), ".remotion_props_temp.json");
  writeFileSync(propsPath, JSON.stringify(inputProps), "utf-8");
  console.log(`\nOpening Remotion Studio with composition "${compositionId}"...`);
  console.log(`Public dir: ${publicAbsolute}`);
  try {
    execSync(
      `npx remotion studio "${entryPoint}" --public-dir "${publicAbsolute}" --props "${propsPath}"`,
      { stdio: "inherit", cwd: projectRoot },
    );
  } finally {
    if (existsSync(propsPath)) unlinkSync(propsPath);
  }
  process.exit(0);
}

// ─── Render (segmented + parallel + ffmpeg concat) ───────────────────────
let segmentDir = null;
try {
  console.log(`\nRendering composition "${compositionId}"...`);
  console.log(`Output: ${outputAbsolute}`);
  console.log(`Public dir: ${publicAbsolute}`);

  // Bundle the project once (reused for every segment render).
  console.log("Bundling project...");
  const serveUrl = await bundle({
    entryPoint,
    publicDir: publicAbsolute,
    webpackOverride: (cfg) => cfg,
  });

  // Resolve the composition (runs calculateMetadata → real durationInFrames).
  const composition = await selectComposition({ serveUrl, id: compositionId, inputProps });
  composition.fps = fps; // match the YAML fps (same as the old --fps flag)
  const totalFrames = composition.durationInFrames;
  console.log(`Composition resolved: ${totalFrames} frames @ ${fps} fps`);

  // Build the frame-range segments.
  const segments = [];
  for (let start = 0; start < totalFrames; start += segmentFrames) {
    segments.push([start, Math.min(start + segmentFrames - 1, totalFrames - 1)]);
  }

  if (segments.length <= 1) {
    // Short video — single render, no segmentation overhead.
    console.log("Rendering in a single pass...");
    await renderMedia({
      serveUrl,
      composition,
      codec: "h264",
      outputLocation: outputAbsolute,
      inputProps,
    });
  } else {
    // Render segments in parallel (bounded worker pool), then concatenate.
    segmentDir = mkdtempSync(join(tmpdir(), "remotion-segments-"));
    const segPaths = segments.map((_, i) =>
      join(segmentDir, `seg_${String(i).padStart(4, "0")}.mp4`),
    );
    const workers = Math.min(segmentWorkers, segments.length);
    console.log(
      `Rendering ${segments.length} segment(s) with ${workers} concurrent worker(s) ` +
        `(~${segmentFrames} frames/segment)...`,
    );

    let next = 0;
    let done = 0;
    async function runWorker() {
      while (next < segments.length) {
        const i = next++;
        const [start, end] = segments[i];
        await renderMedia({
          serveUrl,
          composition,
          codec: "h264",
          frameRange: [start, end],
          outputLocation: segPaths[i],
          inputProps,
        });
        done += 1;
        console.log(`  segment ${done}/${segments.length} done (frames ${start}-${end})`);
      }
    }
    await Promise.all(Array.from({ length: workers }, () => runWorker()));

    // Concatenate segments with ffmpeg (stream copy — same encoder/settings).
    console.log("Concatenating segments with ffmpeg...");
    const listFile = join(segmentDir, "concat.txt");
    writeFileSync(
      listFile,
      segPaths.map((p) => `file '${p.replace(/'/g, `'\\''`)}'`).join("\n"),
      "utf-8",
    );
    execSync(
      `ffmpeg -y -f concat -safe 0 -i "${listFile}" -c copy "${outputAbsolute}"`,
      { stdio: "inherit" },
    );
  }

  console.log(`\nRender complete: ${outputAbsolute}`);
} catch (err) {
  console.error("\nRender failed:", err && err.message ? err.message : err);
  process.exit(1);
} finally {
  if (segmentDir && existsSync(segmentDir)) {
    rmSync(segmentDir, { recursive: true, force: true });
  }
}
