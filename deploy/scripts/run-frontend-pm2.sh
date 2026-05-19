#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

ensure_global_tool() {
  local tool_name="$1"
  local package_name="$2"

  if command -v "${tool_name}" >/dev/null 2>&1; then
    return
  fi

  echo "Installing missing global tool: ${package_name}"
  npm install -g "${package_name}"
  hash -r
}

run_pnpm() {
  if command -v corepack >/dev/null 2>&1; then
    corepack pnpm "$@"
    return
  fi

  if command -v pnpm >/dev/null 2>&1; then
    pnpm "$@"
    return
  fi

  ensure_global_tool pnpm pnpm@10.11.1
  pnpm "$@"
}

if [[ ! -s "${HOME}/.nvm/nvm.sh" ]]; then
  echo "nvm not found at ${HOME}/.nvm/nvm.sh" >&2
  exit 1
fi

. "${HOME}/.nvm/nvm.sh"
nvm install 24 >/dev/null
nvm use 24 >/dev/null
if command -v corepack >/dev/null 2>&1; then
  corepack enable >/dev/null 2>&1 || true
fi
ensure_global_tool pm2 pm2

if [[ -f "${ROOT_DIR}/frontend.env" ]]; then
  set -a
  . "${ROOT_DIR}/frontend.env"
  set +a
fi

cd "${ROOT_DIR}/frontend"

run_pnpm --dir "${ROOT_DIR}" --filter frontend start -- --hostname "${FRONTEND_HOST:-127.0.0.1}" --port "${FRONTEND_PORT:-3021}"
