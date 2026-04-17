import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")

from .database import engine, Base
from .routers import auth, user, words, scenes, articles, league

@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield

app = FastAPI(title="EnglishApp API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
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
