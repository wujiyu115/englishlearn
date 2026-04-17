# backend/tests/test_auth.py
def test_register(client):
    r = client.post("/auth/register", json={
        "email": "new@example.com",
        "nickname": "NewUser",
        "password": "secret123",
    })
    assert r.status_code == 200
    assert "access_token" in r.json()

def test_register_duplicate_email(client, test_user):
    r = client.post("/auth/register", json={
        "email": test_user.email,
        "nickname": "Dup",
        "password": "secret123",
    })
    assert r.status_code == 400

def test_login_success(client, test_user):
    r = client.post("/auth/login", json={
        "email": test_user.email,
        "password": "password123",
    })
    assert r.status_code == 200
    assert "access_token" in r.json()

def test_login_wrong_password(client, test_user):
    r = client.post("/auth/login", json={
        "email": test_user.email,
        "password": "wrongpass",
    })
    assert r.status_code == 401

def test_refresh_success(client):
    # Register to get cookies set
    r = client.post("/auth/register", json={
        "email": "refresh@example.com",
        "nickname": "RefreshUser",
        "password": "secret123",
    })
    assert r.status_code == 200
    # refresh_token cookie should be set
    r2 = client.post("/auth/refresh")
    assert r2.status_code == 200
    assert "access_token" in r2.json()

def test_refresh_invalid_token(client):
    client.cookies.set("refresh_token", "invalid.token.here")
    r = client.post("/auth/refresh")
    assert r.status_code == 401
