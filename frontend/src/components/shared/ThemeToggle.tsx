// frontend/src/components/shared/ThemeToggle.tsx
import { useState } from "react";
import { getTheme, applyTheme, type Theme } from "../../lib/theme";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(getTheme);
  const toggle = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    applyTheme(next);
    setTheme(next);
  };
  return (
    <button onClick={toggle} aria-label="Toggle theme" style={{
      background: "none", border: "none", cursor: "pointer",
      color: "var(--text-secondary)", fontSize: 18, lineHeight: 1,
      padding: "4px", borderRadius: "50%",
    }}>
      {theme === "dark" ? "☀" : "☾"}
    </button>
  );
}
