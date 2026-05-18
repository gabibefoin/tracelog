"use client";

// Button — matches the design system Button component exactly.
// Source: design_handoff_tracelog_app/design-system/tracelog-ds.jsx → function Button()
//
// Variants:  primary | secondary | ghost | danger
// Modes:     light | dark
// Sizes:     default | mini

import { PixelIcon } from "@/components/icons/PixelIcons";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  mode?: "light" | "dark";
  icon?: string;
  mini?: boolean;
  children?: React.ReactNode;
}

// DS token maps — mirrors TL object
const LIGHT = { ink: "#1A1814", inkDim: "#5C564B", rule: "#E3DECF" };
const DARK  = { ink: "#ECE7D9", inkDim: "#A29B8C", rule: "#3A3631" };
const RED   = "#DB4842";

export function Button({
  variant = "primary",
  mode = "light",
  icon,
  mini = false,
  children,
  style,
  onMouseEnter,
  onMouseLeave,
  ...rest
}: ButtonProps) {
  const c = mode === "dark" ? DARK : LIGHT;

  const base: React.CSSProperties = {
    fontFamily: '"IBM Plex Sans", -apple-system, BlinkMacSystemFont, sans-serif',
    fontWeight: 500,
    fontSize: mini ? 12 : 13,
    padding: mini ? "5px 10px" : "7px 13px",
    border: "none",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: 7,
    borderRadius: 8,
    transition: "background .12s, color .12s, box-shadow .12s",
    lineHeight: 1,
    whiteSpace: "nowrap",
  };

  let st: React.CSSProperties;
  if (variant === "primary") {
    st = { background: RED, color: "#FFFCF4" };
  } else if (variant === "secondary") {
    st = { background: "transparent", color: c.ink, boxShadow: `inset 0 0 0 1px ${c.rule}` };
  } else if (variant === "ghost") {
    st = { background: "transparent", color: c.ink };
  } else {
    // danger
    st = { background: "transparent", color: RED, boxShadow: `inset 0 0 0 1px ${RED}` };
  }

  function hoverStyle(e: React.MouseEvent<HTMLButtonElement>) {
    const el = e.currentTarget;
    if (variant === "primary") el.style.background = "#B83A35";
    else if (variant === "secondary") el.style.boxShadow = `inset 0 0 0 1px ${mode === "dark" ? "#4A4540" : "#CFC9B8"}`;
    else if (variant === "ghost") el.style.background = mode === "dark" ? "#2E2B25" : "#EDE8DC";
    else el.style.background = mode === "dark" ? "#3A2220" : "#F4D8D6";
    onMouseEnter?.(e);
  }

  function restoreStyle(e: React.MouseEvent<HTMLButtonElement>) {
    const el = e.currentTarget;
    if (variant === "primary") el.style.background = RED;
    else if (variant === "secondary") el.style.boxShadow = `inset 0 0 0 1px ${c.rule}`;
    else if (variant === "ghost") el.style.background = "transparent";
    else el.style.background = "transparent";
    onMouseLeave?.(e);
  }

  return (
    <button
      {...rest}
      style={{ ...base, ...st, ...style }}
      onMouseEnter={hoverStyle}
      onMouseLeave={restoreStyle}
    >
      {icon && <PixelIcon name={icon} size={mini ? 12 : 14} color="currentColor" />}
      {children}
    </button>
  );
}
