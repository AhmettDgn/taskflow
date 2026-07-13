#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
STANDALONE_DIR="${ROOT_DIR}/frontend-standalone"

if [[ ! -s "${HOME}/.nvm/nvm.sh" ]]; then
  echo "nvm not found at ${HOME}/.nvm/nvm.sh" >&2
  exit 1
fi

. "${HOME}/.nvm/nvm.sh"
if ! nvm use 24 >/dev/null 2>&1; then
  nvm install 24 >/dev/null
  nvm use 24 >/dev/null
fi

if [[ -f "${ROOT_DIR}/frontend.env" ]]; then
  set -a
  . "${ROOT_DIR}/frontend.env"
  set +a
fi

if [[ ! -f "${STANDALONE_DIR}/frontend/server.js" ]]; then
  echo "Standalone bundle not found at ${STANDALONE_DIR}/frontend/server.js" >&2
  echo "Deploy it first (CI builds and uploads frontend-standalone.tar.gz)." >&2
  exit 1
fi

# Standalone server, HOSTNAME/PORT ortam değişkenlerini okur; next start artık kullanılmıyor.
cd "${STANDALONE_DIR}/frontend"
exec env HOSTNAME="${FRONTEND_HOST:-127.0.0.1}" PORT="${FRONTEND_PORT:-3021}" node server.js
