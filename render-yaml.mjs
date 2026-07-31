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
import { tmpdir, cpus } from "node:os";
import { fileURLToPath } from "node:url";
import { load } from "js-yaml";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";

// ─── Container / CPU detection ───────────────────────────────────────────
// Inside a container, os.cpus() reports the HOST's core count, not the CPU
// limit the container is actually given. Read the real limit from cgroup v2
// (cpu.max) — falling back to cgroup v1 (cpu.cfs_quota_us) — so we size the
// render parallelism to the CPUs we actually have and don't over-subscribe.

/** Best-effort detection of running inside a container. */
function isContainer() {
  try {
    if (existsSync("/.dockerenv")) return true;
    if (existsSync("/run/.containerenv")) return true;
    if (existsSync("/proc/1/cgroup")) {
      const cg = readFileSync("/proc/1/cgroup", "utf-8");
      if (/docker|kubepods|containerd|lxc|podman|ecs|mesos/i.test(cg)) return true;
    }
    if (process.env.container) return true;
  } catch {
    /* ignore */
  }
  return false;
}

/**
 * Return the CPU count granted by the cgroup limit, or null if there is no
 * limit (or cgroups are unavailable, e.g. on Windows/macOS). Prefers cgroup v2.
 */
function getCgroupCpuCount() {
  // cgroup v2: /sys/fs/cgroup/cpu.max → "<quota> <period>" or "max <period>"
  try {
    const v2 = "/sys/fs/cgroup/cpu.max";
    if (existsSync(v2)) {
      const parts = readFileSync(v2, "utf-8").trim().split(/\s+/);
      if (parts[0] !== "max") {
        const quota = parseInt(parts[0], 10);
        const period = parseInt(parts[1], 10) || 100000;
        if (quota > 0) return Math.max(1, Math.round(quota / period));
      }
      return null; // v2 present but unlimited
    }
  } catch {
    /* ignore */
  }
  // cgroup v1 fallback: cpu.cfs_quota_us / cpu.cfs_period_us (-1 = unlimited)
  try {
    const quotaPath = "/sys/fs/cgroup/cpu/cpu.cfs_quota_us";
    const periodPath = "/sys/fs/cgroup/cpu/cpu.cfs_period_us";
    if (existsSync(quotaPath) && existsSync(periodPath)) {
      const quota = parseInt(readFileSync(quotaPath, "utf-8").trim(), 10);
      const period = parseInt(readFileSync(periodPath, "utf-8").trim(), 10) || 100000;
      if (quota > 0) return Math.max(1, Math.round(quota / period));
    }
  } catch {
    /* ignore */
  }
  return null;
}

const hostCpuCount = cpus().length;
const cgroupCpuCount = getCgroupCpuCount();
const inContainer = isContainer();
// Effective CPUs: the cgroup limit when it is binding, otherwise the host count.
const effectiveCpuCount =
  cgroupCpuCount != null && cgroupCpuCount > 0 && cgroupCpuCount < hostCpuCount
    ? cgroupCpuCount
    : hostCpuCount;

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
  --segment-workers <n>    Max segments rendered concurrently. Default: auto-sized
                           from the CPU count (in a container, the cgroup v2 CPU
                           limit is used so rendering stays within the container's
                           quota; elsewhere the host core count, default 2).
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
let segmentWorkers = null; // null → auto-sized from effectiveCpuCount below

for (let i = 1; i < args.length; i++) {
  if (args[i] === "--public-dir" && i + 1 < args.length) {
    publicDir = args[++i];
  } else if (args[i] === "--output" && i + 1 < args.length) {
    outputPath = args[++i];
  } else if (args[i] === "--segment-frames" && i + 1 < args.length) {
    segmentFrames = Math.max(1, parseInt(args[++i], 10) || 600);
  } else if (args[i] === "--segment-workers" && i + 1 < args.length) {
    segmentWorkers = Math.max(1, parseInt(args[++i], 10) || 1);
  } else if (args[i] === "--studio") {
    studioMode = true;
  }
}

// Auto-size segment_workers from the effective CPU count when not given
// explicitly. In a container this uses the cgroup limit; elsewhere the host
// core count. Per-render concurrency is derived later so total parallelism
// stays ≈ effectiveCpuCount (container-safe).
if (segmentWorkers == null) {
  if (inContainer || cgroupCpuCount != null) {
    // ~1 worker per 4 CPUs, capped to 1-4.
    segmentWorkers = Math.max(1, Math.min(Math.floor(effectiveCpuCount / 4), 4));
  } else {
    segmentWorkers = 2;
  }
}

// Per-render concurrency: when constrained by a cgroup limit, set it so that
// segment_workers × concurrency ≈ effectiveCpuCount (avoids over-subscribing
// the container, whose true limit os.cpus() does not reflect). Outside a
// constrained environment this stays null → Remotion's own default.
let renderConcurrency = null;
if (cgroupCpuCount != null && cgroupCpuCount > 0 && cgroupCpuCount < hostCpuCount) {
  renderConcurrency = Math.max(1, Math.ceil(effectiveCpuCount / segmentWorkers));
}

console.log(
  `CPU detection: container=${inContainer ? "yes" : "no"}, ` +
    `host=${hostCpuCount}, cgroup=${cgroupCpuCount ?? "n/a"}, ` +
    `effective=${effectiveCpuCount} → segment_workers=${segmentWorkers}` +
    (renderConcurrency != null ? `, per-render concurrency=${renderConcurrency}` : " (Remotion default concurrency)"),
);

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

  // Only pass concurrency when we computed a container-aware value; otherwise
  // omit it so Remotion uses its own default.
  const concurrencyOpt = renderConcurrency != null ? { concurrency: renderConcurrency } : {};

  if (segments.length <= 1) {
    // Short video — single render, no segmentation overhead.
    console.log("Rendering in a single pass...");
    await renderMedia({
      serveUrl,
      composition,
      codec: "h264",
      outputLocation: outputAbsolute,
      inputProps,
      ...concurrencyOpt,
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
          ...concurrencyOpt,
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
