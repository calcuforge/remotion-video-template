import { useState, useEffect } from "react";
import { staticFile, delayRender, continueRender } from "remotion";

/**
 * Asset manifest schema (sample):
 * {
 *   "schema_version": 1,
 *   "assets": [
 *     { "id": "hero_bg", "section": "hero", "type": "image", "role": "background",
 *       "source": "user", "status": "resolved", "path": "hero_bg.jpg",
 *       "license": "CC0", "credit": "..." }
 *   ]
 * }
 *
 * Components only render assets with status === "resolved" and a non-empty path.
 * A missing manifest resolves to an empty one (text-only video still works).
 */

const EMPTY = { schema_version: 1, assets: [] };

const cache = new Map();
const pending = new Map();

function fetchManifest() {
  const url = staticFile("assets/manifest.json");
  if (!pending.has(url)) {
    pending.set(
      url,
      fetch(url)
        .then((r) => (r.ok ? r.json() : EMPTY))
        .catch(() => EMPTY)
        .then((data) => {
          cache.set(url, data);
          return data;
        }),
    );
  }
  return pending.get(url);
}

/**
 * useAssets — load assets/manifest.json at runtime via staticFile().
 */
export const useAssets = () => {
  const url = staticFile("assets/manifest.json");
  const cached = cache.get(url) ?? null;
  const [manifest, setManifest] = useState(cached);
  const [handle] = useState(() =>
    cached ? null : delayRender("Loading assets/manifest.json"),
  );

  useEffect(() => {
    if (cached) {
      setManifest(cached);
      return;
    }
    fetchManifest().then((data) => {
      setManifest(data);
      if (handle !== null) continueRender(handle);
    });
  }, [handle, cached]);

  return manifest ?? EMPTY;
};

/**
 * getAsset — look up one resolved asset by id. Returns null if absent or unresolved.
 */
export const getAsset = (manifest, id) => {
  const a = manifest.assets.find((e) => e.id === id);
  return a && a.status === "resolved" && a.path ? a : null;
};

/**
 * getSectionAssets — all resolved assets for a section, optionally filtered by role.
 */
export const getSectionAssets = (manifest, section, role) =>
  manifest.assets.filter(
    (a) =>
      a.section === section &&
      a.status === "resolved" &&
      a.path &&
      (role === undefined || a.role === role),
  );

/**
 * assetSrc — staticFile() URL for a resolved asset entry.
 */
export const assetSrc = (entry) => staticFile(entry.path);
