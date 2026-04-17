// frontend/src/pages/Dashboard.tsx
import { useQuery } from "@tanstack/react-query";
import { useUserStore } from "../stores/userStore";
import XPBar from "../components/shared/XPBar";
import StreakBadge from "../components/shared/StreakBadge";
import { api } from "../lib/api";
import type { Word } from "../types";
import { Link } from "react-router-dom";

export default function Dashboard() {
  const { user } = useUserStore();
  const { data: words } = useQuery<Word[]>({
    queryKey: ["words", "review"],
    queryFn: () => api.get<Word[]>("/words"),
    enabled: !!user,
  });

  const reviewWords = (words ?? [])
    .filter((w) => w.accuracy_rate < 0.6)
    .slice(0, 5);

  if (!user) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
      <div className="card" style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
        <StreakBadge count={user.streak_count} />
        <XPBar level={user.level} totalXp={user.total_xp} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 16 }}>
        <div className="card" style={{ padding: 24 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>每日目标</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>已学 {(words ?? []).filter(w => {
            const today = new Date().toISOString().split("T")[0];
            return w.created_at.startsWith(today);
          }).length} 个单词</p>
        </div>

        <div className="card" style={{ padding: 24 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>推荐复习</h2>
          {reviewWords.length === 0 ? (
            <p style={{ color: "var(--text-muted)", fontSize: 14 }}>暂无需复习的单词</p>
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {reviewWords.map((w) => (
                <span key={w.id} className="pill" style={{ background: "var(--bg-surface)", color: "var(--text-primary)", boxShadow: "var(--border-shadow)" }}>
                  {w.english}
                </span>
              ))}
            </div>
          )}
          <Link to="/game" className="btn-primary" style={{ display: "inline-block", marginTop: 16, textDecoration: "none", fontSize: 13 }}>
            开始对对碰
          </Link>
        </div>
      </div>
    </div>
  );
}
