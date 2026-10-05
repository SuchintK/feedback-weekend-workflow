import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

export type RepositoryContext = {
  provider?: string;
  reference?: string;
  url?: string;
  defaultBranch?: string;
  documentationReferences?: string[];
};
export type IntegrationReference = { endpoint: string; capabilities: string[] };

export type ProductProfile = {
  feedbackIntake?: string;
  goals?: string[];
  repository?: RepositoryContext;
  inventory?: string[];
  ticketDestination?: string;
  approver?: string;
  validationInstructions?: string;
  previewInstructions?: string;
  restrictedAreas?: string[];
  timezone?: string;
  proposalTime?: string;
  approvalDeadline?: string;
  buildWindow?: string;
  runtimeMinutes?: number;
  spendingLimit?: number;
  integrations?: Record<string, IntegrationReference>;
};

export type Product = { id: string; name: string; ownerId: string; profile: ProductProfile };
export type Feedback = { id: string; productId: string; customerId: string; originalText: string; sourceReference: string; receivedAt: string };
export type Readiness = { registered: boolean; analysisReady: boolean; buildReady: boolean; missingAnalysis: string[]; missingBuild: string[] };
type CandidateKind = "feature" | "bug";
type MatchDisposition = "unmet" | "fulfilled" | "unmet-extension" | "uncertain";
type ExistingTicket = { id: string; title: string };
type CandidateMatch = { disposition: MatchDisposition; existingFunctionality?: string; existingTicketId?: string; existingTicketTitle?: string; clarificationQuestion?: string; suggestedInterpretations?: string[] };
type AnalysisMatch = { candidateKey: string } & CandidateMatch;
type Candidate = { productId: string; key: string; underlyingNeed: string; kind: CandidateKind; feedbackIds: string[]; match?: CandidateMatch };
export type AnalysisInput = {
  candidates: Array<{ key: string; underlyingNeed: string; kind: CandidateKind; feedbackIds: string[] }>;
  existingTickets?: ExistingTicket[];
  matches?: AnalysisMatch[];
};

type StoredWorkflow = { products: Product[]; feedback: Feedback[]; candidates: Candidate[] };
type Requirement = { label: string; isSatisfied: (profile: ProductProfile) => boolean };

const analysisRequirements: Requirement[] = [
  { label: "goals", isSatisfied: (profile) => hasTextList(profile.goals) },
  { label: "repository", isSatisfied: (profile) => hasRepositoryIdentity(profile.repository) },
  { label: "repository.documentationReferences", isSatisfied: (profile) => hasTextList(profile.repository?.documentationReferences) },
  { label: "inventory", isSatisfied: (profile) => hasTextList(profile.inventory) },
];

const buildOnlyRequirements: Requirement[] = [
  { label: "repository.defaultBranch", isSatisfied: (profile) => hasText(profile.repository?.defaultBranch) },
  { label: "ticketDestination", isSatisfied: (profile) => hasText(profile.ticketDestination) },
  { label: "approver", isSatisfied: (profile) => hasText(profile.approver) },
  { label: "validationInstructions", isSatisfied: (profile) => hasText(profile.validationInstructions) },
  { label: "previewInstructions", isSatisfied: (profile) => hasText(profile.previewInstructions) },
  { label: "restrictedAreas", isSatisfied: (profile) => hasTextList(profile.restrictedAreas) },
  { label: "timezone", isSatisfied: (profile) => hasValidTimezone(profile.timezone) },
  { label: "proposalTime", isSatisfied: (profile) => hasTime(profile.proposalTime) },
  { label: "approvalDeadline", isSatisfied: (profile) => hasTime(profile.approvalDeadline) },
  { label: "buildWindow", isSatisfied: (profile) => hasText(profile.buildWindow) },
  { label: "runtimeMinutes", isSatisfied: (profile) => hasPositiveNumber(profile.runtimeMinutes) },
  { label: "spendingLimit", isSatisfied: (profile) => hasPositiveNumber(profile.spendingLimit) },
  { label: "integrations", isSatisfied: (profile) => hasDeclaredLimitCapabilities(profile.integrations) },
];

export class WorkflowError extends Error {
  readonly status: number;
  constructor(message: string, status: number) { super(message); this.status = status; }
}

