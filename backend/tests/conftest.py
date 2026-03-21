import os
import sys
from pathlib import Path

import pytest


BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app import create_app  # noqa: E402
from extensions import db  # noqa: E402
from models import User  # noqa: E402
from services.rate_limit import rate_limiter  # noqa: E402


@pytest.fixture()
def app():
    database_path = BACKEND_DIR / "test_app.db"
    if database_path.exists():
        database_path.unlink()

    os.environ["EXPOSE_RESET_TOKEN"] = "1"
    test_app = create_app(
        {
            "TESTING": True,
            "SQLALCHEMY_DATABASE_URI": f"sqlite:///{database_path.as_posix()}",
            "JWT_SECRET_KEY": "test-secret",
        }
    )

    with test_app.app_context():
        db.drop_all()
        db.create_all()
        yield test_app
        db.session.remove()
        db.drop_all()

    rate_limiter._events.clear()
    if database_path.exists():
        database_path.unlink()


@pytest.fixture()
def client(app):
    return app.test_client()


@pytest.fixture()
def auth_headers(client):
    client.post("/api/auth/register", json={"email": "aluno@test.com", "password": "123456"})
    login_response = client.post("/api/auth/login", json={"email": "aluno@test.com", "password": "123456"})
    token = login_response.get_json()["token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture()
def registered_user(app):
    with app.app_context():
        return User.query.filter_by(email="aluno@test.com").first()
