#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEFAULT_CONFIG_PATH="${SCRIPT_DIR}/subtrees.config.sh"
GIT_BIN="${GIT_BIN:-git}"
GH_BIN="${GH_BIN:-gh}"

config_path="${DEFAULT_CONFIG_PATH}"
scope="all"
sync_token_env="GH_SUBTREE_SYNC_TOKEN_VALUE"
dispatch_token_env="MONOREPO_SUBTREE_DISPATCH_TOKEN_VALUE"
dry_run=false
repo_arg=""
command_name=""

usage() {
  cat <<'EOF'
Usage: scripts/manage-subtree-secrets.sh <list|set|delete> [options]

Manage the subtree sync GitHub Actions secrets for the monorepo and its
configured upstream subtree repositories via the GitHub CLI.

Commands:
  list                         Show subtree-related secrets for each selected repo.
  set                          Set subtree-related secrets from environment variables.
  delete                       Delete subtree-related secrets from each selected repo.

Options:
  --scope <all|monorepo|upstreams>
                               Which repos to manage. Default: all.
  --repo <owner/name>          Monorepo GitHub slug. Defaults to origin remote.
  --config <path>              Load subtree mappings from a shell config file.
  --sync-token-env <name>      Env var to read for GH_SUBTREE_SYNC_TOKEN. Default:
                               GH_SUBTREE_SYNC_TOKEN_VALUE
  --dispatch-token-env <name>  Env var to read for MONOREPO_SUBTREE_DISPATCH_TOKEN.
                               Default: MONOREPO_SUBTREE_DISPATCH_TOKEN_VALUE
  --dry-run                    Print gh commands without executing them.
  --help                       Show this help text.

Examples:
  export GH_SUBTREE_SYNC_TOKEN_VALUE=ghp_xxx
  export MONOREPO_SUBTREE_DISPATCH_TOKEN_VALUE=ghp_yyy
  bash scripts/manage-subtree-secrets.sh set
  bash scripts/manage-subtree-secrets.sh list --scope upstreams
  bash scripts/manage-subtree-secrets.sh delete --scope monorepo
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

require_binary() {
  command -v "$1" >/dev/null 2>&1 || die "required executable not found: $1"
}

parse_github_repo() {
  local url="$1"
  local owner=""
  local repo=""

  if [[ "${url}" =~ ^https://github\.com/([^/]+)/([^/]+)(\.git)?$ ]]; then
    owner="${BASH_REMATCH[1]}"
    repo="${BASH_REMATCH[2]}"
  elif [[ "${url}" =~ ^git@github\.com:([^/]+)/([^/]+)(\.git)?$ ]]; then
    owner="${BASH_REMATCH[1]}"
    repo="${BASH_REMATCH[2]}"
  elif [[ "${url}" =~ ^ssh://git@github\.com/([^/]+)/([^/]+)(\.git)?$ ]]; then
    owner="${BASH_REMATCH[1]}"
    repo="${BASH_REMATCH[2]}"
  else
    return 1
  fi

  printf '%s/%s\n' "${owner}" "${repo%.git}"
}

resolve_monorepo_repo() {
  if [[ -n "${repo_arg}" ]]; then
    printf '%s\n' "${repo_arg}"
    return 0
  fi

  local origin_url
  origin_url="$("${GIT_BIN}" remote get-url origin 2>/dev/null || true)"
  [[ -n "${origin_url}" ]] || die "origin remote is not configured; pass --repo <owner/name>"

  parse_github_repo "${origin_url}" || die "origin remote is not a supported GitHub URL; pass --repo <owner/name>"
}

run_gh() {
  if [[ "${dry_run}" == "true" ]]; then
    printf '[dry-run] %s\n' "$(quote_command "${GH_BIN}" "$@")"
    return 0
  fi

  "${GH_BIN}" "$@"
}

set_secret_from_env() {
  local repo="$1"
  local secret_name="$2"
  local env_name="$3"
  local secret_value="${!env_name:-}"

  [[ -n "${secret_value}" ]] || die "set requires env var ${env_name} for ${secret_name}"

  if [[ "${dry_run}" == "true" ]]; then
    printf '[dry-run] %s\n' "$(quote_command "${GH_BIN}" secret set "${secret_name}" --repo "${repo}")"
    return 0
  fi

  printf '%s' "${secret_value}" | "${GH_BIN}" secret set "${secret_name}" --repo "${repo}"
}

repo_has_secret() {
  local repo="$1"
  local secret_name="$2"

  if [[ "${dry_run}" == "true" ]]; then
    return 0
  fi

  "${GH_BIN}" secret list --repo "${repo}" --json name --jq '.[].name' | grep -Fx -- "${secret_name}" >/dev/null
}

delete_secret_if_present() {
  local repo="$1"
  local secret_name="$2"

  if repo_has_secret "${repo}" "${secret_name}"; then
    log "Deleting ${secret_name} from ${repo}"
    run_gh secret delete "${secret_name}" --repo "${repo}"
  else
    log "${secret_name} is already absent in ${repo}"
  fi
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    list|set|delete)
      [[ -z "${command_name}" ]] || die "command already provided: ${command_name}"
      command_name="$1"
      ;;
    --scope)
      [[ $# -ge 2 ]] || die "--scope requires a value"
      scope="$2"
      shift
      ;;
    --repo)
      [[ $# -ge 2 ]] || die "--repo requires a value"
      repo_arg="$2"
      shift
      ;;
    --config)
      [[ $# -ge 2 ]] || die "--config requires a path"
      config_path="$2"
      shift
      ;;
    --sync-token-env)
      [[ $# -ge 2 ]] || die "--sync-token-env requires a value"
      sync_token_env="$2"
      shift
      ;;
    --dispatch-token-env)
      [[ $# -ge 2 ]] || die "--dispatch-token-env requires a value"
      dispatch_token_env="$2"
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
      die "Unknown option or command: $1"
      ;;
  esac

  shift
done

[[ -n "${command_name}" ]] || die "missing command: expected one of list, set, delete"
case "${scope}" in
  all|monorepo|upstreams)
    ;;
  *)
    die "invalid scope: ${scope}"
    ;;
esac

require_binary "${GIT_BIN}"
require_binary "${GH_BIN}"

repo_root="$("${GIT_BIN}" rev-parse --show-toplevel 2>/dev/null)" || die "run this script inside a Git repository"
cd "${repo_root}"

[[ -f "${config_path}" ]] || die "subtree config not found: ${config_path}"
declare -a APP_SUBTREES=()
declare -a PACKAGE_SUBTREES=()
# shellcheck disable=SC1090
source "${config_path}"

monorepo_repo="$(resolve_monorepo_repo)"
declare -A upstream_repo_seen=()
declare -a upstream_repos=()

for spec in "${APP_SUBTREES[@]}"; do
  IFS='|' read -r prefix remote url branch <<<"${spec}"
  [[ -n "${prefix}" && -n "${remote}" && -n "${url}" && -n "${branch}" ]] || die "invalid subtree mapping: ${spec}"

  upstream_repo="$(parse_github_repo "${url}")" || die "unsupported GitHub subtree URL in config: ${url}"
  if [[ -z "${upstream_repo_seen[${upstream_repo}]:-}" ]]; then
    upstream_repo_seen["${upstream_repo}"]=1
    upstream_repos+=("${upstream_repo}")
  fi
done

if [[ "${scope}" != "monorepo" && "${#upstream_repos[@]}" -eq 0 ]]; then
  die "no upstream subtree repositories configured in ${config_path}"
fi

list_repo_secrets() {
  local repo="$1"
  printf 'Repository: %s\n' "${repo}"
  run_gh secret list --repo "${repo}"
  printf '\n'
}

if [[ "${command_name}" == "list" ]]; then
  if [[ "${scope}" == "all" || "${scope}" == "monorepo" ]]; then
    list_repo_secrets "${monorepo_repo}"
  fi

  if [[ "${scope}" == "all" || "${scope}" == "upstreams" ]]; then
    for repo in "${upstream_repos[@]}"; do
      list_repo_secrets "${repo}"
    done
  fi

  exit 0
fi

if [[ "${command_name}" == "set" ]]; then
  if [[ "${scope}" == "all" || "${scope}" == "monorepo" ]]; then
    log "Setting GH_SUBTREE_SYNC_TOKEN in ${monorepo_repo}"
    set_secret_from_env "${monorepo_repo}" "GH_SUBTREE_SYNC_TOKEN" "${sync_token_env}"
  fi

  if [[ "${scope}" == "all" || "${scope}" == "upstreams" ]]; then
    for repo in "${upstream_repos[@]}"; do
      log "Setting MONOREPO_SUBTREE_DISPATCH_TOKEN in ${repo}"
      set_secret_from_env "${repo}" "MONOREPO_SUBTREE_DISPATCH_TOKEN" "${dispatch_token_env}"
    done
  fi

  exit 0
fi

if [[ "${scope}" == "all" || "${scope}" == "monorepo" ]]; then
  delete_secret_if_present "${monorepo_repo}" "GH_SUBTREE_SYNC_TOKEN"
fi

if [[ "${scope}" == "all" || "${scope}" == "upstreams" ]]; then
  for repo in "${upstream_repos[@]}"; do
    delete_secret_if_present "${repo}" "MONOREPO_SUBTREE_DISPATCH_TOKEN"
  done
fi
