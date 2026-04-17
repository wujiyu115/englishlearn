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
    # Reject dates earlier than what we already recorded
    if last is not None and today < last:
        db.refresh(current_user)
        return current_user
    if last is None or (today - last).days > 1:
        current_user.streak_count = 1
    elif (today - last).days == 1:
        current_user.streak_count += 1
    # same day: no change
    current_user.last_study_date = today
    db.commit()
    db.refresh(current_user)
    return current_user
