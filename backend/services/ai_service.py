import math
import os
import re
from datetime import datetime

import requests
from flask import current_app
from sympy import Eq, Float, Integer, Rational, Symbol, cos, diff, factor, integrate, log, simplify, sin, solve, sqrt, tan, together
from sympy.abc import x
from sympy.parsing.sympy_parser import (
    convert_xor,
    function_exponentiation,
    implicit_multiplication_application,
    parse_expr,
    standard_transformations,
)


PHYSICS_KEYWORDS = {
    "velocidade",
    "aceleracao",
    "forca",
    "massa",
    "energia",
    "trabalho",
    "gravidade",
    "newton",
    "mru",
    "mruv",
    "pressao",
    "densidade",
    "corrente",
    "tensao",
    "resistencia",
    "frequencia",
}

TEXT_KEYWORDS = {
    "interprete",
    "interpretacao",
    "resuma",
    "resumo",
    "texto",
    "redacao",
    "argumente",
    "explique",
    "comente",
    "leitura",
    "o que",
    "oque",
    "quem",
    "quando",
    "porque",
    "por que",
    "como funciona",
    "que dia e hoje",
    "qual a data de hoje",
    "que horas sao",
    "qual horario",
}

MATH_KEYWORDS = {
    "calcule",
    "resolve",
    "resolva",
    "equacao",
    "funcao",
    "derivada",
    "integral",
    "raiz",
    "potencia",
    "log",
    "seno",
    "cosseno",
    "tangente",
    "fracao",
}

SUPERSCRIPT_MAP = {
    "\u2070": "0",
    "\u00b9": "1",
    "\u00b2": "2",
    "\u00b3": "3",
    "\u2074": "4",
    "\u2075": "5",
    "\u2076": "6",
    "\u2077": "7",
    "\u2078": "8",
    "\u2079": "9",
    "\u207a": "+",
    "\u207b": "-",
    "\u207d": "(",
    "\u207e": ")",
    "\u207f": "n",
}

UNICODE_FRACTIONS = {
    "\u00bd": "(1/2)",
    "\u2153": "(1/3)",
    "\u2154": "(2/3)",
    "\u00bc": "(1/4)",
    "\u00be": "(3/4)",
}

TRANSFORMATIONS = standard_transformations + (
    convert_xor,
    implicit_multiplication_application,
    function_exponentiation,
)

ALLOWED_FUNCTIONS = {
    "x": x,
    "sin": sin,
    "cos": cos,
    "tan": tan,
    "sqrt": sqrt,
    "log": log,
}
SAFE_PARSE_GLOBALS = {
    "__builtins__": {},
    "Integer": Integer,
    "Float": Float,
    "Rational": Rational,
    "Symbol": Symbol,
}
ALLOWED_NAME_TOKENS = set(ALLOWED_FUNCTIONS.keys())
ALLOWED_EXPRESSION_CHARS = re.compile(r"^[a-z0-9+\-*/().,=\s*]+$")
DISALLOWED_SEQUENCE_PATTERN = re.compile(r"__|[\[\]{}:;\"'`\\]|import|lambda|eval|exec|open|os|sys")
EMAIL_PATTERN = re.compile(r"\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b", re.IGNORECASE)
PHONE_PATTERN = re.compile(r"\b(?:\+?55\s?)?(?:\(?\d{2}\)?\s?)?(?:9?\d{4})[-.\s]?\d{4}\b")
CPF_PATTERN = re.compile(r"\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b")
CREDIT_CARD_PATTERN = re.compile(r"\b(?:\d[ -]*?){13,19}\b")


def replace_unicode_superscripts(text: str) -> str:
    result = []
    index = 0
    while index < len(text):
        char = text[index]
        if char not in SUPERSCRIPT_MAP:
            result.append(char)
            index += 1
            continue

        superscript_chars = []
        while index < len(text) and text[index] in SUPERSCRIPT_MAP:
            superscript_chars.append(SUPERSCRIPT_MAP[text[index]])
            index += 1

        superscript_value = "".join(superscript_chars)
        if result and not result[-1].isspace():
            result.append(f"**({superscript_value})")
        else:
            result.append(superscript_value)
    return "".join(result)


