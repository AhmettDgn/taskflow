#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

run_pnpm() {
  if command -v corepack >/dev/null 2>&1; then
    corepack pnpm "$@"
    return
  fi

  if command -v pnpm >/dev/null 2>&1; then
    pnpm "$@"
    return
  fi

  echo "Neither corepack nor pnpm is available on the server." >&2
  exit 1
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

if [[ -f "${ROOT_DIR}/frontend.env" ]]; then
  set -a
  . "${ROOT_DIR}/frontend.env"
  set +a
fi

cd "${ROOT_DIR}/frontend"

run_pnpm --dir "${ROOT_DIR}" --filter frontend start -- --hostname "${FRONTEND_HOST:-127.0.0.1}" --port "${FRONTEND_PORT:-3021}"
