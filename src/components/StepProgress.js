import { useEntrance, staggerDelay } from "./animations.js";

/**
 * StepProgress — numbered stages with an active-step highlight (workflow,
 * tutorial steps, process explanation). Horizontal on 16:9, vertical on 9:16.
 *
 * steps: [{ label, description? }]; activeStep: 0-based index to emphasize.
 * Keep `steps.length` constant per section so hook order stays stable.
 */
const StepCard = ({ props, index, step, isActive, vertical, delay }) => {
  const color = props.primaryColor;
  const a = useEntrance(props.enableAnimations, delay + staggerDelay(index, 6, 8), "gentle");
  return (
    <div style={{
      flex: vertical ? undefined : 1,
      display: "flex",
      flexDirection: vertical ? "row" : "column",
      alignItems: "center",
      gap: vertical ? 20 : 12,
      background: isActive
        ? `linear-gradient(135deg, ${color}18, ${color}08)`
        : `${color}04`,
      borderRadius: 20,
      padding: vertical ? "20px 24px" : "28px 16px",
      border: `2px solid ${isActive ? color : `${color}15`}`,
      boxShadow: isActive ? `0 8px 32px ${color}20` : "none",
      opacity: a.opacity,
      transform: `translateY(${a.translateY}px) scale(${a.scale * (isActive ? 1.02 : 1)})`,
    }}>
      <div style={{
        width: vertical ? 44 : 48, height: vertical ? 44 : 48,
        borderRadius: "50%",
        background: isActive ? color : `${color}20`,
        color: isActive ? "#fff" : color,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: vertical ? 22 : 24, fontWeight: 800, flexShrink: 0,
      }}>
        {index + 1}
      </div>
      <div style={{ textAlign: vertical ? "left" : "center" }}>
        <div style={{
          fontSize: vertical ? 26 : 24, fontWeight: 700,
          color: isActive ? color : props.textColor,
        }}>
          {step.label}
        </div>
        {step.description && (
          <div style={{
            fontSize: vertical ? 20 : 18, color: props.textColor,
            opacity: 0.5, marginTop: 4,
          }}>
            {step.description}
          </div>
        )}
      </div>
    </div>
  );
};

export const StepProgress = ({
  props,
  title,
  steps = [],
  activeStep,
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
          fontSize: v ? 56 : 64, fontWeight: 800, color: props.primaryColor,
          marginBottom: v ? 36 : 40, textAlign: "center",
          opacity: titleAnim.opacity, transform: `translateY(${titleAnim.translateY}px)`,
        }}>
          {title}
        </h2>
      )}
      <div style={{
        display: "flex",
        flexDirection: v ? "column" : "row",
        alignItems: v ? "stretch" : "center",
        justifyContent: "center",
        gap: v ? 16 : 12,
      }}>
        {steps.map((step, i) => (
          <StepCard
            key={i} props={props} index={i} step={step}
            isActive={activeStep === i} vertical={v} delay={delay}
          />
        ))}
      </div>
    </div>
  );
};
