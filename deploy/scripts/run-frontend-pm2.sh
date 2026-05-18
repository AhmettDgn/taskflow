#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

if [[ ! -s "${HOME}/.nvm/nvm.sh" ]]; then
  echo "nvm not found at ${HOME}/.nvm/nvm.sh" >&2
  exit 1
fi

. "${HOME}/.nvm/nvm.sh"
nvm install 24 >/dev/null
nvm use 24 >/dev/null

if [[ -f "${ROOT_DIR}/frontend.env" ]]; then
  set -a
  . "${ROOT_DIR}/frontend.env"
  set +a
fi

cd "${ROOT_DIR}/frontend"

corepack pnpm --dir "${ROOT_DIR}" --filter frontend start -- --hostname "${FRONTEND_HOST:-127.0.0.1}" --port "${FRONTEND_PORT:-3021}"
