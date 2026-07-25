import React from "react";
import { useEntrance, useBarFill } from "./animations.js";

/**
 * DataBar — horizontal bar chart with animated fill.
 * Each item has { label, value, maxValue? }. value is treated as a percentage
 * if maxValue is omitted; otherwise value/maxValue*100 is used.
 *
 * Keep `items.length` constant per section so hook order stays stable.
 */
const Bar = ({ props, item, max, delay }) => {
  const pct = (item.value / max) * 100;
  const a = useEntrance(props.enableAnimations, delay);
  const fillPct = useBarFill(pct, delay + 10);
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 20,
      opacity: a.opacity, transform: `translateY(${a.translateY}px)`,
    }}>
      <div style={{
        fontSize: 28, fontWeight: 600, color: props.textColor,
        width: 160, textAlign: "right", flexShrink: 0,
      }}>
        {item.label}
      </div>
      <div style={{
        flex: 1, height: 40, background: "rgba(0,0,0,0.06)", borderRadius: 20, overflow: "hidden",
      }}>
        <div style={{
          width: `${fillPct}%`, height: "100%", borderRadius: 20,
          background: `linear-gradient(90deg, ${props.primaryColor}, ${props.accentColor})`,
          boxShadow: `0 2px 8px ${props.primaryColor}30`,
        }} />
      </div>
      <div style={{ fontSize: 26, fontWeight: 700, color: props.primaryColor, width: 80 }}>
        {item.value}{item.suffix || (item.maxValue ? "" : "%")}
      </div>
    </div>
  );
};

export const DataBar = ({
  props,
  items,
  delay = 0,
}) => {
  const max = Math.max(...items.map((d) => d.maxValue ?? d.value));
  return (
    <div style={{
      display: "flex", flexDirection: "column", gap: 24, width: "100%",
      background: "rgba(0,0,0,0.02)", borderRadius: 24, padding: "32px 36px",
      boxShadow: "0 2px 8px rgba(0,0,0,0.03), 0 4px 16px rgba(0,0,0,0.04)",
    }}>
      {items.map((item, i) => (
        <Bar key={i} props={props} item={item} max={max} delay={delay + i * 5} />
      ))}
    </div>
  );
};
