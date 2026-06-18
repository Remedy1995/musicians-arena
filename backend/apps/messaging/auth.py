from urllib.parse import parse_qs

from asgiref.sync import sync_to_async
from channels.auth import AuthMiddlewareStack


@sync_to_async
def get_user_for_token(token_key):
    if not token_key:
        return None
    from rest_framework.authtoken.models import Token

    try:
        return Token.objects.select_related("user").get(key=token_key).user
    except Token.DoesNotExist:
        return None


class TokenAuthMiddleware:
    def __init__(self, inner):
        self.inner = inner

    async def __call__(self, scope, receive, send):
        query_string = scope.get("query_string", b"").decode()
        params = parse_qs(query_string)
        token_key = params.get("token", [None])[0]
        user = await get_user_for_token(token_key)
        if user is not None:
            scope["user"] = user
        return await self.inner(scope, receive, send)


def TokenAuthMiddlewareStack(inner):
    return TokenAuthMiddleware(AuthMiddlewareStack(inner))
