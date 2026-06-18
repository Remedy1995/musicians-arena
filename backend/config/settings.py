from pathlib import Path

from decouple import Csv, config


BASE_DIR = Path(__file__).resolve().parent.parent


ENVIRONMENT = config("DJANGO_ENV", default="development")
SECRET_KEY = config("DJANGO_SECRET_KEY", default="django-insecure-change-me")
DEBUG = config("DJANGO_DEBUG", default=(ENVIRONMENT != "production"), cast=bool)
ALLOWED_HOSTS = config("DJANGO_ALLOWED_HOSTS", default="127.0.0.1,localhost,10.0.2.2", cast=Csv())
CSRF_TRUSTED_ORIGINS = config("DJANGO_CSRF_TRUSTED_ORIGINS", default="", cast=Csv())
CORS_ALLOWED_ORIGINS = config(
    "DJANGO_CORS_ALLOWED_ORIGINS",
    default="http://localhost:8081,http://127.0.0.1:8081,http://localhost:19006,http://127.0.0.1:19006",
    cast=Csv(),
)
CORS_ALLOW_CREDENTIALS = config("DJANGO_CORS_ALLOW_CREDENTIALS", default=True, cast=bool)
CORS_ALLOW_ALL_ORIGINS = config("DJANGO_CORS_ALLOW_ALL_ORIGINS", default=(ENVIRONMENT == "development"), cast=bool)


DJANGO_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
]

THIRD_PARTY_APPS = [
    "corsheaders",
    "rest_framework",
    "rest_framework.authtoken",
    "django_filters",
    "channels",
    "drf_spectacular",
]

LOCAL_APPS = [
    "apps.common",
    "apps.accounts",
    "apps.profiles",
    "apps.bookings",
    "apps.gigs",
    "apps.payments",
    "apps.messaging",
    "apps.notifications",
    "apps.reviews",
]

INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS


MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"


DEFAULT_DB_ENGINE = "django.db.backends.sqlite3" if ENVIRONMENT == "development" else "django.db.backends.postgresql"
DB_ENGINE = config("DB_ENGINE", default=DEFAULT_DB_ENGINE)
DB_NAME = config("DB_NAME", default="musicians_arena")
DB_USER = config("DB_USER", default="musicians_arena")
DB_PASSWORD = config("DB_PASSWORD", default="musicians_arena")
DB_HOST = config("DB_HOST", default="127.0.0.1")
DB_PORT = config("DB_PORT", default="5432")
DB_CONN_MAX_AGE = config("DB_CONN_MAX_AGE", default=60, cast=int)

if DB_ENGINE == "django.db.backends.sqlite3":
    DATABASES = {
        "default": {
            "ENGINE": DB_ENGINE,
        "NAME": config("DB_NAME", default=str(BASE_DIR / "db.sqlite3")),
        }
    }
else:
    DATABASES = {
        "default": {
            "ENGINE": DB_ENGINE,
            "NAME": DB_NAME,
            "USER": DB_USER,
            "PASSWORD": DB_PASSWORD,
            "HOST": DB_HOST,
            "PORT": DB_PORT,
            "CONN_MAX_AGE": DB_CONN_MAX_AGE,
        }
    }


AUTH_USER_MODEL = "accounts.User"

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]


LANGUAGE_CODE = "en-us"
TIME_ZONE = config("DJANGO_TIME_ZONE", default="Africa/Accra")
USE_I18N = True
USE_TZ = True


STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
MEDIA_URL = "media/"
MEDIA_ROOT = BASE_DIR / "media"
MEDIA_FILE_STORAGE_BACKEND = config(
    "MEDIA_FILE_STORAGE_BACKEND",
    default="django.core.files.storage.FileSystemStorage",
)
MEDIA_MAX_IMAGE_BYTES = config("MEDIA_MAX_IMAGE_BYTES", default=10 * 1024 * 1024, cast=int)
MEDIA_MAX_AUDIO_BYTES = config("MEDIA_MAX_AUDIO_BYTES", default=30 * 1024 * 1024, cast=int)
MEDIA_MAX_VIDEO_BYTES = config("MEDIA_MAX_VIDEO_BYTES", default=150 * 1024 * 1024, cast=int)

STORAGES = {
    "default": {
        "BACKEND": MEDIA_FILE_STORAGE_BACKEND,
    },
    "staticfiles": {
        "BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage",
    },
}


DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"


REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework.authentication.TokenAuthentication",
        "rest_framework.authentication.SessionAuthentication",
    ],
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "DEFAULT_FILTER_BACKENDS": [
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.SearchFilter",
        "rest_framework.filters.OrderingFilter",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticatedOrReadOnly",
    ],
}


REDIS_URL = config("REDIS_URL", default="redis://127.0.0.1:6379/0")
CHANNELS_USE_REDIS = config("CHANNELS_USE_REDIS", default=(ENVIRONMENT != "development"), cast=bool)

if CHANNELS_USE_REDIS:
    CHANNEL_LAYERS = {
        "default": {
            "BACKEND": "channels_redis.core.RedisChannelLayer",
            "CONFIG": {
                "hosts": [REDIS_URL],
            },
        }
    }
else:
    CHANNEL_LAYERS = {
        "default": {
            "BACKEND": "channels.layers.InMemoryChannelLayer",
        }
    }


CELERY_BROKER_URL = config("CELERY_BROKER_URL", default=REDIS_URL)
CELERY_RESULT_BACKEND = config("CELERY_RESULT_BACKEND", default=REDIS_URL)
CELERY_TASK_TIME_LIMIT = config("CELERY_TASK_TIME_LIMIT", default=300, cast=int)
CELERY_TASK_SOFT_TIME_LIMIT = config("CELERY_TASK_SOFT_TIME_LIMIT", default=240, cast=int)
CELERY_TASK_ALWAYS_EAGER = config("CELERY_TASK_ALWAYS_EAGER", default=(ENVIRONMENT == "development"), cast=bool)
CELERY_TASK_EAGER_PROPAGATES = config("CELERY_TASK_EAGER_PROPAGATES", default=True, cast=bool)

SPECTACULAR_SETTINGS = {
    "TITLE": "Musician's Arena API",
    "DESCRIPTION": "API documentation for the Musician's Arena mobile and future web platforms.",
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
}


SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
USE_X_FORWARDED_HOST = config("DJANGO_USE_X_FORWARDED_HOST", default=False, cast=bool)
SESSION_COOKIE_SECURE = config("DJANGO_SESSION_COOKIE_SECURE", default=(ENVIRONMENT == "production"), cast=bool)
CSRF_COOKIE_SECURE = config("DJANGO_CSRF_COOKIE_SECURE", default=(ENVIRONMENT == "production"), cast=bool)
SECURE_SSL_REDIRECT = config("DJANGO_SECURE_SSL_REDIRECT", default=False, cast=bool)
