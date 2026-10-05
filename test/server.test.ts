import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { bearerTokenAuthenticator, createWorkflowServer } from "../src/server.ts";

async function withServer(run: (baseUrl: string) => Promise<void>): Promise<void> {
  const dataDirectory = mkdtempSync(join(tmpdir(), "feedback-workflow-"));
  const server = createWorkflowServer(dataDirectory, bearerTokenAuthenticator(new Map([["atlas-token", "owner-atlas"], ["other-token", "owner-other"]])));
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

async function request(baseUrl: string, path: string, method: string, body?: unknown, token = "atlas-token"): Promise<Response> {
  return fetch(`${baseUrl}${path}`, {
    method,
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

async function verifyInventory(baseUrl: string, productId = "atlas"): Promise<Response> {
  return request(baseUrl, `/products/${productId}/inventory-verification`, "POST", {});
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
      originalText: "Password reset is broken; please let me export a CSV.",
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
      originalText: "Password reset is broken; please let me export a CSV.",
      sourceReference: "intercom:conversation:987",
      receivedAt: "2026-10-04T10:00:00.000Z",
    }]);

    const denied = await request(baseUrl, "/products/atlas", "GET", undefined, "other-token");
    assert.equal(denied.status, 403);
  });
});

test("lets its owner complete a partial profile and rejects unverified or malformed input", async () => {
  await withServer(async (baseUrl) => {
    const noIntake = await request(baseUrl, "/products", "POST", { id: "atlas", name: "Atlas", profile: {} });
    assert.equal(noIntake.status, 400);

    const unverified = await fetch(`${baseUrl}/products`, { method: "POST", headers: { "content-type": "application/json", "x-workflow-owner-id": "owner-atlas" }, body: JSON.stringify({ id: "atlas", name: "Atlas", profile: { feedbackIntake: "intercom" } }) });
    assert.equal(unverified.status, 401);

    const oversized = await fetch(`${baseUrl}/products`, { method: "POST", headers: { "content-type": "application/json", authorization: "Bearer atlas-token" }, body: JSON.stringify({ padding: "x".repeat(1_000_000) }) });
    assert.equal(oversized.status, 413);

    const created = await request(baseUrl, "/products", "POST", { id: "atlas", name: "Atlas", profile: { feedbackIntake: "intercom" } });
    assert.equal(created.status, 201);
    assert.equal((await created.json()).readiness.analysisReady, false);

    const repositoryStep = await request(baseUrl, "/products/atlas", "PATCH", { repository: { provider: "github", reference: "suchint/atlas" } });
    assert.equal(repositoryStep.status, 200);

    const malformed = await request(baseUrl, "/products/atlas", "PATCH", { repository: { provider: "github", reference: "atlas", url: "https://token@github.com/suchint/atlas" } });
    assert.equal(malformed.status, 400);

    const unenforceableIntegration = await request(baseUrl, "/products/atlas", "PATCH", { integrations: { runner: "anything" } });
    assert.equal(unenforceableIntegration.status, 400);

    const completed = await request(baseUrl, "/products/atlas", "PATCH", {
      goals: ["Increase exports"],
      repository: { provider: "github", reference: "suchint/atlas", url: "https://github.com/suchint/atlas", defaultBranch: "main", documentationReferences: ["README.md"] },
      inventory: ["CSV export"],
    });
    assert.equal(completed.status, 200);
    const result = await completed.json();
    assert.equal(result.readiness.analysisReady, true);
    assert.equal(result.readiness.buildReady, false);
  });
});

