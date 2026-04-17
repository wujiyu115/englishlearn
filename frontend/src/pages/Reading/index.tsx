// frontend/src/pages/Reading/index.tsx
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { api } from "../../lib/api";
import type { Article } from "../../types";

export default function ArticleList() {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ source_url: "", raw_text: "" });
  const qc = useQueryClient();
  const navigate = useNavigate();

  const { data: articles = [] } = useQuery<Article[]>({
    queryKey: ["articles"],
    queryFn: () => api.get<Article[]>("/articles"),
  });

  const addArticle = useMutation({
    mutationFn: () => api.post<Article>("/articles", form.source_url ? { source_url: form.source_url } : { raw_text: form.raw_text }),
    onSuccess: (article) => { qc.invalidateQueries({ queryKey: ["articles"] }); setShowAdd(false); navigate(`/reading/${article.id}`); },
  });

  const difficultyLabel = (unknown: number, total: number) => {
    const ratio = total > 0 ? unknown / total : 0;
    return ratio < 0.05 ? "简单" : ratio < 0.15 ? "中等" : "困难";
  };
  const difficultyColor = (unknown: number, total: number) => {
    const ratio = total > 0 ? unknown / total : 0;
    return ratio < 0.05 ? "var(--accent-xp)" : ratio < 0.15 ? "#f59e0b" : "var(--accent-review)";
  };

  const inputStyle: React.CSSProperties = {
    padding: "8px 12px", borderRadius: 6, border: "none",
    background: "var(--bg-surface)", boxShadow: "var(--border-shadow)",
    color: "var(--text-primary)", fontSize: 14, outline: "none", width: "100%",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, letterSpacing: "-0.96px" }}>阅读</h1>
        <button onClick={() => setShowAdd(true)} className="btn-primary">+ 添加文章</button>
      </div>

      {showAdd && (
        <div className="card" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
          <input placeholder="文章 URL（可选）" value={form.source_url} onChange={e => setForm(f => ({ ...f, source_url: e.target.value }))} style={inputStyle} />
          <textarea placeholder="或直接粘贴文章原文…" value={form.raw_text} onChange={e => setForm(f => ({ ...f, raw_text: e.target.value }))}
            rows={6} style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }} />
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => addArticle.mutate()} className="btn-primary">解析并添加</button>
            <button onClick={() => setShowAdd(false)} className="btn-secondary">取消</button>
          </div>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {articles.map(article => (
          <div key={article.id} className="card" style={{ padding: "16px 20px", cursor: "pointer" }} onClick={() => navigate(`/reading/${article.id}`)}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>{article.title}</div>
                <div style={{ fontSize: 13, color: "var(--text-muted)" }}>{article.word_count} 词 · {article.unknown_word_count} 生词</div>
              </div>
              <span className="pill" style={{ background: "var(--bg-surface)", color: difficultyColor(article.unknown_word_count, article.word_count), boxShadow: "var(--border-shadow)" }}>
                {difficultyLabel(article.unknown_word_count, article.word_count)}
              </span>
              {article.is_finished && <span className="pill" style={{ background: "var(--accent-xp)", color: "#fff" }}>已读</span>}
            </div>
            {!article.is_finished && article.last_read_position > 0 && (
              <div style={{ marginTop: 8, height: 3, background: "var(--bg-surface)", borderRadius: 9999 }}>
                <div style={{ width: "30%", height: "100%", background: "var(--accent-xp)", borderRadius: 9999 }} />
              </div>
            )}
          </div>
        ))}
        {articles.length === 0 && <p style={{ color: "var(--text-muted)", fontSize: 14 }}>暂无文章，点击「添加文章」开始阅读</p>}
      </div>
    </div>
  );
}
