import { useEntrance, useFloat } from "./animations.js";
import { GridPattern } from "./AnimatedBackground.js";

/**
 * KeywordCloud — floating keyword chips for term/concept emphasis (deep
 * learning, neural networks, ...). weight 1-3 scales the chip (28/40/56px);
 * chips drift gently (useFloat) and fade in staggered.
 *
 * keywords: [{ text, weight? }]
 * Keep `keywords.length` constant per section so hook order stays stable.
 */
const Chip = ({ props, item, index, delay }) => {
  const v = props.orientation === "vertical";
  const weight = Math.min(3, Math.max(1, Number(item.weight) || 1));
  const fontSize = v ? [24, 34, 46][weight - 1] : [28, 40, 56][weight - 1];
  const padX = v ? 22 : 28;
  const padY = v ? 10 : 14;
  const a = useEntrance(props.enableAnimations, delay + index * 5, "snappy");
  const float = useFloat(weight === 3 ? 8 : 5, 150, index * 37);

  return (
    <span style={{
      display: "inline-block",
      fontSize, fontWeight: weight === 3 ? 800 : 600,
      color: weight === 3 ? "#fff" : props.primaryColor,
      background: weight === 3
        ? `linear-gradient(135deg, ${props.primaryColor}, ${props.accentColor})`
        : `${props.primaryColor}10`,
      border: weight === 3 ? "none" : `2px solid ${props.primaryColor}25`,
      borderRadius: 999,
      padding: `${padY}px ${padX}px`,
      margin: v ? 10 : 12,
      boxShadow: weight === 3 ? `0 8px 28px ${props.primaryColor}40` : "none",
      opacity: a.opacity,
      transform: `translateY(${a.translateY + float.translateY}px) scale(${a.scale})`,
    }}>
      {item.text}
    </span>
  );
};

export const KeywordCloud = ({
  props,
  title,
  keywords = [],
  delay = 0,
}) => {
  const v = props.orientation === "vertical";
  const titleAnim = useEntrance(props.enableAnimations, delay);

  return (
    <div style={{
      display: "flex", flexDirection: "column",
      width: "100%", justifyContent: "center",
    }}>
      <GridPattern color={props.primaryColor} opacity={0.025} variant="dots" spacing={50} />
      {title && (
        <h2 style={{
          fontSize: v ? 56 : 64, fontWeight: 800, color: props.primaryColor,
          marginBottom: v ? 32 : 36, textAlign: "center",
          opacity: titleAnim.opacity, transform: `translateY(${titleAnim.translateY}px)`,
        }}>
          {title}
        </h2>
      )}
      <div style={{ textAlign: "center", lineHeight: v ? 1.9 : 2.1 }}>
        {keywords.map((item, i) => (
          <Chip key={i} props={props} item={item} index={i} delay={delay} />
        ))}
      </div>
    </div>
  );
};
