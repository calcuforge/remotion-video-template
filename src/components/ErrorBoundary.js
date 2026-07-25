import React from "react";

/**
 * ErrorBoundary — section-level React error boundary.
 * Wraps a section's content; if any child throws during render, the boundary
 * shows a placeholder card with the section name and error message instead of
 * crashing the whole composition.
 *
 * Usage:
 *   <ErrorBoundary props={props} sectionName="hero">
 *     <HeroContent ... />
 *   </ErrorBoundary>
 */
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: undefined };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    const { props, sectionName } = this.props;
    const v = props.orientation === "vertical";

    return (
      <div style={{
        width: "100%",
        height: "100%",
        background: props.backgroundColor,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: v ? "60px 40px" : "80px 60px",
        boxSizing: "border-box",
      }}>
        <div style={{
          fontSize: v ? 48 : 56,
          fontWeight: 700,
          color: props.primaryColor,
          marginBottom: 24,
        }}>
          {sectionName || "Section"}
        </div>
        <div style={{
          fontSize: v ? 24 : 28,
          color: props.textColor,
          opacity: 0.5,
          textAlign: "center",
        }}>
          Render error: {this.state.error?.message || "Unknown"}
        </div>
      </div>
    );
  }
}
