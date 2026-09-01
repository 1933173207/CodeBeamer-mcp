import type {
  CbTrackerSchemaField,
  CbFieldOption,
} from "../client/codebeamer-client.js";

export function formatFieldOptions(result: {
  field: CbTrackerSchemaField;
  options: CbFieldOption[];
  note?: string;
}): string {
  const { field, options, note } = result;
  const lines: string[] = [
    `## Field: ${field.name.replace(/<[^>]+>/g, "").trim()}`,
    "",
    `- **Field ID:** ${field.id}`,
    `- **Type:** ${field.type ?? "-"}`,
    `- **Reference Type:** ${field.referenceType ?? "-"}`,
    `- **Multiple Values:** ${field.multipleValues ? "Yes" : "No"}`,
    `- **Required For:** ${field.mandatoryIfDependencyFormula ?? "-"}`,
  ];

  if (options.length > 0) {
    lines.push("", "### Options", "");
    lines.push("| ID | Name | Type | Description |");
    lines.push("|----|------|------|-------------|");
    for (const opt of options) {
      lines.push(
        `| ${opt.id} | ${opt.name} | ${opt.type ?? "-"} | ${opt.description ?? "-"} |`,
      );
    }
  } else {
    lines.push("", "_No predefined options found._");
  }

  if (note) {
    lines.push("", `**Note:** ${note}`);
  }

  return lines.join("\n");
}