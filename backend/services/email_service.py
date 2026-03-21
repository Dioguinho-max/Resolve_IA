import os
import smtplib
from email.message import EmailMessage

from flask import current_app


EMAIL_PROVIDER_PRESETS = {
    "gmail": {"host": "smtp.gmail.com", "port": 587, "tls": True, "ssl": False},
    "outlook": {"host": "smtp-mail.outlook.com", "port": 587, "tls": True, "ssl": False},
    "hotmail": {"host": "smtp-mail.outlook.com", "port": 587, "tls": True, "ssl": False},
    "live": {"host": "smtp-mail.outlook.com", "port": 587, "tls": True, "ssl": False},
    "yahoo": {"host": "smtp.mail.yahoo.com", "port": 587, "tls": True, "ssl": False},
    "zoho": {"host": "smtp.zoho.com", "port": 587, "tls": True, "ssl": False},
    "protonmail": {"host": "smtp.protonmail.ch", "port": 587, "tls": True, "ssl": False},
    "custom": {"host": "", "port": 587, "tls": True, "ssl": False},
}


def resolve_email_settings() -> dict:
    provider = os.getenv("SMTP_PROVIDER", "custom").strip().lower() or "custom"
    preset = EMAIL_PROVIDER_PRESETS.get(provider, EMAIL_PROVIDER_PRESETS["custom"])

    host = os.getenv("SMTP_HOST", preset["host"])
    port = int(os.getenv("SMTP_PORT", str(preset["port"])))
    username = os.getenv("SMTP_USERNAME", "")
    password = os.getenv("SMTP_PASSWORD", "")
    from_email = os.getenv("SMTP_FROM_EMAIL", username)
    from_name = os.getenv("SMTP_FROM_NAME", "ResolveAI")
    use_tls = os.getenv("SMTP_USE_TLS", "1" if preset["tls"] else "0") == "1"
    use_ssl = os.getenv("SMTP_USE_SSL", "1" if preset["ssl"] else "0") == "1"

    return {
        "provider": provider,
        "host": host,
        "port": port,
        "username": username,
        "password": password,
        "from_email": from_email,
        "from_name": from_name,
        "use_tls": use_tls,
        "use_ssl": use_ssl,
    }


def email_delivery_enabled() -> bool:
    settings = resolve_email_settings()
    required = [settings["host"], settings["username"], settings["password"], settings["from_email"]]
    return all(required)


def send_reset_code_email(recipient_email: str, reset_token: str, expires_in_minutes: int = 30) -> bool:
    settings = resolve_email_settings()
    if not email_delivery_enabled():
        current_app.logger.warning("Email reset: SMTP nao configurado; envio por email desativado.")
        return False

    message = EmailMessage()
    message["Subject"] = "Codigo de recuperacao de senha - ResolveAI"
    message["From"] = f"{settings['from_name']} <{settings['from_email']}>"
    message["To"] = recipient_email
    message.set_content(
        "\n".join(
            [
                "Ola,",
                "",
                "Recebemos um pedido para redefinir sua senha no ResolveAI.",
                f"Seu codigo de recuperacao e: {reset_token}",
                f"Esse codigo expira em {expires_in_minutes} minutos.",
                "",
                "Se voce nao pediu essa alteracao, ignore este email.",
                "",
                "Equipe ResolveAI",
            ]
        )
    )

    try:
        smtp_class = smtplib.SMTP_SSL if settings["use_ssl"] else smtplib.SMTP
        with smtp_class(settings["host"], settings["port"], timeout=20) as server:
            if settings["use_tls"] and not settings["use_ssl"]:
                server.starttls()
            server.login(settings["username"], settings["password"])
            server.send_message(message)
        current_app.logger.warning(
            "Email reset: codigo enviado para %s via provider=%s",
            recipient_email,
            settings["provider"],
        )
        return True
    except Exception:
        current_app.logger.exception(
            "Email reset: falha ao enviar codigo para %s via provider=%s",
            recipient_email,
            settings["provider"],
        )
        return False
