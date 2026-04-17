#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import re
import shutil
import subprocess
import sys
from pathlib import Path


class CommandError(RuntimeError):
    def __init__(
        self,
        args: list[str],
        returncode: int,
        stdout: str = "",
        stderr: str = "",
    ) -> None:
        self.args_run = args
        self.returncode = returncode
        self.stdout = stdout
        self.stderr = stderr
        joined = " ".join(args)
        super().__init__(f"command failed ({returncode}): {joined}")


def run(
    args: list[str],
    *,
    cwd: Path | None = None,
    capture: bool = False,
    check: bool = True,
) -> subprocess.CompletedProcess[str]:
    result = subprocess.run(
        args,
        cwd=str(cwd) if cwd else None,
        text=True,
        capture_output=capture,
        check=False,
    )
    if check and result.returncode != 0:
        raise CommandError(args, result.returncode, result.stdout, result.stderr)
    return result


def require_binary(name: str) -> None:
    if shutil.which(name) is None:
        print(f"Error: required executable not found: {name}", file=sys.stderr)
        sys.exit(1)


def gh_json(args: list[str]) -> dict:
    result = run(["gh", *args], capture=True)
    try:
        return json.loads(result.stdout)
    except json.JSONDecodeError as exc:
        print("Error: failed to parse JSON from gh output.", file=sys.stderr)
        print(result.stdout, file=sys.stderr)
        raise SystemExit(1) from exc


def repo_exists_locally(path: Path) -> bool:
    return path.exists()


def resolve_full_repo(repo_arg: str) -> tuple[str, str]:
    """
    Returns (full_repo, repo_name).
    repo_arg may be 'name' or 'owner/name'.
    """
    if "/" in repo_arg:
        owner, repo_name = repo_arg.split("/", 1)
        if not owner or not repo_name:
            print("Error: repository must be '<name>' or '<owner>/<name>'.", file=sys.stderr)
            sys.exit(1)
        return repo_arg, repo_name

    me = gh_json(["api", "user"])
    owner = me["login"]
    return f"{owner}/{repo_arg}", repo_arg


def parse_github_remote(url: str) -> tuple[str, str] | None:
    patterns = (
        r"^https://github\.com/(?P<owner>[^/]+)/(?P<repo>[^/]+?)(?:\.git)?$",
        r"^git@github\.com:(?P<owner>[^/]+)/(?P<repo>[^/]+?)(?:\.git)?$",
        r"^ssh://git@github\.com/(?P<owner>[^/]+)/(?P<repo>[^/]+?)(?:\.git)?$",
    )

    for pattern in patterns:
        match = re.match(pattern, url)
        if match:
            return match.group("owner"), match.group("repo")

    return None


def current_repo_root(start: Path) -> Path | None:
    result = run(["git", "rev-parse", "--show-toplevel"], cwd=start, capture=True, check=False)
    if result.returncode != 0:
        return None
    return Path(result.stdout.strip()).resolve()


def resolve_clone_locations(repo_name: str, explicit_dir: str | None) -> tuple[Path, Path]:
    target_dir = Path(explicit_dir).expanduser().resolve() if explicit_dir else (Path.cwd() / repo_name).resolve()
    clone_parent = target_dir.parent if explicit_dir else Path.cwd().resolve()
    cloned_dir = (clone_parent / repo_name).resolve()
    return target_dir, cloned_dir


def ensure_repo_created(
    full_repo: str,
    template_repo: str,
    visibility: str,
    clone: bool,
    cwd: Path | None = None,
) -> None:
    cmd = [
        "gh",
        "repo",
        "create",
        full_repo,
        f"--{visibility}",
        "--template",
        template_repo,
    ]
    if clone:
        cmd.append("--clone")

    run(cmd, cwd=cwd)


def remote_origin_url(repo_dir: Path) -> str:
    result = run(["git", "remote", "get-url", "origin"], cwd=repo_dir, capture=True)
    return result.stdout.strip()


def ensure_local_repo_dir(repo_dir: Path) -> Path:
    if not repo_dir.exists():
        print(
            f"Error: expected cloned repository directory does not exist: {repo_dir}",
            file=sys.stderr,
        )
        sys.exit(1)
    return repo_dir.resolve()


def maybe_move_clone(cloned_dir: Path, target_dir: Path) -> Path:
    if cloned_dir == target_dir:
        return ensure_local_repo_dir(cloned_dir)

    if target_dir.exists():
        print(f"Error: target directory already exists: {target_dir}", file=sys.stderr)
        sys.exit(1)

    shutil.move(str(cloned_dir), str(target_dir))
    return ensure_local_repo_dir(target_dir)


