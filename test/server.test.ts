import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createWorkflowServer } from "../src/server.ts";

async function withServer(run: (baseUrl: string) => Promise<void>): Promise<void> {
  const dataDirectory = mkdtempSync(join(tmpdir(), "feedback-workflow-"));
  const server = createWorkflowServer(dataDirectory);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address();
  if (address === null || typeof address === "string") throw new Error("Server did not bind to a TCP port.");
  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    await run(baseUrl);
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error === undefined ? resolve() : reject(error)));
    rmSync(dataDirectory, { recursive: true, force: true });
  }
}

async function request(baseUrl: string, path: string, method: string, body?: unknown, ownerId = "owner-atlas"): Promise<Response> {
  return fetch(`${baseUrl}${path}`, {
    method,
    headers: { "content-type": "application/json", "x-workflow-owner-id": ownerId },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

test("registers an analysis-ready product through the persistent workflow service", async () => {
  await withServer(async (baseUrl) => {
    const response = await request(baseUrl, "/products", "POST", {
      id: "atlas",
      name: "Atlas",
      profile: {
        feedbackIntake: "intercom",
        goals: ["Increase exports"],
        repository: {
          provider: "github",
          reference: "suchint/atlas",
          url: "https://github.com/suchint/atlas",
          defaultBranch: "main",
          documentationReferences: ["README.md"],
        },
        inventory: ["CSV export"],
      },
    });

    assert.equal(response.status, 201);
    assert.deepEqual(await response.json(), {
      product: {
        id: "atlas",
        name: "Atlas",
        ownerId: "owner-atlas",
        profile: {
          feedbackIntake: "intercom",
          goals: ["Increase exports"],
          repository: {
            provider: "github",
            reference: "suchint/atlas",
            url: "https://github.com/suchint/atlas",
            defaultBranch: "main",
            documentationReferences: ["README.md"],
          },
          inventory: ["CSV export"],
        },
      },
      readiness: {
        registered: true,
        analysisReady: true,
        buildReady: false,
        missingAnalysis: [],
        missingBuild: [
          "ticketDestination",
          "approver",
          "validationInstructions",
          "previewInstructions",
          "restrictedAreas",
          "timezone",
          "proposalTime",
          "approvalDeadline",
          "buildWindow",
          "runtimeMinutes",
          "spendingLimit",
          "integrations",
        ],
      },
    });
  });
});

test("accepts traceable feedback and restricts inspection to the registered owner", async () => {
  await withServer(async (baseUrl) => {
    await request(baseUrl, "/products", "POST", {
      id: "atlas",
      name: "Atlas",
      profile: { feedbackIntake: "intercom" },
    });

    const submission = await request(baseUrl, "/products/atlas/feedback", "POST", {
      customerId: "customer-42",
      originalText: "Please let me export a CSV.",
      sourceReference: "intercom:conversation:987",
      receivedAt: "2026-10-04T10:00:00.000Z",
    });
    assert.equal(submission.status, 201);

    const inspection = await request(baseUrl, "/products/atlas", "GET");
    assert.equal(inspection.status, 200);
    assert.deepEqual((await inspection.json()).feedback, [{
      id: "atlas-1",
      productId: "atlas",
      customerId: "customer-42",
      originalText: "Please let me export a CSV.",
      sourceReference: "intercom:conversation:987",
      receivedAt: "2026-10-04T10:00:00.000Z",
    }]);

    const denied = await request(baseUrl, "/products/atlas", "GET", undefined, "owner-other");
    assert.equal(denied.status, 403);
  });
});
