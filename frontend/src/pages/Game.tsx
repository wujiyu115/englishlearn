// frontend/src/pages/Game.tsx
import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { Word } from "../types";

type CardType = { id: string; wordId: number; text: string; side: "en" | "zh"; matched: boolean; selected: boolean };

function buildCards(words: Word[]): CardType[] {
  const shuffle = <T,>(arr: T[]) => [...arr].sort(() => Math.random() - 0.5);
  const en = words.map(w => ({ id: `en-${w.id}`, wordId: w.id, text: w.english, side: "en" as const, matched: false, selected: false }));
  const zh = words.map(w => ({ id: `zh-${w.id}`, wordId: w.id, text: w.chinese, side: "zh" as const, matched: false, selected: false }));
  return [...shuffle(en), ...shuffle(zh)];
}

export default function Game() {
  const qc = useQueryClient();
  const { data: allWords = [] } = useQuery<Word[]>({ queryKey: ["words"], queryFn: () => api.get("/words") });

  const [cards, setCards] = useState<CardType[]>([]);
  const [selected, setSelected] = useState<CardType | null>(null);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [timer, setTimer] = useState(60);
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<{ wordId: number; correct: boolean }[]>([]);

  const gameWords = allWords.filter(w => w.accuracy_rate < 0.9).slice(0, 6);

  const startGame = useCallback(() => {
    if (gameWords.length < 2) return;
    setCards(buildCards(gameWords));
    setSelected(null); setScore(0); setCombo(0); setTimer(60); setRunning(true); setResults([]);
  }, [gameWords]);

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setTimer(s => { if (s <= 1) { clearInterval(t); setRunning(false); } return s - 1; }), 1000);
    return () => clearInterval(t);
  }, [running]);

  const updateAccuracy = useMutation({
    mutationFn: ({ id, rate }: { id: number; rate: number }) => api.put(`/words/${id}/accuracy`, { accuracy_rate: rate }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["words"] }),
  });

  const handleSelect = (card: CardType) => {
    if (!running || card.matched || card.selected) return;
    if (!selected) {
      setCards(cs => cs.map(c => c.id === card.id ? { ...c, selected: true } : c));
      setSelected(card);
      return;
    }
    const isMatch = selected.wordId === card.wordId && selected.side !== card.side;
    if (isMatch) {
      const newCombo = combo + 1;
      setCombo(newCombo);
      setScore(s => s + 10 + (newCombo > 1 ? newCombo * 2 : 0));
      setCards(cs => cs.map(c => c.wordId === card.wordId ? { ...c, matched: true, selected: false } : c));
      setResults(r => [...r, { wordId: card.wordId, correct: true }]);
    } else {
      setCombo(0);
      setCards(cs => cs.map(c => ({ ...c, selected: false })));
      setTimeout(() => setCards(cs => cs.map(c => ({ ...c, selected: false }))), 600);
      setResults(r => [...r.filter(x => x.wordId !== card.wordId && x.wordId !== selected.wordId),
        { wordId: card.wordId, correct: false }, { wordId: selected.wordId, correct: false }]);
    }
    setSelected(null);
  };

  const finishGame = useCallback(() => {
    setRunning(false);
    results.forEach(({ wordId, correct }) => {
      const word = allWords.find(w => w.id === wordId);
      if (!word) return;
      const delta = correct ? 0.1 : -0.05;
      const rate = Math.max(0, Math.min(1, word.accuracy_rate + delta));
      updateAccuracy.mutate({ id: wordId, rate });
    });
  }, [results, allWords, updateAccuracy]);

  const allMatched = cards.length > 0 && cards.every(c => c.matched);
  useEffect(() => { if (allMatched && running) finishGame(); }, [allMatched, running, finishGame]);

  const enCards = cards.filter(c => c.side === "en");
  const zhCards = cards.filter(c => c.side === "zh");

  if (!running && cards.length === 0) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 24, paddingTop: 80 }}>
        <h1 style={{ fontSize: 32, fontWeight: 600, letterSpacing: "-1.28px" }}>单词对对碰</h1>
        <p style={{ color: "var(--text-secondary)" }}>从单词本中随机选取低熟练度单词进行配对</p>
        {gameWords.length < 2
          ? <p style={{ color: "var(--accent-review)" }}>单词本至少需要 2 个单词才能开始游戏</p>
          : <button onClick={startGame} className="btn-primary" style={{ fontSize: 16, padding: "12px 32px" }}>开始游戏</button>}
      </div>
    );
  }

  if (!running && cards.length > 0) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 24, paddingTop: 80 }}>
        <h2 style={{ fontSize: 28, fontWeight: 600, letterSpacing: "-1.12px" }}>游戏结束</h2>
        <div className="card" style={{ padding: 32, textAlign: "center", minWidth: 280 }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 48, fontWeight: 600, color: "var(--accent-xp)", letterSpacing: "-2.4px" }}>{score}</div>
          <div style={{ color: "var(--text-secondary)", marginTop: 8 }}>得分</div>
        </div>
        <button onClick={startGame} className="btn-primary">再来一局</button>
      </div>
    );
  }

  const cardStyle = (card: CardType): React.CSSProperties => ({
    padding: "16px 12px", borderRadius: 8, textAlign: "center", cursor: "pointer",
    fontSize: 14, fontWeight: 500, transition: "all 0.15s",
    background: card.matched ? "var(--bg-surface)" : card.selected ? "var(--accent-xp)" : "var(--bg-card)",
    color: card.matched ? "var(--text-muted)" : card.selected ? "#fff" : "var(--text-primary)",
    boxShadow: card.selected ? `0 0 0 2px var(--accent-xp)` : "var(--card-shadow)",
    opacity: card.matched ? 0.4 : 1,
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 20, fontWeight: 600, color: timer < 10 ? "var(--accent-review)" : "var(--text-primary)" }}>{timer}s</span>
        <span style={{ fontFamily: "var(--font-mono)", color: "var(--accent-xp)" }}>得分: {score}</span>
        {combo > 1 && <span className="pill" style={{ background: "var(--accent-xp)", color: "#fff" }}>x{combo} 连击!</span>}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {enCards.map(card => <div key={card.id} style={cardStyle(card)} onClick={() => handleSelect(card)}>{card.text}</div>)}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {zhCards.map(card => <div key={card.id} style={cardStyle(card)} onClick={() => handleSelect(card)}>{card.text}</div>)}
        </div>
      </div>
    </div>
  );
}
