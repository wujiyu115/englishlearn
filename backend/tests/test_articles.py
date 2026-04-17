# backend/tests/test_articles.py
from unittest.mock import patch


def test_add_article_raw_text(auth_client):
    client, _ = auth_client
    r = client.post("/articles", json={"raw_text": "Hello world. This is a test article."})
    assert r.status_code == 200
    data = r.json()
    assert data["word_count"] > 0
    assert "content" in data


def test_add_article_url(auth_client):
    client, _ = auth_client
    with patch("app.routers.articles.parse_url", return_value=("Test Title", "Some content here.")):
        r = client.post("/articles", json={"source_url": "https://example.com/article"})
    assert r.status_code == 200
    assert r.json()["title"] == "Test Title"


def test_list_articles(auth_client):
    client, _ = auth_client
    client.post("/articles", json={"raw_text": "Article one text here."})
    r = client.get("/articles")
    assert len(r.json()) == 1


def test_update_progress(auth_client):
    client, _ = auth_client
    r = client.post("/articles", json={"raw_text": "Some reading content."})
    art_id = r.json()["id"]
    r2 = client.put(f"/articles/{art_id}/progress", json={"position": 42})
    assert r2.json()["last_read_position"] == 42


def test_finish_article(auth_client):
    client, _ = auth_client
    r = client.post("/articles", json={"raw_text": "Final content."})
    art_id = r.json()["id"]
    r2 = client.put(f"/articles/{art_id}/finish")
    assert r2.json()["is_finished"] is True
