from time import time

from sqlalchemy.exc import IntegrityError

from extensions import db
from models import RateLimitBucket


class DatabaseRateLimiter:
    def allow(self, key: str, limit: int, window_seconds: int) -> tuple[bool, int]:
        now = int(time())
        window_start = now - (now % window_seconds)
        retry_after = max(window_start + window_seconds - now, 1)

        bucket = RateLimitBucket.query.filter_by(key=key, window_start=window_start).first()
        if bucket is None:
            bucket = RateLimitBucket(key=key, window_start=window_start, count=1)
            db.session.add(bucket)
            try:
                db.session.commit()
                self._cleanup_old_buckets(key, window_start, window_seconds)
                return True, 0
            except IntegrityError:
                db.session.rollback()
                bucket = RateLimitBucket.query.filter_by(key=key, window_start=window_start).first()

        if bucket.count >= limit:
            return False, retry_after

        bucket.count += 1
        db.session.commit()
        self._cleanup_old_buckets(key, window_start, window_seconds)
        return True, 0

    def _cleanup_old_buckets(self, key: str, window_start: int, window_seconds: int) -> None:
        minimum_window = window_start - (window_seconds * 20)
        (
            RateLimitBucket.query.filter(
                RateLimitBucket.key == key,
                RateLimitBucket.window_start < minimum_window,
            ).delete(synchronize_session=False)
        )
        db.session.commit()


rate_limiter = DatabaseRateLimiter()
