// frontend/src/pages/Reading/Reader.tsx
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { api } from "../../lib/api";
import type { ArticleDetail } from "../../types";
import WordPopover from "../../components/shared/WordPopover";

export default function Reader() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const containerRef = useRef<HTMLDivElement>(null);
  const [showFinish, setShowFinish] = useState(false);

  const { data: article } = useQuery<ArticleDetail>({
    queryKey: ["article", id],
    queryFn: () => api.get<ArticleDetail>(`/articles/${id}`),
    enabled: !!id,
  });

  const saveProgress = useMutation({
    mutationFn: (position: number) => api.put(`/articles/${id}/progress`, { position }),
  });

  // Use a ref to the mutate function to avoid stale closure in the scroll handler
  const saveProgressRef = useRef(saveProgress.mutate);
  useEffect(() => {
    saveProgressRef.current = saveProgress.mutate;
  });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handler = () => saveProgressRef.current(el.scrollTop);
    el.addEventListener("scroll", handler, { passive: true });
    return () => el.removeEventListener("scroll", handler);
  }, []);

  const finishArticle = useMutation({
    mutationFn: () => api.put(`/articles/${id}/finish`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["articles"] }); setShowFinish(true); },
  });

  if (!article) return null;

  const readPct = article.content.length > 0
    ? Math.min(Math.round((article.last_read_position / article.content.length) * 100), 100)
    : 0;

  const words = article.content.split(/\b/);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 96px)" }}>
      {showFinish && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="card" style={{ padding: 40, textAlign: "center" }}>
            <div style={{ fontSize: 48 }}>🎉</div>
            <h2 style={{ fontSize: 24, fontWeight: 600, marginTop: 16 }}>文章读完了！</h2>
            <p style={{ color: "var(--text-secondary)", margin: "8px 0 24px" }}>获得 XP 奖励</p>
            <button onClick={() => navigate("/reading")} className="btn-primary">返回书单</button>
          </div>
        </div>
      )}

      <div style={{ marginBottom: 16 }}>
        <button onClick={() => navigate("/reading")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: 13 }}>← 返回</button>
        <h1 style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-0.8px", margin: "8px 0" }}>{article.title}</h1>
        <div style={{ height: 3, background: "var(--bg-surface)", borderRadius: 9999, marginBottom: 4 }}>
          <div style={{ width: `${readPct}%`, height: "100%", background: "var(--accent-xp)", borderRadius: 9999, transition: "width 0.3s" }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{article.word_count} 词 · {article.unknown_word_count} 生词</span>
          {!article.is_finished && (
            <button onClick={() => finishArticle.mutate()} className="btn-primary" style={{ fontSize: 12, padding: "4px 12px" }}>标记读完</button>
          )}
        </div>
      </div>

      <div ref={containerRef} style={{ flex: 1, overflowY: "auto", maxWidth: 680, margin: "0 auto", width: "100%" }}>
        <p style={{ fontSize: 18, lineHeight: 1.8, color: "var(--text-primary)" }}>
          {words.map((token, i) => {
            const isWord = /^[a-zA-Z]+$/.test(token);
            if (!isWord) return <span key={i}>{token}</span>;
            return (
              <WordPopover key={i} word={token} chinese="（查询中）" source="reading">
                {token}
              </WordPopover>
            );
          })}
        </p>
      </div>
    </div>
  );
}