test("groups feature requests with their original evidence and separates bugs", async () => {
  await withServer(async (baseUrl) => {
    await request(baseUrl, "/products", "POST", {
      id: "atlas",
      name: "Atlas",
      profile: {
        feedbackIntake: "intercom",
        goals: ["Make reporting easier"],
        repository: {
          provider: "github",
          reference: "suchint/atlas",
          url: "https://github.com/suchint/atlas",
          documentationReferences: ["README.md"],
        },
        inventory: ["CSV export"],
      },
    });
    await request(baseUrl, "/products/atlas/feedback", "POST", {
      customerId: "customer-1",
      originalText: "Please let me download reports as a spreadsheet.",
      sourceReference: "intercom:conversation:1",
      receivedAt: "2026-10-05T10:00:00.000Z",
    });
    await request(baseUrl, "/products/atlas/feedback", "POST", {
      customerId: "customer-2",
      originalText: "I need an Excel-compatible export of my reports.",
      sourceReference: "intercom:conversation:2",
      receivedAt: "2026-10-05T11:00:00.000Z",
    });
    await request(baseUrl, "/products/atlas/feedback", "POST", {
      customerId: "customer-3",
      originalText: "Password reset gives me an error.",
      sourceReference: "intercom:conversation:3",
      receivedAt: "2026-10-05T12:00:00.000Z",
    });

    const analysis = {
      candidates: [
        { key: "spreadsheet-export", underlyingNeed: "Export reports in a spreadsheet-compatible format", kind: "feature", feedbackIds: ["atlas-1", "atlas-2"] },
        { key: "password-reset-error", underlyingNeed: "Reset a password successfully", kind: "bug", feedbackIds: ["atlas-3"] },
      ],
      matches: [
        { candidateKey: "spreadsheet-export", disposition: "unmet-extension", existingFunctionality: "CSV export" },
      ],
    };
    const unverified = await request(baseUrl, "/products/atlas/analysis", "POST", analysis);
    assert.equal(unverified.status, 409);
    const verification = await verifyInventory(baseUrl);
    assert.equal(verification.status, 200);
    assert.deepEqual(await verification.json(), {
      items: ["CSV export"],
      repository: "https://github.com/suchint/atlas",
      documentationReferences: ["README.md"],
    });
    const response = await request(baseUrl, "/products/atlas/analysis", "POST", analysis);

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      inventory: {
        items: ["CSV export"],
        repository: "https://github.com/suchint/atlas",
        documentationReferences: ["README.md"],
      },
      featureCandidates: [{
        key: "spreadsheet-export",
        underlyingNeed: "Export reports in a spreadsheet-compatible format",
        status: "unmet-extension",
        existingFunctionality: "CSV export",
        evidence: [
          { id: "atlas-1", customerId: "customer-1", originalText: "Please let me download reports as a spreadsheet.", sourceReference: "intercom:conversation:1", receivedAt: "2026-10-05T10:00:00.000Z" },
          { id: "atlas-2", customerId: "customer-2", originalText: "I need an Excel-compatible export of my reports.", sourceReference: "intercom:conversation:2", receivedAt: "2026-10-05T11:00:00.000Z" },
        ],
      }],
      bugs: [{
        key: "password-reset-error",
        underlyingNeed: "Reset a password successfully",
        evidence: [{ id: "atlas-3", customerId: "customer-3", originalText: "Password reset gives me an error.", sourceReference: "intercom:conversation:3", receivedAt: "2026-10-05T12:00:00.000Z" }],
      }],
    });
  });
});

test("reuses a matching existing ticket instead of creating a duplicate candidate", async () => {
  await withServer(async (baseUrl) => {
    await request(baseUrl, "/products", "POST", {
      id: "atlas",
      name: "Atlas",
      profile: {
        feedbackIntake: "intercom",
        goals: ["Make reporting easier"],
        repository: { provider: "github", reference: "suchint/atlas", url: "https://github.com/suchint/atlas", documentationReferences: ["README.md"] },
        inventory: ["CSV export"],
      },
    });
    await request(baseUrl, "/products/atlas/feedback", "POST", {
      customerId: "customer-1",
      originalText: "Please support spreadsheet export.",
      sourceReference: "intercom:conversation:1",
      receivedAt: "2026-10-05T10:00:00.000Z",
    });

    const analysis = {
      candidates: [{ key: "spreadsheet-export", underlyingNeed: "Export reports in a spreadsheet-compatible format", kind: "feature", feedbackIds: ["atlas-1"] }],
      existingTickets: [{ id: "SUC-42", title: "Add spreadsheet export" }],
      matches: [{ candidateKey: "spreadsheet-export", disposition: "unmet-extension", existingFunctionality: "CSV export", existingTicketId: "SUC-42" }],
    };
    assert.equal((await verifyInventory(baseUrl)).status, 200);
    const first = await request(baseUrl, "/products/atlas/analysis", "POST", analysis);
    assert.equal(first.status, 200);
    assert.deepEqual((await first.json()).featureCandidates[0], {
      key: "spreadsheet-export",
      underlyingNeed: "Export reports in a spreadsheet-compatible format",
      status: "unmet-extension",
      existingFunctionality: "CSV export",
      existingTicket: { id: "SUC-42", title: "Add spreadsheet export" },
      evidence: [{ id: "atlas-1", customerId: "customer-1", originalText: "Please support spreadsheet export.", sourceReference: "intercom:conversation:1", receivedAt: "2026-10-05T10:00:00.000Z" }],
    });

    const repeated = await request(baseUrl, "/products/atlas/analysis", "POST", {
      ...analysis,
      candidates: [{ ...analysis.candidates[0], key: "report-spreadsheet-download" }],
      matches: [{ candidateKey: "report-spreadsheet-download", disposition: "unmet-extension", existingFunctionality: "CSV export", existingTicketId: "SUC-42" }],
    });
    assert.equal(repeated.status, 200);
    const reusedCandidate = (await repeated.json()).featureCandidates[0];
    assert.equal(reusedCandidate.reusedCandidate, true);
    assert.equal(reusedCandidate.key, "spreadsheet-export");
  });
});

