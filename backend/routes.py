import json
import os
import secrets
from collections import Counter, defaultdict
from datetime import datetime, timedelta, timezone
from hashlib import sha256
from math import ceil
from re import fullmatch

from flask import Blueprint, current_app, jsonify, request
from flask_jwt_extended import (
    create_access_token,
    get_csrf_token,
    get_jwt,
    get_jwt_identity,
    jwt_required,
    set_access_cookies,
    unset_jwt_cookies,
    verify_jwt_in_request,
)
from sqlalchemy import text

from extensions import bcrypt, db
from models import AIHistory, User
from services.ai_service import detect_subject, solve_general, solve_math, solve_physics
from services.rate_limit import rate_limiter


api = Blueprint("api", __name__)

EMAIL_PATTERN = r"^[^@\s]+@[^@\s]+\.[^@\s]+$"
MAX_EMAIL_LENGTH = 255
MAX_PASSWORD_LENGTH = 128
MAX_QUESTION_LENGTH = 4000
MAX_RESET_TOKEN_LENGTH = 255
MAX_CATEGORY_LENGTH = 100


def create_user_token(user: User) -> str:
    return create_access_token(identity=str(user.id), additional_claims={"token_version": user.token_version})


def build_auth_response(user: User, status_code: int = 200):
    token = create_user_token(user)
    payload = {
        "user": {"id": user.id, "email": user.email},
        "csrf_token": get_csrf_token(token),
    }
    if current_app.config.get("TESTING"):
        payload["token"] = token
    response = jsonify(payload)
    set_access_cookies(response, token)
    return response, status_code


@api.get("/")
def index():
    return jsonify({"status": "online", "service": "ResolveAI API"})


@api.get("/api/health")
def health_check():
    from datetime import datetime, timezone

    return jsonify({"status": "ok", "timestamp": datetime.now(timezone.utc).isoformat()})


@api.post("/api/auth/register")
def register():
    payload = request.get_json(silent=True) or {}
    email = (payload.get("email") or "").strip().lower()
    password = payload.get("password") or ""

    valid, error_response = validate_auth_payload(email, password)
    if not valid:
        return error_response
    limited = enforce_rate_limit(f"auth:register:{request.remote_addr}", 8, 300)
    if limited:
        return limited

    existing_user = User.query.filter_by(email=email).first()
    if existing_user:
        return jsonify({"error": "Ja existe uma conta com esse email."}), 409

    password_hash = bcrypt.generate_password_hash(password).decode("utf-8")
    user = User(email=email, password_hash=password_hash)
    db.session.add(user)
    db.session.commit()

    return build_auth_response(user, 201)


@api.post("/api/auth/login")
def login():
    payload = request.get_json(silent=True) or {}
    email = (payload.get("email") or "").strip().lower()
    password = payload.get("password") or ""

    valid, error_response = validate_auth_payload(email, password, validate_strength=False)
    if not valid:
        return error_response
    limited = enforce_rate_limit(f"auth:login:{request.remote_addr}:{email}", 10, 300)
    if limited:
        return limited

    user = User.query.filter_by(email=email).first()
    if not user or not bcrypt.check_password_hash(user.password_hash, password):
        current_app.logger.warning("Falha de login para %s", email)
        return jsonify({"error": "Email ou senha invalidos."}), 401

    current_app.logger.warning("Login realizado com sucesso para %s", email)
    return build_auth_response(user)