def run_branch_setup_script(repo_dir: Path, full_repo: str, args: argparse.Namespace) -> None:
    script_path = repo_dir / "scripts" / "setup-promotion-branches.sh"
    if not script_path.exists():
        script_path = Path(__file__).resolve().with_name("setup-promotion-branches.sh")

    if not script_path.exists():
        print(f"Error: branch setup script not found: {script_path}", file=sys.stderr)
        sys.exit(1)

    cmd = [
        "bash",
        str(script_path),
        "--repo",
        full_repo,
        "--develop-branch",
        args.develop_branch,
    ]

    default_extra_branches = ["nightly", "beta", "staging"]
    if args.extra_branches != default_extra_branches:
        if args.extra_branches:
            cmd.extend(["--extra-branches", *args.extra_branches])
        else:
            cmd.append("--no-extra-branches")

    if args.with_main:
        cmd.append("--with-main")

    if args.keep_old_default_branch:
        cmd.append("--keep-old-default-branch")

    run(cmd, cwd=repo_dir)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Create a GitHub repository from a template or prepare an existing "
            "clone by creating promotion branches from develop so they share history."
        )
    )
    parser.add_argument(
        "repo",
        nargs="?",
        help="Target repository name or owner/name",
    )
    parser.add_argument(
        "--template",
        default="moritzbrantner/monorepo",
        help="Template repository (default: moritzbrantner/monorepo)",
    )
    parser.add_argument(
        "--visibility",
        choices=["private", "public", "internal"],
        default="private",
        help="Repository visibility (default: private)",
    )
    parser.add_argument(
        "--develop-branch",
        default="develop",
        help="Name of the main working branch to normalize to (default: develop)",
    )
    parser.add_argument(
        "--extra-branches",
        nargs="*",
        default=["nightly", "beta", "staging"],
        help="Branches to create from develop (default: nightly beta staging)",
    )
    parser.add_argument(
        "--with-main",
        action="store_true",
        help="Also create main from develop",
    )
    parser.add_argument(
        "--directory",
        help="Expected local clone directory. Defaults to ./<repo-name>",
    )
    parser.add_argument(
        "--keep-old-default-branch",
        action="store_true",
        help="Do not delete the original remote default branch after renaming to develop",
    )
    return parser.parse_args()


def resolve_existing_repo(args: argparse.Namespace) -> tuple[Path | None, str | None, str | None]:
    if args.directory:
        directory = Path(args.directory).expanduser().resolve()
        repo_root = current_repo_root(directory)
        if repo_root is not None:
            remote = parse_github_remote(remote_origin_url(repo_root))
            if remote is None:
                print("Error: origin remote is not a supported GitHub URL.", file=sys.stderr)
                sys.exit(1)
            owner, repo_name = remote
            return repo_root, f"{owner}/{repo_name}", repo_name
        return None, None, None

    repo_root = current_repo_root(Path.cwd())
    if repo_root is None:
        return None, None, None

    remote = parse_github_remote(remote_origin_url(repo_root))
    if remote is None:
        print("Error: origin remote is not a supported GitHub URL.", file=sys.stderr)
        sys.exit(1)
    owner, repo_name = remote
    return repo_root, f"{owner}/{repo_name}", repo_name


def main() -> int:
    try:
        args = parse_args()

        require_binary("bash")
        require_binary("gh")
        require_binary("git")

        repo_dir, full_repo, repo_name = resolve_existing_repo(args)

        if repo_dir is None:
            if not args.repo:
                print(
                    "Error: repository argument is required when not running inside an existing Git repository.",
                    file=sys.stderr,
                )
                return 1

            full_repo, repo_name = resolve_full_repo(args.repo)
            target_dir, cloned_dir = resolve_clone_locations(repo_name, args.directory)

            if repo_exists_locally(target_dir):
                print(
                    f"Error: target directory already exists: {target_dir}",
                    file=sys.stderr,
                )
                return 1

            if cloned_dir.exists():
                print(
                    f"Error: clone destination already exists: {cloned_dir}",
                    file=sys.stderr,
                )
                return 1

            cloned_dir.parent.mkdir(parents=True, exist_ok=True)

            ensure_repo_created(
                full_repo=full_repo,
                template_repo=args.template,
                visibility=args.visibility,
                clone=True,
                cwd=cloned_dir.parent,
            )

            repo_dir = maybe_move_clone(cloned_dir, target_dir)
        elif args.repo:
            provided_full_repo, provided_repo_name = resolve_full_repo(args.repo)
            if provided_full_repo != full_repo:
                print(
                    f"Error: provided repository {provided_full_repo} does not match origin remote {full_repo}.",
                    file=sys.stderr,
                )
                return 1
            repo_name = provided_repo_name

        run_branch_setup_script(repo_dir, full_repo, args)
        return 0
    except CommandError as exc:
        print(f"Error: {exc}", file=sys.stderr)
        if exc.stdout.strip():
            print(exc.stdout.strip(), file=sys.stderr)
        if exc.stderr.strip():
            print(exc.stderr.strip(), file=sys.stderr)
        return exc.returncode or 1
    except KeyboardInterrupt:
        print("Error: interrupted.", file=sys.stderr)
        return 130


if __name__ == "__main__":
    raise SystemExit(main())
