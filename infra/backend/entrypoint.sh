#!/bin/sh
set -e

wait_for_host() {
  host="$1"
  port="$2"
  label="$3"

  if [ -z "${host}" ] || [ -z "${port}" ]; then
    return 0
  fi

  echo "Waiting for ${label} at ${host}:${port}..."
  until nc -z "${host}" "${port}"; do
    sleep 1
  done
}

if [ "${DB_HOST}" != "" ]; then
  wait_for_host "${DB_HOST}" "${DB_PORT:-5432}" "database"
fi

if [ "${WAIT_FOR_REDIS:-False}" = "True" ] || [ "${WAIT_FOR_REDIS:-false}" = "true" ]; then
  REDIS_WAIT_HOST="$(python -c "from urllib.parse import urlparse; import os; parsed = urlparse(os.environ.get('REDIS_URL', '')); print(parsed.hostname or '')")"
  REDIS_WAIT_PORT="$(python -c "from urllib.parse import urlparse; import os; parsed = urlparse(os.environ.get('REDIS_URL', '')); print(parsed.port or 6379)")"
  wait_for_host "${REDIS_WAIT_HOST}" "${REDIS_WAIT_PORT}" "redis"
fi

if [ "${RUN_MIGRATIONS:-False}" = "True" ] || [ "${RUN_MIGRATIONS:-false}" = "true" ]; then
  python manage.py migrate --noinput
fi

if [ "${RUN_COLLECTSTATIC:-False}" = "True" ] || [ "${RUN_COLLECTSTATIC:-false}" = "true" ]; then
  python manage.py collectstatic --noinput
fi

exec "$@"
