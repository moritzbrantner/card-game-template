import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const workflowSources = {
  develop: readFileSync(
    new URL('../../.github/workflows/develop.yml', import.meta.url),
    'utf8',
  ),
  nightly: readFileSync(
    new URL('../../.github/workflows/nightly.yml', import.meta.url),
    'utf8',
  ),
  beta: readFileSync(
    new URL('../../.github/workflows/beta.yml', import.meta.url),
    'utf8',
  ),
  staging: readFileSync(
    new URL('../../.github/workflows/staging.yml', import.meta.url),
    'utf8',
  ),
  snapshotStage: readFileSync(
    new URL('../../.github/workflows/snapshot-stage.yml', import.meta.url),
    'utf8',
  ),
};

const readmeSource = readFileSync(
  new URL('../../README.md', import.meta.url),
  'utf8',
);

test('branch workflows delegate to the reusable direct-promotion pipeline', () => {
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

test('direct promotion removes temporary promotion branches and pull request automation', () => {
  for (const source of Object.values(workflowSources)) {
    assert.doesNotMatch(source, /auto-promote\//);
    assert.doesNotMatch(source, /create-pull-request@v\d+/);
    assert.doesNotMatch(source, /enable-pull-request-automerge@v\d+/);
    assert.doesNotMatch(source, /auto-promotion/);
  }
});

test('reusable workflow promotes with GITHUB_TOKEN and dispatches the next stage', () => {
  assert.doesNotMatch(workflowSources.snapshotStage, /GH_PROMOTION_TOKEN/);
  assert.doesNotMatch(workflowSources.snapshotStage, /secrets\./);
  assert.match(
    workflowSources.snapshotStage,
    /permissions:\s+contents:\s+write\s+actions:\s+write/,
  );
  assert.match(workflowSources.snapshotStage, /git push/);
  assert.match(workflowSources.snapshotStage, /--force-with-lease=/);
  assert.match(
    workflowSources.snapshotStage,
    /"\$\{TESTED_SHA\}:refs\/heads\/\$\{TARGET_BRANCH\}"/,
  );
  assert.match(
    workflowSources.snapshotStage,
    /GH_TOKEN:\s+\$\{\{\s*github\.token\s*\}\}/,
  );
  assert.match(
    workflowSources.snapshotStage,
    /gh workflow run "\$\{workflow\}"[^\n]*--ref "\$\{TARGET_BRANCH\}"/,
  );

  assert.match(workflowSources.develop, /promote_workflows:\s+nightly\.yml/);
  assert.match(workflowSources.nightly, /promote_workflows:\s+beta\.yml/);
  assert.match(workflowSources.beta, /promote_workflows:\s+staging\.yml/);
  for (const stage of ['develop', 'nightly', 'beta', 'staging']) {
    assert.doesNotMatch(workflowSources[stage], /secrets:/);
    assert.match(
      workflowSources[stage],
      /permissions:\s+contents:\s+write\s+actions:\s+write/,
    );
  }
  for (const stage of ['nightly', 'beta', 'staging']) {
    assert.match(workflowSources[stage], /workflow_dispatch:/);
  }
});

test('reusable workflow guards snapshot branches from drift before promotion', () => {
  assert.match(workflowSources.snapshotStage, /git merge-base --is-ancestor/);
  assert.match(
    workflowSources.snapshotStage,
    /Snapshot branches must not drift\./,
  );
});

test('README documents token-free release branch promotion', () => {
  assert.doesNotMatch(readmeSource, /GH_PROMOTION_TOKEN/);
  assert.match(readmeSource, /GITHUB_TOKEN/);
  assert.match(readmeSource, /develop -> nightly -> beta -> staging/);
  assert.match(readmeSource, /directly push snapshot branch updates/i);
  assert.doesNotMatch(readmeSource, /create and merge pull requests/);
});
