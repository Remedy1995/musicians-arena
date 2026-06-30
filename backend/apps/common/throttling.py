from rest_framework.throttling import ScopedRateThrottle


class ScopedWriteThrottleMixin:
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = None
    throttled_methods = {"POST", "PUT", "PATCH", "DELETE"}

    def get_throttles(self):
        request = getattr(self, "request", None)
        if request is None or request.method not in self.throttled_methods or not self.throttle_scope:
            return []
        return [throttle() for throttle in self.throttle_classes]
