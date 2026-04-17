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
    del_r = client.delete(f"/words/{word_id}")
    assert del_r.status_code == 200
    r2 = client.get("/words")
    assert len(r2.json()) == 0
