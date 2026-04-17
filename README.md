# Monorepo (Next.js + Expo + Electron) Template

This repository is a starter template for app portfolios that need web, mobile, and desktop entrypoints without treating the template itself as the long-lived shared platform.

## Create a repository from this template

Use the helper script:

```bash
python3 scripts/create_from_template.py my-app --with-main
```

If you already created and cloned the repository and it only has `main`, run the standalone setup script from the repository root to create `develop`, `nightly`, `beta`, `staging`, and optional `main` from shared history:

```bash
bash scripts/setup-promotion-branches.sh --with-main
```

Important details:

- `moritzbrantner/monorepo` must be marked as a GitHub template repository.
- This intentionally avoids `--include-all-branches` so `nightly`, `beta`, and `staging` are created from `develop` and keep shared history for promotion workflows.
- Generated repositories do not inherit secrets, branch protection, rulesets, or local Git remote definitions from this template.

Recommended first-run setup in the generated repository:

1. Run `python3 scripts/create_from_template.py my-app --with-main`.
2. Install dependencies with `bun install --frozen-lockfile`.
3. Configure environment files for the apps you plan to use.
4. Run `bun run setup:subtree-remotes`.
5. Verify `git remote -v` includes `app-web`, `app-mobile`, and `app-desktop`.
6. Add a repository secret named `GH_PROMOTION_TOKEN`.
7. Add a repository secret named `GH_SUBTREE_SYNC_TOKEN` if this repo should open subtree sync pull requests automatically.
8. Add a repository secret named `MONOREPO_SUBTREE_DISPATCH_TOKEN` in each upstream subtree repository if upstream pushes should notify this repo.
9. Configure branch protection or rulesets for `develop`, `nightly`, `beta`, `staging`, and `main` when used.

If the repository already exists before you run the template helper, use `bash scripts/setup-promotion-branches.sh --with-main` instead.

## Operating model

- Keep this repository thin and focused on scaffolding.
- Keep deployable apps in `apps/*`.
- Keep template-local reusable code in `packages/*`.
- Move real cross-repository shared code into a separate private packages repository.
- Let app repositories adopt shared package updates on their own release cadence.

See:

- `ARCHITECTURE.md` for the boundary rules
- `PLATFORM_PACKAGES.md` for the private GitHub Packages setup
- `templates/platform-packages/` for a starter scaffold of the separate packages repo

## What belongs here

- workspace layout and repo conventions
- baseline Next.js, Expo, and Electron setup
- lint, typecheck, test, build, and CI wiring
- app manifest examples
- scaffolding and workflow templates

## What does not belong here

- evolving business logic for multiple live products
- shared packages that need independent semantic versioning
- manual sync workflows across many generated repositories

## Best way to use Codex here

1. The generated repository already includes `AGENTS.md`.
2. Start Codex with a concrete task and include: **"follow the plan step by step"**.
3. Ask Codex to keep running autonomously until done unless a serious blocker occurs.
4. Require tests and relevant lint/type/build checks before completion.

## Environment setup for testing and benchmarking

1. Install Node.js 20 LTS and Bun.
2. Install workspace dependencies once from the repository root with `bun install --frozen-lockfile`.
3. Configure per-app environment files plus shared service variables.
4. Run testing by scope: unit, then integration, then cross-app e2e.
5. Build production artifacts before benchmarking to avoid dev-mode noise.
6. Benchmark each surface separately and keep device profiles fixed.
7. Use Turbo cache controls intentionally so reruns are explicit.

## Release branch automation

- Promotion flows through `develop -> nightly -> beta -> staging`.
- Add a repository secret named `GH_PROMOTION_TOKEN` with permission to directly push snapshot branch updates.
- The default `GITHUB_TOKEN` is not sufficient here because direct promotion pushes must trigger the next branch workflow in the chain.
- Generated repositories must recreate any branch protection or ruleset setup manually because GitHub does not copy those settings from templates.

## Companion docs for generated repos

- `PLANS.md`: ordered queue the agent executes without interruption.
- `INFRASTRUCTURE.md`: environments, services, secrets, deploy/rollback constraints.
- `AGENT_WORKFLOW.md`: explicit execution contract for autonomous agents.
- `ARCHITECTURE.md`: boundaries, key data flows, and invariants.
- `OPERATIONS.md`: deployment and rollback notes.
- `DECISIONS.md`: brief ADR-style log for major technical choices.

## App subtree mapping

- `apps/web` is imported from `https://github.com/moritzbrantner/next-template.git`
- `apps/mobile` is imported from `https://github.com/moritzbrantner/expo-template.git`
- `apps/desktop` is imported from `https://github.com/moritzbrantner/electron-template.git`

The app folders are tracked in this repository via Git subtree imports rather than submodules. Remote definitions are declared in `scripts/subtrees.config.sh`.

Run `bun run setup:subtree-remotes` to create or update the configured subtree remotes in your local Git repository. The command is idempotent.

Run `bun run setup:promotion-branches -- --with-main` if you want the repository-local wrapper for the promotion branch setup script.

Run `bun run sync:subtrees` to bootstrap remotes and pull the configured subtree updates.

GitHub can automate the subtree pull flow too:

- `moritzbrantner/next-template` dispatches `subtree_sync` for `apps/web`
- `moritzbrantner/expo-template` dispatches `subtree_sync` for `apps/mobile`
- `moritzbrantner/electron-template` dispatches `subtree_sync` for `apps/desktop`
- `.github/workflows/subtree-sync.yml` checks out `develop`, syncs only the requested prefix, and opens or updates a pull request back into `develop`

Required secrets for that automation:

- `GH_SUBTREE_SYNC_TOKEN` in the monorepo with `Contents: write` and `Pull requests: write`
- `MONOREPO_SUBTREE_DISPATCH_TOKEN` in each upstream subtree repository with permission to call `POST /repos/moritzbrantner/monorepo/dispatches`

You can manage those secrets from the terminal with `gh`:

```bash
export GH_SUBTREE_SYNC_TOKEN_VALUE=ghp_your_monorepo_token
export MONOREPO_SUBTREE_DISPATCH_TOKEN_VALUE=ghp_your_upstream_dispatch_token
bun run manage:subtree-secrets set
bun run manage:subtree-secrets list
bun run manage:subtree-secrets delete -- --scope upstreams
```

The helper reads the monorepo slug from `origin`, discovers upstream repos from `scripts/subtrees.config.sh`, and wraps `gh secret list|set|delete`.

Package subtree mappings are intentionally empty by default because this template recommends publishing long-lived shared packages from a separate packages repository instead of mirroring them into `packages/*`. If you do track package folders through subtrees, add them to `PACKAGE_SUBTREES` in `scripts/subtrees.config.sh`.