@api.post("/api/auth/forgot-password")
def forgot_password():
    payload = request.get_json(silent=True) or {}
    email = (payload.get("email") or "").strip().lower()

    if not email or len(email) > MAX_EMAIL_LENGTH or not fullmatch(EMAIL_PATTERN, email):
        return jsonify({"error": "Informe um email valido."}), 400
    limited = enforce_rate_limit(f"auth:forgot:{request.remote_addr}:{email}", 5, 600)
    if limited:
        return limited

    user = User.query.filter_by(email=email).first()
    response = {
        "message": "Se o email existir, um codigo de recuperacao foi gerado.",
    }

    if not user:
        return jsonify(response)

    reset_token = secrets.token_urlsafe(24)
    user.reset_token_hash = sha256(reset_token.encode("utf-8")).hexdigest()
    user.reset_token_expires_at = datetime.now(timezone.utc) + timedelta(minutes=30)
    db.session.commit()

    current_app.logger.warning("Reset password token gerado para %s", user.email)
    if os.getenv("EXPOSE_RESET_TOKEN", "0") == "1" or current_app.config.get("TESTING"):
        response["reset_token"] = reset_token
        response["expires_in_minutes"] = 30

    return jsonify(response)


@api.post("/api/auth/reset-password")
def reset_password():
    payload = request.get_json(silent=True) or {}
    token = (payload.get("token") or "").strip()
    password = payload.get("password") or ""

    if not token or len(token) > MAX_RESET_TOKEN_LENGTH:
        return jsonify({"error": "Codigo de recuperacao invalido."}), 400
    valid_password, password_error = validate_password_strength(password)
    if not valid_password:
        return jsonify({"error": password_error}), 400
    limited = enforce_rate_limit(f"auth:reset:{request.remote_addr}", 8, 600)
    if limited:
        return limited

    token_hash = sha256(token.encode("utf-8")).hexdigest()
    user = User.query.filter_by(reset_token_hash=token_hash).first()
    if not user or not user.reset_token_expires_at:
        return jsonify({"error": "Codigo de recuperacao invalido."}), 400

    expires_at = user.reset_token_expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)

    if expires_at < datetime.now(timezone.utc):
        return jsonify({"error": "Codigo de recuperacao expirado."}), 400

    user.password_hash = bcrypt.generate_password_hash(password).decode("utf-8")
    user.token_version += 1
    user.reset_token_hash = None
    user.reset_token_expires_at = None
    db.session.commit()

    return jsonify({"message": "Senha redefinida com sucesso."})


@api.post("/api/auth/logout")
def logout():
    response = jsonify({"message": "Sessao encerrada com sucesso."})
    unset_jwt_cookies(response)
    return response


@api.get("/api/auth/me")
def me():
    verify_jwt_in_request(optional=True)
    user_id = get_jwt_identity()
    if not user_id:
        return jsonify({"authenticated": False})

    user = get_current_user()
    if not user:
        return jsonify({"authenticated": False})

    jwt_payload = get_jwt()
    return jsonify(
        {
            "authenticated": True,
            "id": user.id,
            "email": user.email,
            "created_at": user.created_at.isoformat(),
            "csrf_token": jwt_payload.get("csrf"),
        }
    )