def normalize_expression(raw_text: str) -> str:
    expression = replace_unicode_superscripts(raw_text.strip().lower())
    for old, new in UNICODE_FRACTIONS.items():
        expression = expression.replace(old, new)

    expression = expression.replace(",", ".")
    expression = expression.replace("\u221a", "sqrt")

    expression = re.sub(r"raiz quadrada de\s*\(?([^\n]+?)\)?$", r"sqrt(\1)", expression)
    expression = re.sub(r"raiz\(([^)]+)\)", r"sqrt(\1)", expression)
    expression = re.sub(r"sqrt\s*\(?([a-z0-9x+\-*/^. ]+)\)?", r"sqrt(\1)", expression)

    replacements = {
        "^": "**",
        "sen(": "sin(",
        "seno(": "sin(",
        "cos(": "cos(",
        "cosseno(": "cos(",
        "tg(": "tan(",
        "tangente(": "tan(",
        "ln(": "log(",
        "log10(": "log(",
    }
    for old, new in replacements.items():
        expression = expression.replace(old, new)

    return " ".join(expression.split())


def parse_math_expression(expression: str):
    normalized = normalize_expression(expression)
    validate_math_expression(normalized)
    return parse_expr(
        normalized,
        transformations=TRANSFORMATIONS,
        local_dict=ALLOWED_FUNCTIONS,
        global_dict=SAFE_PARSE_GLOBALS,
        evaluate=True,
    )


def validate_math_expression(expression: str) -> None:
    if not expression or len(expression) > 300:
        raise ValueError("Expressao matematica invalida ou muito longa.")
    if not ALLOWED_EXPRESSION_CHARS.fullmatch(expression):
        raise ValueError("A expressao contem caracteres nao permitidos.")
    if DISALLOWED_SEQUENCE_PATTERN.search(expression):
        raise ValueError("A expressao contem termos nao permitidos.")

    alpha_tokens = re.findall(r"[a-z_]+", expression)
    unknown_tokens = [token for token in alpha_tokens if token not in ALLOWED_NAME_TOKENS]
    if unknown_tokens:
        raise ValueError("A expressao contem funcoes ou nomes nao suportados.")


def detect_subject(question: str) -> str:
    lowered = question.lower()
    normalized = normalize_expression(lowered)

    if any(keyword in normalized for keyword in PHYSICS_KEYWORDS):
        return "fisica"
    if any(keyword in normalized for keyword in MATH_KEYWORDS):
        return "matematica"
    if any(symbol in normalized for symbol in ["x", "y", "=", "^", "+", "-", "*", "/", "f(", "**"]):
        return "matematica"
    if any(char in lowered for char in SUPERSCRIPT_MAP):
        return "matematica"
    if re.search(r"\d+\s*[%+\-/*=]", normalized):
        return "matematica"
    if any(keyword in normalized for keyword in TEXT_KEYWORDS):
        return "geral"
    return "geral"


def extract_expression(question: str) -> str | None:
    normalized_question = normalize_expression(question)
    candidates = [
        r"f\(x\)\s*=\s*([^\n]+)",
        r"y\s*=\s*([^\n]+)",
        r"resolve[:\s]*([^\n]+)",
        r"calcule[:\s]*([^\n]+)",
        r"derivada de ([^\n]+)",
        r"integral de ([^\n]+)",
    ]

    for pattern in candidates:
        match = re.search(pattern, normalized_question, flags=re.IGNORECASE)
        if match:
            return normalize_expression(match.group(1))

    if any(token in normalized_question for token in ["=", "x", "+", "-", "*", "/", "**", "sin(", "cos(", "tan(", "sqrt(", "log("]):
        return normalized_question
    return None


def describe_math_features(expression: str) -> list[str]:
    features = []
    lowered = expression.lower()
    if "/" in lowered:
        features.append("Reconheci fracoes e mantive a estrutura racional da conta.")
    if "sqrt(" in lowered:
        features.append("Interpretei a raiz como uma potencia fracionaria equivalente quando necessario.")
    if "log(" in lowered:
        features.append("Mantive o logaritmo na forma simbolica para simplificar com seguranca.")
    if any(func in lowered for func in ["sin(", "cos(", "tan("]):
        features.append("Detectei funcao trigonometrica e preservei a forma simbolica para evitar aproximacoes ruins.")
    return features


