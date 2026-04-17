# backend/app/routers/league.py
from datetime import date, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, joinedload
from sqlalchemy.exc import IntegrityError
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
        try:
            lw = LeagueWeek(user_id=user.id, week_start_date=week_start, tier=user.league_tier, weekly_xp=0)
            db.add(lw)
            db.commit()
            db.refresh(lw)
        except IntegrityError:
            db.rollback()
            lw = db.query(LeagueWeek).filter(
                LeagueWeek.user_id == user.id,
                LeagueWeek.week_start_date == week_start,
            ).first()
    return lw


@router.get("/current", response_model=LeagueResponse)
def get_current_league(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    week_start = _current_week_start()
    my_lw = _get_or_create_week(current_user, db)
    all_weeks = (
        db.query(LeagueWeek)
        .options(joinedload(LeagueWeek.user))
        .filter(LeagueWeek.week_start_date == week_start, LeagueWeek.tier == my_lw.tier)
        .order_by(LeagueWeek.weekly_xp.desc())
        .limit(20)
        .all()
    )
    entries = [
        LeagueEntry(
            user_id=lw.user.id, nickname=lw.user.nickname, avatar_url=lw.user.avatar_url,
            weekly_xp=lw.weekly_xp, rank=rank, tier=lw.tier,
        )
        for rank, lw in enumerate(all_weeks, 1)
    ]
    my_entry = next(
        (e for e in entries if e.user_id == current_user.id),
        LeagueEntry(
            user_id=current_user.id,
            nickname=current_user.nickname,
            avatar_url=current_user.avatar_url,
            weekly_xp=my_lw.weekly_xp,
            rank=len(entries) + 1,
            tier=my_lw.tier,
        ),
    )
    return LeagueResponse(my_entry=my_entry, entries=entries, week_start_date=week_start)


@router.get("/friends", response_model=list[LeagueEntry])
def get_friends(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Placeholder: return top 10 users this week (friend system not in scope v1)
    week_start = _current_week_start()
    weeks = (
        db.query(LeagueWeek)
        .options(joinedload(LeagueWeek.user))
        .filter(LeagueWeek.week_start_date == week_start, LeagueWeek.tier == current_user.league_tier)
        .order_by(LeagueWeek.weekly_xp.desc())
        .limit(10)
        .all()
    )
    result = [
        LeagueEntry(
            user_id=lw.user.id, nickname=lw.user.nickname, avatar_url=lw.user.avatar_url,
            weekly_xp=lw.weekly_xp, rank=rank, tier=lw.tier,
        )
        for rank, lw in enumerate(weeks, 1)
    ]
    return result
