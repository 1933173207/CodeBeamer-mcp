import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  getTrackerConfig,
  formatTrackerConfig,
} from "../tracker-config.js";

export function registerTrackerConfigTool(server: McpServer): void {
  server.registerTool(
    "get_tracker_config",
    {
      title: "Get Tracker Config",
      description:
        "Read the local tracker configuration file from %USERPROFILE%/.code-beamer-wiki/config.json. " +
        "Returns required custom fields and their allowed values for a specific tracker. " +
        "Use this before create_item or update_item to know which custom fields are mandatory and what values are allowed.",
      inputSchema: {
        trackerId: z
          .number()
          .int()
          .positive()
          .describe("Numeric tracker ID to look up in the local config"),
      },
    },
    async ({ trackerId }) => {
      const config = getTrackerConfig(trackerId);
      if (!config) {
        return {
          content: [
            {
              type: "text",
              text: `No local config found for tracker ${trackerId}. The config file path is:\n\n${process.env.USERPROFILE ?? process.env.HOME ?? "~"}\\.code-beamer-wiki\\config.json\n\nFalling back to dynamic schema discovery via get_tracker / get_field_options.`,
            },
          ],
        };
      }

      return {
        content: [{ type: "text", text: formatTrackerConfig(config) }],
      };
    },
  );
}
