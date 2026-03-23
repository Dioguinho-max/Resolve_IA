import json

from sqlalchemy import func

from extensions import db


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    token_version = db.Column(db.Integer, nullable=False, default=0, server_default="0")
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, server_default=func.now())
    reset_token_hash = db.Column(db.String(255), nullable=True)
    reset_token_expires_at = db.Column(db.DateTime(timezone=True), nullable=True)
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


class RateLimitBucket(db.Model):
    __tablename__ = "rate_limit_buckets"

    id = db.Column(db.Integer, primary_key=True)
    key = db.Column(db.String(255), nullable=False, index=True)
    window_start = db.Column(db.Integer, nullable=False, index=True)
    count = db.Column(db.Integer, nullable=False, default=0, server_default="0")
    updated_at = db.Column(db.DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())

    __table_args__ = (db.UniqueConstraint("key", "window_start", name="uq_rate_limit_bucket"),)
