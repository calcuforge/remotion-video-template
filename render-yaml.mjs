/**
 * render-yaml.mjs — Convert a remotion_sections.yaml config to JSON props
 * and invoke `remotion render` with the appropriate composition.
 *
 * Usage:
 *   node render-yaml.mjs <path-to-yaml-config> [--public-dir <dir>] [--output <path>]
 *
 * Examples:
 *   node render-yaml.mjs ../explainer-video-maker/skills/explainer-video-maker/references/demo_projects/project1/video1/remotion_sections.yaml
 *   node render-yaml.mjs config.yaml --public-dir my-project/public --output out/my-video.mp4
 *
 * The script reads the YAML config, determines the right composition from
 * resolution + orientation fields, and passes the parsed config as the
 * `config` prop to the YamlVideo composition.
 */

import { readFileSync, writeFileSync, unlinkSync, existsSync, mkdirSync } from "node:fs";
import { resolve, dirname, basename, join } from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { load } from "js-yaml";

// ─── CLI argument parsing ────────────────────────────────────────────────
const args = process.argv.slice(2);
if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
  console.log(`Usage: node render-yaml.mjs <yaml-config-path> [options]

Options:
  --public-dir <dir>   Public directory for static files (default: public/)
  --output <path>      Output video path (default: public/output_yaml.mp4)
  --studio             Open in Remotion Studio instead of rendering
  --help, -h           Show this help

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

for (let i = 1; i < args.length; i++) {
  if (args[i] === "--public-dir" && i + 1 < args.length) {
    publicDir = args[++i];
  } else if (args[i] === "--output" && i + 1 < args.length) {
    outputPath = args[++i];
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

// ─── Write JSON props file ───────────────────────────────────────────────
const propsPath = join(dirname(yamlPath), ".remotion_props_temp.json");
const propsContent = JSON.stringify({ config });

writeFileSync(propsPath, propsContent, "utf-8");
console.log(`Props written to: ${propsPath}`);

// ─── Invoke remotion ─────────────────────────────────────────────────────
const propsAbsolute = resolve(propsPath);
const outputAbsolute = resolve(outputPath);
const publicAbsolute = resolve(publicDir);
const entryPoint = resolve(
  fileURLToPath(new URL(".", import.meta.url)),
  "src",
  "index.js",
);

try {
  if (studioMode) {
    console.log(`\nOpening Remotion Studio with composition "${compositionId}"...`);
    console.log(`Public dir: ${publicAbsolute}`);
    execSync(
      `npx remotion studio "${entryPoint}" --public-dir "${publicAbsolute}" --props "${propsAbsolute}"`,
      { stdio: "inherit", cwd: resolve(fileURLToPath(new URL(".", import.meta.url))) },
    );
  } else {
    console.log(`\nRendering composition "${compositionId}"...`);
    console.log(`Output: ${outputAbsolute}`);
    console.log(`Public dir: ${publicAbsolute}`);

    const fps = config.fps || 24;

    execSync(
      `npx remotion render "${entryPoint}" "${compositionId}" "${outputAbsolute}" --public-dir "${publicAbsolute}" --props "${propsAbsolute}" --fps ${fps}`,
      { stdio: "inherit", cwd: resolve(fileURLToPath(new URL(".", import.meta.url))) },
    );

    console.log(`\nRender complete: ${outputAbsolute}`);
  }
} finally {
  // Clean up temp props file
  if (existsSync(propsPath)) {
    unlinkSync(propsPath);
  }
}
