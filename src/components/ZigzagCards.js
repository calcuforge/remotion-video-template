import { useEntrance, staggerDelay } from "./animations.js";
import { Icon } from "./Icon.js";

const PALETTE = ["#4f6ef7", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

/**
 * ZigzagCards — alternating left/right feature cards (feature list, pros/cons,
 * step-by-step explanation). Odd cards flip right on 16:9; vertical stacks all
 * left. A 4px side bar + gradient card + icon per item, 6-color rotation.
 *
 * items: [{ icon, title, description, color? }]
 * Keep `items.length` constant per section so hook order stays stable.
 */
const ZigzagCard = ({ props, index, item, color, alignRight, delay }) => {
  const v = props.orientation === "vertical";
  const a = useEntrance(props.enableAnimations, delay + staggerDelay(index, 8), "gentle");
  return (
    <div style={{
      display: "flex",
      flexDirection: alignRight ? "row-reverse" : "row",
      alignItems: "center",
      gap: 24,
      background: `linear-gradient(135deg, ${color}08, ${color}04)`,
      borderRadius: 20,
      padding: v ? "24px 28px" : "20px 32px",
      borderLeft: alignRight ? "none" : `4px solid ${color}`,
      borderRight: alignRight ? `4px solid ${color}` : "none",
      boxShadow: `0 4px 20px ${color}10`,
      maxWidth: v ? "100%" : "75%",
      marginLeft: alignRight ? "auto" : 0,
      opacity: a.opacity, transform: `translateY(${a.translateY}px) scale(${a.scale})`,
    }}>
      <Icon name={item.icon} size={v ? 48 : 44} color={color} delay={delay + index * 5} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: v ? 32 : 30, fontWeight: 700, color: props.textColor }}>
          {item.title}
        </div>
        <div style={{ fontSize: v ? 24 : 22, color: props.textColor, opacity: 0.6, marginTop: 4 }}>
          {item.description}
        </div>
      </div>
    </div>
  );
};

export const ZigzagCards = ({
  props,
  title,
  items = [],
  delay = 0,
}) => {
  const v = props.orientation === "vertical";
  const titleAnim = useEntrance(props.enableAnimations, delay);

  return (
    <div style={{
      display: "flex", flexDirection: "column",
      width: "100%", justifyContent: "center",
    }}>
      {title && (
        <h2 style={{
          fontSize: v ? 60 : 72, fontWeight: 800, color: props.primaryColor,
          marginBottom: v ? 32 : 28, textAlign: "center",
          opacity: titleAnim.opacity, transform: `translateY(${titleAnim.translateY}px)`,
        }}>
          {title}
        </h2>
      )}
      <div style={{
        display: "flex", flexDirection: "column",
        justifyContent: "center", gap: v ? 20 : 16,
      }}>
        {items.map((item, i) => (
          <ZigzagCard
            key={i} props={props} index={i} item={item}
            color={item.color || PALETTE[i % PALETTE.length]}
            alignRight={!v && i % 2 === 1}
            delay={delay}
          />
        ))}
      </div>
    </div>
  );
};
