# Platform Layout

This repository is a platform repo with one deployable Next.js app at the root, one current app pack in `apps/showcase`, and internal shared libraries in `packages/*`.

## Layers

- `app/` owns the runtime entrypoints.
- `src/` owns foundation, domain, and infrastructure code.
- `apps/*` own app-pack manifests, content, messages, and pack-specific tests.
- `packages/*` own reusable libraries with package-level public APIs.

## Stable seams

- App packs extend the platform through `AppManifest`.
- Workspace packages expose stable entrypoints only from `package.json#exports`.
- Foundation code must not import app packs directly except via manifest loading.
