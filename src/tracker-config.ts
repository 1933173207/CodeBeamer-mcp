import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import os from "node:os";

export interface TrackerConfigValue {
  id: number;
  name: string;
}

export interface TrackerConfigField {
  fieldName: string;
  optionalValues: TrackerConfigValue[];
}

export interface TrackerConfigEntry {
  trackerId: string | number;
  requiredFields: TrackerConfigField[];
}

let cachedConfig: TrackerConfigEntry[] | null = null;
let cachedConfigPath: string | null = null;

export function getTrackerConfigPath(): string {
  const home = process.env.USERPROFILE ?? process.env.HOME ?? os.homedir();
  return join(home, ".code-beamer-wiki", "config.json");
}

export function loadTrackerConfig(forceReload = false): TrackerConfigEntry[] {
  const configPath = getTrackerConfigPath();

  if (!forceReload && cachedConfig && cachedConfigPath === configPath) {
    return cachedConfig;
  }

  if (!existsSync(configPath)) {
    cachedConfig = [];
    cachedConfigPath = configPath;
    return cachedConfig;
  }

  try {
    const raw = readFileSync(configPath, "utf-8");
    const parsed = JSON.parse(raw) as TrackerConfigEntry[];
    cachedConfig = Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    throw new Error(
      `Failed to load tracker config from ${configPath}: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  cachedConfigPath = configPath;
  return cachedConfig;
}

export function getTrackerConfig(
  trackerId: number,
): TrackerConfigEntry | undefined {
  const config = loadTrackerConfig();
  return config.find((entry) => String(entry.trackerId) === String(trackerId));
}

export interface NormalizedCustomFieldInput {
  fieldName: string;
  value: string | number | Array<string | number>;
}

export function validateCustomFieldsByConfig(
  trackerConfig: TrackerConfigEntry,
  provided: NormalizedCustomFieldInput[],
): void {
  const providedMap = new Map(
    provided.map((p) => [stripHtml(p.fieldName).toLowerCase(), p]),
  );

  for (const requiredField of trackerConfig.requiredFields) {
    const normalizedRequiredName = stripHtml(requiredField.fieldName).toLowerCase();
    const providedField = providedMap.get(normalizedRequiredName);

    if (!providedField) {
      throw new Error(
        `Missing mandatory custom field '${requiredField.fieldName}' according to tracker config.`,
      );
    }

    const providedValues = Array.isArray(providedField.value)
      ? providedField.value
      : [providedField.value];

    const allowedIds = new Set(requiredField.optionalValues.map((v) => v.id));
    const allowedNames = new Set(
      requiredField.optionalValues.map((v) => v.name.toLowerCase()),
    );

    for (const v of providedValues) {
      const isAllowedById = typeof v === "number" && allowedIds.has(v);
      const isAllowedByName =
        typeof v === "string" && allowedNames.has(v.toLowerCase());

      if (!isAllowedById && !isAllowedByName) {
        const allowedList = requiredField.optionalValues
          .map((ov) => `${ov.name} (${ov.id})`)
          .join(", ");
        throw new Error(
          `Invalid value '${v}' for field '${requiredField.fieldName}'. Allowed values: ${allowedList}`,
        );
      }
    }
  }
}

export function resolveCustomFieldValueByConfig(
  trackerConfig: TrackerConfigEntry,
  fieldName: string,
  value: string | number | Array<string | number>,
): TrackerConfigValue | TrackerConfigValue[] | undefined {
  const normalizedFieldName = stripHtml(fieldName).toLowerCase();
  const fieldConfig = trackerConfig.requiredFields.find(
    (f) => stripHtml(f.fieldName).toLowerCase() === normalizedFieldName,
  );

  if (!fieldConfig) return undefined;

  const values = Array.isArray(value) ? value : [value];
  const resolved: TrackerConfigValue[] = [];

  for (const v of values) {
    if (typeof v === "number") {
      const found = fieldConfig.optionalValues.find((ov) => ov.id === v);
      if (found) resolved.push(found);
    } else {
      const found = fieldConfig.optionalValues.find(
        (ov) => ov.name.toLowerCase() === v.toLowerCase(),
      );
      if (found) resolved.push(found);
    }
  }

  return Array.isArray(value) ? resolved : resolved[0];
}

export function formatTrackerConfig(config: TrackerConfigEntry): string {
  const lines: string[] = [
    `## Tracker Config: ${config.trackerId}`,
    "",
    "### Required Fields",
    "",
    "| Field | Allowed Values |",
    "|-------|----------------|",
  ];

  for (const field of config.requiredFields) {
    const values = field.optionalValues
      .map((v) => `${v.name} (${v.id})`)
      .join(", ");
    lines.push(`| ${field.fieldName} | ${values} |`);
  }

  return lines.join("\n");
}

function stripHtml(input: string): string {
  return input.replace(/<[^>]+>/g, "").trim();
}
