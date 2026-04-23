# Benchmarks

This repository currently uses a build-gate benchmark.

## Build baseline

Run:

```bash
bun run benchmark
```

The command runs `bun run build`, measures wall-clock duration, and writes `benchmark-results/build-baseline.json`.

The baseline is informational for now. It fails only when the production build fails; no duration threshold is enforced yet.
