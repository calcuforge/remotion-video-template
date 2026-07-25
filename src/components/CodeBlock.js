import React from "react";
import { useEntrance } from "./animations.js";

/**
 * CodeBlock — macOS-style terminal window with staggered line entrance.
 * Lines are plain strings; syntax highlighting is intentionally omitted so
 * any language code fits the same template.
 *
 * Note: line-by-line hooks are not safe when `lines.length` is dynamic —
 * keep `lines.length` constant for a given section so hook order stays stable.
 */
const Line = ({ props, line, delay }) => {
  const lineAnim = useEntrance(props.enableAnimations, delay);
  return (
    <div style={{
      fontFamily: "SF Mono, Menlo, Monaco, monospace", fontSize: 26,
      color: "#e6e6e6", lineHeight: 1.8,
      opacity: lineAnim.opacity, transform: `translateY(${lineAnim.translateY}px)`,
    }}>
      {line}
    </div>
  );
};

export const CodeBlock = ({
  props,
  title = "terminal",
  lines,
  delay = 0,
}) => {
  const anim = useEntrance(props.enableAnimations, delay);
  return (
    <div style={{
      width: "100%", borderRadius: 20, overflow: "hidden",
      opacity: anim.opacity, transform: `translateY(${anim.translateY}px)`,
      boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
    }}>
      <div style={{
        background: "#2d2d2d", padding: "14px 24px",
        display: "flex", alignItems: "center", gap: 12,
      }}>
        <div style={{ display: "flex", gap: 8 }}>
          {["#ff5f57", "#febc2e", "#28c840"].map((c) => (
            <div key={c} style={{ width: 14, height: 14, borderRadius: 7, background: c }} />
          ))}
        </div>
        <span style={{ fontSize: 20, color: "rgba(255,255,255,0.5)", marginLeft: 8 }}>{title}</span>
      </div>
      <div style={{ background: "#1e1e1e", padding: "28px 32px" }}>
        {lines.map((line, i) => (
          <Line key={i} props={props} line={line} delay={delay + 5 + i * 4} />
        ))}
      </div>
    </div>
  );
};
