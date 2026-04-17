# 英语学习 App — 后端 API 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 用 FastAPI + SQLAlchemy 实现英语学习 App 的完整后端 API，包含鉴权、单词本、场景英语、阅读、联赛六大模块。

**Architecture:** FastAPI 提供 RESTful API，SQLAlchemy ORM 操作 SQLite（开发）/MySQL（生产），JWT 存于 httpOnly Cookie，bcrypt 哈希密码，Claude API 代理场景对话生成。

**Tech Stack:** Python 3.11+, FastAPI, SQLAlchemy 2.x, pydantic v2, python-jose, passlib[bcrypt], httpx, anthropic SDK, pytest, uvicorn

---

## 文件结构

```
backend/
  app/
    __init__.py
    main.py          # FastAPI 应用入口，挂载所有 router
    database.py      # SQLAlchemy engine + session 依赖
    models.py        # 所有 ORM 模型
    schemas.py       # 所有 Pydantic 模型
    auth.py          # JWT 生成/验证 + bcrypt + 当前用户依赖
    routers/
      __init__.py
      auth.py        # POST /auth/register|login|refresh
      user.py        # GET /user/me, PUT /user/xp|streak
      words.py       # CRUD /words, PUT /words/{id}/accuracy
      scenes.py      # GET /scenes/presets|search, POST /scenes/{id}/favorite
      articles.py    # CRUD /articles, PUT /articles/{id}/progress|finish
      league.py      # GET /league/current|friends
    services/
      __init__.py
      claude.py      # Claude API 场景生成
      parser.py      # URL/文本解析 → 干净正文
      xp.py          # XP 累加 + 等级计算
  tests/
    conftest.py      # pytest fixtures: test client, test DB, test user
    test_auth.py
    test_words.py
    test_scenes.py
    test_articles.py
    test_league.py
    test_xp.py
  requirements.txt
  .env.example
```

---

## Task 1: 项目初始化

**Files:**
- Create: `backend/requirements.txt`
- Create: `backend/.env.example`
- Create: `backend/app/__init__.py`
- Create: `backend/app/main.py`
- Create: `backend/app/database.py`

- [ ] **Step 1: 创建目录结构**

```bash
mkdir -p backend/app/routers backend/app/services backend/tests
touch backend/app/__init__.py backend/app/routers/__init__.py backend/app/services/__init__.py
```

- [ ] **Step 2: 创建 requirements.txt**

```
fastapi==0.115.0
uvicorn[standard]==0.30.6
sqlalchemy==2.0.36
pydantic[email]==2.9.2
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
python-multipart==0.0.12
httpx==0.27.2
anthropic==0.40.0
beautifulsoup4==4.12.3
requests==2.32.3
python-dotenv==1.0.1
pytest==8.3.3
pytest-asyncio==0.24.0
httpx==0.27.2
```

```bash
cd backend && python -m venv venv && source venv/bin/activate && pip install -r requirements.txt
```

- [ ] **Step 3: 创建 .env.example**

```bash
cat > backend/.env.example << 'EOF'
DATABASE_URL=sqlite:///./englishapp.db
SECRET_KEY=your-secret-key-min-32-chars
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
REFRESH_TOKEN_EXPIRE_DAYS=30
ANTHROPIC_API_KEY=sk-ant-...
EOF
cp backend/.env.example backend/.env
```

- [ ] **Step 4: 创建 database.py**

```python
# backend/app/database.py
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./englishapp.db")

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

class Base(DeclarativeBase):
    pass

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

- [ ] **Step 5: 创建 main.py（骨架）**

```python
# backend/app/main.py
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

from .database import engine, Base
from .routers import auth, user, words, scenes, articles, league

@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield

