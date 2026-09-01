import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CodebeamerClient } from "../client/codebeamer-client.js";
import type {
  CbCreateItemRequest,
  CbTrackerSchemaField,
  CbUpdateItemRequest,
} from "../client/codebeamer-client.js";
import { formatItem } from "../formatters/item-formatter.js";
import {
  getTrackerConfig,
  validateCustomFieldsByConfig,
  type TrackerConfigEntry,
} from "../tracker-config.js";

interface CustomFieldInput {
  fieldName: string;
  value: string | number | Array<string | number>;
}

function stripHtml(input: string): string {
  return input.replace(/<[^>]+>/g, "").trim();
}

function resolveValueByConfig(
  trackerConfig: TrackerConfigEntry,
  fieldName: string,
  value: string | number,
): { id: number; name: string } | undefined {
  const normalizedFieldName = stripHtml(fieldName).toLowerCase();
  const fieldConfig = trackerConfig.requiredFields.find(
    (f) => stripHtml(f.fieldName).toLowerCase() === normalizedFieldName,
  );
  if (!fieldConfig) return undefined;

  if (typeof value === "number") {
    return fieldConfig.optionalValues.find((ov) => ov.id === value);
  }
  return fieldConfig.optionalValues.find(
    (ov) => ov.name.toLowerCase() === value.toLowerCase(),
  );
}

function findSchemaField(
  schema: CbTrackerSchemaField[],
  fieldName: string,
): CbTrackerSchemaField | undefined {
  const normalized = fieldName.toLowerCase().trim();
  return schema.find((f) => {
    if (f.legacyRestName?.toLowerCase() === normalized) return true;
    return stripHtml(f.name).toLowerCase() === normalized;
  });
}

function normalizeCustomFieldValue(
  value: string | number | Array<string | number>,
): Array<string | number> {
  return Array.isArray(value) ? value : [value];
}

function resolveCustomFields(
  inputs: CustomFieldInput[],
  schema: CbTrackerSchemaField[],
  trackerConfig?: TrackerConfigEntry,
): NonNullable<CbCreateItemRequest["customFields"]> {
  const result: NonNullable<CbCreateItemRequest["customFields"]> = [];

  for (const input of inputs) {
    const field = findSchemaField(schema, input.fieldName);
    if (!field) {
      throw new Error(
        `Custom field '${input.fieldName}' not found in tracker schema.`,
      );
    }

    const rawValues = normalizeCustomFieldValue(input.value);
    const base = { fieldId: field.id, name: stripHtml(field.name) };

    if (field.type === "OptionChoiceField") {
      if (!field.options || field.options.length === 0) {
        throw new Error(
          `Custom field '${input.fieldName}' has no defined options.`,
        );
      }
      const resolved = rawValues.map((v) => {
        const configValue = trackerConfig
          ? resolveValueByConfig(trackerConfig, input.fieldName, v)
          : undefined;
        if (configValue && typeof configValue === "object" && "id" in configValue) {
          return { id: configValue.id, name: configValue.name, type: "ChoiceOptionReference" };
        }

        const option = field.options!.find((o) => {
          if (typeof v === "number" || /^\d+$/.test(String(v))) {
            return String(o.id) === String(v);
          }
          return o.name.toLowerCase() === String(v).toLowerCase();
        });
        if (!option) {
          throw new Error(
            `Invalid value '${v}' for custom field '${input.fieldName}'. ` +
              `Available options: ${field.options!.map((o) => o.name).join(", ")}`,
          );
        }
        return { id: option.id, name: option.name, type: "ChoiceOptionReference" };
      });
      result.push({ ...base, type: "ChoiceFieldValue", values: resolved });
      continue;
    }

    if (field.type === "TrackerItemChoiceField") {
      const resolved = rawValues.map((v) => {
        const configValue = trackerConfig
          ? resolveValueByConfig(trackerConfig, input.fieldName, v)
          : undefined;
        if (configValue && typeof configValue === "object" && "id" in configValue) {
          return { id: configValue.id, type: "TrackerItemReference" };
        }

        const id = typeof v === "number" ? v : Number(v);
        if (Number.isNaN(id)) {
          throw new Error(
            `Custom field '${input.fieldName}' requires a numeric tracker item ID, got '${v}'.`,
          );
        }
        return { id, type: "TrackerItemReference" };
      });
      result.push({ ...base, type: "ChoiceFieldValue", values: resolved });
      continue;
    }

    if (field.type === "UserChoiceField") {
      const resolved = rawValues.map((v) => {
        const id = typeof v === "number" ? v : Number(v);
        if (Number.isNaN(id)) {
          throw new Error(
            `Custom field '${input.fieldName}' requires a numeric user ID, got '${v}'.`,
          );
        }
        return { id, type: "UserReference" };
      });
      result.push({ ...base, type: "ChoiceFieldValue", values: resolved });
      continue;
    }

    if (field.type === "TextField") {
      result.push({ ...base, type: "TextFieldValue", value: String(rawValues[0]) });
      continue;
    }

    if (field.type === "WikiTextField") {
      result.push({ ...base, type: "WikiTextFieldValue", value: String(rawValues[0]) });
      continue;
    }

    if (field.type === "IntegerField") {
      result.push({ ...base, type: "IntegerFieldValue", value: Number(rawValues[0]) });
      continue;
    }

    if (field.type === "DecimalField") {
      result.push({ ...base, type: "DecimalFieldValue", value: Number(rawValues[0]) });
      continue;
    }

    if (field.type === "DateField") {
      result.push({ ...base, type: "DateFieldValue", value: String(rawValues[0]) });
      continue;
    }

    if (field.type === "BoolField") {
      result.push({ ...base, type: "BoolFieldValue", value: Boolean(rawValues[0]) });
      continue;
    }

    throw new Error(
      `Unsupported custom field type '${field.type}' for field '${input.fieldName}'.`,
    );
  }

  return result;
}

