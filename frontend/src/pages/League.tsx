// frontend/src/pages/League.tsx
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { LeagueResponse, LeagueEntry } from "../types";
import { useUserStore } from "../stores/userStore";

const TIER_LABELS: Record<string, string> = {
  bronze: "青铜", silver: "白银", gold: "黄金", platinum: "铂金", diamond: "钻石",
};
const TIER_COLORS: Record<string, string> = {
  bronze: "#cd7f32", silver: "#c0c0c0", gold: "#ffd700", platinum: "#e5e4e2", diamond: "var(--accent-xp)",
};
const RANK_ICONS = ["🥇", "🥈", "🥉"];

function EntryRow({ entry, isMe }: { entry: LeagueEntry; isMe: boolean }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12, padding: "12px 16px",
      borderRadius: 8, background: isMe ? "var(--bg-surface)" : "transparent",
      boxShadow: isMe ? "var(--border-shadow)" : "none",
    }}>
      <span style={{ width: 28, textAlign: "center", fontFamily: "var(--font-mono)", fontSize: 14, color: "var(--text-muted)" }}>
        {entry.rank <= 3 ? RANK_ICONS[entry.rank - 1] : entry.rank}
      </span>
      <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--bg-surface)", boxShadow: "var(--border-shadow)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>
        {entry.nickname[0].toUpperCase()}
      </div>
      <span style={{ flex: 1, fontWeight: isMe ? 600 : 400, fontSize: 14 }}>{entry.nickname}{isMe ? " (我)" : ""}</span>
      <span style={{ fontFamily: "var(--font-mono)", fontSize: 14, color: "var(--accent-xp)", fontWeight: 600 }}>{entry.weekly_xp} XP</span>
    </div>
  );
}

export default function League() {
  const { user } = useUserStore();
  const { data } = useQuery<LeagueResponse>({
    queryKey: ["league"],
    queryFn: () => api.get<LeagueResponse>("/league/current"),
  });

  if (!data || !user) return null;

  const tier = data.my_entry.tier;
  const daysLeft = (() => {
    const today = new Date();
    const sunday = new Date(today);
    sunday.setDate(today.getDate() + (7 - today.getDay()) % 7 || 7);
    return Math.ceil((sunday.getTime() - today.getTime()) / 86400000);
  })();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div className="card" style={{ padding: 24, display: "flex", alignItems: "center", gap: 16 }}>
        <span className="pill" style={{ background: "var(--bg-surface)", color: TIER_COLORS[tier] ?? "var(--text-primary)", boxShadow: "var(--border-shadow)", fontSize: 14, padding: "4px 14px" }}>
          {TIER_LABELS[tier] ?? tier}
        </span>
        <div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 24, fontWeight: 600, color: "var(--accent-xp)", letterSpacing: "-0.96px" }}>
            #{data.my_entry.rank}
          </div>
          <div style={{ fontSize: 13, color: "var(--text-muted)" }}>本周 {data.my_entry.weekly_xp} XP · 还剩 {daysLeft} 天结算</div>
        </div>
        <div style={{ marginLeft: "auto", fontSize: 13, color: "var(--text-secondary)" }}>
          前 3 名晋级 · 后 5 名降级
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {data.entries.map(entry => (
          <EntryRow key={entry.user_id} entry={entry} isMe={entry.user_id === user.id} />
        ))}
      </div>
    </div>
  );
}
