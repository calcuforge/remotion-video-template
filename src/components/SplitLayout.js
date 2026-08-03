import { AbsoluteFill, Img, staticFile } from "remotion";
import { useEntrance } from "./animations.js";
import { MovingGradient, FloatingShapes } from "./AnimatedBackground.js";
import { Icon } from "./Icon.js";

const resolveSrc = (src) => {
  if (!src) return null;
  if (src.startsWith("http") || src.startsWith("/") || src.match(/^[A-Za-z]:/)) {
    return src;
  }
  return staticFile(src);
};

/**
 * SplitLayout — text on one side, visual (image or icon list) on the other.
 * Use for feature highlights, explanation + diagram, case intro + screenshot.
 *
 * rightImage / rightItems are mutually exclusive; rightItems (icon list)
 * wins when both given. Vertical orientation stacks text above visual.
 *
 * props: { title, description, rightImage?, rightCaption?, rightItems?,
 *          accent?: "left"|"right", delay? }
 */
export const SplitLayout = ({
  props,
  title,
  description,
  rightImage,
  rightCaption,
  rightItems,
  accent = "left",
  delay = 0,
}) => {
  const v = props.orientation === "vertical";
  const anim = useEntrance(props.enableAnimations, delay);
  const animR = useEntrance(props.enableAnimations, delay + 12);
  const imgSrc = rightImage ? resolveSrc(rightImage) : null;
  const items = Array.isArray(rightItems) && rightItems.length > 0 ? rightItems : null;

  return (
    <AbsoluteFill style={{ backgroundColor: props.backgroundColor }}>
      <MovingGradient color1={props.primaryColor} color2={props.accentColor} opacity={0.06} />
      <FloatingShapes color={props.primaryColor} count={3} opacity={0.04} shape="ring" />
      <div style={{
        position: "absolute", inset: 0,
        display: "flex",
        flexDirection: v ? "column" : accent === "left" ? "row" : "row-reverse",
        alignItems: "center",
        padding: v ? "80px 60px" : "60px 80px",
        gap: v ? 40 : 60,
      }}>
        <div style={{
          flex: 1,
          opacity: anim.opacity,
          transform: `translateY(${anim.translateY}px) scale(${anim.scale})`,
        }}>
          <div style={{
            width: 60, height: 4, borderRadius: 2,
            background: props.primaryColor, marginBottom: 24,
          }} />
          <h2 style={{
            fontSize: v ? 64 : 72, fontWeight: 800, color: props.primaryColor,
            lineHeight: 1.15, marginBottom: 20,
          }}>
            {title}
          </h2>
          {description && (
            <p style={{
              fontSize: v ? 32 : 30, color: props.textColor,
              lineHeight: 1.7, opacity: 0.75,
            }}>
              {description}
            </p>
          )}
        </div>
        <div style={{
          flex: v ? undefined : 1,
          width: v ? "100%" : undefined,
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          opacity: animR.opacity,
          transform: `translateY(${animR.translateY}px) scale(${animR.scale})`,
        }}>
          {items ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 20, width: "100%" }}>
              {items.map((item, i) => (
                <div key={i} style={{
                  display: "flex", alignItems: "center", gap: 20,
                  background: `linear-gradient(135deg, ${props.primaryColor}08, ${props.primaryColor}04)`,
                  borderRadius: 18, padding: v ? "20px 24px" : "18px 28px",
                  border: `1px solid ${props.primaryColor}15`,
                }}>
                  <Icon name={item.icon} size={v ? 40 : 44} color={props.primaryColor} delay={delay + 15 + i * 5} />
                  <div>
                    <div style={{ fontSize: v ? 28 : 26, fontWeight: 700, color: props.textColor }}>
                      {item.title}
                    </div>
                    {item.description && (
                      <div style={{ fontSize: v ? 22 : 20, color: props.textColor, opacity: 0.6, marginTop: 2 }}>
                        {item.description}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : imgSrc ? (
            <div style={{
              borderRadius: 24, overflow: "hidden", maxWidth: v ? "100%" : 720,
              border: `3px solid ${props.primaryColor}30`,
              boxShadow: `0 8px 32px ${props.primaryColor}15, 0 16px 48px rgba(0,0,0,0.08)`,
            }}>
              <Img src={imgSrc} alt={rightCaption || title} style={{ width: "100%", display: "block" }} />
            </div>
          ) : null}
          {rightCaption && !items && imgSrc && (
            <div style={{
              fontSize: v ? 24 : 26, color: props.textColor, opacity: 0.6,
              marginTop: 12, textAlign: "center",
            }}>
              {rightCaption}
            </div>
          )}
        </div>
      </div>
    </AbsoluteFill>
  );
};
