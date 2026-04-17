#!/usr/bin/env bash
set -euo pipefail

GIT_BIN="${GIT_BIN:-git}"
GH_BIN="${GH_BIN:-gh}"

develop_branch="develop"
declare -a extra_branches=("nightly" "beta" "staging")
extra_branches_explicit=false
with_main=false
keep_old_default_branch=false
dry_run=false
repo_arg=""

usage() {
  cat <<'EOF'
Usage: scripts/setup-promotion-branches.sh [options]

Rename the repository's default branch to develop and create promotion branches
from it so they share history.

Options:
  --repo <owner/name>            GitHub repository slug. Defaults to origin remote.
  --develop-branch <name>        Branch to normalize the repo onto. Default: develop.
  --extra-branch <name>          Additional branch to create from develop. May repeat.
  --extra-branches <names...>    Replace the default extra branches with the provided list.
  --no-extra-branches            Do not create nightly/beta/staging branches.
  --with-main                    Also create main from develop after renaming.
  --keep-old-default-branch      Do not delete the original remote default branch.
  --dry-run                      Print mutating commands without executing them.
  --help                         Show this help text.

Defaults:
  develop branch: develop
  extra branches: nightly beta staging
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

run_or_print() {
  if [[ "${dry_run}" == "true" ]]; then
    printf '[dry-run] %s\n' "$(quote_command "$@")"
    return 0
  fi

  "$@"
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

resolve_full_repo() {
  if [[ -n "${repo_arg}" ]]; then
    printf '%s\n' "${repo_arg}"
    return 0
  fi

  local origin_url
  origin_url="$("${GIT_BIN}" remote get-url origin 2>/dev/null || true)"
  [[ -n "${origin_url}" ]] || die "origin remote is not configured; pass --repo <owner/name>"

  parse_github_repo "${origin_url}" || die "origin remote is not a supported GitHub URL; pass --repo <owner/name>"
}

get_default_branch() {
  "${GH_BIN}" repo view "$1" --json defaultBranchRef --jq '.defaultBranchRef.name'
}

git_local_branch_exists() {
  "${GIT_BIN}" show-ref --verify --quiet "refs/heads/$1"
}

git_branch_exists_remote() {
  [[ -n "$("${GIT_BIN}" ls-remote --heads origin "$1")" ]]
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --repo)
      [[ $# -ge 2 ]] || die "--repo requires a value"
      repo_arg="$2"
      shift
      ;;
    --develop-branch)
      [[ $# -ge 2 ]] || die "--develop-branch requires a value"
      develop_branch="$2"
      shift
      ;;
    --extra-branch)
      [[ $# -ge 2 ]] || die "--extra-branch requires a value"
      if [[ "${extra_branches_explicit}" != "true" ]]; then
        extra_branches=()
        extra_branches_explicit=true
      fi
      extra_branches+=("$2")
      shift
      ;;
    --extra-branches)
      shift
      [[ $# -gt 0 && "$1" != --* ]] || die "--extra-branches requires at least one branch name"
      if [[ "${extra_branches_explicit}" != "true" ]]; then
        extra_branches=()
        extra_branches_explicit=true
      fi
      while [[ $# -gt 0 && "$1" != --* ]]; do
        extra_branches+=("$1")
        shift
      done
      continue
      ;;
    --no-extra-branches)
      extra_branches=()
      extra_branches_explicit=true
      ;;
    --with-main)
      with_main=true
      ;;
    --keep-old-default-branch)
      keep_old_default_branch=true
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

require_binary "${GIT_BIN}"
require_binary "${GH_BIN}"

repo_root="$("${GIT_BIN}" rev-parse --show-toplevel 2>/dev/null)" || die "run this script inside a Git repository"
cd "${repo_root}"

full_repo="$(resolve_full_repo)"
original_default="$(get_default_branch "${full_repo}")"
current_local_branch="$("${GIT_BIN}" branch --show-current)"

if [[ "${original_default}" != "${develop_branch}" ]]; then
  if [[ -n "${current_local_branch}" && "${current_local_branch}" == "${original_default}" ]]; then
    log "Renaming local branch ${current_local_branch} -> ${develop_branch}"
    run_or_print "${GIT_BIN}" branch -m "${current_local_branch}" "${develop_branch}"
  elif git_local_branch_exists "${original_default}"; then
    log "Renaming local branch ${original_default} -> ${develop_branch}"
    run_or_print "${GIT_BIN}" branch -m "${original_default}" "${develop_branch}"
  fi
elif git_local_branch_exists "${develop_branch}"; then
  log "Local branch ${develop_branch} already exists"
fi

if git_branch_exists_remote "${develop_branch}"; then
  log "Remote branch ${develop_branch} already exists on origin"
else
  log "Pushing ${develop_branch} to origin"
  run_or_print "${GIT_BIN}" push -u origin "${develop_branch}"
fi

if [[ "${original_default}" == "${develop_branch}" ]]; then
  log "GitHub default branch already set to ${develop_branch}"
else
  log "Setting ${develop_branch} as the GitHub default branch for ${full_repo}"
  run_or_print "${GH_BIN}" repo edit "${full_repo}" --default-branch "${develop_branch}"
fi

if [[ "${keep_old_default_branch}" != "true" && "${original_default}" != "${develop_branch}" ]] && git_branch_exists_remote "${original_default}"; then
  log "Deleting remote branch ${original_default}"
  run_or_print "${GIT_BIN}" push origin --delete "${original_default}"
fi

declare -A seen_branches=()
declare -a branches_to_create=()

for branch in "${extra_branches[@]}"; do
  [[ -n "${branch}" ]] || continue
  [[ "${branch}" == "${develop_branch}" ]] && continue
  [[ -n "${seen_branches[${branch}]:-}" ]] && continue
  seen_branches["${branch}"]=1
  branches_to_create+=("${branch}")
done

if [[ "${with_main}" == "true" && "${develop_branch}" != "main" && -z "${seen_branches[main]:-}" ]]; then
  branches_to_create+=("main")
fi

for branch in "${branches_to_create[@]}"; do
  local_exists=false
  remote_exists=false

  if git_local_branch_exists "${branch}"; then
    local_exists=true
  fi

  if git_branch_exists_remote "${branch}"; then
    remote_exists=true
  fi

  if [[ "${local_exists}" == "true" && "${remote_exists}" == "true" ]]; then
    log "Branch ${branch} already exists locally and on origin"
    continue
  fi

  if [[ "${local_exists}" != "true" ]]; then
    log "Creating ${branch} from ${develop_branch}"
    run_or_print "${GIT_BIN}" branch -f "${branch}" "${develop_branch}"
  else
    log "Local branch ${branch} already exists"
  fi

  if [[ "${remote_exists}" != "true" ]]; then
    log "Pushing ${branch} to origin"
    run_or_print "${GIT_BIN}" push -u origin "${branch}"
  else
    log "Remote branch ${branch} already exists on origin"
  fi
done

log "Configured promotion branches for ${full_repo}:"
log "  - ${develop_branch}"
for branch in "${branches_to_create[@]}"; do
  log "  - ${branch}"
done
