/**
 * validate-remotion-data.mjs — Validate remotion_data fields per component
 * in a remotion_sections.yaml file.
 *
 * Checks each scene's remotion_component + remotion_data against a per-component
 * schema: required fields, array item schemas, and enum values.
 *
 * Usage:
 *   node validate-remotion-data.mjs <path-to-remotion_sections.yaml>
 *
 * Output: JSON envelope { status, msg, data: { errors, warnings, scenes } }
 * Exit codes: 0 = valid, 1 = errors found.
 */

import { readFileSync } from "node:fs";
import { load } from "js-yaml";

// ─── Component schemas ────────────────────────────────────────────────────

const SCHEMAS = {
  QuoteBlock: {
    required: ["quote"],
    optional: ["heading", "attribution"],
  },
  FeatureGrid: {
    required: ["items"],
    optional: ["heading", "columns"],
    arrayItems: {
      items: { required: ["title"], optional: ["icon", "description"] },
    },
  },
  IconCard: {
    required: ["title"],
    optional: ["heading", "icon", "description"],
  },
  ComparisonCard: {
    required: ["left", "right"],
    optional: ["heading"],
    objectFields: {
      left: { required: ["title"], optional: ["items", "highlight"] },
      right: { required: ["title"], optional: ["items", "highlight"] },
    },
  },
  StatCounter: {
    required: ["items"],
    optional: ["heading"],
    arrayItems: {
      items: { required: ["value", "label"], optional: ["suffix", "icon"] },
    },
  },
  DataBar: {
    required: ["items"],
    optional: ["heading"],
    arrayItems: {
      items: { required: ["label", "value"], optional: [] },
    },
  },
  Timeline: {
    required: ["items"],
    optional: ["heading"],
    arrayItems: {
      items: { required: ["label"], optional: ["description"] },
    },
  },
  FlowChart: {
    required: ["steps"],
    optional: ["heading"],
    arrayItems: {
      steps: { required: ["label"], optional: ["description", "icon"] },
    },
  },
  CodeBlock: {
    required: ["lines"],
    optional: ["heading", "title"],
  },
  DataTable: {
    required: ["headers", "rows"],
    optional: ["heading", "highlightRows"],
  },
  DiagramReveal: {
    required: ["nodes", "edges"],
    optional: ["heading", "direction"],
    arrayItems: {
      nodes: { required: ["id", "label"], optional: [] },
      edges: { required: ["from", "to"], optional: [] },
    },
    enums: { direction: ["left", "right", "up", "down"] },
  },
  AnimationDemo: {
    required: [],
    optional: ["heading", "type", "color"],
    enums: { type: ["shapes", "particles", "waves", "clock"] },
  },
  AssetImage: {
    required: ["src"],
    optional: ["id", "role", "caption", "kenBurns", "dim", "delay", "totalFrame"],
    enums: { role: ["background", "inline"] },
  },
  AssetVideo: {
    required: ["src"],
    optional: ["id", "role", "muted", "dim", "delay"],
    enums: { role: ["background", "inline"] },
  },
  KenBurnsImage: {
    required: ["src"],
    optional: ["id", "role", "zoom", "pan", "caption", "dim", "delay", "totalFrame"],
    enums: {
      role: ["background", "inline"],
      zoom: ["in", "out", "none"],
      pan: ["none", "left", "right", "up", "down",
            "up-left", "up-right", "down-left", "down-right"],
    },
  },
  MediaSection: {
    required: ["items"],
    optional: ["heading", "columns", "layout", "text", "data", "delay"],
    enums: { layout: ["card", "full"], columns: [2, 3] },
    arrayItems: {
      items: { required: ["src"], optional: ["alt", "caption", "borderColor"] },
      data: { required: ["value", "label"], optional: ["suffix"] },
    },
  },
};

