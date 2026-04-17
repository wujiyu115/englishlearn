# backend/tests/test_xp.py
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
