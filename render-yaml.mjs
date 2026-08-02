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
 * Failed runs RESUME: completed segment files are kept (video_dir/tmp/
 * remotion-segments/) and skipped on the next run; the interrupted segment's
 * file is removed so it re-renders from scratch instead of resuming a truncated
 * file. Completed segments are cleaned up once concatenation succeeds.
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
  mkdirSync,
  statSync,
  readdirSync,
  rmSync,
  renameSync,
} from "node:fs";
import { resolve, dirname, basename, join } from "node:path";
import { execSync } from "node:child_process";
import { cpus, totalmem } from "node:os";
import { fileURLToPath } from "node:url";
import { load } from "js-yaml";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";

// ─── Container / CPU / memory detection ──────────────────────────────────
// Inside a container, os.cpus() and os.totalmem() report the HOST's resources,
// not the limits the container is given. Read the real limits from cgroup v2
// (cpu.max, memory.max) — falling back to cgroup v1 — so we size the render
// parallelism to the resources we actually have and don't over-subscribe.
// On non-Linux (macOS, Windows) or bare-metal Linux, os.cpus() / os.totalmem()
// are accurate.

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

/**
 * Return the memory limit in bytes from cgroup, or null if unlimited /
 * unavailable. Prefers cgroup v2 (memory.max), falls back to v1
 * (memory.limit_in_bytes).
 */
