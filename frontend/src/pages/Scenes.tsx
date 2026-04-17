// frontend/src/pages/Scenes.tsx
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { Scene } from "../types";
import WordPopover from "../components/shared/WordPopover";

const QUICK_SCENES = ["餐厅点餐", "机场登机", "酒店入住", "求职面试", "购物砍价", "问路指引", "医院就诊", "商务会议"];

export default function Scenes() {
  const [query, setQuery] = useState("");
  const [activeQuery, setActiveQuery] = useState("");

  useQuery<Scene[]>({
    queryKey: ["scenes", "presets"],
    queryFn: () => api.get<Scene[]>("/scenes/presets"),
  });

  const { data: scene, isLoading, isError } = useQuery<Scene>({
    queryKey: ["scene", activeQuery],
    queryFn: () => api.get<Scene>(`/scenes/search?q=${encodeURIComponent(activeQuery)}`),
    enabled: !!activeQuery,
  });

  const favorite = useMutation({
    mutationFn: (id: number) => api.post(`/scenes/${id}/favorite`),
  });

  const speak = (text: string) =>
    window.speechSynthesis.speak(Object.assign(new SpeechSynthesisUtterance(text), { lang: "en-US" }));

  const search = () => { if (query.trim()) setActiveQuery(query.trim()); };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          value={query} onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === "Enter" && search()}
          placeholder="输入场景（如：餐厅点餐、求职面试…）"
          style={{ flex: 1, padding: "8px 12px", borderRadius: 6, border: "none",
            background: "var(--bg-surface)", boxShadow: "var(--border-shadow)",
            color: "var(--text-primary)", fontSize: 14, outline: "none" }}
        />
        <button onClick={search} className="btn-primary">搜索</button>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {QUICK_SCENES.map(s => (
          <button key={s} onClick={() => { setQuery(s); setActiveQuery(s); }}
            className="pill btn-secondary" style={{ fontSize: 12 }}>{s}</button>
        ))}
      </div>

      {isLoading && <p style={{ color: "var(--text-muted)" }}>正在生成场景对话…</p>}
      {isError && <p style={{ color: "var(--accent-review)" }}>生成失败，请重试</p>}

      {scene && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <h2 style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-0.8px" }}>{scene.name_cn}</h2>
            <button onClick={() => favorite.mutate(scene.id)} className="btn-secondary" style={{ fontSize: 12, padding: "4px 10px" }}>
              {scene.is_favorited ? "★ 已收藏" : "☆ 收藏"}
            </button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {scene.dialogues.map((d, i) => (
              <div key={i} className="card" style={{ padding: "14px 16px" }}>
                <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4, display: "flex", alignItems: "center", gap: 8 }}>
                  <span>
                    {d.english.split(" ").map((word, wi) => (
                      <WordPopover key={wi} word={word.replace(/[^a-zA-Z]/g, "")} chinese="（点击查询）" source="scene">
                        {word}{" "}
                      </WordPopover>
                    ))}
                  </span>
                  <button onClick={() => speak(d.english)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: 14 }}>🔊</button>
                </div>
                <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>{d.chinese}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
