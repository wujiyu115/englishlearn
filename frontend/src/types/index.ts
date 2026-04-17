// frontend/src/types/index.ts
export interface User {
  id: number;
  email: string;
  nickname: string;
  avatar_url: string | null;
  level: number;
  total_xp: number;
  streak_count: number;
  last_study_date: string | null;
  league_tier: string;
}

export interface Word {
  id: number;
  english: string;
  phonetic: string | null;
  chinese: string;
  example_sentence: string | null;
  source: "manual" | "scene" | "reading";
  accuracy_rate: number;
  review_count: number;
  next_review_date: string | null;
  created_at: string;
}

export interface Dialogue {
  english: string;
  chinese: string;
}

export interface Scene {
  id: number;
  name_cn: string;
  name_en: string;
  is_preset: boolean;
  dialogues: Dialogue[];
  is_favorited: boolean;
}

export interface Article {
  id: number;
  title: string;
  source_url: string | null;
  word_count: number;
  unknown_word_count: number;
  last_read_position: number;
  is_finished: boolean;
  created_at: string;
}

export interface ArticleDetail extends Article {
  content: string;
}

export interface LeagueEntry {
  user_id: number;
  nickname: string;
  avatar_url: string | null;
  weekly_xp: number;
  rank: number;
  tier: string;
}

export interface LeagueResponse {
  my_entry: LeagueEntry;
  entries: LeagueEntry[];
  week_start_date: string;
}