function getCgroupMemoryBytes() {
  // cgroup v2: /sys/fs/cgroup/memory.max → bytes or "max" (unlimited)
  try {
    const v2 = "/sys/fs/cgroup/memory.max";
    if (existsSync(v2)) {
      const raw = readFileSync(v2, "utf-8").trim();
      if (raw !== "max") {
        const bytes = parseInt(raw, 10);
        if (bytes > 0) return bytes;
      }
      return null; // v2 present but unlimited
    }
  } catch {
    /* ignore */
  }
  // cgroup v1: memory.limit_in_bytes (a huge value ≈ 2^63 means unlimited)
  try {
    const v1 = "/sys/fs/cgroup/memory/memory.limit_in_bytes";
    if (existsSync(v1)) {
      const bytes = parseInt(readFileSync(v1, "utf-8").trim(), 10);
      // Values >= 2^62 are effectively "no limit"
      if (bytes > 0 && bytes < 2 ** 62) return bytes;
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

// Effective memory: cgroup limit when binding, otherwise os.totalmem().
const hostMemBytes = totalmem();
const cgroupMemBytes = getCgroupMemoryBytes();
const effectiveMemBytes =
  cgroupMemBytes != null && cgroupMemBytes < hostMemBytes
    ? cgroupMemBytes
    : hostMemBytes;
const effectiveMemMB = Math.round(effectiveMemBytes / (1024 * 1024));

// ─── Concurrency / memory budget constants ────────────────────────────────
// Each segment render spawns a headless Chrome process whose base memory scales
// with frame size (~1 GB @1080p, ~2 GB @4K). Per-render `concurrency` (parallel
// frame renders inside one Chrome) adds frame-buffer memory on top, so it is
// capped low. The memory budget bounds the NUMBER of concurrent Chrome
// processes (segment_workers); the CPU budget bounds per-render concurrency.
const RESERVE_MB = 1024;                // OS + Node.js + webpack bundle
const MEM_FRAME_BUFFER_FACTOR = 1.2;    // headroom inside each Chrome for frame buffers
const MAX_WORKERS = 3;                  // hard cap on concurrent segment renders
const MAX_PER_RENDER_CONCURRENCY = 3;   // parallel frame-render tabs per Chrome

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
  --segment-workers <n>    Max segments rendered concurrently (i.e. max headless
                           Chrome processes). Default: auto-sized from the CPU count
                           AND the memory budget — each Chrome costs ~1 GB @1080p /
                           ~2 GB @4K, so the default never over-subscribes RAM
                           (in a container, cgroup v2 CPU + memory limits are used).
                           Cap is 4; set explicitly to override.
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
let segmentWorkers = null; // null → auto-sized from the CPU + memory budget below

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

// ─── Auto-size segment_workers + per-render concurrency (resolution-aware) ─
// Workers = number of concurrent Chrome processes → memory-bounded. Per-render
// concurrency = parallel frame renders inside one Chrome → CPU-bounded + capped
// so each Chrome's frame buffers stay predictable.
// Base per-Chrome memory: ~1 GB @1080p (horizontal or vertical), ~2 GB @4K.
const memPerRenderMB = Math.round(
  (resolution === "4K" ? 2048 : 1024) * MEM_FRAME_BUFFER_FACTOR,
);
// Budget for Chrome processes: cap the render footprint at ~75% of RAM so the
// OS, Node.js, the webpack bundle, and frame-buffer spikes always have headroom.
const memBudgetMB = Math.max(
  1024,
  Math.round(effectiveMemMB * 0.75) - RESERVE_MB,
);
const maxWorkersByMem = Math.max(1, Math.floor(memBudgetMB / memPerRenderMB));
const maxWorkersByCpu = effectiveCpuCount;

if (segmentWorkers == null) {
  segmentWorkers = Math.max(
    1,
    Math.min(maxWorkersByMem, maxWorkersByCpu, MAX_WORKERS),
  );
}

// Always set explicitly (never null) so we never over-subscribe memory.
const renderConcurrency = Math.max(
  1,
  Math.min(
    MAX_PER_RENDER_CONCURRENCY,
    Math.floor(effectiveCpuCount / segmentWorkers),
  ),
);

if (segmentWorkers * memPerRenderMB > memBudgetMB) {
  console.warn(
    `WARNING: segment_workers=${segmentWorkers} × ~${memPerRenderMB}MB/Chrome exceeds the ` +
      `memory budget (~${memBudgetMB}MB). Rendering may run out of memory — lower ` +
      `--segment-workers or the video resolution if it fails.`,
  );
}

console.log(
  `Resource detection: container=${inContainer ? "yes" : "no"}, ` +
    `cpu: host=${hostCpuCount} cgroup=${cgroupCpuCount ?? "n/a"} effective=${effectiveCpuCount}, ` +
    `mem: host=${Math.round(hostMemBytes / 1024 / 1024)}MB cgroup=${cgroupMemBytes != null ? Math.round(cgroupMemBytes / 1024 / 1024) + "MB" : "n/a"} effective=${effectiveMemMB}MB, ` +
    `per-Chrome ~${memPerRenderMB}MB (${resolution}${orientation === "vertical" ? " vertical" : ""}) → ` +
    `segment_workers=${segmentWorkers}, per-render concurrency=${renderConcurrency}, ` +
    `estimated peak ≈ ${Math.round((segmentWorkers * memPerRenderMB) / 1024 * 10) / 10}GB`,
);

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

// Codec + CRF from the YAML config (defaults: h264 / 23). CRF is only applied
// to codecs that support it; prores uses proResProfile instead.
const codec = (config.codec || "h264").toLowerCase();
const supportsCrf = ["h264", "h265", "hevc", "vp8", "vp9", "av1"].includes(codec);
const crfOpt = supportsCrf ? { crf: config.crf != null ? config.crf : 23 } : {};

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
let bundleDir = null;
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
  bundleDir = serveUrl; // bundle() returns the output dir path — clean up in finally

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
  const concurrencyOpt = { concurrency: renderConcurrency };

  if (segments.length <= 1) {
    // Short video — single render, no segmentation overhead.
    console.log("Rendering in a single pass...");
    await renderMedia({
      serveUrl,
      composition,
      codec,
      outputLocation: outputAbsolute,
      inputProps,
      ...concurrencyOpt,
      ...crfOpt,
    });
  } else {
    // Render segments in parallel (bounded worker pool), then concatenate.
    // Segment files live in a STABLE directory (video_dir/tmp/remotion-segments/)
    // so a failed run can resume: on retry, segments whose file already exists
    // are skipped instead of re-rendered. Files are named by frame range
    // (seg_<start>_<end>.mp4), so a config change (fps / segment_frames) never
    // reuses a stale segment from an older layout.
    const segTmpBase = join(dirname(outputAbsolute), "tmp");
    mkdirSync(segTmpBase, { recursive: true });
    segmentDir = join(segTmpBase, "remotion-segments");
    mkdirSync(segmentDir, { recursive: true });
    const segPaths = segments.map(
      ([start, end]) => join(segmentDir, `seg_${start}_${end}.mp4`),
    );

    // Prune stale segment files that don't match the current segment layout so
    // they are never mistaken for a completed segment.
    const validSegPaths = new Set(segPaths);
    for (const f of readdirSync(segmentDir)) {
      if (!f.startsWith("seg_")) continue;
      const p = join(segmentDir, f);
      if (!validSegPaths.has(p)) {
        try { unlinkSync(p); } catch { /* ignore */ }
      }
    }

    const pending = [];
    for (let i = 0; i < segments.length; i++) {
      if (existsSync(segPaths[i]) && statSync(segPaths[i]).size > 0) {
        console.log(
          `  segment ${i + 1}/${segments.length} cached (frames ${segments[i][0]}-${segments[i][1]}) — skip`,
        );
      } else {
        pending.push(i);
      }
    }
    const workers = Math.min(segmentWorkers, pending.length);
    console.log(
      `Rendering ${pending.length} of ${segments.length} segment(s) with ${workers} concurrent worker(s) ` +
        `(~${segmentFrames} frames/segment)...`,
    );

    let next = 0;
    let done = 0;
    async function runWorker() {
      while (next < pending.length) {
        const i = pending[next++];
        const [start, end] = segments[i];
        try {
          await renderMedia({
            serveUrl,
            composition,
            codec,
            frameRange: [start, end],
            outputLocation: segPaths[i],
            inputProps,
            ...concurrencyOpt,
            ...crfOpt,
          });
        } catch (err) {
          // Remove the interrupted segment's output so a retry re-renders this
          // segment from scratch instead of resuming from a truncated file.
          try { unlinkSync(segPaths[i]); } catch { /* ignore */ }
          throw err;
        }
        done += 1;
        console.log(`  segment ${done}/${pending.length} done (frames ${start}-${end})`);
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
      `ffmpeg -y -f concat -safe 0 -i "${listFile}" -c copy -movflags +faststart "${outputAbsolute}"`,
      { stdio: "inherit" },
    );
    // Concatenation succeeded — cached segments are no longer needed.
    rmSync(segmentDir, { recursive: true, force: true });
    segmentDir = null;
  }

  // Guarantee the final output is faststart (moov atom at the front) so it can
  // be streamed / sought over HTTP without a slow tail range-request. Idempotent
  // and lossless (stream copy) — fails soft, keeping the rendered output.
  if (existsSync(outputAbsolute)) {
    const fsTmp = `${outputAbsolute}.faststart.tmp.mp4`;
    try {
      execSync(
        `ffmpeg -y -i "${outputAbsolute}" -c copy -movflags +faststart "${fsTmp}"`,
        { stdio: "inherit" },
      );
      rmSync(outputAbsolute, { force: true });
      renameSync(fsTmp, outputAbsolute);
      console.log("Applied faststart (moov atom moved to the front).");
    } catch (err) {
      if (existsSync(fsTmp)) rmSync(fsTmp, { force: true });
      console.error(
        `WARNING: faststart re-mux failed, keeping original output: ${err && err.message ? err.message : err}`,
      );
    }
  }

  console.log(`\nRender complete: ${outputAbsolute}`);
} catch (err) {
  console.error("\nRender failed:", err && err.message ? err.message : err);
  if (segmentDir) {
    console.error(
      `Completed segments are kept in "${segmentDir}" and will be skipped on retry.`,
    );
  }
  process.exit(1);
} finally {
  // Remotion's bundle() does NOT clean up its webpack output dir — do it here
  // to prevent remotion-webpack-bundle-* dirs from accumulating in the system temp.
  if (bundleDir && existsSync(bundleDir)) {
    rmSync(bundleDir, { recursive: true, force: true });
  }
}
