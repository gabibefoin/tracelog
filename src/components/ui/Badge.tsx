"use client";

// Badge (Tag) — matches the design system Tag/pill component exactly.
// Source: design_handoff_tracelog_app/design-system/tracelog-ds.jsx → function Tag()
//
// Variants:  scope | recon | patched | signal | vuln | neutral
// Modes:     light | dark

type BadgeVariant = "scope" | "recon" | "patched" | "signal" | "vuln" | "neutral";

interface BadgeProps {
  variant?: BadgeVariant;
  mode?: "light" | "dark";
  children: React.ReactNode;
  style?: React.CSSProperties;
}

// DS token maps — mirrors TL object exactly
const LIGHT = { inkDim: "#5C564B", rule: "#E3DECF" };
const DARK  = { inkDim: "#A29B8C", rule: "#3A3631" };

type StyleMap = { bg: string; fg: string; bd: string };

function getStyle(variant: BadgeVariant, mode: "light" | "dark"): StyleMap {
  const c = mode === "dark" ? DARK : LIGHT;
  const map: Record<BadgeVariant, StyleMap> = {
    scope:   { bg: mode === "light" ? "#DCE7E8" : "transparent", fg: "#4D7C84", bd: "#4D7C84" },
    recon:   { bg: mode === "light" ? "#E4E1EC" : "transparent", fg: "#6E6B96", bd: "#6E6B96" },
    patched: { bg: mode === "light" ? "#DFE5D8" : "transparent", fg: "#6E8462", bd: "#6E8462" },
    signal:  { bg: mode === "light" ? "#F1E1C8" : "transparent", fg: "#BC8438", bd: "#BC8438" },
    vuln:    { bg: "#DB4842", fg: "#FFFCF4", bd: "#DB4842" },
    neutral: { bg: "transparent", fg: c.inkDim, bd: c.rule },
  };
  return map[variant];
}

export function Badge({ variant = "neutral", mode = "light", children, style }: BadgeProps) {
  const s = getStyle(variant, mode);
  const dotColor = s.fg === "#FFFCF4" ? "#FFFCF4" : s.bd;

  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      padding: "3px 10px",
      border: `1px solid ${s.bd}`,
      background: s.bg,
      color: s.fg,
      fontFamily: '"JetBrains Mono", "IBM Plex Mono", ui-monospace, Menlo, monospace',
      fontSize: 11,
      letterSpacing: "0.04em",
      borderRadius: 999,
      lineHeight: 1.4,
      ...style,
    }}>
      <span style={{
        display: "inline-block",
        width: 6,
        height: 6,
        borderRadius: 999,
        background: dotColor,
        flexShrink: 0,
      }} />
      {children}
    </span>
  );
}
