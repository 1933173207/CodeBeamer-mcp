import { beforeAll, afterEach, afterAll } from "vitest";
import { setupServer } from "msw/node";
import { handlers, resetUpdatedItemFields } from "./mocks/handlers.js";

export const mockServer = setupServer(...handlers);

beforeAll(() => mockServer.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  mockServer.resetHandlers();
  resetUpdatedItemFields();
});
afterAll(() => mockServer.close());
