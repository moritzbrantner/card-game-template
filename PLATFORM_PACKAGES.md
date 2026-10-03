# PLATFORM_PACKAGES.md — shared packages on GitHub

Use separate repositories for long-lived shared packages. Do not publish them from this template repository.

## Recommended repository shape

- repository name: `platform-packages`
- package scope: `@YOUR_GITHUB_USERNAME/*`
- package manager: `bun`
- task runner: `turbo`
- versioning: `changesets`
- distribution: git source pins on a commit SHA (no registry auth)

The starter scaffold lives in `templates/platform-packages/`.

## Suggested initial packages

- `@YOUR_GITHUB_USERNAME/ui`
- `@YOUR_GITHUB_USERNAME/typescript-config`

Only add more packages when the API boundary is stable and reuse is real.

## Release model

- use `changesets` to manage release notes and version bumps
- consumers upgrade independently by moving their pinned commit SHA
- publishing to a registry is optional; consumers must never depend on it

## Shared packages setup

1. Keep each shared package in its own repository.
2. Copy the relevant parts of `templates/platform-packages/` into that repository root.
3. Replace `YOUR_GITHUB_USERNAME` placeholders in package names and workflow docs.
4. Give the package a `prepare` script that builds it from a clean clone, and commit its `bun.lock`:
   `"prepare": "bun install --frozen-lockfile --ignore-scripts && bun run build"`.

## Consumer repository setup

Consumers pin owner packages as git source dependencies on a full commit SHA. No registry token or `.npmrc` registry line is needed:

```json
{
  "dependencies": {
    "@YOUR_GITHUB_USERNAME/ui": "git+https://github.com/YOUR_GITHUB_USERNAME/ui.git#<full-40-char-sha>"
  },
  "trustedDependencies": ["@YOUR_GITHUB_USERNAME/ui"]
}
```

`trustedDependencies` lets bun run the package's `prepare` build. bun cannot install a git subdirectory, so a package that only lives under a monorepo subdirectory (`packages/*`) cannot be pinned this way; give it a standalone repository.

## Access model

- consumers fetch package sources over plain `git+https`, so package repositories must be readable without a token
- use pinned commits instead of copying code between repos

## Dependency update automation

- keep `.github/dependabot.yml` in each app repo
- allow Dependabot to open PRs for package updates and GitHub Actions updates
- validate every upgrade PR with typecheck, lint, build, and the app's smoke tests
