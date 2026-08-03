import { Img, staticFile } from "remotion";
import { useEntrance, staggerDelay } from "./animations.js";

const resolveSrc = (src) => {
  if (!src) return null;
  if (src.startsWith("http") || src.startsWith("/") || src.match(/^[A-Za-z]:/)) {
    return src;
  }
  return staticFile(src);
};

/**
 * MediaSection — single image or image grid, with optional text and stat row.
 *
 * items: [{ src, alt?, caption?, borderColor? }] — length 1 renders a single
 * image (layout "full" | "card"); length > 1 renders a grid (columns 2|3,
 * vertical orientation collapses to 1 column).
 * text: optional description rendered above the images.
 * data: [{ value, label, suffix? }] optional stat cards rendered below.
 *
 * Keep `items.length` and `data.length` constant per section so hook order
 * stays stable.
 */
const StatRow = ({ props, data, delay }) => {
  const v = props.orientation === "vertical";
  return (
    <div style={{
      display: "flex", gap: v ? 24 : 28, width: "100%",
      flexDirection: v ? "column" : "row", justifyContent: "center",
      marginTop: v ? 32 : 36,
    }}>
      {data.map((item, i) => {
        const a = useEntrance(props.enableAnimations, delay + staggerDelay(i, 6, 8), "gentle");
        return (
          <div key={i} style={{
            flex: v ? undefined : 1,
            textAlign: "center",
            padding: v ? "24px 28px" : "28px 24px",
            background: `linear-gradient(135deg, ${props.primaryColor}06, ${props.primaryColor}10)`,
            borderRadius: 20,
            border: `1px solid ${props.primaryColor}12`,
            boxShadow: `0 4px 16px ${props.primaryColor}10`,
            opacity: a.opacity, transform: `translateY(${a.translateY}px) scale(${a.scale})`,
          }}>
            <div style={{
              fontSize: v ? 44 : 52, fontWeight: 800, color: props.primaryColor,
              letterSpacing: -2, lineHeight: 1,
            }}>
              {item.value}{item.suffix || ""}
            </div>
            <div style={{
              fontSize: v ? 22 : 24, fontWeight: 500, color: props.textColor,
              marginTop: 8, opacity: 0.85,
            }}>
              {item.label}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const SingleImage = ({ props, item, layout, delay }) => {
  const v = props.orientation === "vertical";
  const c = item.borderColor || props.primaryColor;
  const a = useEntrance(props.enableAnimations, delay, "gentle");
  const imgSrc = resolveSrc(item.src);
  if (!imgSrc) return null;

  const cardStyle = {
    opacity: a.opacity, transform: `translateY(${a.translateY}px) scale(${a.scale})`,
  };

  if (layout === "full") {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%", gap: 16, ...cardStyle }}>
        <div style={{
          width: "100%", borderRadius: 24, overflow: "hidden",
          border: `3px solid ${c}30`,
          boxShadow: `0 8px 32px ${c}15, 0 16px 48px rgba(0,0,0,0.08)`,
        }}>
          <Img src={imgSrc} alt={item.alt || ""} style={{ width: "100%", display: "block" }} />
        </div>
        {item.caption && (
          <div style={{
            fontSize: v ? 24 : 26, color: props.textColor, opacity: 0.6,
            textAlign: "center", lineHeight: 1.5,
          }}>
            {item.caption}
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{
      display: "flex", flexDirection: "column", gap: 16, ...cardStyle,
      padding: v ? "28px 32px" : "32px 40px",
      background: `linear-gradient(135deg, ${c}06, ${c}10)`,
      borderRadius: 28, border: `2px solid ${c}18`,
      boxShadow: `0 8px 24px ${c}10, 0 4px 12px rgba(0,0,0,0.04)`,
    }}>
      <div style={{ borderRadius: 20, overflow: "hidden" }}>
        <Img src={imgSrc} alt={item.alt || ""} style={{ width: "100%", display: "block" }} />
      </div>
      {item.caption && (
        <div style={{
          fontSize: v ? 26 : 28, fontWeight: 600, color: c,
          textAlign: "center", lineHeight: 1.5,
        }}>
          {item.caption}
        </div>
      )}
    </div>
  );
};

const GridImages = ({ props, items, columns, delay }) => {
  const v = props.orientation === "vertical";
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: v ? "1fr" : `repeat(${columns}, 1fr)`,
      gap: v ? 24 : 32,
      width: "100%",
    }}>
      {items.map((item, i) => {
        const a = useEntrance(props.enableAnimations, delay + i * 5, "gentle");
        const c = item.borderColor || props.primaryColor;
        const imgSrc = resolveSrc(item.src);
        if (!imgSrc) return null;
        return (
          <div key={i} style={{
            display: "flex", flexDirection: "column", gap: 14,
            padding: v ? "24px 28px" : "28px 32px",
            background: `linear-gradient(135deg, ${c}06, ${c}10)`,
            borderRadius: 24, border: `2px solid ${c}18`,
            boxShadow: `0 8px 24px ${c}10, 0 4px 12px rgba(0,0,0,0.04)`,
            opacity: a.opacity, transform: `translateY(${a.translateY}px) scale(${a.scale})`,
          }}>
            <div style={{ borderRadius: 18, overflow: "hidden" }}>
              <Img src={imgSrc} alt={item.alt || ""} style={{ width: "100%", display: "block" }} />
            </div>
            {item.caption && (
              <div style={{
                fontSize: v ? 24 : 26, fontWeight: 600, color: c,
                textAlign: "center", lineHeight: 1.5,
              }}>
                {item.caption}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export const MediaSection = ({
  props,
  items = [],
  columns = 2,
  layout = "card",
  text = "",
  data = [],
  delay = 0,
}) => {
  const v = props.orientation === "vertical";
  const a = useEntrance(props.enableAnimations, delay, "gentle");

  if (!items || items.length === 0) return null;

  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      width: "100%",
      opacity: a.opacity, transform: `translateY(${a.translateY}px) scale(${a.scale})`,
    }}>
      {text && (
        <div style={{
          fontSize: v ? 48 : 44, fontWeight: 800, color: props.primaryColor,
          textAlign: "center", lineHeight: 1.35, marginBottom: v ? 32 : 36,
          maxWidth: "100%",
        }}>
          {text}
        </div>
      )}
      {items.length === 1
        ? <SingleImage props={props} item={items[0]} layout={layout} delay={delay + 5} />
        : <GridImages props={props} items={items} columns={columns} delay={delay + 5} />}
      {data && data.length > 0 && (
        <StatRow props={props} data={data} delay={delay + 10} />
      )}
    </div>
  );
};
