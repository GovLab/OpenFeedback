import { z } from "zod";

// Thrown when a successful HTTP response does not match its schema. Callers
// already handle request failures, so this reaches the same error state.
export class UnexpectedResponseError extends Error {
  constructor() {
    super("The server sent a response this page could not read. Please try again.");
    this.name = "UnexpectedResponseError";
  }
}

// Validates a response body at the fetch boundary. Logs the endpoint and the
// failing field paths only, never the data itself, because it can hold feedback text.
export async function checkedResponse<S extends z.ZodType>(
  endpoint: string,
  schema: S,
  request: Promise<{ data: unknown }>
): Promise<z.output<S>> {
  const response = await request;
  const parsed = schema.safeParse(response.data);
  if (parsed.success) {
    return parsed.data;
  }
  console.error(`Unexpected response from ${endpoint}:`, z.prettifyError(parsed.error));
  throw new UnexpectedResponseError();
}
