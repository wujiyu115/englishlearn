// frontend/src/components/shared/StreakBadge.tsx
interface Props { count: number; }

export default function StreakBadge({ count }: Props) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <span style={{ fontSize: 20 }}>🔥</span>
      <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600, fontSize: 18, color: "var(--accent-review)" }}>
        {count}
      </span>
      <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>天连签</span>
    </div>
  );
}
