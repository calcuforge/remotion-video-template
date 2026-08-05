/**
 * render-range.mjs — Render a single frame-range segment of a
 * remotion_sections.yaml video with Remotion.
 *
 * Distributed rendering entry point: the scheduler (proxy_agent) splits the
 * full video into frame ranges and dispatches one segment per invocation to a
 * render node. The project is bundled on every call — the caller is expected
 * to keep segment sizes coarse enough that the one-time bundle cost stays
 * small relative to the render work (or reuse the same public dir).
 *
 * Usage:
 *   node render-range.mjs <yaml-config> --public-dir <dir> --output <path>
 *                         --frame-range "<start>:<end>" [--concurrency <n>]
 *                         [--timeout-ms <ms>]
 *
 * Examples:
 *   node render-range.mjs config.yaml --public-dir my-project/public \
 *       --output seg_0_599.mp4 --frame-range "0:599" --concurrency 8
 *   node render-range.mjs config.yaml --public-dir my-project/public \
 *       --output seg_0_599.mp4 --frame-range "0:599" --serve-url /shared/bundle
 *
 * The composition (YamlVideo / YamlVideo4K / YamlVideoVertical) is selected
 * automatically based on the resolution and orientation fields in the YAML.
 */

import {
  readFileSync,
  unlinkSync,
  existsSync,
  rmSync,
  renameSync,
} from "node:fs";
import { resolve, dirname, join } from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { load } from "js-yaml";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";

const args = process.argv.slice(2);
if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
  console.log(`Usage: node render-range.mjs <yaml-config-path> [options]

Options:
  --public-dir <dir>       Public directory for static files (required for
                           AIGC assets — audio, images, videos referenced by
                           the config)
  --output <path>          Output segment video path (single-segment mode)
  --frame-range "<s>:<e>"  Frame range to render, inclusive (single mode)
  --segments "s1:e1,s2:e2" Comma-separated frame ranges to render in ONE
                           process (Chrome reused across segments); outputs
                           written to --output-dir as seg_<s>_<e>.mp4
  --output-dir <dir>       Output dir for --segments mode
  --concurrency <n>        Parallel frames inside Chrome (default: 4)
  --timeout-ms <ms>        Per-frame component/delayRender timeout
                           (default: from config.timeout_ms or 60000)
  --serve-url <dir>        Reuse an existing webpack bundle directory instead
                           of bundling again (skips the bundling step)
  --multi-process          Launch Chrome in multi-process mode on Linux
                           (chromiumOptions.enableMultiProcessOnLinux; better
                           multi-core utilization, higher memory usage)
  --help, -h               Show this help`);
  process.exit(0);
}

const yamlPath = resolve(args[0]);
if (!existsSync(yamlPath)) {
  console.error(`Error: YAML config file not found: ${yamlPath}`);
  process.exit(1);
}

let publicDir = "public";
let outputPath = "public/segment.mp4";
let frameRange = null;
let segments = null; // [{start, end}, ...] multi-segment mode
let outputDir = null;
let concurrency = 4;
let timeoutMsOverride = null;
let serveUrlOverride = null;
let multiProcess = false;

for (let i = 1; i < args.length; i++) {
  if (args[i] === "--public-dir" && i + 1 < args.length) {
    publicDir = args[++i];
  } else if (args[i] === "--output" && i + 1 < args.length) {
    outputPath = args[++i];
  } else if (args[i] === "--frame-range" && i + 1 < args.length) {
    const m = /^\s*(\d+)\s*:\s*(\d+)\s*$/.exec(args[++i]);
    if (!m) {
      console.error(`Error: invalid --frame-range "${args[i]}", expected "start:end"`);
      process.exit(1);
    }
    frameRange = [parseInt(m[1], 10), parseInt(m[2], 10)];
  } else if (args[i] === "--concurrency" && i + 1 < args.length) {
    concurrency = Math.max(1, parseInt(args[++i], 10) || 4);
  } else if (args[i] === "--timeout-ms" && i + 1 < args.length) {
    timeoutMsOverride = Math.max(1000, parseInt(args[++i], 10) || 60000);
  } else if (args[i] === "--serve-url" && i + 1 < args.length) {
    serveUrlOverride = args[++i];
  } else if (args[i] === "--segments" && i + 1 < args.length) {
    segments = [];
    for (const part of args[++i].split(",")) {
      const m = /^\s*(\d+)\s*:\s*(\d+)\s*$/.exec(part.trim());
      if (!m) {
        console.error(`Error: invalid --segments item "${part}", expected "start:end"`);
        process.exit(1);
      }
      segments.push([parseInt(m[1], 10), parseInt(m[2], 10)]);
    }
  } else if (args[i] === "--output-dir" && i + 1 < args.length) {
    outputDir = args[++i];
  } else if (args[i] === "--multi-process") {
    multiProcess = true;
  }
}

if (!frameRange && !segments) {
  console.error('Error: --frame-range "<start>:<end>" or --segments is required');
  process.exit(1);
}

