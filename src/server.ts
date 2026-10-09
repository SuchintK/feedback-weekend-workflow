import {
  createServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from "node:http";
import { type ProductProfile, Workflow, WorkflowError } from "./workflow.ts";

export type OwnerAuthenticator = (
  request: IncomingMessage,
) => string | undefined;

export function createWorkflowServer(
  dataDirectory: string,
  authenticate: OwnerAuthenticator = () => undefined,
): Server {
  const workflow = new Workflow(dataDirectory);
  return createServer(async (request, response) => {
    try {
      const url = new URL(request.url ?? "/", "http://localhost");
      if (request.method === "GET" && url.pathname === "/")
        return html(
          response,
          200,
          "<h1>Feedback workflow</h1><p>Register products, collect feedback, and inspect readiness through this authenticated workflow.</p>",
        );
      if (request.method === "POST" && url.pathname === "/products") {
        const ownerId = ownerFrom(request, authenticate);
        return json(
          response,
          201,
          workflow.registerProduct(
            asProductInput(await readJson(request)),
            ownerId,
          ),
        );
      }
      const feedbackMatch = url.pathname.match(
        /^\/products\/([^/]+)\/feedback$/,
      );
      if (request.method === "POST" && feedbackMatch !== null) {
        const ownerId = ownerFrom(request, authenticate);
        return json(response, 201, {
          feedback: workflow.submitFeedback(
            decodeURIComponent(feedbackMatch[1]),
            asFeedbackInput(await readJson(request)),
            ownerId,
          ),
        });
      }
      const productMatch = url.pathname.match(/^\/products\/([^/]+)$/);
      if (request.method === "PATCH" && productMatch !== null) {
        const ownerId = ownerFrom(request, authenticate);
        return json(
          response,
          200,
          workflow.updateProductProfile(
            decodeURIComponent(productMatch[1]),
            asProfilePatch(await readJson(request)),
            ownerId,
          ),
        );
      }
      if (request.method === "GET" && productMatch !== null)
        return json(
          response,
          200,
          workflow.inspectProduct(
            decodeURIComponent(productMatch[1]),
            ownerFrom(request, authenticate),
          ),
        );
      return json(response, 404, { error: "Route not found." });
    } catch (error) {
      if (error instanceof WorkflowError)
        return json(response, error.status, { error: error.message });
      return json(response, 400, {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });
}

export function bearerTokenAuthenticator(
  tokens: ReadonlyMap<string, string>,
): OwnerAuthenticator {
  return (request) => {
    const authorization = request.headers.authorization;
    if (typeof authorization !== "string") return undefined;
    const match = authorization.match(/^Bearer (.+)$/);
    return match === null ? undefined : tokens.get(match[1]);
  };
}
function ownerFrom(
  request: IncomingMessage,
  authenticate: OwnerAuthenticator,
): string {
  const ownerId = authenticate(request);
  if (ownerId === undefined || ownerId.trim() === "")
    throw new WorkflowError("A verified owner identity is required.", 401);
  return ownerId;
}
async function readJson(request: IncomingMessage): Promise<unknown> {
  const maximumBodyBytes = 1_000_000;
  const declaredLength = Number(request.headers["content-length"]);
  if (Number.isFinite(declaredLength) && declaredLength > maximumBodyBytes)
    throw new WorkflowError("Request body exceeds the 1 MB limit.", 413);
  const chunks: Buffer[] = [];
  let receivedBytes = 0;
  for await (const chunk of request) {
    const buffer = Buffer.from(chunk);
    receivedBytes += buffer.length;
    if (receivedBytes > maximumBodyBytes)
      throw new WorkflowError("Request body exceeds the 1 MB limit.", 413);
    chunks.push(buffer);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
  } catch {
    throw new WorkflowError("Request body must be valid JSON.", 400);
  }
}
function asProductInput(value: unknown): {
  id: string;
  name: string;
  profile: ProductProfile;
} {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    typeof value.name !== "string"
  )
    throw new WorkflowError("Product ID and name are required.", 400);
  return { id: value.id, name: value.name, profile: asProfile(value.profile) };
}
function asProfilePatch(value: unknown): ProductProfile {
  return asProfile(value);
}
function asProfile(value: unknown): ProductProfile {
  if (!isRecord(value))
    throw new WorkflowError("Product profile must be an object.", 400);
  const allowed = new Set([
    "feedbackIntake",
    "goals",
    "repository",
    "inventory",
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
  ]);
  for (const key of Object.keys(value))
    if (!allowed.has(key))
      throw new WorkflowError(`Unknown product profile field '${key}'.`, 400);
  const profile: ProductProfile = {};
  const textFields = [
    "feedbackIntake",
    "ticketDestination",
    "approver",
    "validationInstructions",
    "previewInstructions",
    "timezone",
    "proposalTime",
    "approvalDeadline",
    "buildWindow",
  ] as const;
  for (const field of textFields)
    if (value[field] !== undefined)
      profile[field] = asText(value[field], field);
  if (value.goals !== undefined)
    profile.goals = asTextList(value.goals, "goals");
  if (value.inventory !== undefined)
    profile.inventory = asTextList(value.inventory, "inventory");
  if (value.restrictedAreas !== undefined)
    profile.restrictedAreas = asTextList(
      value.restrictedAreas,
      "restrictedAreas",
    );
  if (value.repository !== undefined)
    profile.repository = asRepository(value.repository);
  if (value.runtimeMinutes !== undefined)
    profile.runtimeMinutes = asPositiveNumber(
      value.runtimeMinutes,
      "runtimeMinutes",
    );
  if (value.spendingLimit !== undefined)
    profile.spendingLimit = asPositiveNumber(
      value.spendingLimit,
      "spendingLimit",
    );
  if (value.integrations !== undefined)
    profile.integrations = asIntegrations(value.integrations);
  return profile;
}
function asRepository(value: unknown): ProductProfile["repository"] {
  if (!isRecord(value) || Object.keys(value).length === 0)
    throw new WorkflowError("Repository must be a non-empty object.", 400);
  const allowed = new Set([
    "provider",
    "reference",
    "url",
    "defaultBranch",
    "documentationReferences",
  ]);
  for (const key of Object.keys(value))
    if (!allowed.has(key))
      throw new WorkflowError(`Unknown repository field '${key}'.`, 400);
  const repository: ProductProfile["repository"] = {};
  if (value.provider !== undefined)
    repository.provider = asText(value.provider, "repository.provider");
  if (value.reference !== undefined)
    repository.reference = asText(value.reference, "repository.reference");
  if (value.url !== undefined)
    repository.url = asText(value.url, "repository.url");
  if (value.defaultBranch !== undefined)
    repository.defaultBranch = asText(
      value.defaultBranch,
      "repository.defaultBranch",
    );
  if (value.documentationReferences !== undefined)
    repository.documentationReferences = asTextList(
      value.documentationReferences,
      "repository.documentationReferences",
    );
  return repository;
}
function asText(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim() === "")
    throw new WorkflowError(`${label} must be non-empty text.`, 400);
  return value;
}
function asTextList(value: unknown, label: string): string[] {
  if (
    !Array.isArray(value) ||
    value.length === 0 ||
    value.some((item) => typeof item !== "string" || item.trim() === "")
  )
    throw new WorkflowError(`${label} must be a non-empty list of text.`, 400);
  return value;
}
function asPositiveNumber(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0)
    throw new WorkflowError(`${label} must be a positive number.`, 400);
  return value;
}
function asIntegrations(
  value: unknown,
): NonNullable<ProductProfile["integrations"]> {
  if (!isRecord(value) || Object.entries(value).length === 0)
    throw new WorkflowError("integrations must be a non-empty map.", 400);
  return Object.fromEntries(
    Object.entries(value).map(([name, integration]) => {
      if (name.trim() === "" || !isRecord(integration))
        throw new WorkflowError(
          "Each integration must be named and structured.",
          400,
        );
      return [
        name,
        {
          endpoint: asText(integration.endpoint, "integration.endpoint"),
          capabilities: asTextList(
            integration.capabilities,
            "integration.capabilities",
          ),
        },
      ];
    }),
  );
}
function asFeedbackInput(value: unknown): {
  customerId: string;
  originalText: string;
  sourceReference: string;
  receivedAt: string;
} {
  if (
    !isRecord(value) ||
    typeof value.customerId !== "string" ||
    typeof value.originalText !== "string" ||
    typeof value.sourceReference !== "string" ||
    typeof value.receivedAt !== "string"
  )
    throw new WorkflowError(
      "Feedback customer ID, original text, source reference, and date are required.",
      400,
    );
  return {
    customerId: value.customerId,
    originalText: value.originalText,
    sourceReference: value.sourceReference,
    receivedAt: value.receivedAt,
  };
}
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function json(response: ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
  });
  response.end(`${JSON.stringify(body)}\n`);
}
function html(response: ServerResponse, status: number, body: string): void {
  response.writeHead(status, { "content-type": "text/html; charset=utf-8" });
  response.end(`<!doctype html><html><body>${body}</body></html>`);
}
