import { useState, useEffect } from "react";
import { staticFile, delayRender, continueRender, cancelRender } from "remotion";

/**
 * timing.json schema (sample):
 * {
 *   "total_duration": 60.0,      // seconds
 *   "fps": 30,
 *   "total_frames": 1800,
 *   "sections": [
 *     { "name": "hero", "label": "开场", "start_time": 0.0, "end_time": 5.0,
 *       "duration": 5.0, "start_frame": 0, "duration_frames": 150 }
 *   ]
 * }
 */

// Per-URL cache so each --public-dir gets its own timing data
const cache = new Map();
const pending = new Map();

function fetchTiming() {
  const url = staticFile("timing.json");
  if (!pending.has(url)) {
    pending.set(
      url,
      fetch(url)
        .then((r) => r.json())
        .then((data) => {
          cache.set(url, data);
          return data;
        }),
    );
  }
  return pending.get(url);
}

/**
 * useTiming — load timing.json at runtime via staticFile().
 * Works with --public-dir so each video can have its own timing data.
 * Uses delayRender/continueRender to block rendering until loaded.
 */
export const useTiming = () => {
  const url = staticFile("timing.json");
  const cached = cache.get(url) ?? null;
  const [timing, setTiming] = useState(cached);
  const [handle] = useState(() =>
    cached ? null : delayRender("Loading timing.json"),
  );

  useEffect(() => {
    if (cached) {
      setTiming(cached);
      return;
    }
    fetchTiming()
      .then((data) => {
        setTiming(data);
        if (handle !== null) continueRender(handle);
      })
      .catch((err) => {
        cancelRender(
          new Error(`Failed to load timing.json from --public-dir: ${err}`),
        );
      });
  }, [handle, cached]);

  if (!timing) {
    return { total_duration: 0, fps: 30, total_frames: 1, sections: [] };
  }
  return timing;
};

/**
 * fetchTimingData — standalone fetch for use in calculateMetadata (non-hook context).
 */
export const fetchTimingData = () => fetchTiming();
