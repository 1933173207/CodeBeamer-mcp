import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CodebeamerClient } from "../client/codebeamer-client.js";
import {
  getTrackerConfig,
  saveTrackerConfig,
  formatTrackerConfig,
  getTrackerConfigPath,
  type TrackerConfigEntry,
  type TrackerConfigField,
} from "../tracker-config.js";

function stripHtml(input: string): string {
  return input.replace(/<[^>]+>/g, "").trim();
}

function parseMandatoryItemTypes(formula: string): string[] {
  const itemTypes = new Set<string>();
  const simpleRegex = /categories\[0\]\.name\s*==\s*['"]([^'"]+)['"]/gi;
  let match: RegExpExecArray | null;
  while ((match = simpleRegex.exec(formula)) !== null) {
    itemTypes.add(match[1]);
  }
  return Array.from(itemTypes);
}

async function buildTrackerConfig(
  trackerId: number,
  client: CodebeamerClient,
): Promise<{ config: TrackerConfigEntry; skipped: string[] }> {
  const schema = await client.getTrackerSchema(trackerId);
  const fieldMap = new Map<string, TrackerConfigField>();
  const skipped: string[] = [];

  for (const field of schema) {
    if (!field.mandatoryIfDependencyFormula) continue;

    const itemTypes = parseMandatoryItemTypes(field.mandatoryIfDependencyFormula);
    if (itemTypes.length === 0) continue;

    const fieldName = stripHtml(field.name);
    const optionsResult = await client.getFieldOptions(trackerId, fieldName);

    if (optionsResult.options.length === 0) {
      skipped.push(
        `${fieldName}: could not discover options (field type: ${field.type}). Please populate it manually in the config.`,
      );
      continue;
    }

    const optionalValues = optionsResult.options.map((o) => ({
      id: o.id,
      name: o.name,
    }));

    const existing = fieldMap.get(fieldName);
    if (existing) {
      existing.mandatoryFor = Array.from(
        new Set([...(existing.mandatoryFor ?? []), ...itemTypes]),
      );
    } else {
      fieldMap.set(fieldName, {
        fieldName,
        optionalValues,
        mandatoryFor: itemTypes,
      });
    }
  }

  const config: TrackerConfigEntry = {
    trackerId: String(trackerId),
    requiredFields: Array.from(fieldMap.values()),
  };

  return { config, skipped };
}

export function registerTrackerConfigTool(
  server: McpServer,
  client: CodebeamerClient,
): void {
  server.registerTool(
    "get_tracker_config",
    {
      title: "Get Tracker Config",
      description:
        "Read the local tracker configuration file from %USERPROFILE%/.codebeamer-mcp-wiki/config.json. " +
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
              text: `No local config found for tracker ${trackerId}. The config file path is:\n\n${getTrackerConfigPath()}\n\nUse init_tracker_config to generate the configuration from the live Codebeamer schema.`,
            },
          ],
        };
      }

      return {
        content: [{ type: "text", text: formatTrackerConfig(config) }],
      };
    },
  );

  server.registerTool(
    "init_tracker_config",
    {
      title: "Init Tracker Config",
      description:
        "Discover all mandatory custom fields and their allowed values for a tracker from the live Codebeamer schema, " +
        "then write them to the local config file at %USERPROFILE%/.codebeamer-mcp-wiki/config.json. " +
        "You must run this before create_item or update_item can use customFields for this tracker.",
      inputSchema: {
        trackerId: z
          .number()
          .int()
          .positive()
          .describe("Numeric tracker ID to discover and initialize config for"),
      },
    },
    async ({ trackerId }) => {
      const { config, skipped } = await buildTrackerConfig(trackerId, client);
      saveTrackerConfig(config, true);

      const lines: string[] = [
        `## Tracker config initialized for tracker ${trackerId}`,
        "",
        `Saved to: ${getTrackerConfigPath()}`,
        "",
        formatTrackerConfig(config),
      ];

      if (skipped.length > 0) {
        lines.push(
          "",
          "### Skipped fields (could not discover options automatically)",
          "",
          ...skipped.map((s) => `- ${s}`),
        );
      }

      return { content: [{ type: "text", text: lines.join("\n") }] };
    },
  );
}