// ─── Short-label checks ───────────────────────────────────────────────────
// Data/text components display *data points*, not narration. A common mistake
// is feeding a full sentence into a label field (e.g. a StatCounter whose
// label reads "最初的几轮搜索一无所获，黑匣子的信号也在"), which renders as a
// number floating above a broken half-sentence. These specs name the fields
// that MUST stay short; sentence punctuation there is an error, over-length a
// warning. Fields that legitimately hold prose (descriptions, quotes, code
// lines, diagram node labels) are intentionally NOT listed.
const SENTENCE_PUNCT = /[，。；！？、,;!?]/;
const SHORT_LABEL_SPECS = {
  StatCounter: [
    { path: "items[].label", max: 10 },
    { path: "items[].suffix", max: 4 },
  ],
  DataBar: [
    { path: "items[].label", max: 10 },
  ],
  IconCard: [
    { path: "title", max: 14 },
  ],
  FeatureGrid: [
    { path: "items[].title", max: 14 },
  ],
  Timeline: [
    { path: "items[].label", max: 14 },
  ],
  FlowChart: [
    { path: "steps[].label", max: 14 },
  ],
  DataTable: [
    { path: "headers[]", max: 14, punctWarn: true },
  ],
  MediaSection: [
    { path: "data[].label", max: 10 },
    { path: "data[].suffix", max: 4 },
  ],
};

// Walk a dotted path that may contain one-level `[]` array wildcards, calling
// cb(value) for each resolved leaf.
function forEachField(node, path, cb) {
  const parts = path.split(".");
  const walk = (cur, i) => {
    if (cur === undefined || cur === null) return;
    if (i === parts.length) { cb(cur); return; }
    const part = parts[i];
    if (part.endsWith("[]")) {
      const key = part.slice(0, -2);
      const arr = cur[key];
      if (Array.isArray(arr)) arr.forEach((el) => walk(el, i + 1));
    } else {
      if (typeof cur === "object") walk(cur[part], i + 1);
    }
  };
  walk(node, 0);
}

function checkShortLabels(component, data, prefix, errors, warnings) {
  const specs = SHORT_LABEL_SPECS[component];
  if (!specs) return;
  for (const spec of specs) {
    forEachField(data, spec.path, (val) => {
      if (typeof val !== "string" || val === "") return;
      if (SENTENCE_PUNCT.test(val)) {
        const msg = `${prefix}: [${component}] '${spec.path}' = "${val}" reads like narration ` +
          `(contains sentence punctuation). Data fields hold short labels only — ` +
          `put the full sentence in narration.content and use a ≤${spec.max}-char label here.`;
        if (spec.punctWarn) warnings.push(msg); else errors.push(msg);
      } else if (val.length > spec.max) {
        warnings.push(
          `${prefix}: [${component}] '${spec.path}' = "${val}" is ${val.length} chars ` +
          `(>${spec.max}); keep labels/headers short so they don't wrap awkwardly.`,
        );
      }
    });
  }
}

// ─── Validation logic ─────────────────────────────────────────────────────

