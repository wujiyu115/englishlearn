# backend/app/services/xp.py
def xp_for_level(level: int) -> int:
    """Total XP needed to reach this level."""
    return sum(100 * i for i in range(1, level))

def calc_level(total_xp: int) -> int:
    """Derive level from total XP."""
    level = 1
    while xp_for_level(level + 1) <= total_xp:
        level += 1
    return level
