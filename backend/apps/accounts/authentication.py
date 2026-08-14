from datetime import timedelta

from django.conf import settings
from django.utils import timezone
from rest_framework.authentication import TokenAuthentication
from rest_framework.exceptions import AuthenticationFailed
from rest_framework.authtoken.models import Token


def token_has_expired(token):
    lifetime = timedelta(seconds=settings.AUTH_TOKEN_TTL_SECONDS)
    return token.created + lifetime <= timezone.now()


def get_valid_token_for_user(user):
    token, _ = Token.objects.get_or_create(user=user)
    if token_has_expired(token):
        token.delete()
        token = Token.objects.create(user=user)
    return token


def get_user_for_token_key(token_key):
    if not token_key:
        raise AuthenticationFailed("Authentication credentials were not provided.")

    try:
        token = Token.objects.select_related("user").get(key=token_key)
    except Token.DoesNotExist as exc:
        raise AuthenticationFailed("Invalid authentication token.") from exc

    if token_has_expired(token):
        token.delete()
        raise AuthenticationFailed("Authentication token has expired. Please sign in again.")

    if not token.user.is_active:
        raise AuthenticationFailed("User account is inactive.")

    return token.user, token


class ExpiringTokenAuthentication(TokenAuthentication):
    def authenticate_credentials(self, key):
        user, token = get_user_for_token_key(key)
        return user, token
