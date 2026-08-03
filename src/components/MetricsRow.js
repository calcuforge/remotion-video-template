import { useEntrance, staggerDelay } from "./animations.js";
import { Icon } from "./Icon.js";

/**
 * MetricsRow — dashboard-style stat cards in a row/grid.
 * items: [{ value, label, suffix?, icon? }] — up to 4 columns horizontal,
 * vertical collapses to 1-2 columns.
 *
 * Keep `items.length` constant per section so hook order stays stable.
 */
const MetricCard = ({ props, item, index, delay }) => {
  const v = props.orientation === "vertical";
  const a = useEntrance(props.enableAnimations, delay + staggerDelay(index, 6, 8), "gentle");
  return (
    <div style={{
      background: `linear-gradient(135deg, ${props.primaryColor}10, ${props.primaryColor}06)`,
      borderRadius: 24,
      padding: v ? "28px 24px" : "36px 32px",
      textAlign: "center",
      border: `2px solid ${props.primaryColor}20`,
      boxShadow: `0 8px 32px ${props.primaryColor}12`,
      opacity: a.opacity, transform: `translateY(${a.translateY}px) scale(${a.scale})`,
    }}>
      {item.icon && (
        <div style={{ marginBottom: 12 }}>
          <Icon name={item.icon} size={v ? 36 : 40} color={props.primaryColor} delay={delay + index * 6} />
        </div>
      )}
      <div style={{
        fontSize: v ? 48 : 56, fontWeight: 900, color: props.primaryColor,
        marginTop: item.icon ? 12 : 0, lineHeight: 1,
      }}>
        {item.value}{item.suffix || ""}
      </div>
      <div style={{
        fontSize: v ? 22 : 24, color: props.textColor, opacity: 0.6,
        marginTop: 10, fontWeight: 500,
      }}>
        {item.label}
      </div>
    </div>
  );
};

export const MetricsRow = ({
  props,
  title,
  items = [],
  delay = 0,
}) => {
  const v = props.orientation === "vertical";
  const titleAnim = useEntrance(props.enableAnimations, delay);
  const cols = v
    ? (items.length <= 2 ? "1fr" : "1fr 1fr")
    : `repeat(${Math.min(items.length, 4)}, 1fr)`;

  return (
    <div style={{
      display: "flex", flexDirection: "column", justifyContent: "center",
      width: "100%",
    }}>
      {title && (
        <h2 style={{
          fontSize: v ? 56 : 64, fontWeight: 800, color: props.primaryColor,
          marginBottom: v ? 40 : 48, textAlign: "center",
          opacity: titleAnim.opacity, transform: `translateY(${titleAnim.translateY}px)`,
        }}>
          {title}
        </h2>
      )}
      <div style={{
        display: "grid",
        gridTemplateColumns: cols,
        gap: v ? 20 : 28,
        width: "100%",
      }}>
        {items.map((item, i) => (
          <MetricCard key={i} props={props} item={item} index={i} delay={delay} />
        ))}
      </div>
    </div>
  );
};
