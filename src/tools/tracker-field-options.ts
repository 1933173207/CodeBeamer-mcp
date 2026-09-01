import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CodebeamerClient } from "../client/codebeamer-client.js";
import { formatFieldOptions } from "../formatters/field-options-formatter.js";

export function registerTrackerFieldOptionsTool(
  server: McpServer,
  client: CodebeamerClient,
): void {
  server.registerTool(
    "get_field_options",
    {
      title: "Get Field Options",
      description:
        "Discover valid values for a field in a Codebeamer tracker. " +
        "For OptionChoiceField it returns the configured options. " +
        "For TrackerItemChoiceField it tries to discover the referenced tracker items automatically. " +
        "For UserChoiceField it returns users, and for TrackerChoiceField it returns trackers. " +
        "Use this before create_item or update_item when you are unsure what value to provide in customFields.",
      inputSchema: {
        trackerId: z
          .number()
          .int()
          .positive()
          .describe("Numeric tracker ID that contains the field"),
        fieldName: z
          .string()
          .min(1)
          .describe("Field display name or legacyRestName, e.g. 'ECU Variant' or 'ASIL'"),
      },
    },
    async ({ trackerId, fieldName }) => {
      const result = await client.getFieldOptions(trackerId, fieldName);
      return { content: [{ type: "text", text: formatFieldOptions(result) }] };
    },
  );
}