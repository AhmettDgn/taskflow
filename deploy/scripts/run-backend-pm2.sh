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

if [[ -f "${ROOT_DIR}/backend.env" ]]; then
  set -a
  . "${ROOT_DIR}/backend.env"
  set +a
fi

cd "${ROOT_DIR}/backend"

HOST="${HOST:-127.0.0.1}" PORT="${PORT:-5021}" corepack pnpm --dir "${ROOT_DIR}" --filter backend start
