import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  type ProductProfile,
  Workflow,
  WorkflowError,
} from "../src/workflow.ts";

const atlasProfile: ProductProfile = { feedbackIntake: "intercom" };

function withDataDirectory(run: (dataDirectory: string) => void): void {
  const dataDirectory = mkdtempSync(join(tmpdir(), "feedback-workflow-"));
  try {
    run(dataDirectory);
  } finally {
    rmSync(dataDirectory, { recursive: true, force: true });
  }
}

test("persists duplicate prevention and owner isolation across workflow instances", () => {
  withDataDirectory((dataDirectory) => {
    const first = new Workflow(dataDirectory);
    first.registerProduct(
      { id: "atlas", name: "Atlas", profile: atlasProfile },
      "owner-atlas"
    );
    first.registerProduct(
      { id: "borealis", name: "Borealis", profile: atlasProfile },
      "owner-borealis"
    );

    const second = new Workflow(dataDirectory);
    assert.throws(
      () =>
        second.registerProduct(
          { id: "atlas", name: "Atlas again", profile: atlasProfile },
          "owner-atlas"
        ),
      (error: unknown) => error instanceof WorkflowError && error.status === 409
    );
    assert.throws(
      () => second.inspectProduct("atlas", "owner-borealis"),
      (error: unknown) => error instanceof WorkflowError && error.status === 403
    );

    assert.equal(
      second.inspectProduct("borealis", "owner-borealis").feedback.length,
      0
    );
  });
});
