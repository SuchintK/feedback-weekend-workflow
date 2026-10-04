import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

const projectRoot = new URL("..", import.meta.url).pathname;

function run(dataDirectory: string, request: unknown): unknown {
  const result = spawnSync(
    process.execPath,
    ["src/cli.ts", "--data-dir", dataDirectory],
    {
      cwd: projectRoot,
      encoding: "utf8",
      input: JSON.stringify(request),
    },
  );

  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout);
}

test("registers a product, stores traceable feedback, and retrieves it after restart", () => {
  const dataDirectory = mkdtempSync(join(tmpdir(), "feedback-workflow-"));
  try {
    const registration = run(dataDirectory, {
      action: "register-product",
      product: { id: "atlas", name: "Atlas" },
    });
    assert.deepEqual(registration, {
      product: { id: "atlas", name: "Atlas", configuration: {} },
    });

    const expectedFeedback = {
      id: "atlas-1",
      productId: "atlas",
      customerId: "customer-42",
      text: "Please let me export a CSV.",
      source: "intercom://conversation/987",
      receivedAt: "2026-10-04T10:00:00.000Z",
    };
    const submission = run(dataDirectory, {
      action: "submit-feedback",
      feedback: {
        productId: "atlas",
        customerId: "customer-42",
        text: "Please let me export a CSV.",
        source: "intercom://conversation/987",
        receivedAt: "2026-10-04T10:00:00.000Z",
      },
    });
    assert.deepEqual(submission, {
      feedback: expectedFeedback,
    });

    assert.deepEqual(run(dataDirectory, { action: "list-feedback", productId: "atlas" }), {
      feedback: [expectedFeedback],
    });
  } finally {
    rmSync(dataDirectory, { recursive: true, force: true });
  }
});

test("reports incomplete build configuration and keeps feedback isolated by product", () => {
  const dataDirectory = mkdtempSync(join(tmpdir(), "feedback-workflow-"));
  try {
    run(dataDirectory, {
      action: "register-product",
      product: {
        id: "atlas",
        name: "Atlas",
        configuration: { goals: ["Increase exports"] },
      },
    });
    run(dataDirectory, {
      action: "register-product",
      product: { id: "beacon", name: "Beacon" },
    });
    run(dataDirectory, {
      action: "submit-feedback",
      feedback: {
        productId: "beacon",
        customerId: "customer-7",
        text: "Add a dark theme.",
        source: "email://thread/7",
        receivedAt: "2026-10-04T11:00:00.000Z",
      },
    });

    assert.deepEqual(run(dataDirectory, { action: "list-feedback", productId: "atlas" }), {
      feedback: [],
    });
    assert.deepEqual(run(dataDirectory, { action: "validate-build-configuration", productId: "atlas" }), {
      ready: false,
      missing: [
        "integrations",
        "approver",
        "inventory",
        "schedule",
        "validationInstructions",
        "restrictedAreas",
        "runtimeMinutes",
        "spendingLimit",
      ],
    });
  } finally {
    rmSync(dataDirectory, { recursive: true, force: true });
  }
});