@api.get("/api/history")
@jwt_required()
def history():
    user = get_current_user()
    rls_error = activate_history_rls(user)
    if rls_error:
        return rls_error
    page = max(int(request.args.get("page", 1)), 1)
    page_size = min(max(int(request.args.get("page_size", 10)), 1), 50)
    subject = (request.args.get("subject") or "").strip().lower()
    query_text = (request.args.get("q") or "").strip()
    category = (request.args.get("category") or "").strip()
    favorites_only = (request.args.get("favorites") or "").strip() in {"1", "true", "True"}

    query = AIHistory.query.filter_by(user_id=user.id)
    if subject:
        query = query.filter(AIHistory.subject == subject)
    if category:
        query = query.filter(AIHistory.category.ilike(f"%{category}%"))
    if favorites_only:
        query = query.filter(AIHistory.is_favorite.is_(True))
    if query_text:
        like = f"%{query_text}%"
        query = query.filter(
            (AIHistory.question.ilike(like))
            | (AIHistory.answer.ilike(like))
            | (AIHistory.category.ilike(like))
        )

    total = query.count()
    records = (
        query.order_by(AIHistory.created_at.desc(), AIHistory.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return jsonify(
        {
            "items": [record.to_dict() for record in records],
            "pagination": {
                "page": page,
                "page_size": page_size,
                "total": total,
                "total_pages": max(ceil(total / page_size), 1),
            },
        }
    )


@api.delete("/api/history")
@jwt_required()
def clear_history():
    user = get_current_user()
    rls_error = activate_history_rls(user)
    if rls_error:
        return rls_error
    deleted = AIHistory.query.filter_by(user_id=user.id).delete()
    db.session.commit()
    return jsonify({"deleted": deleted})


@api.delete("/api/history/<int:history_id>")
@jwt_required()
def delete_history_item(history_id: int):
    user = get_current_user()
    rls_error = activate_history_rls(user)
    if rls_error:
        return rls_error
    item = AIHistory.query.filter_by(id=history_id, user_id=user.id).first()
    if not item:
        return jsonify({"error": "Item do historico nao encontrado."}), 404

    db.session.delete(item)
    db.session.commit()
    return jsonify({"deleted": 1, "history_id": history_id})


@api.patch("/api/history/<int:history_id>")
@jwt_required()
def update_history_item(history_id: int):
    user = get_current_user()
    rls_error = activate_history_rls(user)
    if rls_error:
        return rls_error

    item = AIHistory.query.filter_by(id=history_id, user_id=user.id).first()
    if not item:
        return jsonify({"error": "Item do historico nao encontrado."}), 404

    payload = request.get_json(silent=True) or {}
    updated = False

    if "is_favorite" in payload:
        item.is_favorite = bool(payload.get("is_favorite"))
        updated = True

    if "category" in payload:
        category = (payload.get("category") or "").strip()
        if len(category) > MAX_CATEGORY_LENGTH:
            return jsonify({"error": "A categoria e muito longa."}), 400
        item.category = category or None
        updated = True

    if not updated:
        return jsonify({"error": "Nenhum campo valido foi enviado para atualizacao."}), 400

    db.session.flush()
    item_payload = item.to_dict()
    db.session.commit()
    return jsonify(item_payload)


@api.get("/api/dashboard")
@jwt_required()
def dashboard():
    user = get_current_user()
    rls_error = activate_history_rls(user)
    if rls_error:
        return rls_error

    selected_period = (request.args.get("period") or "30d").strip().lower()
    if selected_period not in {"7d", "30d", "all"}:
        selected_period = "30d"

    history_rows = (
        AIHistory.query.with_entities(
            AIHistory.created_at,
            AIHistory.subject,
            AIHistory.is_favorite,
            AIHistory.category,
        )
        .filter_by(user_id=user.id)
        .order_by(AIHistory.created_at.asc(), AIHistory.id.asc())
        .all()
    )

    dashboard_payload = build_dashboard_payload(history_rows, selected_period)
    return jsonify(dashboard_payload)


@api.post("/api/solve/math")
@jwt_required()
def solve_math_route():
    return save_history(run_solve("math"))


@api.post("/api/solve/physics")
@jwt_required()
def solve_physics_route():
    return save_history(run_solve("physics"))


@api.post("/api/solve/general")
@jwt_required()
def solve_general_route():
    question = extract_question()
    if not question:
        return jsonify({"error": "Envie uma questao para resolver."}), 400
    if question == "__too_long__":
        return jsonify({"error": "Questao muito grande. Reduza o texto e tente novamente."}), 400
    return save_history(run_solve(detect_subject(question)))


@api.post("/api/solve")
@jwt_required()
def solve_auto_route():
    question = extract_question()
    if not question:
        return jsonify({"error": "Envie uma questao para resolver."}), 400
    if question == "__too_long__":
        return jsonify({"error": "Questao muito grande. Reduza o texto e tente novamente."}), 400
    return save_history(run_solve(detect_subject(question)))


def get_current_user():
    user_id = get_jwt_identity()
    jwt_payload = get_jwt()
    token_version = int(jwt_payload.get("token_version", 0))
    user = db.session.get(User, int(user_id))
    if not user or user.token_version != token_version:
        return None
    return user


def activate_history_rls(user):
    if not user:
        return jsonify({"error": "Autenticacao obrigatoria."}), 401

    # Keep the authenticated user id bound to the current SQL transaction so
    # Postgres RLS can validate reads and writes on ai_history.
    db.session.execute(
        text("select set_config('app.current_user_id', :user_id, true)"),
        {"user_id": str(user.id)},
    )
    return None


def build_dashboard_payload(history_rows, selected_period: str):
    now = datetime.now(timezone.utc)
    normalized_rows = []
    unique_days = set()

    for created_at, subject, is_favorite, category in history_rows:
        if created_at is None:
            continue
        if created_at.tzinfo is None:
            created_at = created_at.replace(tzinfo=timezone.utc)
        day = created_at.astimezone(timezone.utc).date()
        normalized_rows.append(
            {
                "created_at": created_at,
                "day": day,
                "subject": subject,
                "is_favorite": bool(is_favorite),
                "category": category,
            }
        )
        unique_days.add(day)

    periods = {
        "7d": now - timedelta(days=7),
        "30d": now - timedelta(days=30),
        "all": None,
    }

    usage_by_period = {}
    for key, start_at in periods.items():
        rows_for_period = [row for row in normalized_rows if start_at is None or row["created_at"] >= start_at]
        usage_by_period[key] = {
            "label": {"7d": "Ultimos 7 dias", "30d": "Ultimos 30 dias", "all": "Geral"}[key],
            "questions": len(rows_for_period),
            "favorites": sum(1 for row in rows_for_period if row["is_favorite"]),
            "active_days": len({row["day"] for row in rows_for_period}),
        }

    selected_start_at = periods[selected_period]
    rows_for_selected_period = [
        row for row in normalized_rows if selected_start_at is None or row["created_at"] >= selected_start_at
    ]

    weekly_buckets = defaultdict(int)
    for row in rows_for_selected_period:
        week_start = row["day"] - timedelta(days=row["day"].weekday())
        weekly_buckets[week_start] += 1

    weekly_points = []
    if selected_period == "7d":
        number_of_weeks = 2
    elif selected_period == "30d":
        number_of_weeks = 6
    else:
        number_of_weeks = 12

    current_week_start = now.date() - timedelta(days=now.date().weekday())
    week_starts = [current_week_start - timedelta(days=7 * offset) for offset in range(number_of_weeks - 1, -1, -1)]
    for week_start in week_starts:
        weekly_points.append(
            {
                "week_start": week_start.isoformat(),
                "label": week_start.strftime("%d/%m"),
                "questions": weekly_buckets.get(week_start, 0),
            }
        )

    current_streak = 0
    best_streak = 0
    sorted_days = sorted(unique_days)
    previous_day = None
    streak = 0
    for day in sorted_days:
        if previous_day and day == previous_day + timedelta(days=1):
            streak += 1
        else:
            streak = 1
        best_streak = max(best_streak, streak)
        previous_day = day

    if sorted_days:
        latest_day = sorted_days[-1]
        if latest_day in {now.date(), now.date() - timedelta(days=1)}:
            current_streak = 1
            pointer = latest_day
            unique_days_lookup = set(sorted_days)
            while pointer - timedelta(days=1) in unique_days_lookup:
                current_streak += 1
                pointer -= timedelta(days=1)

    subject_counter = Counter(row["subject"] for row in rows_for_selected_period)
    category_counter = Counter(row["category"] for row in rows_for_selected_period if row["category"])
    daily_activity_counter = Counter(row["day"] for row in normalized_rows)

    activity_calendar = []
    calendar_start = now.date() - timedelta(days=41)
    for offset in range(42):
        day = calendar_start + timedelta(days=offset)
        activity_calendar.append(
            {
                "day": day.isoformat(),
                "weekday": day.weekday(),
                "count": daily_activity_counter.get(day, 0),
            }
        )

    recent_activity = [
        {
            "day": row["day"].isoformat(),
            "subject": row["subject"],
            "favorite": row["is_favorite"],
            "category": row["category"],
        }
        for row in reversed(rows_for_selected_period[-5:])
    ]

    return {
        "selected_period": selected_period,
        "usage_by_period": usage_by_period,
        "weekly_evolution": weekly_points,
        "study_streak": {
            "current": current_streak,
            "best": best_streak,
        },
        "activity_calendar": activity_calendar,
        "summary": {
            "questions": len(rows_for_selected_period),
            "favorites": sum(1 for row in rows_for_selected_period if row["is_favorite"]),
            "active_days": len({row["day"] for row in rows_for_selected_period}),
            "top_subject": subject_counter.most_common(1)[0][0] if subject_counter else None,
            "top_category": category_counter.most_common(1)[0][0] if category_counter else None,
        },
        "recent_activity": recent_activity,
    }


def extract_question():
    payload = request.get_json(silent=True) or {}
    question = (payload.get("question") or "").strip()
    if not question:
        return None
    if len(question) > MAX_QUESTION_LENGTH:
        return "__too_long__"
    return question


def run_solve(mode: str):
    question = extract_question()
    if not question:
        return {"error": "Envie uma questao para resolver."}, 400
    if question == "__too_long__":
        return {"error": "Questao muito grande. Reduza o texto e tente novamente."}, 400

    user = get_current_user()
    limit = int(os.getenv("SOLVE_RATE_LIMIT_COUNT", "12"))
    window = int(os.getenv("SOLVE_RATE_LIMIT_WINDOW", "60"))
    allowed, retry_after = rate_limiter.allow(f"{user.id}:{mode}", limit, window)
    if not allowed:
        return {"error": f"Voce fez muitas consultas. Tente novamente em {retry_after}s."}, 429

    if mode == "math":
        result = solve_math(question)
    elif mode == "physics":
        result = solve_physics(question)
    else:
        result = solve_general(question)

    result["question"] = question
    return result, 200


def save_history(result_with_status):
    result, status = result_with_status
    if status != 200:
        return jsonify(result), status

    user = get_current_user()
    rls_error = activate_history_rls(user)
    if rls_error:
        return rls_error
    history_item = AIHistory(
        user_id=user.id,
        question=result["question"],
        subject=result["subject"],
        answer=result["answer"],
        steps_json=json.dumps(result["steps"], ensure_ascii=True),
        graph_json=json.dumps(result["graph"], ensure_ascii=True) if result["graph"] else None,
    )
    db.session.add(history_item)
    db.session.flush()
    history_id = history_item.id
    db.session.commit()
    result["history_id"] = history_id
    return jsonify(result)


def validate_auth_payload(email: str, password: str, validate_strength: bool = True):
    if not email or not password:
        return False, (jsonify({"error": "Email e senha sao obrigatorios."}), 400)
    if len(email) > MAX_EMAIL_LENGTH or not fullmatch(EMAIL_PATTERN, email):
        return False, (jsonify({"error": "Informe um email valido."}), 400)
    if len(password) > MAX_PASSWORD_LENGTH:
        return False, (jsonify({"error": "A senha e muito longa."}), 400)
    if validate_strength:
        valid_password, password_error = validate_password_strength(password)
        if not valid_password:
            return False, (jsonify({"error": password_error}), 400)
    return True, None


def validate_password_strength(password: str):
    if len(password) < 8:
        return False, "A senha precisa ter pelo menos 8 caracteres."
    if not any(char.islower() for char in password):
        return False, "A senha precisa ter pelo menos uma letra minuscula."
    if not any(char.isupper() for char in password):
        return False, "A senha precisa ter pelo menos uma letra maiuscula."
    if not any(char.isdigit() for char in password):
        return False, "A senha precisa ter pelo menos um numero."
    return True, None


def enforce_rate_limit(key: str, limit: int, window_seconds: int):
    allowed, retry_after = rate_limiter.allow(key, limit, window_seconds)
    if allowed:
        return None
    return jsonify({"error": f"Muitas tentativas. Tente novamente em {retry_after}s."}), 429