def to_numeric_float(value):
    try:
        evaluated = complex(value.evalf())
    except Exception:
        return None

    if abs(evaluated.imag) > 1e-9:
        return None

    numeric = float(evaluated.real)
    if not math.isfinite(numeric):
        return None
    return numeric


def format_numeric_value(value: float, digits: int = 4) -> str:
    rounded = round(value, digits)
    if abs(rounded) < 10 ** (-digits):
        rounded = 0.0
    if float(rounded).is_integer():
        return str(int(rounded))
    return f"{rounded:.{digits}f}".rstrip("0").rstrip(".")


def build_graph_summary(highlights: dict) -> str | None:
    parts = []
    roots = highlights.get("roots") or []
    if roots:
        parts.append("Raizes: " + ", ".join(root["display"] for root in roots))

    vertex = highlights.get("vertex")
    if vertex:
        parts.append(f"Vertice: ({vertex['display_x']}, {vertex['display_y']})")

    y_intercept = highlights.get("y_intercept")
    if y_intercept:
        parts.append(f"Intercepto em y: {y_intercept['display_y']}")

    axis_of_symmetry = highlights.get("axis_of_symmetry")
    if axis_of_symmetry:
        parts.append(f"Eixo de simetria: x = {axis_of_symmetry['display']}")

    return " | ".join(parts) if parts else None


def build_graph_data(expression: str) -> dict | None:
    if "x" not in expression or "=" in expression:
        return None

    try:
        expr = simplify(parse_math_expression(expression))
    except Exception:
        return None

    points = []
    for value in [n / 2 for n in range(-20, 21)]:
        try:
            result = expr.subs(x, value).evalf()
            numeric_result = float(result)
            if math.isfinite(numeric_result):
                points.append({"x": round(value, 2), "y": round(numeric_result, 4)})
        except Exception:
            continue

    if len(points) < 2:
        return None

    highlights = {"roots": []}
    try:
        roots = solve(Eq(expr, 0), x)
    except Exception:
        roots = []

    seen_roots = set()
    for root in roots:
        numeric_root = to_numeric_float(root)
        if numeric_root is None:
            continue
        rounded_key = round(numeric_root, 6)
        if rounded_key in seen_roots:
            continue
        seen_roots.add(rounded_key)
        highlights["roots"].append(
            {
                "x": round(numeric_root, 4),
                "y": 0.0,
                "label": "Raiz",
                "display": format_numeric_value(numeric_root),
            }
        )

    try:
        y_intercept = to_numeric_float(expr.subs(x, 0))
        if y_intercept is not None:
            highlights["y_intercept"] = {
                "x": 0.0,
                "y": round(y_intercept, 4),
                "label": "Intercepto em y",
                "display_y": format_numeric_value(y_intercept),
            }
    except Exception:
        pass

    try:
        poly = expr.as_poly(x)
        if poly and poly.degree() == 2:
            a, b, _c = poly.all_coeffs()
            vertex_x_expr = simplify(-b / (2 * a))
            vertex_y_expr = simplify(expr.subs(x, vertex_x_expr))
            vertex_x = to_numeric_float(vertex_x_expr)
            vertex_y = to_numeric_float(vertex_y_expr)
            if vertex_x is not None and vertex_y is not None:
                highlights["vertex"] = {
                    "x": round(vertex_x, 4),
                    "y": round(vertex_y, 4),
                    "label": "Vertice",
                    "display_x": format_numeric_value(vertex_x),
                    "display_y": format_numeric_value(vertex_y),
                }
                highlights["axis_of_symmetry"] = {
                    "x": round(vertex_x, 4),
                    "display": format_numeric_value(vertex_x),
                }
    except Exception:
        pass

    return {
        "title": f"Grafico de y = {expression}",
        "summary": build_graph_summary(highlights),
        "points": points,
        "highlights": highlights,
    }


