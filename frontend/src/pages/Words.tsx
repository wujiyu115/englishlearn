// frontend/src/pages/Words.tsx
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { Word } from "../types";

const SOURCES = ["全部", "manual", "scene", "reading"] as const;
const SOURCE_LABELS: Record<string, string> = { "全部": "全部", manual: "手动", scene: "场景", reading: "阅读" };

function AccuracyBar({ value }: { value: number }) {
  const color = value < 0.4 ? "var(--accent-review)" : value < 0.7 ? "#f59e0b" : "var(--accent-xp)";
  return (
    <div style={{ width: 80, height: 4, background: "var(--bg-surface)", borderRadius: 9999 }}>
      <div style={{ width: `${value * 100}%`, height: "100%", background: color, borderRadius: 9999 }} />
    </div>
  );
}

export default function Words() {
  const [source, setSource] = useState<string>("全部");
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ english: "", phonetic: "", chinese: "", example_sentence: "" });
  const qc = useQueryClient();

  const { data: words = [] } = useQuery<Word[]>({
    queryKey: ["words", source],
    queryFn: () => api.get<Word[]>(source === "全部" ? "/words" : `/words?source=${source}`),
  });

  const filtered = words.filter(w =>
    !search || w.english.toLowerCase().includes(search.toLowerCase()) || w.chinese.includes(search)
  );

  const addWord = useMutation({
    mutationFn: () => api.post("/words", { ...form, source: "manual" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["words"] }); setShowAdd(false); setForm({ english: "", phonetic: "", chinese: "", example_sentence: "" }); },
  });

  const deleteWord = useMutation({
    mutationFn: (id: number) => api.delete(`/words/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["words"] }),
  });

  const speak = (text: string) => window.speechSynthesis.speak(Object.assign(new SpeechSynthesisUtterance(text), { lang: "en-US" }));

  const inputStyle: React.CSSProperties = {
    padding: "6px 10px", borderRadius: 6, border: "none",
    background: "var(--bg-surface)", boxShadow: "var(--border-shadow)",
    color: "var(--text-primary)", fontSize: 14, outline: "none", width: "100%",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="搜索单词…"
          style={{ ...inputStyle, width: 240 }} />
        <div style={{ display: "flex", gap: 6 }}>
          {SOURCES.map(s => (
            <button key={s} onClick={() => setSource(s)}
              className="pill btn-secondary"
              style={{ background: source === s ? "var(--text-primary)" : undefined, color: source === s ? "var(--bg)" : undefined }}>
              {SOURCE_LABELS[s]}
            </button>
          ))}
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary" style={{ marginLeft: "auto" }}>+ 添加单词</button>
      </div>

      {showAdd && (
        <div className="card" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
          <input placeholder="English *" value={form.english} onChange={e => setForm(f => ({ ...f, english: e.target.value }))} style={inputStyle} />
          <input placeholder="/音标/" value={form.phonetic} onChange={e => setForm(f => ({ ...f, phonetic: e.target.value }))} style={inputStyle} />
          <input placeholder="中文释义 *" value={form.chinese} onChange={e => setForm(f => ({ ...f, chinese: e.target.value }))} style={inputStyle} />
          <input placeholder="例句（可选）" value={form.example_sentence} onChange={e => setForm(f => ({ ...f, example_sentence: e.target.value }))} style={inputStyle} />
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => addWord.mutate()} className="btn-primary">保存</button>
            <button onClick={() => setShowAdd(false)} className="btn-secondary">取消</button>
          </div>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {filtered.map(word => (
          <WordRow key={word.id} word={word} onSpeak={speak} onDelete={() => deleteWord.mutate(word.id)} />
        ))}
        {filtered.length === 0 && <p style={{ color: "var(--text-muted)", fontSize: 14 }}>暂无单词</p>}
      </div>
    </div>
  );
}

function WordRow({ word, onSpeak, onDelete }: { word: Word; onSpeak: (t: string) => void; onDelete: () => void }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="card" style={{ padding: "12px 16px", cursor: "pointer" }} onClick={() => setExpanded(e => !e)}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontWeight: 600, fontSize: 16, flex: 1 }}>{word.english}</span>
        {word.phonetic && <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-muted)" }}>{word.phonetic}</span>}
        <span style={{ fontSize: 14, color: "var(--text-secondary)" }}>{word.chinese}</span>
        <AccuracyBar value={word.accuracy_rate} />
      </div>
      {expanded && (
        <div style={{ marginTop: 12, paddingTop: 12, boxShadow: "inset 0 1px 0 0 var(--bg-surface)" }}>
          {word.example_sentence && <p style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 12 }}>{word.example_sentence}</p>}
          <div style={{ display: "flex", gap: 8 }} onClick={e => e.stopPropagation()}>
            <button onClick={() => onSpeak(word.english)} className="btn-secondary" style={{ fontSize: 12, padding: "4px 10px" }}>🔊 发音</button>
            <button onClick={onDelete} style={{ fontSize: 12, padding: "4px 10px", background: "none", border: "none", color: "var(--accent-review)", cursor: "pointer" }}>删除</button>
          </div>
        </div>
      )}
    </div>
  );
}
