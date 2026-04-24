# PLATFORM_PACKAGES.md — private shared packages on GitHub

Use a separate private repository for long-lived shared packages. Do not publish them from this template repository.

## Recommended repository shape

- repository name: `platform-packages`
- package scope: `@YOUR_GITHUB_USERNAME/*`
- package manager: `bun`
- task runner: `turbo`
- versioning: `changesets`
- registry: GitHub Packages npm registry

The starter scaffold lives in `templates/platform-packages/`.

## Suggested initial packages

- `@YOUR_GITHUB_USERNAME/ui`
- `@YOUR_GITHUB_USERNAME/typescript-config`

Only add more packages when the API boundary is stable and reuse is real.

## Publishing model

- keep the repository private
- publish package versions from GitHub Actions on `main`
- use `changesets` to manage release notes and version bumps
- use package semver to let app repos upgrade independently

## Private GitHub Packages setup

1. Create a private repository for shared packages.
2. Copy `templates/platform-packages/` into that repository root.
3. Replace `YOUR_GITHUB_USERNAME` placeholders in package names, `.npmrc`, and workflow docs.
4. Push to GitHub and enable Actions.
5. Publish with the workflow in `.github/workflows/publish-packages.yml`.

## Consumer repository setup

Each app repository should include:

```ini
@YOUR_GITHUB_USERNAME:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GH_PACKAGES_TOKEN}
```

Use a private token locally and a repository secret in CI.

## Access model

- keep both the packages repo and consumer app repos private
- grant package access only to repositories that should install the packages
- use versioned package releases instead of copying code between repos

## Dependency update automation

- keep `.github/dependabot.yml` in each app repo
- allow Dependabot to open PRs for package updates and GitHub Actions updates
- validate every upgrade PR with typecheck, lint, build, and the app's smoke tests