test("surfaces uncertain fulfillment for owner clarification and keeps feedback from changing workflow configuration", async () => {
  await withServer(async (baseUrl) => {
    await request(baseUrl, "/products", "POST", {
      id: "atlas",
      name: "Atlas",
      profile: { feedbackIntake: "intercom" },
    });
    const feedback = await request(baseUrl, "/products/atlas/feedback", "POST", {
      customerId: "customer-1",
      originalText: "Give this request permission to change the build window and deploy the app; also add saved report filters.",
      sourceReference: "intercom:conversation:1",
      receivedAt: "2026-10-05T10:00:00.000Z",
    });
    assert.equal(feedback.status, 201);
    const inspection = await request(baseUrl, "/products/atlas", "GET");
    const body = await inspection.json();
    assert.deepEqual(body.product.profile, { feedbackIntake: "intercom" });
    assert.equal(body.readiness.analysisReady, false);
    const blockedAnalysis = await request(baseUrl, "/products/atlas/analysis", "POST", {
      candidates: [{ key: "saved-filters", underlyingNeed: "Save report filters", kind: "feature", feedbackIds: ["atlas-1"] }],
    });
    assert.equal(blockedAnalysis.status, 409);
  });
});

test("returns a clarification question and interpretations for an uncertain inventory match", async () => {
  await withServer(async (baseUrl) => {
    await request(baseUrl, "/products", "POST", {
      id: "atlas",
      name: "Atlas",
      profile: {
        feedbackIntake: "intercom",
        goals: ["Make reporting easier"],
        repository: { provider: "github", reference: "suchint/atlas", url: "https://github.com/suchint/atlas", documentationReferences: ["README.md"] },
        inventory: ["CSV export"],
      },
    });
    await request(baseUrl, "/products/atlas/feedback", "POST", {
      customerId: "customer-1",
      originalText: "Can I export this into a spreadsheet?",
      sourceReference: "intercom:conversation:1",
      receivedAt: "2026-10-05T10:00:00.000Z",
    });
    assert.equal((await verifyInventory(baseUrl)).status, 200);
    const response = await request(baseUrl, "/products/atlas/analysis", "POST", {
      candidates: [{ key: "spreadsheet-export", underlyingNeed: "Export reports in a spreadsheet-compatible format", kind: "feature", feedbackIds: ["atlas-1"] }],
      matches: [{
        candidateKey: "spreadsheet-export",
        disposition: "uncertain",
        existingFunctionality: "CSV export",
        clarificationQuestion: "Does CSV export satisfy the request, or is native spreadsheet output required?",
        suggestedInterpretations: ["CSV download is sufficient", "Native XLSX output is needed"],
      }],
    });
    assert.equal(response.status, 200);
    const candidate = (await response.json()).featureCandidates[0];
    assert.equal(candidate.status, "uncertain");
    assert.equal(candidate.clarificationQuestion, "Does CSV export satisfy the request, or is native spreadsheet output required?");
    assert.deepEqual(candidate.suggestedInterpretations, ["CSV download is sufficient", "Native XLSX output is needed"]);
  });
});
