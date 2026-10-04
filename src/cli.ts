import { readFileSync } from "node:fs";
import { Workflow } from "./workflow.ts";

type Request =
  | { action: "register-product"; product: { id: string; name: string; ownerId: string; configuration?: Record<string, unknown> } }
  | { action: "submit-feedback"; feedback: { productId: string; customerId: string; text: string; source: string; receivedAt: string } }
  | { action: "list-feedback"; productId: string }
  | { action: "validate-build-configuration"; productId: string };

const dataDirectory = readDataDirectory(process.argv.slice(2));

try {
  const request = JSON.parse(readFileSync(0, "utf8")) as Request;
  const workflow = new Workflow(dataDirectory);
  const response = handle(workflow, request, readActorId());
  process.stdout.write(`${JSON.stringify(response)}\n`);
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}

function handle(workflow: Workflow, request: Request, actorId: string): object {
  switch (request.action) {
    case "register-product":
      return { product: workflow.registerProduct(request.product) };
    case "submit-feedback":
      return { feedback: workflow.submitFeedback(request.feedback) };
    case "list-feedback":
      return { feedback: workflow.listFeedback(request.productId, actorId) };
    case "validate-build-configuration":
      return workflow.validateBuildConfiguration(request.productId, actorId);
  }
}

function readActorId(): string {
  const actorId = process.env.WORKFLOW_ACTOR_ID;
  if (actorId === undefined || actorId.trim() === "") {
    throw new Error("WORKFLOW_ACTOR_ID is required.");
  }
  return actorId;
}

function readDataDirectory(arguments_: string[]): string {
  const dataDirectoryIndex = arguments_.indexOf("--data-dir");
  if (dataDirectoryIndex === -1 || arguments_[dataDirectoryIndex + 1] === undefined) {
    throw new Error("Usage: workflow --data-dir <directory>");
  }
  return arguments_[dataDirectoryIndex + 1];
}
