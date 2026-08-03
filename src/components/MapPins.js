import { AbsoluteFill } from "remotion";
import { useEntrance, usePulse } from "./animations.js";
import { GridPattern } from "./AnimatedBackground.js";

/**
 * MapPins — abstract location map for geographic narrative (where something
 * happened, which countries/regions are involved). A lat/long-style grid
 * backdrop with pulsing pins at percentage coordinates; optional SVG links
 * between pins. No real country borders are drawn (accuracy/copyright) — the
 * map is deliberately schematic.
 *
 * pins: [{ label, x (0-100), y (0-100), description? }]
 * lines: [{ from, to }] — pin indices, drawn as accent-colored arcs.
 * Keep `pins.length` constant per section so hook order stays stable.
 */
const Pin = ({ props, pin, index, delay }) => {
  const a = useEntrance(props.enableAnimations, delay + index * 6, "gentle");
  const pulse = usePulse(0.9, 1.25, 50, index * 13);
  const x = pin.x, y = pin.y;
  return (
    <div style={{
      position: "absolute",
      left: `${x}%`, top: `${y}%`,
      transform: "translate(-50%, -50%)",
      display: "flex", flexDirection: "column",
      alignItems: "center",
      opacity: a.opacity,
    }}>
      <div style={{
        width: 14, height: 14, borderRadius: "50%",
        background: props.primaryColor,
        boxShadow: `0 0 0 4px ${props.primaryColor}22, 0 0 18px ${props.primaryColor}66`,
        transform: `scale(${pulse.scale})`,
      }} />
      <div style={{
        marginTop: 8,
        background: `${props.primaryColor}12`,
        border: `1px solid ${props.primaryColor}30`,
        borderRadius: 8,
        padding: "6px 14px",
        fontSize: props.orientation === "vertical" ? 20 : 22,
        fontWeight: 700,
        color: props.primaryColor,
        whiteSpace: "nowrap",
      }}>
        {pin.label}
      </div>
      {pin.description && (
        <div style={{
          marginTop: 4, fontSize: 16, color: props.textColor, opacity: 0.5,
          whiteSpace: "nowrap",
        }}>
          {pin.description}
        </div>
      )}
    </div>
  );
};

export const MapPins = ({
  props,
  title,
  pins = [],
  lines = [],
  delay = 0,
}) => {
  const v = props.orientation === "vertical";
  const titleAnim = useEntrance(props.enableAnimations, delay);

  return (
    <AbsoluteFill style={{ backgroundColor: props.backgroundColor }}>
      <GridPattern color={props.primaryColor} opacity={0.05} variant="lines" spacing={v ? 56 : 72} />
      <GridPattern color={props.primaryColor} opacity={0.04} variant="dots" spacing={v ? 28 : 36} />
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", flexDirection: "column",
        padding: v ? "60px 40px" : "50px 90px",
      }}>
        {title && (
          <h2 style={{
            fontSize: v ? 52 : 60, fontWeight: 800, color: props.primaryColor,
            marginBottom: v ? 28 : 24, textAlign: "center",
            opacity: titleAnim.opacity, transform: `translateY(${titleAnim.translateY}px)`,
          }}>
            {title}
          </h2>
        )}
        <div style={{ flex: 1, position: "relative" }}>
          <svg
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            {lines.map((line, i) => {
              const from = pins[line.from], to = pins[line.to];
              if (!from || !to) return null;
              const mx = (from.x + to.x) / 2;
              const my = Math.min(from.y, to.y) - 12;
              return (
                <path
                  key={i}
                  d={`M ${from.x} ${from.y} Q ${mx} ${my} ${to.x} ${to.y}`}
                  fill="none"
                  stroke={props.accentColor}
                  strokeWidth={0.5}
                  strokeDasharray="2 1.5"
                  strokeLinecap="round"
                />
              );
            })}
          </svg>
          {pins.map((pin, i) => (
            <Pin key={i} props={props} pin={pin} index={i} delay={delay} />
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
};
