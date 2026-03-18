import json
import math
import os
import re
from datetime import datetime, timedelta, timezone

import requests
from dotenv import load_dotenv
from flask import Flask, jsonify, request
from flask_bcrypt import Bcrypt
from flask_cors import CORS
from flask_jwt_extended import (
    JWTManager,
    create_access_token,
    get_jwt_identity,
    jwt_required,
)
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import func
from sympy import Eq, SympifyError, diff, integrate, simplify, solve, sympify
from sympy.abc import x


load_dotenv()

db = SQLAlchemy()
bcrypt = Bcrypt()
jwt = JWTManager()


PHYSICS_KEYWORDS = {
    "velocidade",
    "aceleracao",
    "aceleração",
    "forca",
    "força",
    "massa",
    "energia",
    "trabalho",
    "gravidade",
    "newton",
    "mru",
    "mruv",
    "pressao",
    "pressão",
    "densidade",
    "corrente",
    "tensao",
    "tensão",
    "resistencia",
    "resistência",
    "frequencia",
    "frequência",
}

TEXT_KEYWORDS = {
    "interprete",
    "interpretação",
    "resuma",
    "resumo",
    "texto",
    "redação",
    "argumente",
    "explique",
    "comente",
    "leitura",
}


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, server_default=func.now())
    histories = db.relationship("AIHistory", backref="user", lazy=True, cascade="all, delete-orphan")