def request_huggingface_response(prompt: str, max_tokens: int = 220) -> str | None:
    api_key = os.getenv("HUGGINGFACE_API_KEY")
    if not api_key:
        current_app.logger.warning("Hugging Face: HUGGINGFACE_API_KEY ausente.")
        return None

    model_name = os.getenv("HUGGINGFACE_MODEL", "meta-llama/Meta-Llama-3-8B-Instruct")
    max_tokens = min(max_tokens, int(os.getenv("HUGGINGFACE_MAX_TOKENS", "220")))
    api_url = "https://router.huggingface.co/v1/chat/completions"

    try:
        response = requests.post(
            api_url,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": model_name,
                "messages": [{"role": "user", "content": prompt}],
                "max_tokens": max_tokens,
                "temperature": 0.4,
            },
            timeout=40,
        )
        current_app.logger.warning("Hugging Face: status=%s model=%s", response.status_code, model_name)
        if response.status_code >= 400:
            current_app.logger.warning("Hugging Face: corpo_erro=%s", response.text)
        response.raise_for_status()
        data = response.json()
        choices = data.get("choices", []) if isinstance(data, dict) else []
        if choices and isinstance(choices[0], dict):
            message = choices[0].get("message", {})
            content = message.get("content")
            if isinstance(content, str) and content.strip():
                return content.strip()
            current_app.logger.warning("Hugging Face: message sem content -> %s", message)
        current_app.logger.warning("Hugging Face: formato inesperado -> %s", data)
    except Exception:
        current_app.logger.exception("Hugging Face: falha na requisicao para %s", model_name)
        return None
    return None


def request_huggingface_explanation(question: str, subject: str, local_answer: str, local_steps: list[str]) -> str | None:
    prompt = (
        "Voce e um professor particular objetivo.\n"
        f"Materia detectada: {subject}\n"
        f"Questao do aluno: {question}\n"
        f"Resposta base: {local_answer}\n"
        f"Passos base: {' | '.join(local_steps)}\n"
        "Escreva uma explicacao curta em portugues do Brasil, clara e passo a passo."
    )
    return request_huggingface_response(prompt, max_tokens=160)


def polish_math_explanation(explanation: str | None, existing_steps: list[str]) -> str | None:
    if not explanation:
        return None

    cleaned = re.sub(r"\*\*+", "", explanation)
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    lowered = cleaned.lower()

    duplicate_markers = [
        "vamos resolver",
        "passo 1",
        "passo 2",
        "passo 3",
        "passo 4",
        "formula quadratica",
    ]
    if any(marker in lowered for marker in duplicate_markers):
        return None

    existing_text = " ".join(existing_steps).lower()
    if cleaned.lower() in existing_text:
        return None

    sentences = [part.strip() for part in re.split(r"(?<=[.!?])\s+", cleaned) if part.strip()]
    if not sentences:
        return None

    summary = " ".join(sentences[:2]).strip()
    if len(summary) > 180:
        summary = f"{summary[:177].rstrip()}..."

    if len(summary) < 25:
        return None

    return f"Resumo: {summary}"


def request_huggingface_general_answer(question: str) -> str | None:
    prompt = (
        "Voce e um assistente util, direto e amigavel.\n"
        "Responda sempre em portugues do Brasil.\n"
        "Se a pergunta for conceitual, responda com no maximo 4 frases curtas.\n"
        "Se a pergunta for simples, responda diretamente.\n"
        "Nao repita a pergunta.\n"
        "Finalize sem cortar no meio da frase.\n"
        f"Pergunta do usuario: {question}\n"
        "Resposta:"
    )
    return request_huggingface_response(prompt, max_tokens=160)


def contains_sensitive_content(text: str) -> bool:
    return any(
        pattern.search(text)
        for pattern in (EMAIL_PATTERN, PHONE_PATTERN, CPF_PATTERN, CREDIT_CARD_PATTERN)
    )


def build_sensitive_content_warning() -> str:
    return (
        "Detectei possiveis dados sensiveis na pergunta. Por privacidade, eu nao envio esse texto para a IA externa. "
        "Remova emails, telefones, CPF, numeros de cartao ou outros dados pessoais e tente novamente."
    )


def get_local_general_answer(question: str) -> str | None:
    lowered = question.lower().strip()
    now = datetime.now()

    if any(term in lowered for term in ["que dia e hoje", "qual a data de hoje", "data de hoje", "hoje e que dia"]):
        months = [
            "janeiro",
            "fevereiro",
            "marco",
            "abril",
            "maio",
            "junho",
            "julho",
            "agosto",
            "setembro",
            "outubro",
            "novembro",
            "dezembro",
        ]
        return f"Hoje e {now.day} de {months[now.month - 1]} de {now.year}."

    if any(term in lowered for term in ["que horas sao", "qual horario", "hora agora", "horas agora"]):
        return f"Agora sao {now.strftime('%H:%M')}."

    if lowered in {"oi", "ola", "bom dia", "boa tarde", "boa noite"}:
        return "Ola! Posso te ajudar com matematica, fisica ou perguntas gerais."

    if "o que e ia" in lowered or "o que e inteligencia artificial" in lowered:
        return (
            "Inteligencia artificial e a area da computacao que cria sistemas capazes de aprender "
            "padroes, analisar dados e executar tarefas como responder perguntas, reconhecer imagens "
            "e gerar texto."
        )
    return None