export class Workflow {
  readonly #filePath: string;
  constructor(dataDirectory: string) { this.#filePath = join(dataDirectory, "workflow.json"); }

  registerProduct(input: { id: string; name: string; profile: ProductProfile }, ownerId: string): { product: Product; readiness: Readiness } {
    requireText(input.id, "product ID");
    requireText(input.name, "product name");
    requireText(ownerId, "owner identity");
    validateProfile(input.profile);
    if (!hasText(input.profile.feedbackIntake)) throw new WorkflowError("A feedback intake is required to register a product.", 400);
    const data = this.read();
    if (data.products.some((product) => product.id === input.id)) throw new WorkflowError(`Product '${input.id}' is already registered.`, 409);
    const product: Product = { id: input.id, name: input.name, ownerId, profile: input.profile };
    data.products.push(product);
    this.write(data);
    return { product, readiness: this.readiness(product) };
  }

  updateProductProfile(productId: string, patch: ProductProfile, ownerId: string): { product: Product; readiness: Readiness } {
    validateProfile(patch);
    if (Object.keys(patch).length === 0) throw new WorkflowError("At least one product profile field is required.", 400);
    const data = this.read();
    const product = this.productForOwner(productId, ownerId, data);
    product.profile = mergeProfile(product.profile, patch);
    validateProfile(product.profile);
    this.write(data);
    return { product, readiness: this.readiness(product) };
  }

  submitFeedback(productId: string, input: Omit<Feedback, "id" | "productId">, ownerId: string): Feedback {
    requireText(productId, "product ID");
    requireText(input.customerId, "customer ID");
    requireText(input.originalText, "feedback text");
    requireText(input.sourceReference, "feedback source reference");
    requireText(input.receivedAt, "feedback date");
    requireText(ownerId, "owner identity");
    if (Number.isNaN(Date.parse(input.receivedAt))) throw new WorkflowError("Feedback date must be an ISO-8601 date.", 400);
    rejectCredentials(input.originalText, "feedback");
    requireCredentialFreeSource(input.sourceReference);
    const data = this.read();
    this.productForOwner(productId, ownerId, data);
    const feedback: Feedback = { id: `${productId}-${data.feedback.filter((item) => item.productId === productId).length + 1}`, productId, ...input };
    data.feedback.push(feedback);
    this.write(data);
    return feedback;
  }

  inspectProduct(productId: string, ownerId: string): { product: Product; readiness: Readiness; feedback: Feedback[] } {
    const product = this.productForOwner(productId, ownerId, this.read());
    return { product, readiness: this.readiness(product), feedback: this.read().feedback.filter((feedback) => feedback.productId === productId) };
  }

  analyzeFeedback(productId: string, input: AnalysisInput, ownerId: string): { inventory: { items: string[]; repository: string; documentationReferences: string[] }; featureCandidates: unknown[]; bugs: unknown[] } {
    const data = this.read();
    const product = this.productForOwner(productId, ownerId, data);
    const readiness = this.readiness(product);
    if (!readiness.analysisReady) throw new WorkflowError(`Analysis requires verified goals, repository, documentation, and inventory evidence. Missing: ${readiness.missingAnalysis.join(", ")}.`, 409);
    validateAnalysisInput(input, product, data.feedback);
    const matches = new Map((input.matches ?? []).map((match) => [match.candidateKey, match]));
    const tickets = new Map((input.existingTickets ?? []).map((ticket) => [ticket.id, ticket]));
    const candidates = input.candidates.map((candidateInput) => {
      const match = matches.get(candidateInput.key);
      validateMatch(match, product.profile.inventory ?? [], tickets);
      const existing = data.candidates.find((candidate) => candidate.productId === productId && candidate.key === candidateInput.key);
      if (existing !== undefined) {
        if (existing.kind !== candidateInput.kind || existing.underlyingNeed !== candidateInput.underlyingNeed) throw new WorkflowError(`Candidate '${candidateInput.key}' conflicts with the existing candidate.`, 409);
        existing.feedbackIds = unique([...existing.feedbackIds, ...candidateInput.feedbackIds]);
        existing.match = match === undefined ? existing.match : withoutCandidateKey(match, tickets);
        return { candidate: existing, reused: true };
      }
      const candidate: Candidate = { productId, ...candidateInput, feedbackIds: unique(candidateInput.feedbackIds), match: match === undefined ? undefined : withoutCandidateKey(match, tickets) };
      data.candidates.push(candidate);
      return { candidate, reused: false };
    });
    this.write(data);
    const feedbackById = new Map(data.feedback.filter((feedback) => feedback.productId === productId).map((feedback) => [feedback.id, feedback]));
    return {
      inventory: {
        items: product.profile.inventory ?? [],
        repository: product.profile.repository?.url ?? "",
        documentationReferences: product.profile.repository?.documentationReferences ?? [],
      },
      featureCandidates: candidates.filter(({ candidate }) => candidate.kind === "feature").map(({ candidate, reused }) => asFeatureCandidate(candidate, feedbackById, reused)),
      bugs: candidates.filter(({ candidate }) => candidate.kind === "bug").map(({ candidate }) => asBugCandidate(candidate, feedbackById)),
    };
  }

  private productForOwner(productId: string, ownerId: string, data: StoredWorkflow): Product {
    requireText(ownerId, "owner identity");
    const product = data.products.find((item) => item.id === productId);
    if (product === undefined) throw new WorkflowError(`Product '${productId}' is not registered.`, 404);
    if (product.ownerId !== ownerId) throw new WorkflowError(`Owner '${ownerId}' is not authorized to access product '${productId}'.`, 403);
    return product;
  }

  private readiness(product: Product): Readiness {
    const missingAnalysis = missingRequirements(product.profile, analysisRequirements);
    const missingBuildOnly = missingRequirements(product.profile, buildOnlyRequirements);
    return { registered: true, analysisReady: missingAnalysis.length === 0, buildReady: missingAnalysis.length === 0 && missingBuildOnly.length === 0, missingAnalysis, missingBuild: [...missingAnalysis, ...missingBuildOnly] };
  }

  private read(): StoredWorkflow {
    try {
      const data = JSON.parse(readFileSync(this.#filePath, "utf8")) as Partial<StoredWorkflow>;
      return { products: data.products ?? [], feedback: data.feedback ?? [], candidates: data.candidates ?? [] };
    }
    catch (error) { if (isMissingFile(error)) return { products: [], feedback: [], candidates: [] }; throw error; }
  }

  private write(data: StoredWorkflow): void {
    mkdirSync(dirname(this.#filePath), { recursive: true });
    const temporaryFile = `${this.#filePath}.tmp`;
    writeFileSync(temporaryFile, `${JSON.stringify(data, null, 2)}\n`, "utf8");
    renameSync(temporaryFile, this.#filePath);
  }
}

function missingRequirements(profile: ProductProfile, requirements: Requirement[]): string[] { return requirements.filter((requirement) => !requirement.isSatisfied(profile)).map((requirement) => requirement.label); }
function validateAnalysisInput(input: AnalysisInput, product: Product, feedback: Feedback[]): void {
  if (!Array.isArray(input.candidates) || input.candidates.length === 0) throw new WorkflowError("At least one analyzed candidate is required.", 400);
  const candidateKeys = new Set<string>();
  const feedbackIds = new Set<string>();
  const productFeedback = new Set(feedback.filter((item) => item.productId === product.id).map((item) => item.id));
  for (const candidate of input.candidates) {
    if (!hasText(candidate.key) || !hasText(candidate.underlyingNeed) || !["feature", "bug"].includes(candidate.kind)) throw new WorkflowError("Each candidate needs a key, underlying need, and valid kind.", 400);
    if (candidateKeys.has(candidate.key)) throw new WorkflowError(`Candidate '${candidate.key}' is duplicated in this analysis.`, 400);
    candidateKeys.add(candidate.key);
    if (!hasTextList(candidate.feedbackIds)) throw new WorkflowError(`Candidate '${candidate.key}' needs feedback evidence.`, 400);
    for (const feedbackId of candidate.feedbackIds) {
      if (!productFeedback.has(feedbackId)) throw new WorkflowError(`Feedback '${feedbackId}' does not belong to product '${product.id}'.`, 400);
      if (feedbackIds.has(feedbackId)) throw new WorkflowError(`Feedback '${feedbackId}' cannot be assigned to more than one candidate.`, 400);
      feedbackIds.add(feedbackId);
    }
  }
  const matchKeys = new Set<string>();
  const ticketIds = new Set<string>();
  for (const ticket of input.existingTickets ?? []) {
    if (!hasText(ticket.id) || !hasText(ticket.title)) throw new WorkflowError("Each existing ticket needs an ID and title.", 400);
    if (ticketIds.has(ticket.id)) throw new WorkflowError(`Existing ticket '${ticket.id}' is duplicated.`, 400);
    ticketIds.add(ticket.id);
  }
  for (const match of input.matches ?? []) {
    if (!hasText(match.candidateKey) || !candidateKeys.has(match.candidateKey)) throw new WorkflowError("Every match must identify an analyzed candidate.", 400);
    if (matchKeys.has(match.candidateKey)) throw new WorkflowError(`Candidate '${match.candidateKey}' has more than one match.`, 400);
    matchKeys.add(match.candidateKey);
  }
}
function validateMatch(match: AnalysisMatch | undefined, inventory: string[], tickets: ReadonlyMap<string, ExistingTicket>): void {
  if (match === undefined) return;
  if (!["unmet", "fulfilled", "unmet-extension", "uncertain"].includes(match.disposition)) throw new WorkflowError("Candidate match disposition is invalid.", 400);
  if (match.existingFunctionality !== undefined && !inventory.includes(match.existingFunctionality)) throw new WorkflowError(`Existing functionality '${match.existingFunctionality}' is not in the verified inventory.`, 400);
  if (["fulfilled", "unmet-extension"].includes(match.disposition) && !hasText(match.existingFunctionality)) throw new WorkflowError(`${match.disposition} matches require verified existing functionality.`, 400);
  if (match.existingTicketId !== undefined && (!hasText(match.existingTicketId) || !tickets.has(match.existingTicketId))) throw new WorkflowError("Existing ticket matches must reference a checked ticket.", 400);
  if (match.disposition === "uncertain" && (!hasText(match.clarificationQuestion) || !hasTextList(match.suggestedInterpretations))) throw new WorkflowError("Uncertain matches require a clarification question and suggested interpretations.", 400);
}
function withoutCandidateKey(match: AnalysisMatch, tickets: ReadonlyMap<string, ExistingTicket>): CandidateMatch {
  const { candidateKey: _, ...candidateMatch } = match;
  const ticket = candidateMatch.existingTicketId === undefined ? undefined : tickets.get(candidateMatch.existingTicketId);
  return ticket === undefined ? candidateMatch : { ...candidateMatch, existingTicketTitle: ticket.title };
}
function evidenceFor(candidate: Candidate, feedbackById: Map<string, Feedback>): Array<Omit<Feedback, "productId">> { return candidate.feedbackIds.map((feedbackId) => { const feedback = feedbackById.get(feedbackId); if (feedback === undefined) throw new Error(`Missing candidate feedback '${feedbackId}'.`); const { productId: _, ...evidence } = feedback; return evidence; }); }
function asFeatureCandidate(candidate: Candidate, feedbackById: Map<string, Feedback>, reused: boolean): object {
  const result: Record<string, unknown> = { key: candidate.key, underlyingNeed: candidate.underlyingNeed, status: candidate.match?.existingTicketId === undefined ? candidate.match?.disposition ?? "unmet" : "existing-ticket" };
  if (candidate.match?.existingFunctionality !== undefined) result.existingFunctionality = candidate.match.existingFunctionality;
  if (candidate.match?.existingTicketId !== undefined) result.existingTicket = { id: candidate.match.existingTicketId, title: candidate.match.existingTicketTitle };
  if (candidate.match?.clarificationQuestion !== undefined) result.clarificationQuestion = candidate.match.clarificationQuestion;
  if (candidate.match?.suggestedInterpretations !== undefined) result.suggestedInterpretations = candidate.match.suggestedInterpretations;
  if (reused) result.reusedCandidate = true;
  result.evidence = evidenceFor(candidate, feedbackById);
  return result;
}
function asBugCandidate(candidate: Candidate, feedbackById: Map<string, Feedback>): object { return { key: candidate.key, underlyingNeed: candidate.underlyingNeed, evidence: evidenceFor(candidate, feedbackById) }; }
function unique(values: string[]): string[] { return [...new Set(values)]; }
function mergeProfile(current: ProductProfile, patch: ProductProfile): ProductProfile { return { ...current, ...patch, repository: patch.repository === undefined ? current.repository : { ...current.repository, ...patch.repository } }; }
function validateProfile(profile: ProductProfile): void {
  rejectCredentials(profile, "product profile");
  if (profile.repository?.provider !== undefined && !hasText(profile.repository.provider)) throw new WorkflowError("Repository provider must be text.", 400);
  if (profile.repository?.reference !== undefined && !hasText(profile.repository.reference)) throw new WorkflowError("Repository reference must be text.", 400);
  if (profile.repository?.url !== undefined && !isCredentialFreeHttpUrl(profile.repository.url)) throw new WorkflowError("Repository URL must be credential-free HTTP(S).", 400);
  if (profile.repository?.defaultBranch !== undefined && !hasText(profile.repository.defaultBranch)) throw new WorkflowError("Repository default branch must be text.", 400);
  if (profile.repository?.documentationReferences !== undefined && !hasTextList(profile.repository.documentationReferences)) throw new WorkflowError("Repository documentation references must be non-empty text.", 400);
  for (const [label, value] of Object.entries(profile)) if (value !== undefined && ["feedbackIntake", "ticketDestination", "approver", "validationInstructions", "previewInstructions", "timezone", "proposalTime", "approvalDeadline", "buildWindow"].includes(label) && !hasText(value)) throw new WorkflowError(`${label} must be text.`, 400);
  if (profile.goals !== undefined && !hasTextList(profile.goals)) throw new WorkflowError("Goals must be non-empty text.", 400);
  if (profile.inventory !== undefined && !hasTextList(profile.inventory)) throw new WorkflowError("Inventory must be non-empty text.", 400);
  if (profile.restrictedAreas !== undefined && !hasTextList(profile.restrictedAreas)) throw new WorkflowError("Restricted areas must be non-empty text.", 400);
  if (profile.runtimeMinutes !== undefined && !hasPositiveNumber(profile.runtimeMinutes)) throw new WorkflowError("Runtime minutes must be a positive number.", 400);
  if (profile.spendingLimit !== undefined && !hasPositiveNumber(profile.spendingLimit)) throw new WorkflowError("Spending limit must be a positive number.", 400);
  if (profile.integrations !== undefined && !hasDeclaredLimitCapabilities(profile.integrations)) throw new WorkflowError("Integrations must have credential-free HTTP(S) endpoints and declare runtime and spending-limit capabilities.", 400);
}
function hasRepositoryIdentity(repository: RepositoryContext | undefined): boolean { return hasText(repository?.provider) && hasText(repository.reference) && isCredentialFreeHttpUrl(repository.url); }
function hasText(value: unknown): value is string { return typeof value === "string" && value.trim() !== ""; }
function hasTextList(value: unknown): value is string[] { return Array.isArray(value) && value.length > 0 && value.every(hasText); }
function hasPositiveNumber(value: unknown): value is number { return typeof value === "number" && Number.isFinite(value) && value > 0; }
function hasDeclaredLimitCapabilities(value: unknown): value is Record<string, IntegrationReference> { return isRecord(value) && Object.entries(value).length > 0 && Object.entries(value).every(([name, integration]) => hasText(name) && isRecord(integration) && isCredentialFreeHttpUrl(integration.endpoint) && hasTextList(integration.capabilities) && integration.capabilities.includes("runtime-limit") && integration.capabilities.includes("spending-limit")); }
function hasValidTimezone(value: unknown): boolean { if (!hasText(value)) return false; try { Intl.DateTimeFormat(undefined, { timeZone: value }); return true; } catch { return false; } }
function hasTime(value: unknown): boolean { return hasText(value) && /^([01]\d|2[0-3]):[0-5]\d$/.test(value); }
function isCredentialFreeHttpUrl(value: unknown): boolean { if (!hasText(value)) return false; try { const url = new URL(value); return (url.protocol === "http:" || url.protocol === "https:") && url.username === "" && url.password === "" && ![...url.searchParams.keys()].some((key) => credentialFieldPattern.test(key)); } catch { return false; } }
function requireText(value: string, label: string): void { if (!hasText(value)) throw new WorkflowError(`A ${label} is required.`, 400); }
function rejectCredentials(value: unknown, location: string): void { if (typeof value === "string") { if (credentialValuePattern.test(value)) throw new WorkflowError(`Credentials must stay outside ${location}.`, 400); return; } if (Array.isArray(value)) value.forEach((item) => rejectCredentials(item, location)); else if (isRecord(value)) Object.entries(value).forEach(([key, nested]) => { if (credentialFieldPattern.test(key)) throw new WorkflowError(`Credentials must stay outside ${location}.`, 400); rejectCredentials(nested, location); }); }
function requireCredentialFreeSource(source: string): void { if (!sourceReferencePattern.test(source)) throw new WorkflowError("Feedback source must be a credential-free source reference.", 400); }
const credentialFieldPattern = /credential|secret|token|password|api[_-]?key|access[_-]?token|api[_-]?token/i;
const credentialValuePattern = /\b(?:api[_-]?key|access[_-]?token|api[_-]?token|secret|password)\b\s*[:=]\s*\S+|\bbearer\s+\S+/i;
const sourceReferencePattern = /^[a-z][a-z0-9_-]*:[a-z0-9._-]+(?::[a-z0-9._-]+)*$/i;
function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null && !Array.isArray(value); }
function isMissingFile(error: unknown): error is NodeJS.ErrnoException { return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT"; }
