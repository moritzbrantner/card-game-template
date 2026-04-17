#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEFAULT_CONFIG_PATH="${SCRIPT_DIR}/subtrees.config.sh"
GIT_BIN="${GIT_BIN:-git}"

include_apps=false
include_packages=false
selection_explicit=false
allow_dirty=false
dry_run=false
config_path="${DEFAULT_CONFIG_PATH}"
requested_prefix=""

usage() {
  cat <<'EOF'
Usage: scripts/sync-subtrees.sh [options]

Pull the latest subtree changes for configured app and package prefixes.

Options:
  --apps           Sync only app subtree mappings.
  --packages       Sync only package subtree mappings.
  --all            Sync both app and package subtree mappings.
  --prefix <path>  Sync only the configured subtree mapping for one prefix.
  --config <path>  Load subtree mappings from a shell config file.
  --allow-dirty    Allow syncing with tracked local changes present.
  --dry-run        Print the git commands without executing fetch/pull.
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
    --prefix)
      [[ $# -ge 2 ]] || die "--prefix requires a path"
      requested_prefix="$2"
      shift
      ;;
    --allow-dirty)
      allow_dirty=true
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

if [[ "${allow_dirty}" != "true" ]]; then
  dirty_status="$("${GIT_BIN}" status --short --untracked-files=no)"
  if [[ -n "${dirty_status}" ]]; then
    die "tracked changes detected; commit or stash them first, or rerun with --allow-dirty"
  fi
fi

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

if [[ -n "${requested_prefix}" ]]; then
  declare -a filtered_specs=()

  for spec in "${selected_specs[@]}"; do
    IFS='|' read -r prefix remote url branch <<<"${spec}"
    if [[ "${prefix}" == "${requested_prefix}" ]]; then
      filtered_specs+=("${spec}")
    fi
  done

  [[ "${#filtered_specs[@]}" -gt 0 ]] || die "requested prefix is not configured: ${requested_prefix}"
  selected_specs=("${filtered_specs[@]}")
fi

synced_count=0

for spec in "${selected_specs[@]}"; do
  IFS='|' read -r prefix remote url branch <<<"${spec}"

  [[ -n "${prefix}" && -n "${remote}" && -n "${url}" && -n "${branch}" ]] || die "invalid subtree mapping: ${spec}"
  [[ -e "${prefix}" ]] || die "configured prefix does not exist: ${prefix}"

  if ! "${GIT_BIN}" remote get-url "${remote}" >/dev/null 2>&1; then
    die "configured remote does not exist: ${remote}"
  fi

  log "Syncing ${prefix} from ${remote}@${branch}"
  run_or_print "${GIT_BIN}" fetch "${remote}" "${branch}"
  run_or_print "${GIT_BIN}" subtree pull --prefix="${prefix}" "${remote}" "${branch}" --squash
  synced_count=$((synced_count + 1))
done

log "Synced ${synced_count} subtree mapping(s)."
