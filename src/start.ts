import { bearerTokenAuthenticator, createWorkflowServer } from "./server.ts";

const dataDirectory = process.env.WORKFLOW_DATA_DIRECTORY ?? ".data";
const port = Number(process.env.PORT ?? "3000");
const tokens = new Map(
  Object.entries(readTokenMapping(process.env.WORKFLOW_AUTH_TOKENS)),
);

createWorkflowServer(dataDirectory, bearerTokenAuthenticator(tokens)).listen(
  port,
  "127.0.0.1",
  () => {
    process.stdout.write(
      `Feedback workflow listening on http://127.0.0.1:${port}\n`,
    );
  },
);

function readTokenMapping(raw: string | undefined): Record<string, string> {
  if (raw === undefined)
    throw new Error(
      "WORKFLOW_AUTH_TOKENS must be a JSON object mapping bearer tokens to owner IDs.",
    );
  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      Array.isArray(parsed) ||
      Object.entries(parsed).length === 0 ||
      Object.entries(parsed).some(
        ([token, owner]) =>
          token.trim() === "" ||
          typeof owner !== "string" ||
          owner.trim() === "",
      )
    )
      throw new Error("invalid");
    return parsed as Record<string, string>;
  } catch {
    throw new Error(
      "WORKFLOW_AUTH_TOKENS must be a non-empty JSON object mapping bearer tokens to owner IDs.",
    );
  }
}
