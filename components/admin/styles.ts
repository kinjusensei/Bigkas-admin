import type { CSSProperties } from "react";

// Inline styles copied from app/dashboard/users/page.tsx, which styles its
// inputs, labels and tabs inline rather than through globals.css.

export const labelStyle: CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: "#6B7280",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  display: "block",
  marginBottom: 6,
};

export const inputStyle: CSSProperties = {
  width: "100%",
  border: "1px solid #E5E7EB",
  borderRadius: 6,
  padding: "8px 10px",
  fontSize: 13,
  fontFamily: "inherit",
  outline: "none",
};

export const textareaStyle: CSSProperties = {
  ...inputStyle,
  minHeight: 120,
  resize: "vertical",
};

export const fieldStyle: CSSProperties = { marginBottom: 14 };

export const fieldFootStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  marginTop: 4,
  fontSize: 11,
  color: "#9CA3AF",
};

export const leadStyle: CSSProperties = {
  fontSize: 13,
  color: "#6B7280",
  marginBottom: 16,
};

export const mutedStyle: CSSProperties = { fontSize: 12, color: "#9CA3AF" };

export const emptyStyle: CSSProperties = {
  padding: 32,
  textAlign: "center",
  fontSize: 13,
  color: "#9CA3AF",
};

export const tabBarStyle: CSSProperties = {
  display: "flex",
  borderBottom: "1px solid #E5E7EB",
};

export function tabStyle(active: boolean): CSSProperties {
  return {
    padding: "10px 20px",
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
    background: "none",
    // Longhands only: mixing `border` and `borderBottom` makes React warn on re-render.
    borderStyle: "solid",
    borderWidth: "0 0 2px",
    borderColor: active ? "#4F46E5" : "transparent",
    color: active ? "#4F46E5" : "#6B7280",
    marginBottom: -1,
    transition: "all .12s",
    fontFamily: "inherit",
  };
}

/** A card that sits flush under a tab bar, as on the users page. */
export const cardUnderTabsStyle: CSSProperties = {
  borderTopLeftRadius: 0,
  borderTopRightRadius: 0,
  borderTop: "none",
};