app = FastAPI(title="EnglishApp API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(user.router, prefix="/user", tags=["user"])
app.include_router(words.router, prefix="/words", tags=["words"])
app.include_router(scenes.router, prefix="/scenes", tags=["scenes"])
app.include_router(articles.router, prefix="/articles", tags=["articles"])
app.include_router(league.router, prefix="/league", tags=["league"])

@app.get("/health")
def health():
    return {"status": "ok"}
```

- [ ] **Step 6: 验证启动**

先创建空 router 文件（否则 import 报错）：

```bash
for f in auth user words scenes articles league; do
  echo "from fastapi import APIRouter; router = APIRouter()" > backend/app/routers/$f.py
done
```

```bash
cd backend && uvicorn app.main:app --reload
# 预期：Uvicorn running on http://127.0.0.1:8000
```

```bash
curl http://localhost:8000/health
# 预期：{"status":"ok"}
```

- [ ] **Step 7: Commit**

```bash
git add backend/
git commit -m "feat: backend project scaffold with FastAPI + SQLAlchemy"
```

---

## Task 2: 数据模型

**Files:**
- Create: `backend/app/models.py`

- [ ] **Step 1: 写 models.py**

```python
# backend/app/models.py
from datetime import datetime, date
from sqlalchemy import (
    Integer, String, Float, Boolean, Text, Date, DateTime,
    ForeignKey, JSON
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
    source: Mapped[str] = mapped_column(String(20), default="manual")  # manual|scene|reading
    accuracy_rate: Mapped[float] = mapped_column(Float, default=0.0)
    review_count: Mapped[int] = mapped_column(Integer, default=0)
    next_review_date: Mapped[date | None] = mapped_column(Date)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user: Mapped["User"] = relationship(back_populates="words")

class Scene(Base):
    __tablename__ = "scenes"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"))  # null = preset
    name_cn: Mapped[str] = mapped_column(String(100))
    name_en: Mapped[str] = mapped_column(String(100))
    is_preset: Mapped[bool] = mapped_column(Boolean, default=False)
    dialogues: Mapped[list] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    favorites: Mapped[list["UserFavoriteScene"]] = relationship(back_populates="scene", cascade="all, delete")

class UserFavoriteScene(Base):
    __tablename__ = "user_favorite_scenes"
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
    last_read_position: Mapped[int] = mapped_column(Integer, default=0)  # char offset
    is_finished: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    user: Mapped["User"] = relationship(back_populates="articles")

class LeagueWeek(Base):
    __tablename__ = "league_weeks"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    week_start_date: Mapped[date] = mapped_column(Date)
    tier: Mapped[str] = mapped_column(String(20))
    weekly_xp: Mapped[int] = mapped_column(Integer, default=0)
    rank: Mapped[int | None] = mapped_column(Integer)

    user: Mapped["User"] = relationship(back_populates="league_weeks")
```

- [ ] **Step 2: 验证表创建**

```bash
cd backend && python -c "
from app.database import engine, Base
from app import models
Base.metadata.create_all(engine)
print('Tables:', list(Base.metadata.tables.keys()))
"
# 预期：Tables: ['users', 'words', 'scenes', 'user_favorite_scenes', 'articles', 'league_weeks']
```

- [ ] **Step 3: Commit**

```bash
git add backend/app/models.py
git commit -m "feat: define all SQLAlchemy ORM models"
```

---

## Task 3: Pydantic Schemas

**Files:**
- Create: `backend/app/schemas.py`

- [ ] **Step 1: 写 schemas.py**

```python
# backend/app/schemas.py
from datetime import datetime, date
from pydantic import BaseModel, EmailStr

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
    amount: int  # XP to add

class StreakUpdate(BaseModel):
    study_date: date  # date of activity

# --- Words ---
class WordCreate(BaseModel):
    english: str
    phonetic: str | None = None
    chinese: str
    example_sentence: str | None = None
    source: str = "manual"

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
    accuracy_rate: float  # 0.0–1.0

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
    raw_text: str | None = None  # 二选一

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
    position: int  # char offset

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
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/schemas.py
git commit -m "feat: define all Pydantic v2 schemas"
```

---

## Task 4: 鉴权工具 + XP 服务

**Files:**
- Create: `backend/app/auth.py`
- Create: `backend/app/services/xp.py`
- Create: `backend/tests/conftest.py`
- Create: `backend/tests/test_xp.py`

- [ ] **Step 1: 写 tests/test_xp.py（先写测试）**

```python
# backend/tests/test_xp.py
import pytest
from app.services.xp import calc_level, xp_for_level

def test_level_1_at_zero_xp():
    assert calc_level(0) == 1

def test_level_increases_with_xp():
    assert calc_level(100) == 2
    assert calc_level(300) == 3

def test_xp_for_level_1_is_zero():
    assert xp_for_level(1) == 0

def test_xp_for_level_2_is_100():
    assert xp_for_level(2) == 100
```

- [ ] **Step 2: 运行测试，确认失败**

```bash
cd backend && python -m pytest tests/test_xp.py -v
# 预期：ImportError — xp module not found
```

- [ ] **Step 3: 写 services/xp.py**

```python
# backend/app/services/xp.py
# XP required to reach level N: sum of 100*(i-1) for i in 1..N
# Level 1: 0 XP, Level 2: 100 XP, Level 3: 300 XP, Level 4: 600 XP ...

def xp_for_level(level: int) -> int:
    """Total XP needed to reach this level."""
    return sum(100 * i for i in range(level - 1))

def calc_level(total_xp: int) -> int:
    """Derive level from total XP."""
    level = 1
    while xp_for_level(level + 1) <= total_xp:
        level += 1
    return level
```

- [ ] **Step 4: 运行测试，确认通过**

```bash
cd backend && python -m pytest tests/test_xp.py -v
# 预期：4 passed
```

- [ ] **Step 5: 写 auth.py**

```python
# backend/app/auth.py
import os
from datetime import datetime, timedelta
from typing import Annotated
from fastapi import Depends, HTTPException, Cookie, status
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session
from .database import get_db
from .models import User

SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key-change-in-production")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_EXPIRE = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))
REFRESH_EXPIRE = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "30"))

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)

