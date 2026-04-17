# backend/app/models.py
from datetime import datetime, date
from sqlalchemy import (
    Integer, String, Float, Boolean, Text, Date, DateTime,
    ForeignKey, JSON, UniqueConstraint
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .database import Base

class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    nickname: Mapped[str] = mapped_column(String(100))
    avatar_url: Mapped[str | None] = mapped_column(String(500))
    password_hash: Mapped[str] = mapped_column(String(255))
    level: Mapped[int] = mapped_column(Integer, default=1)
    total_xp: Mapped[int] = mapped_column(Integer, default=0)
    streak_count: Mapped[int] = mapped_column(Integer, default=0)
    last_study_date: Mapped[date | None] = mapped_column(Date)
    league_tier: Mapped[str] = mapped_column(String(20), default="bronze")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    words: Mapped[list["Word"]] = relationship(back_populates="user", cascade="all, delete")
    articles: Mapped[list["Article"]] = relationship(back_populates="user", cascade="all, delete")
    favorite_scenes: Mapped[list["UserFavoriteScene"]] = relationship(back_populates="user", cascade="all, delete")
    league_weeks: Mapped[list["LeagueWeek"]] = relationship(back_populates="user", cascade="all, delete")

class Word(Base):
    __tablename__ = "words"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    english: Mapped[str] = mapped_column(String(200))
    phonetic: Mapped[str | None] = mapped_column(String(200))
    chinese: Mapped[str] = mapped_column(String(500))
    example_sentence: Mapped[str | None] = mapped_column(Text)
    source: Mapped[str] = mapped_column(String(20), default="manual")
    accuracy_rate: Mapped[float] = mapped_column(Float, default=0.0)
    review_count: Mapped[int] = mapped_column(Integer, default=0)
    next_review_date: Mapped[date | None] = mapped_column(Date)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user: Mapped["User"] = relationship(back_populates="words")

class Scene(Base):
    __tablename__ = "scenes"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    name_cn: Mapped[str] = mapped_column(String(100))
    name_en: Mapped[str] = mapped_column(String(100))
    is_preset: Mapped[bool] = mapped_column(Boolean, default=False)
    dialogues: Mapped[list] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    favorites: Mapped[list["UserFavoriteScene"]] = relationship(back_populates="scene", cascade="all, delete")

class UserFavoriteScene(Base):
    __tablename__ = "user_favorite_scenes"
    __table_args__ = (UniqueConstraint("user_id", "scene_id", name="uq_user_scene"),)
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    scene_id: Mapped[int] = mapped_column(ForeignKey("scenes.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    user: Mapped["User"] = relationship(back_populates="favorite_scenes")
    scene: Mapped["Scene"] = relationship(back_populates="favorites")

class Article(Base):
    __tablename__ = "articles"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    title: Mapped[str] = mapped_column(String(500))
    source_url: Mapped[str | None] = mapped_column(String(1000))
    content: Mapped[str] = mapped_column(Text)
    word_count: Mapped[int] = mapped_column(Integer, default=0)
    unknown_word_count: Mapped[int] = mapped_column(Integer, default=0)
    last_read_position: Mapped[int] = mapped_column(Integer, default=0)
    is_finished: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    user: Mapped["User"] = relationship(back_populates="articles")

class LeagueWeek(Base):
    __tablename__ = "league_weeks"
    __table_args__ = (UniqueConstraint("user_id", "week_start_date", name="uq_user_week"),)
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    week_start_date: Mapped[date] = mapped_column(Date)
    tier: Mapped[str] = mapped_column(String(20))
    weekly_xp: Mapped[int] = mapped_column(Integer, default=0)
    rank: Mapped[int | None] = mapped_column(Integer)

    user: Mapped["User"] = relationship(back_populates="league_weeks")
