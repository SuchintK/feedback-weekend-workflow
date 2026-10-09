import { config } from "dotenv";

/**
 * Loads local development configuration before the application reads
 * environment variables. Values supplied by the process take precedence.
 */
export function loadEnvironment(path?: string): void {
  config({ path, quiet: true });
}
