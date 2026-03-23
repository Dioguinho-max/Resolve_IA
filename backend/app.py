import os
from datetime import timedelta

from dotenv import load_dotenv
from flask import Flask, current_app, jsonify, request
from flask_cors import CORS
from sqlalchemy import inspect, text

from extensions import bcrypt, db, jwt
from routes import api


load_dotenv()


def build_cors_origins():
    raw_origins = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000").strip()
    if not raw_origins or raw_origins == "*":
        if os.getenv("FLASK_DEBUG", "0") == "1":
            return ["http://localhost:3000", "http://127.0.0.1:3000"]
        raise RuntimeError("CORS_ORIGINS precisa ser configurado explicitamente em producao.")
    origins = [origin.strip().rstrip("/") for origin in raw_origins.split(",") if origin.strip()]
    return origins or ["http://localhost:3000", "http://127.0.0.1:3000"]


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
    if "token_version" not in user_columns:
        statements.append(text("ALTER TABLE users ADD COLUMN token_version INTEGER NOT NULL DEFAULT 0"))

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
    jwt_secret = os.getenv("JWT_SECRET_KEY")
    if not jwt_secret and not (config_overrides or {}).get("TESTING"):
        raise RuntimeError("JWT_SECRET_KEY precisa ser configurada com um valor forte.")
    if jwt_secret and len(jwt_secret) < 32 and not (config_overrides or {}).get("TESTING"):
        raise RuntimeError("JWT_SECRET_KEY precisa ter pelo menos 32 caracteres em producao.")
    app.config["JWT_SECRET_KEY"] = jwt_secret or "test-secret"
    app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(hours=int(os.getenv("JWT_ACCESS_HOURS", "12")))
    app.config["MAX_CONTENT_LENGTH"] = int(os.getenv("MAX_CONTENT_LENGTH", str(64 * 1024)))
    app.config["JWT_TOKEN_LOCATION"] = ["headers", "cookies"]
    app.config["JWT_COOKIE_HTTPONLY"] = True
    app.config["JWT_COOKIE_SECURE"] = os.getenv("JWT_COOKIE_SECURE", "0" if os.getenv("FLASK_DEBUG", "0") == "1" else "1") == "1"
    app.config["JWT_COOKIE_SAMESITE"] = os.getenv(
        "JWT_COOKIE_SAMESITE", "Lax" if os.getenv("FLASK_DEBUG", "0") == "1" else "None"
    )
    app.config["JWT_COOKIE_CSRF_PROTECT"] = True
    app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
        "pool_pre_ping": True,
    }
    if config_overrides:
        app.config.update(config_overrides)

    allowed_origins = build_cors_origins()
    app.config["ALLOWED_CORS_ORIGINS"] = allowed_origins

    CORS(
        app,
        resources={
            r"/api/*": {
                "origins": allowed_origins,
                "methods": ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
                "allow_headers": ["Content-Type", "Authorization", "X-CSRF-TOKEN"],
                "supports_credentials": True,
            }
        },
    )

    db.init_app(app)
    bcrypt.init_app(app)
    jwt.init_app(app)
    app.register_blueprint(api)

    @app.before_request
    def enforce_allowed_origin_for_state_changes():
        if current_app.config.get("TESTING"):
            return None
        if not request.path.startswith("/api/"):
            return None
        if request.method not in {"POST", "PUT", "PATCH", "DELETE"}:
            return None

        origin = (request.headers.get("Origin") or "").rstrip("/")
        allowed = current_app.config.get("ALLOWED_CORS_ORIGINS", [])
        if origin not in allowed:
            return jsonify({"error": "Origem da requisicao nao permitida."}), 403
        return None

    @jwt.token_in_blocklist_loader
    def is_token_revoked(_jwt_header, jwt_payload):
        identity = jwt_payload.get("sub")
        token_version = int(jwt_payload.get("token_version", 0))
        if not identity:
            return True
        from models import User

        try:
            user = db.session.get(User, int(identity))
        except (TypeError, ValueError):
            return True
        return not user or user.token_version != token_version

    @jwt.revoked_token_loader
    def revoked_token_callback(_jwt_header, _jwt_payload):
        return jsonify({"error": "Sua sessao expirou ou foi revogada. Faca login novamente."}), 401

    @jwt.invalid_token_loader
    def invalid_token_callback(_error):
        return jsonify({"error": "Token de acesso invalido."}), 401

    @jwt.unauthorized_loader
    def missing_token_callback(_error):
        return jsonify({"error": "Autenticacao obrigatoria."}), 401

    @app.after_request
    def apply_security_headers(response):
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self'; "
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
            "font-src 'self' https://fonts.gstatic.com; "
            "img-src 'self' data:; "
            "connect-src 'self' https:; "
            "frame-ancestors 'none'; "
            "base-uri 'self'; "
            "form-action 'self';"
        )
        if request.is_secure or os.getenv("ENABLE_HSTS", "1") == "1":
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload"
        return response

    @app.errorhandler(413)
    def payload_too_large(_error):
        return jsonify({"error": "Requisicao muito grande."}), 413

    @app.errorhandler(500)
    def internal_error(_error):
        return jsonify({"error": "Erro interno do servidor."}), 500

    with app.app_context():
        db.create_all()
        ensure_runtime_schema(app)

    return app


app = None if os.getenv("FLASK_SKIP_APP_BOOTSTRAP", "0") == "1" else create_app()


if __name__ == "__main__":
    app = app or create_app()
    port = int(os.getenv("PORT", "5000"))
    app.run(host="0.0.0.0", port=port, debug=os.getenv("FLASK_DEBUG", "1") == "1")
