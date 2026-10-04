import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

export type RepositoryContext = { provider: string; reference: string; url: string; defaultBranch: string; documentationReferences: string[] };
export type ProductProfile = {
  feedbackIntake?: string; goals?: string[]; repository?: RepositoryContext; inventory?: string[];
  ticketDestination?: string; approver?: string; validationInstructions?: string; previewInstructions?: string;
  restrictedAreas?: string[]; timezone?: string; proposalTime?: string; approvalDeadline?: string;
  buildWindow?: string; runtimeMinutes?: number; spendingLimit?: number; integrations?: Record<string, string>;
};
export type Product = { id: string; name: string; ownerId: string; profile: ProductProfile };
export type Feedback = { id: string; productId: string; customerId: string; originalText: string; sourceReference: string; receivedAt: string };
export type Readiness = { registered: boolean; analysisReady: boolean; buildReady: boolean; missingAnalysis: string[]; missingBuild: string[] };

type StoredWorkflow = { products: Product[]; feedback: Feedback[] };
const analysisFields = ["goals", "repository", "repository.documentationReferences", "inventory"] as const;
const buildFields = ["repository", "repository.defaultBranch", "ticketDestination", "approver", "validationInstructions", "previewInstructions", "restrictedAreas", "timezone", "proposalTime", "approvalDeadline", "buildWindow", "runtimeMinutes", "spendingLimit", "integrations"] as const;

export class WorkflowError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export class Workflow {
  readonly #filePath: string;

  constructor(dataDirectory: string) { this.#filePath = join(dataDirectory, "workflow.json"); }

  registerProduct(input: { id: string; name: string; profile?: ProductProfile }, ownerId: string): { product: Product; readiness: Readiness } {
    requireText(input.id, "product ID");
    requireText(input.name, "product name");
    requireText(ownerId, "owner identity");
    rejectCredentials(input.profile, "product profile");
    const data = this.read();
    if (data.products.some((product) => product.id === input.id)) throw new WorkflowError(`Product '${input.id}' is already registered.`, 409);
    const product: Product = { id: input.id, name: input.name, ownerId, profile: input.profile ?? {} };
    data.products.push(product);
    this.write(data);
    return { product, readiness: this.readiness(product) };
  }

  submitFeedback(productId: string, input: Omit<Feedback, "id" | "productId">): Feedback {
    requireText(productId, "product ID");
    requireText(input.customerId, "customer ID");
    requireText(input.originalText, "feedback text");
    requireText(input.sourceReference, "feedback source reference");
    requireText(input.receivedAt, "feedback date");
    if (Number.isNaN(Date.parse(input.receivedAt))) throw new WorkflowError("Feedback date must be an ISO-8601 date.", 400);
    rejectCredentials(input.originalText, "feedback");
    requireCredentialFreeSource(input.sourceReference);
    const data = this.read();
    if (!data.products.some((product) => product.id === productId)) throw new WorkflowError(`Product '${productId}' is not registered.`, 404);
    const feedback: Feedback = { id: `${productId}-${data.feedback.filter((item) => item.productId === productId).length + 1}`, productId, ...input };
    data.feedback.push(feedback);
    this.write(data);
    return feedback;
  }

  inspectProduct(productId: string, ownerId: string): { product: Product; readiness: Readiness; feedback: Feedback[] } {
    const product = this.productForOwner(productId, ownerId);
    return { product, readiness: this.readiness(product), feedback: this.read().feedback.filter((feedback) => feedback.productId === productId) };
  }

  private productForOwner(productId: string, ownerId: string): Product {
    requireText(ownerId, "owner identity");
    const product = this.read().products.find((item) => item.id === productId);
    if (product === undefined) throw new WorkflowError(`Product '${productId}' is not registered.`, 404);
    if (product.ownerId !== ownerId) throw new WorkflowError(`Owner '${ownerId}' is not authorized to inspect product '${productId}'.`, 403);
    return product;
  }

  private readiness(product: Product): Readiness {
    const missingAnalysis = analysisFields.filter((field) => isMissing(readField(product.profile, field)));
    const missingBuild = buildFields.filter((field) => isMissing(readField(product.profile, field)));
    return { registered: !isMissing(product.profile.feedbackIntake), analysisReady: missingAnalysis.length === 0, buildReady: missingBuild.length === 0, missingAnalysis, missingBuild };
  }

  private read(): StoredWorkflow {
    try { return JSON.parse(readFileSync(this.#filePath, "utf8")) as StoredWorkflow; }
    catch (error) { if (isMissingFile(error)) return { products: [], feedback: [] }; throw error; }
  }

  private write(data: StoredWorkflow): void {
    mkdirSync(dirname(this.#filePath), { recursive: true });
    const temporaryFile = `${this.#filePath}.tmp`;
    writeFileSync(temporaryFile, `${JSON.stringify(data, null, 2)}\n`, "utf8");
    renameSync(temporaryFile, this.#filePath);
  }
}

function readField(profile: ProductProfile, field: string): unknown { return field.split(".").reduce<unknown>((value, key) => isRecord(value) ? value[key] : undefined, profile); }
function isMissing(value: unknown): boolean { return value === undefined || value === null || value === "" || (Array.isArray(value) && value.length === 0) || (isRecord(value) && Object.keys(value).length === 0) || (typeof value === "number" && value <= 0); }
function requireText(value: string, label: string): void { if (value === undefined || value.trim() === "") throw new WorkflowError(`A ${label} is required.`, 400); }
function rejectCredentials(value: unknown, location: string): void {
  if (typeof value === "string") { if (credentialPattern.test(value)) throw new WorkflowError(`Credentials must stay outside ${location}.`, 400); return; }
  if (Array.isArray(value)) value.forEach((item) => rejectCredentials(item, location));
  else if (isRecord(value)) Object.entries(value).forEach(([key, nested]) => { if (/credential|secret|token|password/i.test(key)) throw new WorkflowError(`Credentials must stay outside ${location}.`, 400); rejectCredentials(nested, location); });
}
function requireCredentialFreeSource(source: string): void { if (!sourceReferencePattern.test(source) || credentialPattern.test(source)) throw new WorkflowError("Feedback source must be a credential-free source reference.", 400); }
const credentialPattern = /\b(?:api[_-]?key|access[_-]?token|api[_-]?token|secret|password)\b/i;
const sourceReferencePattern = /^[a-z][a-z0-9_-]*:[a-z0-9._-]+(?::[a-z0-9._-]+)*$/i;
function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null && !Array.isArray(value); }
function isMissingFile(error: unknown): error is NodeJS.ErrnoException { return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT"; }
