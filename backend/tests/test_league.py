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
