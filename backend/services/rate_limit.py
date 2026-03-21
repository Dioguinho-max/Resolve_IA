from collections import defaultdict, deque
from time import time


class InMemoryRateLimiter:
    def __init__(self):
        self._events = defaultdict(deque)

    def allow(self, key: str, limit: int, window_seconds: int) -> tuple[bool, int]:
        now = time()
        bucket = self._events[key]

        while bucket and bucket[0] <= now - window_seconds:
            bucket.popleft()

        if len(bucket) >= limit:
            retry_after = int(window_seconds - (now - bucket[0])) + 1
            return False, max(retry_after, 1)

        bucket.append(now)
        return True, 0


rate_limiter = InMemoryRateLimiter()
