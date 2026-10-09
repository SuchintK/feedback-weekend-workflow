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

export type Product = {
  id: string;
  name: string;
  ownerId: string;
  profile: ProductProfile;
};
export type Feedback = {
  id: string;
  productId: string;
  customerId: string;
  originalText: string;
  sourceReference: string;
  receivedAt: string;
};
export type Readiness = {
  registered: boolean;
  analysisReady: boolean;
  buildReady: boolean;
  missingAnalysis: string[];
  missingBuild: string[];
};

type StoredWorkflow = { products: Product[]; feedback: Feedback[] };
type Requirement = {
  label: string;
  isSatisfied: (profile: ProductProfile) => boolean;
};

const analysisRequirements: Requirement[] = [
  { label: "goals", isSatisfied: (profile) => hasTextList(profile.goals) },
  {
    label: "repository",
    isSatisfied: (profile) => hasRepositoryIdentity(profile.repository),
  },
  {
    label: "repository.documentationReferences",
    isSatisfied: (profile) =>
      hasTextList(profile.repository?.documentationReferences),
  },
  {
    label: "inventory",
    isSatisfied: (profile) => hasTextList(profile.inventory),
  },
];

const buildOnlyRequirements: Requirement[] = [
  {
    label: "repository.defaultBranch",
    isSatisfied: (profile) => hasText(profile.repository?.defaultBranch),
  },
  {
    label: "ticketDestination",
    isSatisfied: (profile) => hasText(profile.ticketDestination),
  },
  { label: "approver", isSatisfied: (profile) => hasText(profile.approver) },
  {
    label: "validationInstructions",
    isSatisfied: (profile) => hasText(profile.validationInstructions),
  },
  {
    label: "previewInstructions",
    isSatisfied: (profile) => hasText(profile.previewInstructions),
  },
  {
    label: "restrictedAreas",
    isSatisfied: (profile) => hasTextList(profile.restrictedAreas),
  },
  {
    label: "timezone",
    isSatisfied: (profile) => hasValidTimezone(profile.timezone),
  },
  {
    label: "proposalTime",
    isSatisfied: (profile) => hasTime(profile.proposalTime),
  },
  {
    label: "approvalDeadline",
    isSatisfied: (profile) => hasTime(profile.approvalDeadline),
  },
  {
    label: "buildWindow",
    isSatisfied: (profile) => hasText(profile.buildWindow),
  },
  {
    label: "runtimeMinutes",
    isSatisfied: (profile) => hasPositiveNumber(profile.runtimeMinutes),
  },
  {
    label: "spendingLimit",
    isSatisfied: (profile) => hasPositiveNumber(profile.spendingLimit),
  },
  {
    label: "integrations",
    isSatisfied: (profile) =>
      hasDeclaredLimitCapabilities(profile.integrations),
  },
];

export class WorkflowError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export class Workflow {
  readonly #filePath: string;
  constructor(dataDirectory: string) {
    this.#filePath = join(dataDirectory, "workflow.json");
  }

  registerProduct(
    input: { id: string; name: string; profile: ProductProfile },
    ownerId: string,
  ): { product: Product; readiness: Readiness } {
    requireText(input.id, "product ID");
    requireText(input.name, "product name");
    requireText(ownerId, "owner identity");
    validateProfile(input.profile);
    if (!hasText(input.profile.feedbackIntake))
      throw new WorkflowError(
        "A feedback intake is required to register a product.",
        400,
      );
    const data = this.read();
    if (data.products.some((product) => product.id === input.id))
      throw new WorkflowError(
        `Product '${input.id}' is already registered.`,
        409,
      );
    const product: Product = {
      id: input.id,
      name: input.name,
      ownerId,
      profile: input.profile,
    };
    data.products.push(product);
    this.write(data);
    return { product, readiness: this.readiness(product) };
  }

  updateProductProfile(
    productId: string,
    patch: ProductProfile,
    ownerId: string,
  ): { product: Product; readiness: Readiness } {
    validateProfile(patch);
    if (Object.keys(patch).length === 0)
      throw new WorkflowError(
        "At least one product profile field is required.",
        400,
      );
    const data = this.read();
    const product = this.productForOwner(productId, ownerId, data);
    product.profile = mergeProfile(product.profile, patch);
    validateProfile(product.profile);
    this.write(data);
    return { product, readiness: this.readiness(product) };
  }

