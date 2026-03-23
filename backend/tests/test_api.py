def test_register_login_and_me_flow(client):
    register_response = client.post("/api/auth/register", json={"email": "user@test.com", "password": "Senha123"})
    assert register_response.status_code == 201
    token = register_response.get_json()["token"]

    me_response = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_response.status_code == 200
    assert me_response.get_json()["email"] == "user@test.com"


def test_history_pagination_filter_and_single_delete(client, auth_headers):
    client.post("/api/solve/math", json={"question": "2+2"}, headers=auth_headers)
    client.post("/api/solve/general", json={"question": "o que e ia"}, headers=auth_headers)

    history_response = client.get("/api/history?page=1&page_size=1&subject=geral", headers=auth_headers)
    assert history_response.status_code == 200
    payload = history_response.get_json()
    assert payload["pagination"]["page_size"] == 1
    assert payload["pagination"]["total"] >= 1
    assert payload["items"][0]["subject"] == "geral"

    history_id = payload["items"][0]["id"]
    delete_response = client.delete(f"/api/history/{history_id}", headers=auth_headers)
    assert delete_response.status_code == 200

    after_delete = client.get("/api/history?subject=geral", headers=auth_headers).get_json()
    assert all(item["id"] != history_id for item in after_delete["items"])


def test_clear_history_endpoint(client, auth_headers):
    client.post("/api/solve/math", json={"question": "2+2"}, headers=auth_headers)
    clear_response = client.delete("/api/history", headers=auth_headers)
    assert clear_response.status_code == 200
    assert clear_response.get_json()["deleted"] >= 1


def test_math_response_contains_detailed_steps(client, auth_headers):
    response = client.post("/api/solve/math", json={"question": "1/2 + 3/4"}, headers=auth_headers)
    payload = response.get_json()

    assert response.status_code == 200
    assert payload["subject"] == "matematica"
    assert len(payload["steps"]) >= 3
    assert any("frac" in step.lower() or "denominador" in step.lower() for step in payload["steps"])


def test_reset_password_flow(client):
    register_response = client.post("/api/auth/register", json={"email": "reset@test.com", "password": "Senha123"})
    old_token = register_response.get_json()["token"]
    forgot_response = client.post("/api/auth/forgot-password", json={"email": "reset@test.com"})

    assert forgot_response.status_code == 200
    forgot_payload = forgot_response.get_json()
    assert "reset_token" in forgot_payload

    reset_response = client.post(
        "/api/auth/reset-password",
        json={"token": forgot_payload["reset_token"], "password": "NovaSenha123"},
    )
    assert reset_response.status_code == 200

    old_me_response = client.get("/api/auth/me", headers={"Authorization": f"Bearer {old_token}"})
    assert old_me_response.status_code == 401

    login_response = client.post("/api/auth/login", json={"email": "reset@test.com", "password": "NovaSenha123"})
    assert login_response.status_code == 200


def test_rate_limit_blocks_excess_requests(client, auth_headers, clear_rate_limits):
    for _ in range(12):
        response = client.post("/api/solve/general", json={"question": "o que e ia"}, headers=auth_headers)
        assert response.status_code == 200

    blocked = client.post("/api/solve/general", json={"question": "o que e ia"}, headers=auth_headers)
    assert blocked.status_code == 429
