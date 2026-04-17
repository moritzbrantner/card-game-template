import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const workflowSources = {
  develop: readFileSync(
    new URL("../../.github/workflows/develop.yml", import.meta.url),
    "utf8",
  ),
  nightly: readFileSync(
    new URL("../../.github/workflows/nightly.yml", import.meta.url),
    "utf8",
  ),
  beta: readFileSync(
    new URL("../../.github/workflows/beta.yml", import.meta.url),
    "utf8",
  ),
  staging: readFileSync(
    new URL("../../.github/workflows/staging.yml", import.meta.url),
    "utf8",
  ),
  snapshotStage: readFileSync(
    new URL("../../.github/workflows/snapshot-stage.yml", import.meta.url),
    "utf8",
  ),
};

const readmeSource = readFileSync(
  new URL("../../README.md", import.meta.url),
  "utf8",
);

test("branch workflows delegate to the reusable direct-promotion pipeline", () => {
  assert.match(
    workflowSources.develop,
    /uses:\s+\.\/\.github\/workflows\/snapshot-stage\.yml/,
  );
  assert.match(
    workflowSources.nightly,
    /uses:\s+\.\/\.github\/workflows\/snapshot-stage\.yml/,
  );
  assert.match(
    workflowSources.beta,
    /uses:\s+\.\/\.github\/workflows\/snapshot-stage\.yml/,
  );
  assert.match(
    workflowSources.staging,
    /uses:\s+\.\/\.github\/workflows\/snapshot-stage\.yml/,
  );

  assert.match(workflowSources.develop, /promote_to:\s+nightly/);
  assert.match(workflowSources.nightly, /promote_to:\s+beta/);
  assert.match(workflowSources.beta, /promote_to:\s+staging/);
  assert.match(workflowSources.staging, /promote:\s+false/);
});

test("direct promotion removes temporary promotion branches and pull request automation", () => {
  for (const source of Object.values(workflowSources)) {
    assert.doesNotMatch(source, /auto-promote\//);
    assert.doesNotMatch(source, /create-pull-request@v\d+/);
    assert.doesNotMatch(source, /enable-pull-request-automerge@v\d+/);
    assert.doesNotMatch(source, /auto-promotion/);
  }
});

test("reusable workflow requires the promotion token and pushes the tested commit directly", () => {
  assert.match(workflowSources.snapshotStage, /GH_PROMOTION_TOKEN:/);
  assert.match(
    workflowSources.snapshotStage,
    /PROMOTION_TOKEN:\s+\$\{\{\s*secrets\.GH_PROMOTION_TOKEN\s*\}\}/,
  );
  assert.match(
    workflowSources.snapshotStage,
    /token:\s+\$\{\{\s*secrets\.GH_PROMOTION_TOKEN\s*\}\}/,
  );
  assert.match(workflowSources.snapshotStage, /git push/);
  assert.match(workflowSources.snapshotStage, /--force-with-lease=/);
  assert.match(
    workflowSources.snapshotStage,
    /"\$\{TESTED_SHA\}:refs\/heads\/\$\{TARGET_BRANCH\}"/,
  );
});

test("reusable workflow guards snapshot branches from drift before promotion", () => {
  assert.match(workflowSources.snapshotStage, /git merge-base --is-ancestor/);
  assert.match(
    workflowSources.snapshotStage,
    /Snapshot branches must not drift\./,
  );
});

test("README documents the automation token required for release branch promotion", () => {
  assert.match(readmeSource, /GH_PROMOTION_TOKEN/);
  assert.match(readmeSource, /develop -> nightly -> beta -> staging/);
  assert.match(readmeSource, /directly push snapshot branch updates/i);
  assert.doesNotMatch(readmeSource, /create and merge pull requests/);
});
