# backend/tests/test_scenes.py
from unittest.mock import patch

MOCK_DIALOGUES = [
    {"english": "Can I see the menu?", "chinese": "我能看一下菜单吗？"},
    {"english": "I'd like a coffee.", "chinese": "我想要一杯咖啡。"},
]

def test_search_preset_scene(auth_client, db):
    client, _ = auth_client
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
