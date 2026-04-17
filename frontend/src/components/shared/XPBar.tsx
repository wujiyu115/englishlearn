// frontend/src/components/shared/XPBar.tsx
interface Props { level: number; totalXp: number; }

function xpForLevel(level: number): number {
  return Array.from({ length: level - 1 }, (_, i) => 100 * (i + 1)).reduce((a, b) => a + b, 0);
}

export default function XPBar({ level, totalXp }: Props) {
  const current = xpForLevel(level);
  const next = xpForLevel(level + 1);
  const pct = Math.min(((totalXp - current) / (next - current)) * 100, 100);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <span style={{ fontSize: 13, fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>Lv.{level}</span>
      <div style={{ flex: 1, height: 6, background: "var(--bg-surface)", borderRadius: 9999, overflow: "hidden", boxShadow: "var(--border-shadow)" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: "var(--accent-xp)", borderRadius: 9999, transition: "width 0.5s ease" }} />
      </div>
      <span style={{ fontSize: 13, fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>Lv.{level + 1}</span>
    </div>
  );
}
