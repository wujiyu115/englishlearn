// frontend/src/components/shared/WordPopover.tsx
import { useState, useRef, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";

interface Props {
  word: string;
  phonetic?: string;
  chinese: string;
  source?: "manual" | "scene" | "reading";
  children: React.ReactNode;
}

export default function WordPopover({ word, phonetic, chinese, source = "scene", children }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const qc = useQueryClient();

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const addWord = useMutation({
    mutationFn: () => api.post("/words", { english: word, phonetic, chinese, source }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["words"] }); setOpen(false); },
  });

  const speak = () => window.speechSynthesis.speak(Object.assign(new SpeechSynthesisUtterance(word), { lang: "en-US" }));

  return (
    <span ref={ref} style={{ position: "relative", display: "inline" }}>
      <span onClick={() => setOpen((o) => !o)} style={{ cursor: "pointer", textDecoration: "underline dotted", textDecorationColor: "var(--accent-xp)" }}>
        {children}
      </span>
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 200,
          minWidth: 200, padding: 12, borderRadius: 8,
          background: "var(--bg-card)", boxShadow: "var(--card-shadow)",
        }}>
          <div style={{ fontWeight: 600, fontSize: 15 }}>{word}</div>
          {phonetic && <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-muted)", margin: "2px 0" }}>{phonetic}</div>}
          <div style={{ fontSize: 14, color: "var(--text-secondary)", margin: "6px 0" }}>{chinese}</div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={speak} className="btn-secondary" style={{ padding: "4px 10px", fontSize: 12 }}>🔊 发音</button>
            <button onClick={() => addWord.mutate()} className="btn-primary" style={{ padding: "4px 10px", fontSize: 12 }}>+ 加入单词本</button>
          </div>
        </div>
      )}
    </span>
  );
}
