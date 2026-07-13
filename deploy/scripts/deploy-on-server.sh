#!/usr/bin/env bash
set -Eeuo pipefail

# Frontend artık sunucuda BUILD EDİLMEZ. CI, standalone production bundle'ını
# (frontend-standalone.tar.gz) hazırlayıp yükler; bu betik sadece:
#   1. repoyu günceller (backend/server.js, ecosystem, PM2 runner betikleri için)
#   2. tarball'ı açıp frontend-standalone dizinini atomik biçimde değiştirir
#   3. PM2'yi yeniden yükler ve health check yapar (başarısızlıkta rollback)

DEPLOY_PATH_INPUT="${DEPLOY_PATH:-${1:-~/projects/taskflow}}"
DEPLOY_BRANCH="${DEPLOY_BRANCH:-${2:-main}}"
FRONTEND_TARBALL="${FRONTEND_TARBALL:-/tmp/taskflow-frontend-standalone.tar.gz}"

expand_home_path() {
  local raw_path="$1"

  if [[ "${raw_path}" == "~" ]]; then
    printf '%s\n' "${HOME}"
    return
  fi

  if [[ "${raw_path}" == ~/* ]]; then
    printf '%s\n' "${HOME}/${raw_path#~/}"
    return
  fi

  printf '%s\n' "${raw_path}"
}

ROOT_DIR="$(expand_home_path "${DEPLOY_PATH_INPUT}")"
STANDALONE_DIR="${ROOT_DIR}/frontend-standalone"
STANDALONE_NEW="${ROOT_DIR}/frontend-standalone.new"
STANDALONE_PREV="${ROOT_DIR}/frontend-standalone.prev"
LOCK_FILE="${TMPDIR:-/tmp}/taskflow-deploy.lock"
USE_FLOCK=0
RELOADED=0
DEPLOY_COMPLETED=0
ROLLBACK_ATTEMPTED=0
PREV_COMMIT=""

log() {
  printf '[deploy] %s\n' "$*"
}

ensure_global_tool() {
  local tool_name="$1"
  local package_name="$2"

  if command -v "${tool_name}" >/dev/null 2>&1; then
    return
  fi

  log "Installing missing global tool: ${package_name}"
  npm install -g "${package_name}"
  hash -r
}

require_command() {
  local command_name
  for command_name in "$@"; do
    if ! command -v "${command_name}" >/dev/null 2>&1; then
      printf 'Required command not found: %s\n' "${command_name}" >&2
      exit 1
    fi
  done
}

load_env_file() {
  local env_file="$1"

  if [[ -f "${env_file}" ]]; then
    log "Loading environment from ${env_file}"
    set -a
    # shellcheck disable=SC1090
    . "${env_file}"
    set +a
  fi
}

acquire_lock() {
  if command -v flock >/dev/null 2>&1; then
    USE_FLOCK=1
    exec 9>"${LOCK_FILE}"
    flock -n 9 || {
      printf 'Another deployment is already running.\n' >&2
      exit 1
    }
    return
  fi

  if [[ -f "${LOCK_FILE}" ]]; then
    local existing_pid
    existing_pid="$(cat "${LOCK_FILE}" 2>/dev/null || true)"
    if [[ -n "${existing_pid}" ]] && kill -0 "${existing_pid}" >/dev/null 2>&1; then
      printf 'Another deployment is already running with PID %s.\n' "${existing_pid}" >&2
      exit 1
    fi
  fi

  printf '%s\n' "$$" > "${LOCK_FILE}"
}

release_lock() {
  if [[ "${USE_FLOCK}" -eq 0 ]]; then
    rm -f "${LOCK_FILE}"
  fi
}

health_check() {
  local name="$1"
  local url="$2"
  local attempt

  for attempt in {1..10}; do
    if curl -fsS --max-time 10 "${url}" >/dev/null; then
      log "${name} health check passed: ${url}"
      return 0
    fi

    log "${name} health check failed on attempt ${attempt}: ${url}"
    sleep 3
  done

  printf '%s health check failed after multiple attempts: %s\n' "${name}" "${url}" >&2
  return 1
}

verify_clean_worktree() {
  if [[ -n "$(git status --porcelain)" ]]; then
    printf 'Refusing to deploy from a dirty working tree in %s\n' "${ROOT_DIR}" >&2
    exit 1
  fi
}

rollback() {
  if [[ "${ROLLBACK_ATTEMPTED}" -eq 1 ]]; then
    return
  fi

  ROLLBACK_ATTEMPTED=1
  trap - ERR
  set +e

  log "Deploy failed after PM2 reload. Rolling back to ${PREV_COMMIT}"
  git reset --hard "${PREV_COMMIT}"

  if [[ -d "${STANDALONE_PREV}" ]]; then
    rm -rf "${STANDALONE_DIR}"
    mv "${STANDALONE_PREV}" "${STANDALONE_DIR}"
    log "Restored previous standalone bundle"
  fi

  pm2 startOrReload ecosystem.config.cjs --update-env
  pm2 save
  health_check "backend rollback" "http://127.0.0.1:5021/health"
  health_check "frontend rollback" "http://127.0.0.1:3021/login"

  printf 'Rollback completed. Deployment aborted.\n' >&2
  exit 1
}

on_error() {
  local exit_code=$?

  if [[ "${RELOADED}" -eq 1 ]] && [[ "${DEPLOY_COMPLETED}" -eq 0 ]]; then
    rollback
  fi

  exit "${exit_code}"
}

cleanup() {
  release_lock
}

trap on_error ERR
trap cleanup EXIT

require_command bash git curl tar

if [[ ! -f "${FRONTEND_TARBALL}" ]]; then
  printf 'Frontend standalone tarball not found: %s\n' "${FRONTEND_TARBALL}" >&2
  exit 1
fi

if [[ ! -s "${HOME}/.nvm/nvm.sh" ]]; then
  printf 'nvm not found at %s/.nvm/nvm.sh\n' "${HOME}" >&2
  exit 1
fi

. "${HOME}/.nvm/nvm.sh"
if ! nvm use 24 >/dev/null 2>&1; then
  nvm install 24 >/dev/null
  nvm use 24 >/dev/null
fi
ensure_global_tool pm2 pm2

if [[ ! -d "${ROOT_DIR}" ]]; then
  printf 'Deploy path does not exist: %s\n' "${ROOT_DIR}" >&2
  exit 1
fi

cd "${ROOT_DIR}"
acquire_lock
verify_clean_worktree

load_env_file "${ROOT_DIR}/frontend.env"
load_env_file "${ROOT_DIR}/backend.env"

PREV_COMMIT="$(git rev-parse HEAD)"

log "Starting deploy for branch ${DEPLOY_BRANCH} in ${ROOT_DIR}"
if [[ -n "${GITHUB_SHA:-}" ]]; then
  log "GitHub Actions commit: ${GITHUB_SHA}"
fi

git fetch origin "${DEPLOY_BRANCH}"
git checkout "${DEPLOY_BRANCH}"
git pull --ff-only origin "${DEPLOY_BRANCH}"

log "Extracting frontend standalone bundle"
rm -rf "${STANDALONE_NEW}"
mkdir -p "${STANDALONE_NEW}"
tar -xzf "${FRONTEND_TARBALL}" -C "${STANDALONE_NEW}"

if [[ ! -f "${STANDALONE_NEW}/frontend/server.js" ]]; then
  printf 'Extracted bundle is missing frontend/server.js\n' >&2
  exit 1
fi

log "Swapping standalone bundle into place"
rm -rf "${STANDALONE_PREV}"
if [[ -d "${STANDALONE_DIR}" ]]; then
  mv "${STANDALONE_DIR}" "${STANDALONE_PREV}"
fi
mv "${STANDALONE_NEW}" "${STANDALONE_DIR}"

log "Reloading PM2 processes"
pm2 startOrReload ecosystem.config.cjs --update-env
RELOADED=1
pm2 save

health_check "backend" "http://127.0.0.1:5021/health"
health_check "frontend" "http://127.0.0.1:3021/login"

DEPLOY_COMPLETED=1
rm -f "${FRONTEND_TARBALL}"
log "Deployment completed successfully at commit $(git rev-parse HEAD)"
