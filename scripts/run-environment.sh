#!/usr/bin/env sh
# Run a command with variables from the local .env file.
set -eu

ENV_PATH="$(dirname "$0")/../.env"

if [ ! -f "$ENV_PATH" ]; then
  echo ".env not found at $ENV_PATH" >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
. "$ENV_PATH"
set +a

exec "$@"
