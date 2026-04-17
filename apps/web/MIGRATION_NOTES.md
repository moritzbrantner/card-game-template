# MIGRATION_NOTES.md

## Canonical namespace migration

The repository now treats `src/` as the only canonical application namespace.

## Removed deprecated roots

- `features/`
- `stores/`
- `lib/services/`
- demo-only auth/profile adapters that depended on hardcoded users

## Result

- Runtime code, tests, and docs now reference canonical `src/` modules only.
- Example capabilities remain available, but under explicit `/examples/*` routes instead of mixed into the primary product surface.