def solve_math(question: str) -> dict:
    expression = extract_expression(question)
    if not expression:
        return {
            "title": "Nao consegui identificar a expressao",
            "steps": [
                "Verifique se a questao contem uma expressao matematica clara.",
                "Exemplos validos: 2*x + 3 = 7, f(x)=x^2-4*x+3, x^2 + 4*x + 4, derivada de x^3, sqrt(16), log(100), sin(x).",
            ],
            "answer": "Tente reescrever a questao com a conta ou a funcao explicitamente.",
            "graph": None,
            "subject": "matematica",
            "mode": "math",
        }

    normalized = normalize_expression(expression)

    def append_graph_step(steps: list[str], graph: dict | None) -> None:
        if graph and graph.get("summary"):
            steps.append(f"No grafico, destaquei os pontos principais: {graph['summary']}.")

    try:
        if "=" in normalized:
            left, right = normalized.split("=", 1)
            left_expr = parse_math_expression(left.strip())
            right_expr = parse_math_expression(right.strip())
            equation = Eq(left_expr, right_expr)
            reduced = simplify(left_expr - right_expr)
            solution = solve(equation, x)
            reduced_expression = str(reduced)
            graph = build_graph_data(reduced_expression)
            answer = ", ".join(str(item) for item in solution) if solution else "Sem solucao real simples"
            steps = [
                f"Identifiquei a equacao original: {left.strip()} = {right.strip()}",
                f"Levei tudo para um lado e obtive: {reduced} = 0",
            ]

            poly = reduced.as_poly(x)
            if poly and poly.degree() == 2:
                a, b, c = poly.all_coeffs()
                delta = simplify(b**2 - 4 * a * c)
                steps.append(f"Observei a forma ax^2 + bx + c, com a={a}, b={b} e c={c}.")
                steps.append(f"Calculei o discriminante: Delta = b^2 - 4ac = {delta}.")
                delta_value = to_numeric_float(delta)
                if delta_value is not None:
                    if abs(delta_value) < 1e-9:
                        steps.append("Como Delta = 0, a parabola toca o eixo x em uma raiz real dupla.")
                    elif delta_value > 0:
                        steps.append("Como Delta > 0, existem duas raizes reais distintas.")
                    else:
                        steps.append("Como Delta < 0, nao existem raizes reais no plano cartesiano.")

            steps.append("Resolvi a equacao simbolicamente em relacao a x.")
            steps.append(f"Cheguei ao conjunto de solucoes exatas: x = {answer}")

            numeric_solutions = []
            for item in solution:
                numeric_item = to_numeric_float(item)
                if numeric_item is not None:
                    numeric_solutions.append(format_numeric_value(numeric_item))
            if numeric_solutions:
                steps.append(f"Em aproximacao decimal: x ~= {', '.join(numeric_solutions)}")

            steps.extend(describe_math_features(normalized))
            append_graph_step(steps, graph)
            ai_explanation = polish_math_explanation(
                request_huggingface_explanation(question, "matematica", answer, steps),
                steps,
            )
            if ai_explanation:
                steps.append(ai_explanation)
            return {
                "title": "Resolucao de equacao",
                "steps": steps,
                "answer": answer,
                "graph": graph,
                "subject": "matematica",
                "mode": "math",
            }

        lowered = normalize_expression(question.lower())
        expr = parse_math_expression(normalized)

        if "deriv" in lowered:
            result = diff(expr, x)
            graph = build_graph_data(normalized)
            steps = [
                f"Considerei a funcao {normalized}.",
                "Identifiquei que o pedido era de derivada em relacao a x.",
                f"Derivei termo a termo e obtive: {result}",
            ]
            steps.extend(describe_math_features(normalized))
            append_graph_step(steps, graph)
            return {
                "title": "Derivada calculada",
                "steps": steps,
                "answer": str(result),
                "graph": graph,
                "subject": "matematica",
                "mode": "math",
            }

        if "integr" in lowered:
            result = integrate(expr, x)
            graph = build_graph_data(normalized)
            steps = [
                f"Considerei a expressao {normalized}.",
                "Identifiquei que o pedido era de integral indefinida.",
                f"Integrei simbolicamente em relacao a x: {result} + C",
            ]
            steps.extend(describe_math_features(normalized))
            append_graph_step(steps, graph)
            return {
                "title": "Integral calculada",
                "steps": steps,
                "answer": f"{result} + C",
                "graph": graph,
                "subject": "matematica",
                "mode": "math",
            }

        simplified = simplify(expr)
        rational = together(expr)
        factored = factor(expr)
        graph = build_graph_data(normalized)

        steps = [
            f"Interpretei a expressao como: {normalized}",
            "Converti a conta para uma forma simbolica compativel com operacoes algebricas.",
        ]
        steps.extend(describe_math_features(normalized))

        if str(rational) != str(expr):
            steps.append(f"Reescrevi a expressao com denominador comum quando fez sentido: {rational}")
        if str(simplified) != str(expr):
            steps.append(f"Simplifiquei a expressao para a forma mais enxuta: {simplified}")
        else:
            steps.append("A expressao ja estava em uma forma simplificada adequada.")
        if str(factored) not in {str(expr), str(simplified)}:
            steps.append(f"Tambem observei a forma fatorada equivalente: {factored}")
        append_graph_step(steps, graph)

        return {
            "title": "Analise matematica",
            "steps": steps,
            "answer": str(simplified),
            "graph": graph,
            "subject": "matematica",
            "mode": "math",
        }
    except Exception as exc:
        return {
            "title": "Falha ao resolver",
            "steps": [
                "A expressao foi detectada, mas nao consegui processa-la automaticamente.",
                "Tente escrever com mais clareza, por exemplo: 1/2 + 3/4, sqrt(16), sin(x), cos(x), tan(x), log(100).",
                f"Detalhe tecnico: {exc}",
            ],
            "answer": "Tente enviar apenas a parte matematica principal.",
            "graph": None,
            "subject": "matematica",
            "mode": "math",
        }


