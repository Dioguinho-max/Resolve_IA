import os
from datetime import timedelta

from dotenv import load_dotenv
from flask import Flask
from flask_cors import CORS
from sqlalchemy import inspect, text

from extensions import bcrypt, db, jwt
from routes import api


load_dotenv()


def build_cors_origins():
    raw_origins = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000").strip()
    if not raw_origins or raw_origins == "*":
        return "*"
    origins = [origin.strip().rstrip("/") for origin in raw_origins.split(",") if origin.strip()]
    return origins or "*"


def ensure_runtime_schema(app: Flask):
    inspector = inspect(db.engine)
    if "users" not in inspector.get_table_names():
        return

    user_columns = {column["name"] for column in inspector.get_columns("users")}
    statements = []
    if "reset_token_hash" not in user_columns:
        statements.append(text("ALTER TABLE users ADD COLUMN reset_token_hash VARCHAR(255)"))
    if "reset_token_expires_at" not in user_columns:
        statements.append(text("ALTER TABLE users ADD COLUMN reset_token_expires_at TIMESTAMP"))

    if not statements:
        return

    with db.engine.begin() as connection:
        for statement in statements:
            connection.execute(statement)
    app.logger.warning("Schema atualizado em runtime para suportar reset de senha.")


def create_app(config_overrides=None):
    app = Flask(__name__)
    app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv("DATABASE_URL", "sqlite:///local.db")
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY", "troque-esta-chave-em-producao")
    app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(days=7)
    if config_overrides:
        app.config.update(config_overrides)

    CORS(
        app,
        resources={
            r"/api/*": {
                "origins": build_cors_origins(),
                "methods": ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
                "allow_headers": ["Content-Type", "Authorization"],
            }
        },
    )

    db.init_app(app)
    bcrypt.init_app(app)
    jwt.init_app(app)
    app.register_blueprint(api)

    with app.app_context():
        db.create_all()
        ensure_runtime_schema(app)

    return app


app = create_app()


if __name__ == "__main__":
    port = int(os.getenv("PORT", "5000"))
    app.run(host="0.0.0.0", port=port, debug=os.getenv("FLASK_DEBUG", "1") == "1")
