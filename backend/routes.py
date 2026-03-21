import json
import os
from math import ceil

from flask import Blueprint, current_app, jsonify, request
from flask_jwt_extended import create_access_token, get_jwt_identity, jwt_required

from extensions import bcrypt, db
from models import AIHistory, User
from services.ai_service import solve_general, solve_math, solve_physics
from services.rate_limit import rate_limiter


api = Blueprint("api", __name__)


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

    if not email or not password:
        return jsonify({"error": "Email e senha sao obrigatorios."}), 400
    if len(password) < 6:
        return jsonify({"error": "A senha precisa ter pelo menos 6 caracteres."}), 400

    existing_user = User.query.filter_by(email=email).first()
    if existing_user:
        return jsonify({"error": "Ja existe uma conta com esse email."}), 409

    password_hash = bcrypt.generate_password_hash(password).decode("utf-8")
    user = User(email=email, password_hash=password_hash)
    db.session.add(user)
    db.session.commit()

    token = create_access_token(identity=str(user.id))
    return jsonify({"token": token, "user": {"id": user.id, "email": user.email}}), 201


@api.post("/api/auth/login")
def login():
    payload = request.get_json(silent=True) or {}
    email = (payload.get("email") or "").strip().lower()
    password = payload.get("password") or ""

    user = User.query.filter_by(email=email).first()
    if not user or not bcrypt.check_password_hash(user.password_hash, password):
        return jsonify({"error": "Email ou senha invalidos."}), 401

    token = create_access_token(identity=str(user.id))
    return jsonify({"token": token, "user": {"id": user.id, "email": user.email}})


@api.get("/api/auth/me")
@jwt_required()
def me():
    user = get_current_user()
    return jsonify({"id": user.id, "email": user.email, "created_at": user.created_at.isoformat()})


@api.get("/api/history")
@jwt_required()
def history():
    user = get_current_user()
    page = max(int(request.args.get("page", 1)), 1)
    page_size = min(max(int(request.args.get("page_size", 10)), 1), 50)
    subject = (request.args.get("subject") or "").strip().lower()
    query_text = (request.args.get("q") or "").strip()

    query = AIHistory.query.filter_by(user_id=user.id)
    if subject:
        query = query.filter(AIHistory.subject == subject)
    if query_text:
        like = f"%{query_text}%"
        query = query.filter((AIHistory.question.ilike(like)) | (AIHistory.answer.ilike(like)))

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
    deleted = AIHistory.query.filter_by(user_id=user.id).delete()
    db.session.commit()
    return jsonify({"deleted": deleted})


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
    return save_history(run_solve("general"))


def get_current_user():
    user_id = get_jwt_identity()
    user = db.session.get(User, int(user_id))
    if not user:
        return None
    return user


def extract_question():
    payload = request.get_json(silent=True) or {}
    question = (payload.get("question") or "").strip()
    if not question:
        return None
    return question


def run_solve(mode: str):
    question = extract_question()
    if not question:
        return {"error": "Envie uma questao para resolver."}, 400

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
    history_item = AIHistory(
        user_id=user.id,
        question=result["question"],
        subject=result["subject"],
        answer=result["answer"],
        steps_json=json.dumps(result["steps"], ensure_ascii=True),
        graph_json=json.dumps(result["graph"], ensure_ascii=True) if result["graph"] else None,
    )
    db.session.add(history_item)
    db.session.commit()
    result["history_id"] = history_item.id
    return jsonify(result)