def create_token(data: dict, expires_delta: timedelta) -> str:
    payload = data.copy()
    payload["exp"] = datetime.utcnow() + expires_delta
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def create_access_token(user_id: int) -> str:
    return create_token({"sub": str(user_id), "type": "access"}, timedelta(minutes=ACCESS_EXPIRE))

def create_refresh_token(user_id: int) -> str:
    return create_token({"sub": str(user_id), "type": "refresh"}, timedelta(days=REFRESH_EXPIRE))

def get_current_user(
    access_token: Annotated[str | None, Cookie()] = None,
    db: Session = Depends(get_db),
) -> User:
    credentials_exception = HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    if not access_token:
        raise credentials_exception
    try:
        payload = jwt.decode(access_token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("type") != "access":
            raise credentials_exception
        user_id = int(payload["sub"])
    except (JWTError, KeyError, ValueError):
        raise credentials_exception
    user = db.get(User, user_id)
    if not user:
        raise credentials_exception
    return user
```

- [ ] **Step 6: 写 tests/conftest.py**

```python
# backend/tests/conftest.py
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.database import Base, get_db
from app.models import User
from app.auth import hash_password

TEST_DB = "sqlite:///./test_englishapp.db"
engine = create_engine(TEST_DB, connect_args={"check_same_thread": False})
TestSession = sessionmaker(bind=engine)

@pytest.fixture(autouse=True)
def reset_db():
    Base.metadata.create_all(engine)
    yield
    Base.metadata.drop_all(engine)

@pytest.fixture
def db():
    session = TestSession()
    try:
        yield session
    finally:
        session.close()

def override_db():
    session = TestSession()
    try:
        yield session
    finally:
        session.close()

@pytest.fixture
def client():
    app.dependency_overrides[get_db] = override_db
    with TestClient(app, raise_server_exceptions=True) as c:
        yield c
    app.dependency_overrides.clear()

@pytest.fixture
def test_user(db):
    user = User(
        email="test@example.com",
        nickname="Tester",
        password_hash=hash_password("password123"),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

@pytest.fixture
def auth_client(client, test_user):
    """Client with a valid access_token cookie."""
    from app.auth import create_access_token
    token = create_access_token(test_user.id)
    client.cookies.set("access_token", token)
    return client, test_user
```

- [ ] **Step 7: Commit**

```bash
git add backend/app/auth.py backend/app/services/xp.py backend/tests/
git commit -m "feat: auth utilities, XP service, test fixtures"
```

---

## Task 5: Auth Router

**Files:**
- Modify: `backend/app/routers/auth.py`
- Create: `backend/tests/test_auth.py`

- [ ] **Step 1: 写 tests/test_auth.py**

```python
# backend/tests/test_auth.py
def test_register(client):
    r = client.post("/auth/register", json={
        "email": "new@example.com",
        "nickname": "NewUser",
        "password": "secret123",
    })
    assert r.status_code == 200
    assert "access_token" in r.json()

def test_register_duplicate_email(client, test_user):
    r = client.post("/auth/register", json={
        "email": test_user.email,
        "nickname": "Dup",
        "password": "secret123",
    })
    assert r.status_code == 400

def test_login_success(client, test_user):
    r = client.post("/auth/login", json={
        "email": test_user.email,
        "password": "password123",
    })
    assert r.status_code == 200
    assert "access_token" in r.json()

def test_login_wrong_password(client, test_user):
    r = client.post("/auth/login", json={
        "email": test_user.email,
        "password": "wrongpass",
    })
    assert r.status_code == 401
```

- [ ] **Step 2: 运行测试，确认失败**

```bash
cd backend && python -m pytest tests/test_auth.py -v
# 预期：422/404 errors — router not implemented
```

- [ ] **Step 3: 实现 routers/auth.py**

```python
# backend/app/routers/auth.py
from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User
from ..schemas import RegisterRequest, LoginRequest, TokenResponse
from ..auth import hash_password, verify_password, create_access_token, create_refresh_token

router = APIRouter()

@router.post("/register", response_model=TokenResponse)
def register(body: RegisterRequest, response: Response, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == body.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(
        email=body.email,
        nickname=body.nickname,
        password_hash=hash_password(body.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    token = create_access_token(user.id)
    refresh = create_refresh_token(user.id)
    response.set_cookie("access_token", token, httponly=True, samesite="lax")
    response.set_cookie("refresh_token", refresh, httponly=True, samesite="lax")
    return TokenResponse(access_token=token)

@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest, response: Response, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == body.email).first()
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_access_token(user.id)
    refresh = create_refresh_token(user.id)
    response.set_cookie("access_token", token, httponly=True, samesite="lax")
    response.set_cookie("refresh_token", refresh, httponly=True, samesite="lax")
    return TokenResponse(access_token=token)

@router.post("/refresh", response_model=TokenResponse)
def refresh(response: Response, refresh_token: str | None = None, db: Session = Depends(get_db)):
    from jose import JWTError, jwt
    from ..auth import SECRET_KEY, ALGORITHM, create_access_token
    if not refresh_token:
        raise HTTPException(status_code=401, detail="No refresh token")
    try:
        payload = jwt.decode(refresh_token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user_id = int(payload["sub"])
    except (JWTError, ValueError):
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    token = create_access_token(user.id)
    response.set_cookie("access_token", token, httponly=True, samesite="lax")
    return TokenResponse(access_token=token)
```

- [ ] **Step 4: 运行测试，确认通过**

```bash
cd backend && python -m pytest tests/test_auth.py -v
# 预期：4 passed
```

- [ ] **Step 5: Commit**

```bash
git add backend/app/routers/auth.py backend/tests/test_auth.py
git commit -m "feat: auth register/login/refresh endpoints"
```

---

## Task 6: User Router

**Files:**
- Modify: `backend/app/routers/user.py`

- [ ] **Step 1: 实现 routers/user.py**

```python
# backend/app/routers/user.py
from datetime import date
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User
from ..schemas import UserOut, XPUpdate, StreakUpdate
from ..auth import get_current_user
from ..services.xp import calc_level

router = APIRouter()

@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.put("/xp", response_model=UserOut)
def update_xp(body: XPUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    current_user.total_xp += body.amount
    current_user.level = calc_level(current_user.total_xp)
    db.commit()
    db.refresh(current_user)
    return current_user

@router.put("/streak", response_model=UserOut)
def update_streak(body: StreakUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    today = body.study_date
    last = current_user.last_study_date
    from datetime import timedelta
    if last is None or (today - last).days > 1:
        current_user.streak_count = 1
    elif (today - last).days == 1:
        current_user.streak_count += 1
    # same day: no change
    current_user.last_study_date = today
    db.commit()
    db.refresh(current_user)
    return current_user
```

- [ ] **Step 2: 测试 user 端点**

```bash
cd backend && python -m pytest -k "user" -v
# 若无 test_user.py，用 curl 手动验证：
curl -X GET http://localhost:8000/user/me
# 预期：401（未登录）
```

- [ ] **Step 3: Commit**

```bash
git add backend/app/routers/user.py
git commit -m "feat: user profile, XP, streak endpoints"
```

---

## Task 7: Words Router

**Files:**
- Modify: `backend/app/routers/words.py`
- Create: `backend/tests/test_words.py`

- [ ] **Step 1: 写 tests/test_words.py**

```python
# backend/tests/test_words.py
def test_add_word(auth_client):
    client, user = auth_client
    r = client.post("/words", json={
        "english": "ephemeral",
        "phonetic": "/ɪˈfem.ər.əl/",
        "chinese": "短暂的",
        "source": "manual",
    })
    assert r.status_code == 200
    assert r.json()["english"] == "ephemeral"

def test_list_words(auth_client):
    client, user = auth_client
    client.post("/words", json={"english": "test", "chinese": "测试", "source": "manual"})
    r = client.get("/words")
    assert r.status_code == 200
    assert len(r.json()) == 1

def test_filter_by_source(auth_client):
    client, _ = auth_client
    client.post("/words", json={"english": "a", "chinese": "甲", "source": "scene"})
    client.post("/words", json={"english": "b", "chinese": "乙", "source": "manual"})
    r = client.get("/words?source=scene")
    assert len(r.json()) == 1

def test_update_accuracy(auth_client):
    client, _ = auth_client
    r = client.post("/words", json={"english": "x", "chinese": "X", "source": "manual"})
    word_id = r.json()["id"]
    r2 = client.put(f"/words/{word_id}/accuracy", json={"accuracy_rate": 0.8})
    assert r2.json()["accuracy_rate"] == 0.8

def test_delete_word(auth_client):
    client, _ = auth_client
    r = client.post("/words", json={"english": "del", "chinese": "删", "source": "manual"})
    word_id = r.json()["id"]
    client.delete(f"/words/{word_id}")
    r2 = client.get("/words")
    assert len(r2.json()) == 0
```

- [ ] **Step 2: 运行测试，确认失败**

```bash
cd backend && python -m pytest tests/test_words.py -v
# 预期：404 errors
```

- [ ] **Step 3: 实现 routers/words.py**

```python
# backend/app/routers/words.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User, Word
from ..schemas import WordCreate, WordOut, AccuracyUpdate
from ..auth import get_current_user

router = APIRouter()

@router.get("", response_model=list[WordOut])
def list_words(source: str | None = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    q = db.query(Word).filter(Word.user_id == current_user.id)
    if source:
        q = q.filter(Word.source == source)
    return q.order_by(Word.created_at.desc()).all()

@router.post("", response_model=WordOut)
def add_word(body: WordCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    word = Word(user_id=current_user.id, **body.model_dump())
    db.add(word)
    db.commit()
    db.refresh(word)
    return word

@router.put("/{word_id}/accuracy", response_model=WordOut)
def update_accuracy(word_id: int, body: AccuracyUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    word = db.query(Word).filter(Word.id == word_id, Word.user_id == current_user.id).first()
    if not word:
        raise HTTPException(404, "Word not found")
    word.accuracy_rate = body.accuracy_rate
    word.review_count += 1
    db.commit()
    db.refresh(word)
    return word

@router.delete("/{word_id}")
def delete_word(word_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    word = db.query(Word).filter(Word.id == word_id, Word.user_id == current_user.id).first()
    if not word:
        raise HTTPException(404, "Word not found")
    db.delete(word)
    db.commit()
    return {"ok": True}
```

- [ ] **Step 4: 运行测试，确认通过**

```bash
cd backend && python -m pytest tests/test_words.py -v
# 预期：5 passed
```

- [ ] **Step 5: Commit**

```bash
git add backend/app/routers/words.py backend/tests/test_words.py
git commit -m "feat: words CRUD + accuracy update endpoints"
```

---

## Task 8: Claude 服务 + Scenes Router

**Files:**
- Create: `backend/app/services/claude.py`
- Modify: `backend/app/routers/scenes.py`
- Create: `backend/tests/test_scenes.py`

- [ ] **Step 1: 写 services/claude.py**

```python
# backend/app/services/claude.py
import os
import json
import anthropic

client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

SCENE_PROMPT = """Generate {count} natural English dialogues for the scene: "{scene}".
Return ONLY a JSON array, no markdown, no explanation.
Each item: {{"english": "...", "chinese": "...（中文翻译）"}}
Make dialogues practical and natural."""

def generate_scene_dialogues(scene_name: str, count: int = 10) -> list[dict]:
    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1024,
        messages=[{"role": "user", "content": SCENE_PROMPT.format(scene=scene_name, count=count)}],
    )
    text = message.content[0].text.strip()
    # Strip markdown code fences if present
    if text.startswith("```"):
        text = text.split("```")[1]
        if text.startswith("json"):
            text = text[4:]
    return json.loads(text.strip())
```

- [ ] **Step 2: 写 tests/test_scenes.py**

```python
# backend/tests/test_scenes.py
from unittest.mock import patch

MOCK_DIALOGUES = [
    {"english": "Can I see the menu?", "chinese": "我能看一下菜单吗？"},
    {"english": "I'd like a coffee.", "chinese": "我想要一杯咖啡。"},
]

def test_search_preset_scene(client, db):
    from app.models import Scene
    scene = Scene(name_cn="餐厅", name_en="restaurant", is_preset=True, dialogues=MOCK_DIALOGUES)
    db.add(scene)
    db.commit()
    r = client.get("/scenes/search?q=餐厅")
    assert r.status_code == 200
    assert r.json()["name_cn"] == "餐厅"

def test_search_generates_via_claude(auth_client):
    client, _ = auth_client
    with patch("app.routers.scenes.generate_scene_dialogues", return_value=MOCK_DIALOGUES):
        r = client.get("/scenes/search?q=太空旅行")
    assert r.status_code == 200
    assert len(r.json()["dialogues"]) == 2

def test_favorite_scene(auth_client, db):
    client, _ = auth_client
    from app.models import Scene
    scene = Scene(name_cn="机场", name_en="airport", is_preset=True, dialogues=MOCK_DIALOGUES)
    db.add(scene)
    db.commit()
    r = client.post(f"/scenes/{scene.id}/favorite")
    assert r.status_code == 200
    assert r.json()["ok"] is True

def test_list_presets(client, db):
    from app.models import Scene
    db.add(Scene(name_cn="酒店", name_en="hotel", is_preset=True, dialogues=MOCK_DIALOGUES))
    db.commit()
    r = client.get("/scenes/presets")
    assert r.status_code == 200
    assert len(r.json()) == 1
```

- [ ] **Step 3: 运行测试，确认失败**

```bash
cd backend && python -m pytest tests/test_scenes.py -v
# 预期：404 errors
```

- [ ] **Step 4: 实现 routers/scenes.py**

```python
# backend/app/routers/scenes.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User, Scene, UserFavoriteScene
from ..schemas import SceneOut
from ..auth import get_current_user
from ..services.claude import generate_scene_dialogues

router = APIRouter()

def _scene_out(scene: Scene, user_id: int | None, db: Session) -> dict:
    is_fav = False
    if user_id:
        is_fav = db.query(UserFavoriteScene).filter_by(user_id=user_id, scene_id=scene.id).first() is not None
    return {**scene.__dict__, "is_favorited": is_fav}

@router.get("/presets", response_model=list[SceneOut])
def list_presets(db: Session = Depends(get_db)):
    scenes = db.query(Scene).filter(Scene.is_preset == True).all()
    return [_scene_out(s, None, db) for s in scenes]

@router.get("/search", response_model=SceneOut)
def search_scene(q: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Try preset match
    scene = db.query(Scene).filter(
        (Scene.name_cn.ilike(f"%{q}%")) | (Scene.name_en.ilike(f"%{q}%")),
        Scene.is_preset == True,
    ).first()
    if scene:
        return _scene_out(scene, current_user.id, db)
    # Try user's cached scene
    scene = db.query(Scene).filter(
        Scene.user_id == current_user.id,
        (Scene.name_cn.ilike(f"%{q}%")) | (Scene.name_en.ilike(f"%{q}%")),
    ).first()
    if scene:
        return _scene_out(scene, current_user.id, db)
    # Generate via Claude
    dialogues = generate_scene_dialogues(q)
    scene = Scene(
        user_id=current_user.id,
        name_cn=q,
        name_en=q,
        is_preset=False,
        dialogues=dialogues,
    )
    db.add(scene)
    db.commit()
    db.refresh(scene)
    return _scene_out(scene, current_user.id, db)

@router.post("/{scene_id}/favorite")
def favorite_scene(scene_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    scene = db.get(Scene, scene_id)
    if not scene:
        raise HTTPException(404, "Scene not found")
    existing = db.query(UserFavoriteScene).filter_by(user_id=current_user.id, scene_id=scene_id).first()
    if not existing:
        db.add(UserFavoriteScene(user_id=current_user.id, scene_id=scene_id))
        db.commit()
    return {"ok": True}
```

- [ ] **Step 5: 运行测试，确认通过**

```bash
cd backend && python -m pytest tests/test_scenes.py -v
# 预期：4 passed
```

- [ ] **Step 6: Commit**

```bash
git add backend/app/services/claude.py backend/app/routers/scenes.py backend/tests/test_scenes.py
git commit -m "feat: scenes search with Claude API fallback + favorites"
```

---

## Task 9: Article Parser + Articles Router

**Files:**
- Create: `backend/app/services/parser.py`
- Modify: `backend/app/routers/articles.py`
- Create: `backend/tests/test_articles.py`

- [ ] **Step 1: 写 services/parser.py**

```python
# backend/app/services/parser.py
import re
import requests
from bs4 import BeautifulSoup

def parse_url(url: str) -> tuple[str, str]:
    """Returns (title, clean_text)."""
    resp = requests.get(url, timeout=10, headers={"User-Agent": "Mozilla/5.0"})
    resp.raise_for_status()
    soup = BeautifulSoup(resp.text, "html.parser")
    title = soup.title.string.strip() if soup.title else url
    for tag in soup(["script", "style", "nav", "footer", "header", "aside"]):
        tag.decompose()
    text = soup.get_text(separator=" ")
    text = re.sub(r"\s+", " ", text).strip()
    return title, text

def count_words(text: str) -> int:
    return len(re.findall(r"\b[a-zA-Z]+\b", text))

def estimate_unknown(text: str, known_words: set[str]) -> int:
    words = set(re.findall(r"\b[a-zA-Z]+\b", text.lower()))
    return len(words - known_words)
```

- [ ] **Step 2: 写 tests/test_articles.py**

```python
# backend/tests/test_articles.py
from unittest.mock import patch

def test_add_article_raw_text(auth_client):
    client, _ = auth_client
    r = client.post("/articles", json={"raw_text": "Hello world. This is a test article."})
    assert r.status_code == 200
    data = r.json()
    assert data["word_count"] > 0
    assert "content" in data

def test_add_article_url(auth_client):
    client, _ = auth_client
    with patch("app.routers.articles.parse_url", return_value=("Test Title", "Some content here.")):
        r = client.post("/articles", json={"source_url": "https://example.com/article"})
    assert r.status_code == 200
    assert r.json()["title"] == "Test Title"

def test_list_articles(auth_client):
    client, _ = auth_client
    client.post("/articles", json={"raw_text": "Article one text here."})
    r = client.get("/articles")
    assert len(r.json()) == 1

def test_update_progress(auth_client):
    client, _ = auth_client
    r = client.post("/articles", json={"raw_text": "Some reading content."})
    art_id = r.json()["id"]
    r2 = client.put(f"/articles/{art_id}/progress", json={"position": 42})
    assert r2.json()["last_read_position"] == 42

def test_finish_article(auth_client):
    client, _ = auth_client
    r = client.post("/articles", json={"raw_text": "Final content."})
    art_id = r.json()["id"]
    r2 = client.put(f"/articles/{art_id}/finish")
    assert r2.json()["is_finished"] is True
```

- [ ] **Step 3: 运行测试，确认失败**

```bash
cd backend && python -m pytest tests/test_articles.py -v
# 预期：404 errors
```

- [ ] **Step 4: 实现 routers/articles.py**

```python
# backend/app/routers/articles.py
import re
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User, Article, Word
from ..schemas import ArticleCreate, ArticleOut, ArticleDetail, ProgressUpdate
from ..auth import get_current_user
from ..services.parser import parse_url, count_words, estimate_unknown

router = APIRouter()

@router.get("", response_model=list[ArticleOut])
def list_articles(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Article).filter(Article.user_id == current_user.id).order_by(Article.created_at.desc()).all()

@router.post("", response_model=ArticleDetail)
def add_article(body: ArticleCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not body.source_url and not body.raw_text:
        raise HTTPException(400, "Provide source_url or raw_text")
    if body.source_url:
        title, content = parse_url(body.source_url)
    else:
        title = body.raw_text[:60].split(".")[0].strip() or "Untitled"
        content = body.raw_text
    known = {w.english.lower() for w in db.query(Word).filter(Word.user_id == current_user.id).all()}
    article = Article(
        user_id=current_user.id,
        title=title,
        source_url=body.source_url,
        content=content,
        word_count=count_words(content),
        unknown_word_count=estimate_unknown(content, known),
    )
    db.add(article)
    db.commit()
    db.refresh(article)
    return article

@router.put("/{article_id}/progress", response_model=ArticleOut)
def update_progress(article_id: int, body: ProgressUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    article = db.query(Article).filter(Article.id == article_id, Article.user_id == current_user.id).first()
    if not article:
        raise HTTPException(404, "Article not found")
    article.last_read_position = body.position
    db.commit()
    db.refresh(article)
    return article

@router.put("/{article_id}/finish", response_model=ArticleOut)
def finish_article(article_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    article = db.query(Article).filter(Article.id == article_id, Article.user_id == current_user.id).first()
    if not article:
        raise HTTPException(404, "Article not found")
    article.is_finished = True
    db.commit()
    db.refresh(article)
    return article
```

- [ ] **Step 5: 运行测试，确认通过**

```bash
cd backend && python -m pytest tests/test_articles.py -v
# 预期：5 passed
```

- [ ] **Step 6: Commit**

```bash
git add backend/app/services/parser.py backend/app/routers/articles.py backend/tests/test_articles.py
git commit -m "feat: articles CRUD with URL parsing and progress tracking"
```

---

## Task 10: League Router

**Files:**
- Modify: `backend/app/routers/league.py`
- Create: `backend/tests/test_league.py`

- [ ] **Step 1: 写 tests/test_league.py**

```python
# backend/tests/test_league.py
from datetime import date, timedelta

def _seed_league(db, user, xp=100):
    from app.models import LeagueWeek
    today = date.today()
    week_start = today - timedelta(days=today.weekday())
    lw = LeagueWeek(user_id=user.id, week_start_date=week_start, tier="bronze", weekly_xp=xp, rank=1)
    db.add(lw)
    db.commit()
    return lw

def test_get_current_league(auth_client, db, test_user):
    client, _ = auth_client
    _seed_league(db, test_user, xp=200)
    r = client.get("/league/current")
    assert r.status_code == 200
    assert r.json()["my_entry"]["weekly_xp"] == 200

def test_league_no_record(auth_client):
    client, _ = auth_client
    r = client.get("/league/current")
    assert r.status_code == 200
    assert r.json()["my_entry"]["weekly_xp"] == 0
```

- [ ] **Step 2: 运行测试，确认失败**

```bash
cd backend && python -m pytest tests/test_league.py -v
```

- [ ] **Step 3: 实现 routers/league.py**

```python
# backend/app/routers/league.py
from datetime import date, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User, LeagueWeek
from ..schemas import LeagueResponse, LeagueEntry
from ..auth import get_current_user

router = APIRouter()

def _current_week_start() -> date:
    today = date.today()
    return today - timedelta(days=today.weekday())

def _get_or_create_week(user: User, db: Session) -> LeagueWeek:
    week_start = _current_week_start()
    lw = db.query(LeagueWeek).filter(
        LeagueWeek.user_id == user.id,
        LeagueWeek.week_start_date == week_start,
    ).first()
    if not lw:
        lw = LeagueWeek(user_id=user.id, week_start_date=week_start, tier=user.league_tier, weekly_xp=0)
        db.add(lw)
        db.commit()
        db.refresh(lw)
    return lw

@router.get("/current", response_model=LeagueResponse)
def get_current_league(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    week_start = _current_week_start()
    my_lw = _get_or_create_week(current_user, db)
    all_weeks = (
        db.query(LeagueWeek)
        .filter(LeagueWeek.week_start_date == week_start, LeagueWeek.tier == my_lw.tier)
        .order_by(LeagueWeek.weekly_xp.desc())
        .limit(20)
        .all()
    )
    entries = []
    for rank, lw in enumerate(all_weeks, 1):
        user = db.get(User, lw.user_id)
        entries.append(LeagueEntry(
            user_id=user.id, nickname=user.nickname, avatar_url=user.avatar_url,
            weekly_xp=lw.weekly_xp, rank=rank, tier=lw.tier,
        ))
    my_entry = next((e for e in entries if e.user_id == current_user.id), LeagueEntry(
        user_id=current_user.id, nickname=current_user.nickname, avatar_url=current_user.avatar_url,
        weekly_xp=0, rank=len(entries) + 1, tier=current_user.league_tier,
    ))
    return LeagueResponse(my_entry=my_entry, entries=entries, week_start_date=week_start)

@router.get("/friends", response_model=list[LeagueEntry])
def get_friends(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Placeholder: return top 10 users this week (friend system not in scope v1)
    week_start = _current_week_start()
    weeks = (
        db.query(LeagueWeek)
        .filter(LeagueWeek.week_start_date == week_start)
        .order_by(LeagueWeek.weekly_xp.desc())
        .limit(10)
        .all()
    )
    result = []
    for rank, lw in enumerate(weeks, 1):
        user = db.get(User, lw.user_id)
        result.append(LeagueEntry(
            user_id=user.id, nickname=user.nickname, avatar_url=user.avatar_url,
            weekly_xp=lw.weekly_xp, rank=rank, tier=lw.tier,
        ))
    return result
```

- [ ] **Step 4: 运行测试，确认通过**

```bash
cd backend && python -m pytest tests/test_league.py -v
# 预期：2 passed
```

- [ ] **Step 5: 全套测试**

```bash
cd backend && python -m pytest tests/ -v
# 预期：全部通过
```

- [ ] **Step 6: Commit**

```bash
git add backend/app/routers/league.py backend/tests/test_league.py
git commit -m "feat: league weekly rankings endpoint"
```

---

后端完成。前端计划见：`docs/superpowers/plans/2026-04-17-frontend.md`
