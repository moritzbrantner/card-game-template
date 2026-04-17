#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEFAULT_CONFIG_PATH="${SCRIPT_DIR}/subtrees.config.sh"
GIT_BIN="${GIT_BIN:-git}"

include_apps=false
include_packages=false
selection_explicit=false
dry_run=false
config_path="${DEFAULT_CONFIG_PATH}"

usage() {
  cat <<'EOF'
Usage: scripts/setup-subtree-remotes.sh [options]

Create or update Git remotes for configured subtree mappings.

Options:
  --apps           Configure only app subtree remotes.
  --packages       Configure only package subtree remotes.
  --all            Configure both app and package subtree remotes.
  --config <path>  Load subtree mappings from a shell config file.
  --dry-run        Print the git commands without executing them.
  --help           Show this help text.

Config format:
  APP_SUBTREES=(
    "apps/web|app-web|https://github.com/moritzbrantner/next-template.git|main"
  )

  PACKAGE_SUBTREES=(
    "packages/ui|package-ui|https://github.com/moritzbrantner/platform-packages.git|main"
  )
EOF
}

quote_command() {
  printf '%q ' "$@"
}

log() {
  printf '%s\n' "$*"
}

die() {
  printf 'Error: %s\n' "$*" >&2
  exit 1
}

run_or_print() {
  if [[ "${dry_run}" == "true" ]]; then
    printf '[dry-run] %s\n' "$(quote_command "$@")"
    return 0
  fi

  "$@"
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --apps)
      include_apps=true
      selection_explicit=true
      ;;
    --packages)
      include_packages=true
      selection_explicit=true
      ;;
    --all)
      include_apps=true
      include_packages=true
      selection_explicit=true
      ;;
    --config)
      [[ $# -ge 2 ]] || die "--config requires a path"
      config_path="$2"
      shift
      ;;
    --dry-run)
      dry_run=true
      ;;
    --help)
      usage
      exit 0
      ;;
    *)
      die "Unknown option: $1"
      ;;
  esac

  shift
done

if [[ "${selection_explicit}" != "true" ]]; then
  include_apps=true
  include_packages=true
fi

repo_root="$("${GIT_BIN}" rev-parse --show-toplevel 2>/dev/null)" || die "run this script inside a Git repository"
cd "${repo_root}"

[[ -f "${config_path}" ]] || die "subtree config not found: ${config_path}"
declare -a APP_SUBTREES=()
declare -a PACKAGE_SUBTREES=()
# shellcheck disable=SC1090
source "${config_path}"

declare -a selected_specs=()

if [[ "${include_apps}" == "true" ]]; then
  selected_specs+=("${APP_SUBTREES[@]}")
fi

if [[ "${include_packages}" == "true" ]]; then
  selected_specs+=("${PACKAGE_SUBTREES[@]}")
fi

[[ "${#selected_specs[@]}" -gt 0 ]] || die "no subtree mappings selected from ${config_path}"

if [[ "${include_packages}" == "true" && "${#PACKAGE_SUBTREES[@]}" -eq 0 ]]; then
  log "No package subtree mappings configured in ${config_path}; skipping packages."
fi

configured_count=0

for spec in "${selected_specs[@]}"; do
  IFS='|' read -r prefix remote url branch <<<"${spec}"

  [[ -n "${prefix}" && -n "${remote}" && -n "${url}" && -n "${branch}" ]] || die "invalid subtree mapping: ${spec}"
  [[ -e "${prefix}" ]] || die "configured prefix does not exist: ${prefix}"

  current_url="$("${GIT_BIN}" remote get-url "${remote}" 2>/dev/null || true)"

  if [[ -z "${current_url}" ]]; then
    log "Adding remote ${remote} -> ${url}"
    run_or_print "${GIT_BIN}" remote add "${remote}" "${url}"
  elif [[ "${current_url}" != "${url}" ]]; then
    log "Updating remote ${remote} -> ${url}"
    run_or_print "${GIT_BIN}" remote set-url "${remote}" "${url}"
  else
    log "Remote ${remote} already matches ${url}"
  fi

  configured_count=$((configured_count + 1))
done

log "Configured ${configured_count} subtree remote(s)."