  submitFeedback(
    productId: string,
    input: Omit<Feedback, "id" | "productId">,
    ownerId: string,
  ): Feedback {
    requireText(productId, "product ID");
    requireText(input.customerId, "customer ID");
    requireText(input.originalText, "feedback text");
    requireText(input.sourceReference, "feedback source reference");
    requireText(input.receivedAt, "feedback date");
    requireText(ownerId, "owner identity");
    if (Number.isNaN(Date.parse(input.receivedAt)))
      throw new WorkflowError("Feedback date must be an ISO-8601 date.", 400);
    rejectCredentials(input.originalText, "feedback");
    requireCredentialFreeSource(input.sourceReference);
    const data = this.read();
    this.productForOwner(productId, ownerId, data);
    const feedback: Feedback = {
      id: `${productId}-${data.feedback.filter((item) => item.productId === productId).length + 1}`,
      productId,
      ...input,
    };
    data.feedback.push(feedback);
    this.write(data);
    return feedback;
  }

  inspectProduct(
    productId: string,
    ownerId: string,
  ): { product: Product; readiness: Readiness; feedback: Feedback[] } {
    const product = this.productForOwner(productId, ownerId, this.read());
    return {
      product,
      readiness: this.readiness(product),
      feedback: this.read().feedback.filter(
        (feedback) => feedback.productId === productId,
      ),
    };
  }

  private productForOwner(
    productId: string,
    ownerId: string,
    data: StoredWorkflow,
  ): Product {
    requireText(ownerId, "owner identity");
    const product = data.products.find((item) => item.id === productId);
    if (product === undefined)
      throw new WorkflowError(`Product '${productId}' is not registered.`, 404);
    if (product.ownerId !== ownerId)
      throw new WorkflowError(
        `Owner '${ownerId}' is not authorized to access product '${productId}'.`,
        403,
      );
    return product;
  }

  private readiness(product: Product): Readiness {
    const missingAnalysis = missingRequirements(
      product.profile,
      analysisRequirements,
    );
    const missingBuildOnly = missingRequirements(
      product.profile,
      buildOnlyRequirements,
    );
    return {
      registered: true,
      analysisReady: missingAnalysis.length === 0,
      buildReady: missingAnalysis.length === 0 && missingBuildOnly.length === 0,
      missingAnalysis,
      missingBuild: [...missingAnalysis, ...missingBuildOnly],
    };
  }

