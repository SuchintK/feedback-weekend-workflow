import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { loadEnvironment } from "../src/environment.ts";

test("loads an .env file without overriding supplied environment variables", () => {
  const directory = mkdtempSync(join(tmpdir(), "feedback-workflow-env-"));
  const path = join(directory, ".env");
  const fileOnlyVariable = "WORKFLOW_TEST_FILE_ONLY";
  const suppliedVariable = "WORKFLOW_TEST_SUPPLIED";
  writeFileSync(
    path,
    `${fileOnlyVariable}=from-file\n${suppliedVariable}=from-file\n`
  );
  delete process.env[fileOnlyVariable];
  process.env[suppliedVariable] = "from-process";

  try {
    loadEnvironment(path);

    assert.equal(process.env[fileOnlyVariable], "from-file");
    assert.equal(process.env[suppliedVariable], "from-process");
  } finally {
    delete process.env[fileOnlyVariable];
    delete process.env[suppliedVariable];
    rmSync(directory, { recursive: true, force: true });
  }
});
