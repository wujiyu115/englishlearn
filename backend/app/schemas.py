# backend/app/schemas.py
from datetime import datetime, date
from typing import Annotated, Literal
from pydantic import BaseModel, EmailStr, Field

# --- Auth ---
class RegisterRequest(BaseModel):
    email: EmailStr
    nickname: str
    password: str

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

# --- User ---
class UserOut(BaseModel):
    id: int
    email: str
    nickname: str
    avatar_url: str | None
    level: int
    total_xp: int
    streak_count: int
    last_study_date: date | None
    league_tier: str
    created_at: datetime

    model_config = {"from_attributes": True}

class XPUpdate(BaseModel):
    amount: int

class StreakUpdate(BaseModel):
    study_date: date

# --- Words ---
class WordCreate(BaseModel):
    english: str
    phonetic: str | None = None
    chinese: str
    example_sentence: str | None = None
    source: Literal["manual", "scene", "reading"] = "manual"

class WordOut(BaseModel):
    id: int
    english: str
    phonetic: str | None
    chinese: str
    example_sentence: str | None
    source: str
    accuracy_rate: float
    review_count: int
    next_review_date: date | None
    created_at: datetime

    model_config = {"from_attributes": True}

class AccuracyUpdate(BaseModel):
    accuracy_rate: Annotated[float, Field(ge=0.0, le=1.0)]

# --- Scenes ---
class Dialogue(BaseModel):
    english: str
    chinese: str

class SceneOut(BaseModel):
    id: int
    name_cn: str
    name_en: str
    is_preset: bool
    dialogues: list[Dialogue]
    is_favorited: bool = False

    model_config = {"from_attributes": True}

# --- Articles ---
class ArticleCreate(BaseModel):
    source_url: str | None = None
    raw_text: str | None = None

class ArticleOut(BaseModel):
    id: int
    title: str
    source_url: str | None
    word_count: int
    unknown_word_count: int
    last_read_position: int
    is_finished: bool
    created_at: datetime

    model_config = {"from_attributes": True}

class ArticleDetail(ArticleOut):
    content: str

class ProgressUpdate(BaseModel):
    position: int = Field(ge=0)

# --- League ---
class LeagueEntry(BaseModel):
    user_id: int
    nickname: str
    avatar_url: str | None
    weekly_xp: int
    rank: int
    tier: str

class LeagueResponse(BaseModel):
    my_entry: LeagueEntry
    entries: list[LeagueEntry]
    week_start_date: date
