# backend/app/routers/articles.py
import requests as _requests
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User, Article, Word
from ..schemas import ArticleCreate, ArticleOut, ArticleDetail, ProgressUpdate
from ..auth import get_current_user
from ..services.parser import parse_url, count_words, estimate_unknown

router = APIRouter()


@router.get("", response_model=list[ArticleOut])
def list_articles(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return (
        db.query(Article)
        .filter(Article.user_id == current_user.id)
        .order_by(Article.created_at.desc())
        .all()
    )


@router.post("", response_model=ArticleDetail)
def add_article(
    body: ArticleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not body.source_url and not body.raw_text:
        raise HTTPException(400, "Provide source_url or raw_text")
    if body.source_url:
        try:
            title, content = parse_url(body.source_url)
        except ValueError as exc:
            raise HTTPException(400, str(exc))
        except _requests.Timeout:
            raise HTTPException(422, "URL fetch timed out")
        except _requests.HTTPError as exc:
            raise HTTPException(422, f"URL returned error: {exc.response.status_code}")
        except _requests.RequestException as exc:
            raise HTTPException(422, f"Could not fetch URL: {exc}")
    else:
        title = body.raw_text[:60].split(".")[0].strip() or "Untitled"
        content = body.raw_text
    known = {
        w.english.lower()
        for w in db.query(Word).filter(Word.user_id == current_user.id).all()
    }
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
def update_progress(
    article_id: int,
    body: ProgressUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    article = (
        db.query(Article)
        .filter(Article.id == article_id, Article.user_id == current_user.id)
        .first()
    )
    if not article:
        raise HTTPException(404, "Article not found")
    article.last_read_position = body.position
    db.commit()
    db.refresh(article)
    return article


@router.put("/{article_id}/finish", response_model=ArticleOut)
def finish_article(
    article_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    article = (
        db.query(Article)
        .filter(Article.id == article_id, Article.user_id == current_user.id)
        .first()
    )
    if not article:
        raise HTTPException(404, "Article not found")
    article.is_finished = True
    db.commit()
    db.refresh(article)
    return article
