#!/usr/bin/env sh
# Run a command with secrets injected by `op run`.
#
# Resolution order:
#   1. If $OP_ENVIRONMENT_ID is set AND an `op` on PATH supports
#      `op run --environment` (1Password CLI beta), use that.
#   2. Otherwise fall back to `op run --env-file env.template` which is
#      supported by the stable CLI and reads the same op:// secret refs.
#
# Either path talks to the 1Password desktop app directly (no FIFO on disk),
# so secrets are re-fetched fresh on every invocation.
set -eu

SCRIPT_DIR="$(dirname "$0")"
TEMPLATE_PATH="$SCRIPT_DIR/../env.template"
LOCAL_ENV_PATH="$SCRIPT_DIR/../.env"

run_with_local_env() {
  reason="$1"
  shift

  if [ ! -f "$LOCAL_ENV_PATH" ]; then
    echo "[op-run] $reason; no local .env was found at $LOCAL_ENV_PATH" >&2
    exit 1
  fi

  echo "[op-run] $reason; falling back to local .env" >&2
  set -a
  # shellcheck disable=SC1090
  . "$LOCAL_ENV_PATH"
  set +a
  exec "$@"
}

if [ -n "${OP_ENVIRONMENT_ID:-}" ]; then
  seen_paths=":"
  IFS=":"
  for dir in $PATH; do
    candidate="$dir/op"
    [ -x "$candidate" ] || continue
    case "$seen_paths" in
      *":$candidate:"*) continue ;;
    esac
    seen_paths="$seen_paths$candidate:"
    if "$candidate" run --help 2>&1 | grep -q -- '--environment'; then
      unset IFS
      exec "$candidate" run --environment "$OP_ENVIRONMENT_ID" -- "$@"
    fi
  done
  unset IFS
fi

if ! command -v op >/dev/null 2>&1; then
  echo "1Password CLI (op) not found on PATH." >&2
  exit 1
fi

if [ ! -f "$TEMPLATE_PATH" ]; then
  echo "env.template not found at $TEMPLATE_PATH" >&2
  exit 1
fi

if [ "${LIBRESTOCK_SKIP_OP:-}" = "1" ]; then
  run_with_local_env "LIBRESTOCK_SKIP_OP=1" "$@"
fi

OP_PREFLIGHT_ERROR=$(mktemp)
if ! op run --env-file "$TEMPLATE_PATH" -- true 2>"$OP_PREFLIGHT_ERROR"; then
  if [ "${LIBRESTOCK_STRICT_OP:-}" = "1" ]; then
    cat "$OP_PREFLIGHT_ERROR" >&2
    rm -f "$OP_PREFLIGHT_ERROR"
    exit 1
  fi

  echo "[op-run] 1Password env injection failed:" >&2
  cat "$OP_PREFLIGHT_ERROR" >&2
  rm -f "$OP_PREFLIGHT_ERROR"
  run_with_local_env "1Password env injection failed" "$@"
fi
rm -f "$OP_PREFLIGHT_ERROR"

# `op run --env-file` takes precedence over inherited env vars. Re-apply
# workspace dev overrides after injection so `pnpm dev` can use local infra.
if [ -n "${DATABASE_URL+x}" ]; then
  set -- env "DATABASE_URL=$DATABASE_URL" "$@"
fi
if [ -n "${CORS_ORIGIN+x}" ]; then
  set -- env "CORS_ORIGIN=$CORS_ORIGIN" "$@"
fi
if [ -n "${FRONTEND_URL+x}" ]; then
  set -- env "FRONTEND_URL=$FRONTEND_URL" "$@"
fi

exec op run --env-file "$TEMPLATE_PATH" -- "$@"