class AIHistory(db.Model):
    __tablename__ = "ai_history"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    question = db.Column(db.Text, nullable=False)
    subject = db.Column(db.String(50), nullable=False)
    answer = db.Column(db.Text, nullable=False)
    steps_json = db.Column(db.Text, nullable=False)
    graph_json = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, server_default=func.now())

    def to_dict(self):
        return {
            "id": self.id,
            "question": self.question,
            "subject": self.subject,
            "answer": self.answer,
            "steps": json.loads(self.steps_json),
            "graph": json.loads(self.graph_json) if self.graph_json else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


def create_app():
    app = Flask(__name__)
    app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv("DATABASE_URL", "sqlite:///local.db")
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY", "troque-esta-chave-em-producao")
    app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(days=7)

    cors_origins = build_cors_origins()
    CORS(
        app,
        resources={
            r"/api/*": {
                "origins": cors_origins,
                "methods": ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
                "allow_headers": ["Content-Type", "Authorization"],
            }
        },
    )

    db.init_app(app)
    bcrypt.init_app(app)
    jwt.init_app(app)

    with app.app_context():
        db.create_all()

    register_routes(app)
    return app


def build_cors_origins():
    raw_origins = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000").strip()
    if not raw_origins or raw_origins == "*":
        return "*"

    origins = [origin.strip().rstrip("/") for origin in raw_origins.split(",") if origin.strip()]
    return origins or "*"


def register_routes(app):
    @app.get("/api/health")
    def health_check():
        return jsonify({"status": "ok", "timestamp": datetime.now(timezone.utc).isoformat()})

    @app.post("/api/auth/register")
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

    @app.post("/api/auth/login")
    def login():
        payload = request.get_json(silent=True) or {}
        email = (payload.get("email") or "").strip().lower()
        password = payload.get("password") or ""

        user = User.query.filter_by(email=email).first()
        if not user or not bcrypt.check_password_hash(user.password_hash, password):
            return jsonify({"error": "Email ou senha invalidos."}), 401

        token = create_access_token(identity=str(user.id))
        return jsonify({"token": token, "user": {"id": user.id, "email": user.email}})

    @app.get("/api/auth/me")
    @jwt_required()
    def me():
        user = get_current_user()
        return jsonify({"id": user.id, "email": user.email, "created_at": user.created_at.isoformat()})

    @app.get("/api/history")
    @jwt_required()
    def history():
        user = get_current_user()
        records = (
            AIHistory.query.filter_by(user_id=user.id)
            .order_by(AIHistory.created_at.desc(), AIHistory.id.desc())
            .limit(50)
            .all()
        )
        return jsonify([record.to_dict() for record in records])

    @app.post("/api/solve")
    @jwt_required()
    def solve_question_route():
        payload = request.get_json(silent=True) or {}
        question = (payload.get("question") or "").strip()

        if not question:
            return jsonify({"error": "Envie uma questao para resolver."}), 400

        result = solve_question(question)
        user = get_current_user()

        history_item = AIHistory(
            user_id=user.id,
            question=question,
            subject=result["subject"],
            answer=result["answer"],
            steps_json=json.dumps(result["steps"], ensure_ascii=True),
            graph_json=json.dumps(result["graph"], ensure_ascii=True) if result["graph"] else None,
        )
        db.session.add(history_item)
        db.session.commit()

        result["history_id"] = history_item.id
        return jsonify(result)


def get_current_user():
    user_id = get_jwt_identity()
    user = db.session.get(User, int(user_id))
    if not user:
        raise ValueError("Usuario autenticado nao encontrado.")
    return user


def normalize_expression(raw_text: str) -> str:
    expression = raw_text.strip()
    replacements = {"^": "**", "sen(": "sin(", "tg(": "tan(", "raiz(": "sqrt("}
    for old, new in replacements.items():
        expression = expression.replace(old, new)
    return expression


def detect_subject(question: str) -> str:
    lowered = question.lower()

    if any(keyword in lowered for keyword in PHYSICS_KEYWORDS):
        return "fisica"

    if any(keyword in lowered for keyword in TEXT_KEYWORDS):
        return "texto"

    if any(symbol in lowered for symbol in ["x", "y", "=", "^", "+", "-", "*", "/", "f("]):
        return "matematica"

    if re.search(r"\d", lowered):
        return "matematica"

    return "texto"


def extract_expression(question: str) -> str | None:
    candidates = [
        r"f\(x\)\s*=\s*([^\n]+)",
        r"y\s*=\s*([^\n]+)",
        r"resolve[:\s]*([^\n]+)",
        r"calcule[:\s]*([^\n]+)",
        r"derivada de ([^\n]+)",
        r"integral de ([^\n]+)",
    ]

    for pattern in candidates:
        match = re.search(pattern, question, flags=re.IGNORECASE)
        if match:
            return normalize_expression(match.group(1))

    cleaned = normalize_expression(question)
    if any(token in cleaned for token in ["=", "x", "+", "-", "*", "/", "**"]):
        return cleaned

    return None


def build_graph_data(expression: str) -> dict | None:
    if "x" not in expression or "=" in expression:
        return None

    try:
        expr = sympify(expression)
    except SympifyError:
        return None

    points = []
    for value in range(-10, 11):
        try:
            result = expr.subs(x, value).evalf()
            numeric_result = float(result)
            if math.isfinite(numeric_result):
                points.append({"x": value, "y": round(numeric_result, 4)})
        except Exception:
            continue

    if len(points) < 2:
        return None

    return {"title": f"Grafico de y = {expression}", "points": points}


def request_huggingface_explanation(question: str, subject: str, local_answer: str, local_steps: list[str]) -> str | None:
    api_key = os.getenv("HUGGINGFACE_API_KEY")
    if not api_key:
        return None

    model_name = os.getenv("HUGGINGFACE_MODEL", "mistralai/Mistral-7B-Instruct-v0.2")
    api_url = f"https://api-inference.huggingface.co/models/{model_name}"
    prompt = (
        "Voce e um professor particular objetivo.\n"
        f"Materia detectada: {subject}\n"
        f"Questao do aluno: {question}\n"
        f"Resposta base: {local_answer}\n"
        f"Passos base: {' | '.join(local_steps)}\n"
        "Escreva uma explicacao curta em portugues do Brasil, clara e passo a passo."
    )

    try:
        response = requests.post(
            api_url,
            headers={"Authorization": f"Bearer {api_key}"},
            json={
                "inputs": prompt,
                "parameters": {"max_new_tokens": 220, "temperature": 0.5, "return_full_text": False},
            },
            timeout=40,
        )
        response.raise_for_status()
        data = response.json()
        if isinstance(data, list) and data and isinstance(data[0], dict):
            generated = data[0].get("generated_text")
            if generated:
                return generated.strip()
    except Exception:
        return None

    return None


def solve_math(question: str) -> dict:
    expression = extract_expression(question)
    if not expression:
        return {
            "title": "Nao consegui identificar a expressao",
            "steps": [
                "Verifique se a questao contem uma expressao matematica clara.",
                "Exemplos validos: 2*x + 3 = 7, f(x)=x^2-4x+3, derivada de x^3.",
            ],
            "answer": "Tente reescrever a questao com a conta ou a funcao explicitamente.",
            "graph": None,
        }

    normalized = normalize_expression(expression)

    try:
        if "=" in normalized:
            left, right = normalized.split("=", 1)
            equation = Eq(sympify(left.strip()), sympify(right.strip()))
            solution = solve(equation, x)
            answer = ", ".join(str(item) for item in solution) if solution else "Sem solucao real simples"
            steps = [
                f"Identifiquei a equacao: {left.strip()} = {right.strip()}",
                "Isolei a variavel principal x usando algebra simbolica.",
                f"Encontrei a solucao: x = {answer}",
            ]
            ai_explanation = request_huggingface_explanation(question, "matematica", answer, steps)
            if ai_explanation:
                steps.append(ai_explanation)
            return {"title": "Resolucao de equacao", "steps": steps, "answer": answer, "graph": None}

        lowered = question.lower()
        expr = sympify(normalized)

        if "deriv" in lowered:
            result = diff(expr, x)
            steps = [
                f"Considerei a funcao {normalized}.",
                "Apliquei derivacao em relacao a x.",
                f"Resultado final: {result}",
            ]
            ai_explanation = request_huggingface_explanation(question, "matematica", str(result), steps)
            if ai_explanation:
                steps.append(ai_explanation)
            return {
                "title": "Derivada calculada",
                "steps": steps,
                "answer": str(result),
                "graph": build_graph_data(normalized),
            }

        if "integr" in lowered:
            result = integrate(expr, x)
            steps = [
                f"Considerei a expressao {normalized}.",
                "Apliquei integracao simbolica em relacao a x.",
                f"Resultado: {result} + C",
            ]
            ai_explanation = request_huggingface_explanation(question, "matematica", f"{result} + C", steps)
            if ai_explanation:
                steps.append(ai_explanation)
            return {
                "title": "Integral calculada",
                "steps": steps,
                "answer": f"{result} + C",
                "graph": build_graph_data(normalized),
            }

        simplified = simplify(expr)
        graph = build_graph_data(normalized)
        steps = [
            f"Interpretei a expressao como: {normalized}",
            "Simplifiquei a expressao para obter uma forma mais limpa.",
            f"Resultado simplificado: {simplified}",
        ]
        if graph:
            steps.append("Como a expressao depende de x, gerei um grafico para ajudar na visualizacao.")

        ai_explanation = request_huggingface_explanation(question, "matematica", str(simplified), steps)
        if ai_explanation:
            steps.append(ai_explanation)

        return {"title": "Analise matematica", "steps": steps, "answer": str(simplified), "graph": graph}
    except Exception as exc:
        return {
            "title": "Falha ao resolver",
            "steps": [
                "A expressao foi detectada, mas nao consegui processa-la automaticamente.",
                "Isso costuma acontecer com formatos muito abertos ou texto misturado com conta.",
                f"Detalhe tecnico: {exc}",
            ],
            "answer": "Tente enviar apenas a parte matematica principal.",
            "graph": None,
        }


def solve_physics(question: str) -> dict:
    steps = [
        "Detectei termos comuns de fisica na sua pergunta.",
        "Organizei a resolucao em dados do problema, formula e conclusao.",
        "A resposta abaixo pode ser refinada pelo modelo de IA da Hugging Face quando a chave estiver configurada.",
    ]
    answer = (
        "Estrutura sugerida: liste os dados conhecidos, escolha a formula principal, "
        "substitua os valores com unidade e finalize interpretando o resultado."
    )
    ai_explanation = request_huggingface_explanation(question, "fisica", answer, steps)
    if ai_explanation:
        steps.append(ai_explanation)

    return {"title": "Explicacao guiada de fisica", "steps": steps, "answer": answer, "graph": None}


def solve_text(question: str) -> dict:
    steps = [
        "Detectei que a questao parece mais textual do que numerica.",
        "Montei uma estrutura de resposta com ideia central, desenvolvimento e conclusao.",
        "O modelo da Hugging Face pode complementar a explicacao automaticamente.",
    ]
    answer = (
        "Modelo de resposta: apresente a ideia central do enunciado, explique os argumentos "
        "ou evidencias e finalize com uma conclusao objetiva."
    )
    ai_explanation = request_huggingface_explanation(question, "texto", answer, steps)
    if ai_explanation:
        steps.append(ai_explanation)

    return {"title": "Analise de texto", "steps": steps, "answer": answer, "graph": None}


def solve_question(question: str) -> dict:
    subject = detect_subject(question)
    if subject == "matematica":
        result = solve_math(question)
    elif subject == "fisica":
        result = solve_physics(question)
    else:
        result = solve_text(question)

    result["subject"] = subject
    return result


app = create_app()


if __name__ == "__main__":
    port = int(os.getenv("PORT", "5000"))
    app.run(host="0.0.0.0", port=port, debug=os.getenv("FLASK_DEBUG", "1") == "1")