// ─── Read & parse YAML (same normalization as render-yaml.mjs) ────────────
let yamlContent = readFileSync(yamlPath, "utf-8");
yamlContent = yamlContent
  .split("\n")
  .map((line) => {
    if (line.includes("{") || line.includes("[")) return line;
    return line.replace(/^(\s+[\w-]+:\s+.*?)\s*,(\s*(?:#.*)?)$/, "$1$2");
  })
  .join("\n");

const config = load(yamlContent);

// ─── Determine composition ────────────────────────────────────────────────
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

const fps = config.fps || 24;
const codec = (config.codec || "h264").toLowerCase();
const supportsCrf = ["h264", "h265", "hevc", "vp8", "vp9", "av1"].includes(codec);
const crfOpt = supportsCrf ? { crf: config.crf != null ? config.crf : 23 } : {};
const timeoutMs = timeoutMsOverride != null ? timeoutMsOverride : (config.timeout_ms != null ? config.timeout_ms : 60000);

// 待渲染段:--segments 多段(单进程循环,Chrome 复用)或 --frame-range 单段。
// 注意:segments 模式下 frameRange 为 null,不能解构。
const segs = segments && segments.length > 0 ? segments : (frameRange ? [frameRange] : []);
if (segs.length === 0) {
  console.error("Error: no frame ranges to render");
  process.exit(1);
}
console.log(`Rendering ${segs.length} segment(s) of "${compositionId}" @ ${fps} fps`);
console.log(`Public dir: ${resolve(publicDir)}`);
console.log(`Output: ${outputDir ? resolve(outputDir) : resolve(outputPath)}`);
console.log(`Codec: ${codec}, concurrency: ${concurrency}`);

const projectRoot = resolve(fileURLToPath(new URL(".", import.meta.url)));
const entryPoint = join(projectRoot, "src", "index.js");
const inputProps = { config };

let bundleDir = null;
try {
  let serveUrl;
  if (serveUrlOverride) {
    serveUrl = resolve(serveUrlOverride);
    console.log(`Reusing existing bundle: ${serveUrl}`);
  } else {
    console.log("Bundling project...");
    serveUrl = await bundle({
      entryPoint,
      publicDir: resolve(publicDir),
      webpackOverride: (cfg) => cfg,
    });
    bundleDir = serveUrl;
  }

  const composition = await selectComposition({ serveUrl, id: compositionId, inputProps });
  composition.fps = fps;

  const totalFrames = composition.durationInFrames;

  const outputAbsolute = resolve(outputPath);

  // 每段渲染失败不立即退出:重试该段(最多 MAX_RENDER_ATTEMPTS 次,连续失败才
  // 退出返回错误),重试前清理输出文件。
  const MAX_RENDER_ATTEMPTS = 3;
  let lastErr = null;
  for (const [s, e] of segs) {
    if (s > e || e >= totalFrames) {
      console.error(
        `Error: frame range ${s}-${e} out of bounds (composition has ${totalFrames} frames)`,
      );
      process.exit(1);
    }
    const out = outputDir ? resolve(join(outputDir, `seg_${s}_${e}.mp4`)) : outputAbsolute;
    let ok = false;
    for (let attempt = 1; attempt <= MAX_RENDER_ATTEMPTS; attempt++) {
      try {
        await renderMedia({
          serveUrl,
          composition,
          codec,
          frameRange: [s, e],
          outputLocation: out,
          inputProps,
          timeoutInMilliseconds: timeoutMs,
          concurrency,
          chromiumOptions: multiProcess ? { enableMultiProcessOnLinux: true } : undefined,
          ...crfOpt,
        });
        ok = true;
        break;
      } catch (err) {
        lastErr = err;
        console.error(
          `Segment ${s}-${e} attempt ${attempt}/${MAX_RENDER_ATTEMPTS} failed: ${err && err.message ? err.message : err}`,
        );
        if (attempt < MAX_RENDER_ATTEMPTS) {
          // 清理可能残留的段输出,等待后重试(serveStatic 偶发拉取超时可恢复)
          try { unlinkSync(out); } catch { /* ignore */ }
          await new Promise((r) => setTimeout(r, 5000 * attempt));
        }
      }
    }
    if (!ok) {
      throw lastErr;
    }
    console.log(`Segment ${s}-${e} complete: ${out}`);
  }

  // Guarantee faststart (moov atom at the front) so merged output streams well.
  for (const [s, e] of segs) {
    const out = outputDir ? resolve(join(outputDir, `seg_${s}_${e}.mp4`)) : outputAbsolute;
    if (existsSync(out)) {
      const fsTmp = `${out}.faststart.tmp.mp4`;
      try {
        execSync(
          `ffmpeg -y -i "${out}" -c copy -movflags +faststart "${fsTmp}"`,
          { stdio: "inherit" },
        );
        rmSync(out, { force: true });
        renameSync(fsTmp, out);
      } catch (err) {
        if (existsSync(fsTmp)) rmSync(fsTmp, { force: true });
        console.error(
          `WARNING: faststart re-mux failed, keeping original output: ${err && err.message ? err.message : err}`,
        );
      }
    }
  }

  console.log(`\nSegment render complete (${segs.length} segment(s))`);
} catch (err) {
  console.error("\nRender failed:", err && err.message ? err.message : err);
  process.exit(1);
} finally {
  if (bundleDir && existsSync(bundleDir)) {
    try { rmSync(bundleDir, { recursive: true, force: true }); } catch { /* ignore */ }
  }
}
