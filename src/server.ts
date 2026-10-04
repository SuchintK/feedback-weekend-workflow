import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { Workflow, WorkflowError } from "./workflow.ts";

export function createWorkflowServer(dataDirectory: string): Server {
  const workflow = new Workflow(dataDirectory);
  return createServer(async (request, response) => {
    try {
      const url = new URL(request.url ?? "/", "http://localhost");
      if (request.method === "GET" && url.pathname === "/") {
        return html(response, 200, "<h1>Feedback workflow</h1><p>Register products, collect feedback, and inspect readiness through this authenticated workflow.</p>");
      }
      if (request.method === "POST" && url.pathname === "/products") {
        return json(response, 201, workflow.registerProduct(asProductInput(await readJson(request)), ownerFrom(request)));
      }
      const feedbackMatch = url.pathname.match(/^\/products\/([^/]+)\/feedback$/);
      if (request.method === "POST" && feedbackMatch !== null) {
        return json(response, 201, { feedback: workflow.submitFeedback(decodeURIComponent(feedbackMatch[1]), asFeedbackInput(await readJson(request))) });
      }
      const productMatch = url.pathname.match(/^\/products\/([^/]+)$/);
      if (request.method === "GET" && productMatch !== null) {
        return json(response, 200, workflow.inspectProduct(decodeURIComponent(productMatch[1]), ownerFrom(request)));
      }
      return json(response, 404, { error: "Route not found." });
    } catch (error) {
      if (error instanceof WorkflowError) return json(response, error.status, { error: error.message });
      return json(response, 400, { error: error instanceof Error ? error.message : String(error) });
    }
  });
}

function ownerFrom(request: IncomingMessage): string {
  const ownerId = request.headers["x-workflow-owner-id"];
  if (typeof ownerId !== "string" || ownerId.trim() === "") throw new WorkflowError("An authenticated owner identity is required.", 401);
  return ownerId;
}

async function readJson(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(Buffer.from(chunk));
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown; }
  catch { throw new WorkflowError("Request body must be valid JSON.", 400); }
}

function asProductInput(value: unknown): { id: string; name: string; profile?: Record<string, unknown> } {
  if (!isRecord(value) || typeof value.id !== "string" || typeof value.name !== "string") throw new WorkflowError("Product ID and name are required.", 400);
  return { id: value.id, name: value.name, profile: isRecord(value.profile) ? value.profile : undefined };
}

function asFeedbackInput(value: unknown): { customerId: string; originalText: string; sourceReference: string; receivedAt: string } {
  if (!isRecord(value) || typeof value.customerId !== "string" || typeof value.originalText !== "string" || typeof value.sourceReference !== "string" || typeof value.receivedAt !== "string") throw new WorkflowError("Feedback customer ID, original text, source reference, and date are required.", 400);
  return { customerId: value.customerId, originalText: value.originalText, sourceReference: value.sourceReference, receivedAt: value.receivedAt };
}

function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null && !Array.isArray(value); }
function json(response: ServerResponse, status: number, body: unknown): void { response.writeHead(status, { "content-type": "application/json; charset=utf-8" }); response.end(`${JSON.stringify(body)}\n`); }
function html(response: ServerResponse, status: number, body: string): void { response.writeHead(status, { "content-type": "text/html; charset=utf-8" }); response.end(`<!doctype html><html><body>${body}</body></html>`); }
