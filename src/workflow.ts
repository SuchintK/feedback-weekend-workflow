import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

export type ProductConfiguration = {
  goals?: string[];
  integrations?: Record<string, string>;
  approver?: string;
  inventory?: string[];
  schedule?: string;
  validationInstructions?: string;
  restrictedAreas?: string[];
  runtimeMinutes?: number;
  spendingLimit?: number;
};

export type Product = {
  id: string;
  name: string;
  ownerId: string;
  configuration: ProductConfiguration;
};

export type Feedback = {
  id: string;
  productId: string;
  customerId: string;
  text: string;
  source: string;
  receivedAt: string;
};

type StoredWorkflow = {
  products: Product[];
  feedback: Feedback[];
};

const requiredBuildSettings = [
  "goals",
  "integrations",
  "approver",
  "inventory",
  "schedule",
  "validationInstructions",
  "restrictedAreas",
  "runtimeMinutes",
  "spendingLimit",
] as const;

export class Workflow {
  readonly #filePath: string;

  constructor(dataDirectory: string) {
    this.#filePath = join(dataDirectory, "workflow.json");
  }

  registerProduct(input: { id: string; name: string; ownerId: string; configuration?: ProductConfiguration }): Product {
    requireText(input.id, "product id");
    requireText(input.name, "product name");
    requireText(input.ownerId, "product owner id");
    rejectCredentials(input.configuration);

    const data = this.read();
    if (data.products.some((product) => product.id === input.id)) {
      throw new Error(`Product '${input.id}' is already registered.`);
    }

    const product: Product = {
      id: input.id,
      name: input.name,
      ownerId: input.ownerId,
      configuration: input.configuration ?? {},
    };
    data.products.push(product);
    this.write(data);
    return product;
  }

  submitFeedback(input: Omit<Feedback, "id">): Feedback {
    requireText(input.productId, "product id");
    requireText(input.customerId, "customer id");
    requireText(input.text, "feedback text");
    requireText(input.source, "feedback source");
    requireText(input.receivedAt, "feedback date");
    rejectCredentials(input.text, "feedback");
    rejectCredentials(input.source, "feedback");
    if (Number.isNaN(Date.parse(input.receivedAt))) {
      throw new Error("Feedback date must be an ISO-8601 date.");
    }

    const data = this.read();
    if (!data.products.some((product) => product.id === input.productId)) {
      throw new Error(`Product '${input.productId}' is not registered.`);
    }

    const feedback: Feedback = {
      id: `${input.productId}-${data.feedback.filter((item) => item.productId === input.productId).length + 1}`,
      ...input,
    };
    data.feedback.push(feedback);
    this.write(data);
    return feedback;
  }

  listFeedback(productId: string, actorId: string): Feedback[] {
    this.authorize(productId, actorId);
    return this.read().feedback.filter((feedback) => feedback.productId === productId);
  }

  validateBuildConfiguration(productId: string, actorId: string): { ready: boolean; missing: string[] } {
    const configuration = this.authorize(productId, actorId).configuration;
    const missing = requiredBuildSettings.filter((setting) => isMissing(configuration[setting]));
    return { ready: missing.length === 0, missing };
  }

  private getProduct(productId: string): Product {
    const product = this.read().products.find((item) => item.id === productId);
    if (product === undefined) {
      throw new Error(`Product '${productId}' is not registered.`);
    }
    return product;
  }

  private authorize(productId: string, actorId: string): Product {
    requireText(actorId, "actor id");
    const product = this.getProduct(productId);
    if (product.ownerId !== actorId) {
      throw new Error(`Actor '${actorId}' is not authorized to inspect product '${productId}'.`);
    }
    return product;
  }

  private read(): StoredWorkflow {
    try {
      return JSON.parse(readFileSync(this.#filePath, "utf8")) as StoredWorkflow;
    } catch (error) {
      if (isMissingFile(error)) {
        return { products: [], feedback: [] };
      }
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

function isMissing(value: unknown): boolean {
  return value === undefined
    || value === null
    || value === ""
    || (Array.isArray(value) && value.length === 0)
    || (isRecord(value) && Object.keys(value).length === 0);
}

function requireText(value: string, label: string): void {
  if (value.trim() === "") {
    throw new Error(`A ${label} is required.`);
  }
}

function rejectCredentials(value: unknown, location = "product configuration"): void {
  if (typeof value === "string") {
    if (credentialPattern.test(value)) {
      throw new Error(`Credentials must stay outside ${location}.`);
    }
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      rejectCredentials(item, location);
    }
    return;
  }
  if (isRecord(value)) {
    for (const [key, nestedValue] of Object.entries(value)) {
      if (/credential|secret|token|password/i.test(key)) {
        throw new Error(`Credentials must stay outside ${location}.`);
      }
      rejectCredentials(nestedValue, location);
    }
  }
}

const credentialPattern = /\b(?:api[_-]?key|access[_-]?token|api[_-]?token|secret|password)\b/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isMissingFile(error: unknown): error is NodeJS.ErrnoException {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}
