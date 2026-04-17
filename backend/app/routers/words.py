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