def solve_physics(question: str) -> dict:
    if contains_sensitive_content(question):
        return {
            "title": "Privacidade protegida",
            "steps": [],
            "answer": build_sensitive_content_warning(),
            "graph": None,
            "subject": "fisica",
            "mode": "physics",
        }

    base_answer = (
        "Estrutura sugerida: liste os dados conhecidos, escolha a formula principal, "
        "substitua os valores com unidade e finalize interpretando o resultado."
    )
    steps = [
        "Detectei termos comuns de fisica na sua pergunta.",
        "Organizei a resolucao em dados do problema, formula e conclusao.",
        "Se a IA externa responder, eu complemento com explicacao mais natural.",
    ]
    ai_answer = request_huggingface_general_answer(question)
    return {
        "title": "Resposta de fisica" if ai_answer else "Explicacao guiada de fisica",
        "steps": steps,
        "answer": ai_answer or base_answer,
        "graph": None,
        "subject": "fisica",
        "mode": "physics",
    }


def solve_general(question: str) -> dict:
    local_answer = get_local_general_answer(question)
    if local_answer:
        return {
            "title": "Resposta geral",
            "steps": [],
            "answer": local_answer,
            "graph": None,
            "subject": "geral",
            "mode": "general",
        }

    if contains_sensitive_content(question):
        return {
            "title": "Privacidade protegida",
            "steps": [],
            "answer": build_sensitive_content_warning(),
            "graph": None,
            "subject": "geral",
            "mode": "general",
        }

    ai_answer = request_huggingface_general_answer(question)
    if ai_answer:
        return {
            "title": "Resposta geral",
            "steps": [],
            "answer": ai_answer,
            "graph": None,
            "subject": "geral",
            "mode": "general",
        }

    return {
        "title": "Resposta geral",
        "steps": [],
        "answer": (
            "Posso responder perguntas gerais tambem, mas para respostas completas ative a chave "
            "da Hugging Face no backend. Sem isso, eu consigo apenas montar uma orientacao base."
        ),
        "graph": None,
        "subject": "geral",
        "mode": "general",
    }
