import { createWorkflowServer } from "./server.ts";

const dataDirectory = process.env.WORKFLOW_DATA_DIRECTORY ?? ".data";
const port = Number(process.env.PORT ?? "3000");

createWorkflowServer(dataDirectory).listen(port, "127.0.0.1", () => {
  process.stdout.write(`Feedback workflow listening on http://127.0.0.1:${port}\n`);
});
