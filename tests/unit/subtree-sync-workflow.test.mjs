import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const workflowSource = readFileSync(
  new URL("../../.github/workflows/subtree-sync.yml", import.meta.url),
  "utf8",
);
const readmeSource = readFileSync(new URL("../../README.md", import.meta.url), "utf8");
const infrastructureSource = readFileSync(
  new URL("../../INFRASTRUCTURE.md", import.meta.url),
  "utf8",
);

test("subtree sync workflow supports repository dispatch and manual prefix selection", () => {
  assert.match(workflowSource, /repository_dispatch:/);
  assert.match(workflowSource, /types:\s+\[subtree_sync\]/);
  assert.match(workflowSource, /workflow_dispatch:/);
  assert.match(workflowSource, /type:\s+choice/);
  assert.match(workflowSource, /-\s+apps\/web/);
  assert.match(workflowSource, /-\s+apps\/mobile/);
  assert.match(workflowSource, /-\s+apps\/desktop/);
});

test("subtree sync workflow uses the dedicated subtree sync token for checkout and PR automation", () => {
  assert.match(workflowSource, /GH_SUBTREE_SYNC_TOKEN/);
  assert.match(
    workflowSource,
    /token:\s+\$\{\{\s*secrets\.GH_SUBTREE_SYNC_TOKEN\s*\}\}/,
  );
  assert.match(workflowSource, /gh pr create/);
  assert.match(workflowSource, /gh pr edit/);
});

test("subtree sync workflow validates payload mappings and syncs only one prefix", () => {
  assert.match(workflowSource, /Prefix \$\{prefix\} does not match source_repo/);
  assert.match(workflowSource, /Expected source_branch=main/);
  assert.match(workflowSource, /source_sha must be a 40-character lowercase Git SHA/);
  assert.match(workflowSource, /bash scripts\/sync-subtrees\.sh --apps --prefix "\$\{PREFIX\}"/);
  assert.match(workflowSource, /auto\/subtree-sync\/apps-web/);
  assert.match(workflowSource, /auto\/subtree-sync\/apps-mobile/);
  assert.match(workflowSource, /auto\/subtree-sync\/apps-desktop/);
});

test("subtree sync workflow skips PR creation when the head would match develop or no commits exist", () => {
  assert.match(workflowSource, /SYNC_BRANCH\}" == "develop"/);
  assert.match(workflowSource, /git fetch origin develop "\$\{SYNC_BRANCH\}"/);
  assert.match(workflowSource, /git rev-list --count "origin\/develop\.\.origin\/\$\{SYNC_BRANCH\}"/);
  assert.match(workflowSource, /Skipping subtree sync PR because there are no commits between develop and/);
});

test("README and infrastructure docs record the subtree sync automation secrets", () => {
  assert.match(readmeSource, /GH_SUBTREE_SYNC_TOKEN/);
  assert.match(readmeSource, /MONOREPO_SUBTREE_DISPATCH_TOKEN/);
  assert.match(readmeSource, /opens or updates a pull request back into `develop`/);

  assert.match(infrastructureSource, /GH_SUBTREE_SYNC_TOKEN/);
  assert.match(infrastructureSource, /MONOREPO_SUBTREE_DISPATCH_TOKEN/);
  assert.match(infrastructureSource, /Do not print any of these tokens in workflow logs/);
});