function validateScene(component, data, sceneId, storyId) {
  const errors = [];
  const warnings = [];
  const prefix = `${storyId}/${sceneId}`;

  const schema = SCHEMAS[component];
  if (!schema) {
    errors.push(`${prefix}: unknown component '${component}'`);
    return { errors, warnings };
  }

  if (data === null || data === undefined || typeof data !== "object" || Array.isArray(data)) {
    errors.push(`${prefix}: remotion_data must be a JSON object, got ${typeof data}`);
    return { errors, warnings };
  }

  // Required fields
  for (const field of schema.required) {
    if (data[field] === undefined || data[field] === null || data[field] === "") {
      errors.push(`${prefix}: [${component}] missing required field '${field}'`);
    }
  }

  // Enum validation
  if (schema.enums) {
    for (const [field, allowed] of Object.entries(schema.enums)) {
      const val = data[field];
      if (val !== undefined && val !== null && val !== "" && !allowed.includes(val)) {
        errors.push(`${prefix}: [${component}] field '${field}' = '${val}' not in [${allowed.join(", ")}]`);
      }
    }
  }

  // Array item validation
  if (schema.arrayItems) {
    for (const [field, itemSchema] of Object.entries(schema.arrayItems)) {
      const arr = data[field];
      if (arr === undefined || arr === null) continue;
      if (!Array.isArray(arr)) {
        errors.push(`${prefix}: [${component}] field '${field}' must be an array`);
        continue;
      }
      if (arr.length === 0) {
        warnings.push(`${prefix}: [${component}] field '${field}' is an empty array`);
        continue;
      }
      arr.forEach((item, i) => {
        if (typeof item !== "object" || item === null) {
          errors.push(`${prefix}: [${component}] ${field}[${i}] must be an object`);
          return;
        }
        for (const req of itemSchema.required) {
          if (item[req] === undefined || item[req] === null || item[req] === "") {
            errors.push(`${prefix}: [${component}] ${field}[${i}] missing required field '${req}'`);
          }
        }
      });
    }
  }

  // Nested object validation (e.g., ComparisonCard left/right)
  if (schema.objectFields) {
    for (const [field, objSchema] of Object.entries(schema.objectFields)) {
      const obj = data[field];
      if (obj === undefined || obj === null) continue;
      if (typeof obj !== "object" || Array.isArray(obj)) {
        errors.push(`${prefix}: [${component}] field '${field}' must be an object`);
        continue;
      }
      for (const req of objSchema.required) {
        if (obj[req] === undefined || obj[req] === null || obj[req] === "") {
          errors.push(`${prefix}: [${component}] ${field} missing required field '${req}'`);
        }
      }
    }
  }

  // Short-label / narration-leak checks (StatCounter, DataBar, cards, etc.)
  checkShortLabels(component, data, prefix, errors, warnings);

  // Unknown field warnings
  const known = new Set([
    ...(schema.required || []),
    ...(schema.optional || []),
  ]);
  for (const key of Object.keys(data)) {
    if (!known.has(key)) {
      warnings.push(`${prefix}: [${component}] unknown field '${key}' (ignored by component)`);
    }
  }

  return { errors, warnings };
}

// ─── Main ─────────────────────────────────────────────────────────────────

const yamlPath = process.argv[2];
if (!yamlPath) {
  console.error("Usage: node validate-remotion-data.mjs <remotion_sections.yaml>");
  process.exit(1);
}

let config;
try {
  const raw = readFileSync(yamlPath, "utf-8");
  config = load(raw);
} catch (e) {
  console.log(JSON.stringify({
    status: "error",
    msg: `Failed to load YAML: ${e.message}`,
    data: { errors: [`YAML parse error: ${e.message}`], warnings: [] },
  }, null, 2));
  process.exit(1);
}

const allErrors = [];
const allWarnings = [];
let sceneCount = 0;

for (const story of config?.stories || []) {
  const storyId = story.story_id || story.story_name || "?";
  for (const section of story.section_list || []) {
    for (const scene of section.scene_list || []) {
      sceneCount++;
      const component = scene.remotion_component || "";
      const sceneId = scene.scene_id || `scene_${sceneCount}`;

      // Parse remotion_data (may be a JSON string or already an object)
      let data = scene.remotion_data;
      if (typeof data === "string") {
        try {
          data = JSON.parse(data);
        } catch (e) {
          allErrors.push(`${storyId}/${sceneId}: remotion_data is not valid JSON: ${e.message}`);
          continue;
        }
      }

      const result = validateScene(component, data, sceneId, storyId);
      allErrors.push(...result.errors);
      allWarnings.push(...result.warnings);
    }
  }
}

if (allErrors.length > 0) {
  console.log(JSON.stringify({
    status: "error",
    msg: `remotion_data validation failed: ${allErrors.length} error(s) across ${sceneCount} scene(s)`,
    data: { errors: allErrors, warnings: allWarnings, scenes: sceneCount },
  }, null, 2));
  process.exit(1);
} else {
  console.log(JSON.stringify({
    status: allWarnings.length > 0 ? "warning" : "ok",
    msg: `remotion_data valid: ${sceneCount} scene(s)${allWarnings.length > 0 ? `, ${allWarnings.length} warning(s)` : ""}`,
    data: { errors: [], warnings: allWarnings, scenes: sceneCount },
  }, null, 2));
  process.exit(0);
}