function validateMandatoryCustomFields(
  schema: CbTrackerSchemaField[],
  provided: CustomFieldInput[],
  itemTypeName: string | undefined,
): void {
  if (!itemTypeName) return;

  const providedNames = new Set(
    provided.map((p) => stripHtml(p.fieldName).toLowerCase()),
  );

  for (const field of schema) {
    if (!field.mandatoryIfDependencyFormula) continue;
    const match = field.mandatoryIfDependencyFormula.match(
      /categories\[0\]\.name\s*==\s*['"]([^'"]+)['"]/,
    );
    if (!match) continue;
    if (match[1].toLowerCase() !== itemTypeName.toLowerCase()) continue;

    const fieldName = stripHtml(field.name);
    const legacyName = field.legacyRestName;
    const isProvided =
      providedNames.has(fieldName.toLowerCase()) ||
      (legacyName ? providedNames.has(legacyName.toLowerCase()) : false);

    if (!isProvided) {
      throw new Error(
        `Missing mandatory custom field '${fieldName}' for item type '${itemTypeName}'.`,
      );
    }
  }
}

export function registerItemWriteTools(
  server: McpServer,
  client: CodebeamerClient,
): void {
  server.registerTool(
    "create_item",
    {
      title: "Create Item",
      description:
        "Create a new work item in a Codebeamer tracker. " +
        "Use get_tracker to discover available fields, statuses, and priorities. " +
        "Returns the created item with all fields.",
      inputSchema: {
        trackerId: z
          .number()
          .int()
          .positive()
          .describe("Numeric tracker ID to create the item in"),
        name: z.string().min(1).describe("Item summary / title"),
        description: z
          .string()
          .optional()
          .describe("Item description (plain text or wiki markup)"),
        descriptionFormat: z
          .enum(["PlainText", "Wiki"])
          .optional()
          .describe("Description format: PlainText or Wiki markup"),
        statusId: z
          .number()
          .int()
          .positive()
          .optional()
          .describe("Status ID (use get_tracker to see available statuses)"),
        priorityId: z
          .number()
          .int()
          .positive()
          .optional()
          .describe("Priority ID (use get_tracker to see available priorities)"),
        assignedToIds: z
          .array(z.number().int().positive())
          .optional()
          .describe("Array of user IDs to assign"),
        storyPoints: z
          .number()
          .int()
          .min(0)
          .optional()
          .describe("Story points estimate"),
        isFolder: z
          .boolean()
          .optional()
          .describe("Set to true to create a folder item instead of a regular item"),
        itemTypeName: z
          .string()
          .optional()
          .describe("Item type name as configured in the tracker (e.g. 'Folder', 'Informative'). Overrides isFolder."),
        parentId: z
          .number()
          .int()
          .positive()
          .optional()
          .describe("Parent item ID to nest this item inside (e.g. a folder)"),
        customFields: z
          .array(
            z.object({
              fieldName: z.string().describe("Field display name or legacyRestName"),
              value: z
                .union([z.string(), z.number(), z.array(z.union([z.string(), z.number()]))])
                .describe("Field value: option name/id, target item/user id, or plain text/number"),
            }),
          )
          .optional()
          .describe("Custom fields to set. Use get_tracker to discover available fields."),
      },
    },
    async ({ trackerId, name, description, descriptionFormat, statusId, priorityId, assignedToIds, storyPoints, isFolder, itemTypeName, parentId, customFields }) => {
      const data: CbCreateItemRequest = { name };
      const desiredType = itemTypeName ?? (isFolder ? "Folder" : undefined);
      const schema = await client.getTrackerSchema(trackerId);
      if (desiredType) {
        const typeField = schema.find((f) => f.trackerItemField === "categories" || f.legacyRestName === "type");
        const option = typeField?.options?.find((o) => o.name.toLowerCase() === desiredType.toLowerCase());
        if (option) {
          data.categories = [{ id: option.id, type: "ChoiceOptionReference" }];
        }
      }
      if (description !== undefined) data.description = description;
      if (descriptionFormat !== undefined) data.descriptionFormat = descriptionFormat;
      if (statusId !== undefined) data.status = { id: statusId };
      if (priorityId !== undefined) data.priority = { id: priorityId };
      if (assignedToIds !== undefined) data.assignedTo = assignedToIds.map((id) => ({ id }));
      if (storyPoints !== undefined) data.storyPoints = storyPoints;

      if (customFields && customFields.length > 0) {
        const trackerConfig = getTrackerConfig(trackerId);
        if (trackerConfig) {
          validateCustomFieldsByConfig(trackerConfig, customFields);
        } else {
          validateMandatoryCustomFields(schema, customFields, desiredType);
        }
        data.customFields = resolveCustomFields(customFields, schema, trackerConfig);
      }

      const item = await client.createItem(trackerId, data, parentId);
      return { content: [{ type: "text", text: formatItem(item) }] };
    },
  );

  server.registerTool(
    "update_item",
    {
      title: "Update Item",
      description:
        "Update fields on an existing Codebeamer work item. " +
        "Only provide the fields you want to change. " +
        "Supports custom fields via the customFields array. " +
        "Returns the updated item with all fields.",
      inputSchema: {
        itemId: z
          .number()
          .int()
          .positive()
          .describe("Numeric item ID to update"),
        name: z.string().min(1).optional().describe("New summary / title"),
        description: z
          .string()
          .optional()
          .describe("New description (plain text or wiki markup)"),
        descriptionFormat: z
          .enum(["PlainText", "Wiki"])
          .optional()
          .describe("New description format: PlainText or Wiki markup"),
        statusId: z
          .number()
          .int()
          .positive()
          .optional()
          .describe("New status ID"),
        priorityId: z
          .number()
          .int()
          .positive()
          .optional()
          .describe("New priority ID"),
        assignedToIds: z
          .array(z.number().int().positive())
          .optional()
          .describe("New array of assigned user IDs (replaces current)"),
        storyPoints: z
          .number()
          .int()
          .min(0)
          .optional()
          .describe("New story points estimate"),
        customFields: z
          .array(
            z.object({
              fieldName: z.string().describe("Field display name or legacyRestName"),
              value: z
                .union([z.string(), z.number(), z.array(z.union([z.string(), z.number()]))])
                .describe("Field value: option name/id, target item/user id, or plain text/number"),
            }),
          )
          .optional()
          .describe("Custom fields to update. Use get_tracker_config or get_tracker to discover available fields."),
      },
    },
    async ({ itemId, name, description, descriptionFormat, statusId, priorityId, assignedToIds, storyPoints, customFields }) => {
      const data: CbUpdateItemRequest = {};
      if (name !== undefined) data.name = name;
      if (description !== undefined) data.description = description;
      if (descriptionFormat !== undefined) data.descriptionFormat = descriptionFormat;
      if (statusId !== undefined) data.status = { id: statusId };
      if (priorityId !== undefined) data.priority = { id: priorityId };
      if (assignedToIds !== undefined) data.assignedTo = assignedToIds.map((id) => ({ id }));
      if (storyPoints !== undefined) data.storyPoints = storyPoints;

      if (customFields && customFields.length > 0) {
        const item = await client.getItem(itemId);
        const trackerId = item.tracker?.id;
        if (!trackerId) {
          throw new Error(`Cannot determine tracker for item ${itemId}`);
        }
        const schema = await client.getTrackerSchema(trackerId);
        const trackerConfig = getTrackerConfig(trackerId);
        if (trackerConfig) {
          validateCustomFieldsByConfig(trackerConfig, customFields);
        }
        data.customFields = resolveCustomFields(customFields, schema, trackerConfig);
      }

      const item = await client.updateItem(itemId, data);
      return { content: [{ type: "text", text: formatItem(item) }] };
    },
  );
}