  private read(): StoredWorkflow {
    try {
      return JSON.parse(readFileSync(this.#filePath, "utf8")) as StoredWorkflow;
    } catch (error) {
      if (isMissingFile(error)) return { products: [], feedback: [] };
      throw error;
    }
  }

  private write(data: StoredWorkflow): void {
    mkdirSync(dirname(this.#filePath), { recursive: true });
    const temporaryFile = `${this.#filePath}.tmp`;
    writeFileSync(temporaryFile, `${JSON.stringify(data, null, 2)}\n`, "utf8");
    renameSync(temporaryFile, this.#filePath);
  }
}

function missingRequirements(
  profile: ProductProfile,
  requirements: Requirement[],
): string[] {
  return requirements
    .filter((requirement) => !requirement.isSatisfied(profile))
    .map((requirement) => requirement.label);
}
function mergeProfile(
  current: ProductProfile,
  patch: ProductProfile,
): ProductProfile {
  return {
    ...current,
    ...patch,
    repository:
      patch.repository === undefined
        ? current.repository
        : { ...current.repository, ...patch.repository },
  };
}
function validateProfile(profile: ProductProfile): void {
  rejectCredentials(profile, "product profile");
  if (
    profile.repository?.provider !== undefined &&
    !hasText(profile.repository.provider)
  )
    throw new WorkflowError("Repository provider must be text.", 400);
  if (
    profile.repository?.reference !== undefined &&
    !hasText(profile.repository.reference)
  )
    throw new WorkflowError("Repository reference must be text.", 400);
  if (
    profile.repository?.url !== undefined &&
    !isCredentialFreeHttpUrl(profile.repository.url)
  )
    throw new WorkflowError(
      "Repository URL must be credential-free HTTP(S).",
      400,
    );
  if (
    profile.repository?.defaultBranch !== undefined &&
    !hasText(profile.repository.defaultBranch)
  )
    throw new WorkflowError("Repository default branch must be text.", 400);
  if (
    profile.repository?.documentationReferences !== undefined &&
    !hasTextList(profile.repository.documentationReferences)
  )
    throw new WorkflowError(
      "Repository documentation references must be non-empty text.",
      400,
    );
  for (const [label, value] of Object.entries(profile))
    if (
      value !== undefined &&
      [
        "feedbackIntake",
        "ticketDestination",
        "approver",
        "validationInstructions",
        "previewInstructions",
        "timezone",
        "proposalTime",
        "approvalDeadline",
        "buildWindow",
      ].includes(label) &&
      !hasText(value)
    )
      throw new WorkflowError(`${label} must be text.`, 400);
  if (profile.goals !== undefined && !hasTextList(profile.goals))
    throw new WorkflowError("Goals must be non-empty text.", 400);
  if (profile.inventory !== undefined && !hasTextList(profile.inventory))
    throw new WorkflowError("Inventory must be non-empty text.", 400);
  if (
    profile.restrictedAreas !== undefined &&
    !hasTextList(profile.restrictedAreas)
  )
    throw new WorkflowError("Restricted areas must be non-empty text.", 400);
  if (
    profile.runtimeMinutes !== undefined &&
    !hasPositiveNumber(profile.runtimeMinutes)
  )
    throw new WorkflowError("Runtime minutes must be a positive number.", 400);
  if (
    profile.spendingLimit !== undefined &&
    !hasPositiveNumber(profile.spendingLimit)
  )
    throw new WorkflowError("Spending limit must be a positive number.", 400);
  if (
    profile.integrations !== undefined &&
    !hasDeclaredLimitCapabilities(profile.integrations)
  )
    throw new WorkflowError(
      "Integrations must have credential-free HTTP(S) endpoints and declare runtime and spending-limit capabilities.",
      400,
    );
}
function hasRepositoryIdentity(
  repository: RepositoryContext | undefined,
): boolean {
  return (
    hasText(repository?.provider) &&
    hasText(repository.reference) &&
    isCredentialFreeHttpUrl(repository.url)
  );
}
function hasText(value: unknown): value is string {
  return typeof value === "string" && value.trim() !== "";
}
function hasTextList(value: unknown): value is string[] {
  return Array.isArray(value) && value.length > 0 && value.every(hasText);
}
function hasPositiveNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}
function hasDeclaredLimitCapabilities(
  value: unknown,
): value is Record<string, IntegrationReference> {
  return (
    isRecord(value) &&
    Object.entries(value).length > 0 &&
    Object.entries(value).every(
      ([name, integration]) =>
        hasText(name) &&
        isRecord(integration) &&
        isCredentialFreeHttpUrl(integration.endpoint) &&
        hasTextList(integration.capabilities) &&
        integration.capabilities.includes("runtime-limit") &&
        integration.capabilities.includes("spending-limit"),
    )
  );
}
function hasValidTimezone(value: unknown): boolean {
  if (!hasText(value)) return false;
  try {
    Intl.DateTimeFormat(undefined, { timeZone: value });
    return true;
  } catch {
    return false;
  }
}
function hasTime(value: unknown): boolean {
  return hasText(value) && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}
function isCredentialFreeHttpUrl(value: unknown): boolean {
  if (!hasText(value)) return false;
  try {
    const url = new URL(value);
    return (
      (url.protocol === "http:" || url.protocol === "https:") &&
      url.username === "" &&
      url.password === "" &&
      ![...url.searchParams.keys()].some((key) =>
        credentialFieldPattern.test(key),
      )
    );
  } catch {
    return false;
  }
}
function requireText(value: string, label: string): void {
  if (!hasText(value)) throw new WorkflowError(`A ${label} is required.`, 400);
}
function rejectCredentials(value: unknown, location: string): void {
  if (typeof value === "string") {
    if (credentialValuePattern.test(value))
      throw new WorkflowError(
        `Credentials must stay outside ${location}.`,
        400,
      );
    return;
  }
  if (Array.isArray(value))
    value.forEach((item) => rejectCredentials(item, location));
  else if (isRecord(value))
    Object.entries(value).forEach(([key, nested]) => {
      if (credentialFieldPattern.test(key))
        throw new WorkflowError(
          `Credentials must stay outside ${location}.`,
          400,
        );
      rejectCredentials(nested, location);
    });
}
function requireCredentialFreeSource(source: string): void {
  if (!sourceReferencePattern.test(source))
    throw new WorkflowError(
      "Feedback source must be a credential-free source reference.",
      400,
    );
}
const credentialFieldPattern =
  /credential|secret|token|password|api[_-]?key|access[_-]?token|api[_-]?token/i;
const credentialValuePattern =
  /\b(?:api[_-]?key|access[_-]?token|api[_-]?token|secret|password)\b\s*[:=]\s*\S+|\bbearer\s+\S+/i;
const sourceReferencePattern =
  /^[a-z][a-z0-9_-]*:[a-z0-9._-]+(?::[a-z0-9._-]+)*$/i;
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function isMissingFile(error: unknown): error is NodeJS.ErrnoException {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "ENOENT"
  );
}
