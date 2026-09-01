import { HttpClient } from "./http-client.js";

// --- Response types (only fields used by formatters) ---

export interface CbReference {
  id: number;
  name: string;
  type?: string;
}

export interface CbProject {
  id: number;
  name: string;
  keyName?: string;
  description?: string;
  category?: string;
  closed?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CbTracker {
  id: number;
  name: string;
  type?: CbReference;
  project?: CbReference;
  description?: string;
  keyName?: string;
}

export interface CbTrackerField {
  fieldId: number;
  name: string;
  type?: string;
  required?: boolean;
  hidden?: boolean;
}

export interface CbTrackerSchemaOption {
  id: number;
  name: string;
}

export interface CbTrackerSchemaField {
  id: number;
  name: string;
  type?: string;
  description?: string;
  trackerItemField?: string;
  legacyRestName?: string;
  options?: CbTrackerSchemaOption[];
  mandatoryIfDependencyFormula?: string;
  multipleValues?: boolean;
  referenceType?: string;
}

export interface CbFieldOption {
  id: number;
  name: string;
  type?: string;
  description?: string;
}

export interface CbTestStep {
  index?: number;
  actionDescription?: string;
  expectedResults?: string;
}

export interface CbItem {
  id: number;
  name: string;
  typeName?: string;
  description?: string | { markup?: string; value?: string };
  descriptionFormat?: string;
  tracker?: CbReference;
  project?: CbReference;
  status?: CbReference;
  priority?: CbReference;
  assignedTo?: CbReference[];
  categories?: CbReference[];
  createdAt?: string;
  updatedAt?: string;
  submittedAt?: string;
  createdBy?: CbReference;
  modifiedBy?: CbReference;
  storyPoints?: number;
  customFields?: Array<{ fieldId: number; name: string; type?: string; value?: unknown; values?: unknown[] }>;
}

export interface CbRelation {
  id: number;
  type?: CbReference;
  itemRevision?: { id: number; name: string; version?: number };
}

export interface CbItemRelationsPage {
  outgoingAssociations?: CbRelation[];
  incomingAssociations?: CbRelation[];
  upstreamReferences?: CbRelation[];
  downstreamReferences?: CbRelation[];
}

export interface CbComment {
  id: number;
  comment?: string;
  commentFormat?: string;
  createdAt?: string;
  createdBy?: CbReference;
}

export interface CbAttachment {
  id: number;
  name: string;
  description?: string;
  mimeType?: string;
  fileSize?: number;
  createdAt?: string;
  createdBy?: CbReference;
  modifiedAt?: string;
  modifiedBy?: CbReference;
}

export interface CbUser {
  id: number;
  name: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  status?: string;
  registryDate?: string;
}

export interface CbTrackerItemReviewConfig {
  requiredApprovals?: number;
  requiredRejections?: number;
  requiredSignature?: "NONE" | "PASSWORD" | "USERNAME_AND_PASSWORD";
  roleRequired?: boolean;
}

export interface CbTrackerItemReviewVote {
  user?: CbReference;
  asRole?: CbReference;
  decision?: "APPROVED" | "REJECTED" | "UNDECIDED";
  reviewedAt?: string;
}

export interface CbTrackerItemReview {
  config?: CbTrackerItemReviewConfig;
  result?: "APPROVED" | "REJECTED" | "UNDECIDED";
  reviewers?: CbTrackerItemReviewVote[];
  trackerItem?: { id: number; name: string; version?: number };
}

// --- Request types for write operations ---

export interface CbCreateItemRequest {
  name: string;
  description?: string;
  descriptionFormat?: "PlainText" | "Wiki";
  categories?: Array<{ id: number; type: string }>;
  status?: { id: number };
  priority?: { id: number };
  assignedTo?: Array<{ id: number }>;
  storyPoints?: number;
  customFields?: Array<{
    fieldId: number;
    name?: string;
    type: string;
    value?: unknown;
    values?: Array<{ id: number; name?: string; type: string }>;
  }>;
}

export interface CbUpdateItemRequest {
  name?: string;
  description?: string;
  descriptionFormat?: "PlainText" | "Wiki";
  status?: { id: number; type?: string };
  priority?: { id: number };
  assignedTo?: Array<{ id: number }>;
  storyPoints?: number;
  customFields?: Array<{ fieldId: number; type: string; values?: Array<{ id: number; type: string }>; value?: unknown }>;
}

export interface CbEditableField {
  fieldId: number;
  name: string;
  values?: Array<{ id: number; name?: string; type?: string }>;
  value?: unknown;
  type?: string;
}

export interface CbCreateCommentRequest {
  comment: string;
  commentFormat?: string;
}

export interface CbCreateAssociationRequest {
  from: { id: number };
  to: { id: number };
  type: { id: number };
  description?: string;
}

export interface CbAssociation {
  id: number;
  from?: CbReference;
  to?: CbReference;
  type?: CbReference;
  description?: string;
}

// --- Helpers ---

// Codebeamer API returns either a plain array or a paginated object depending on the endpoint/version.
// Known keys: "items" (query endpoint), "itemRefs" (tracker items endpoint in some versions).
function toArray<T>(response: unknown): T[] {
  if (Array.isArray(response)) return response as T[];
  if (response && typeof response === "object") {
    const obj = response as Record<string, unknown>;
    if (Array.isArray(obj["items"])) return obj["items"] as T[];
    if (Array.isArray(obj["itemRefs"])) return obj["itemRefs"] as T[];
    // Generic fallback: find first array-valued key
    for (const key of Object.keys(obj)) {
      if (Array.isArray(obj[key])) {
        console.error(`[codebeamer-mcp-wiki] Using response key "${key}" instead of "items"`);
        return obj[key] as T[];
      }
    }
    console.error("[codebeamer-mcp-wiki] No array found in response:", JSON.stringify(obj).slice(0, 300));
  }
  return [];
}

// --- Client ---

export class CodebeamerClient {
  constructor(private readonly http: HttpClient) {}

  // Projects
  async listProjects(page: number, pageSize: number): Promise<CbProject[]> {
    const raw = await this.http.get<unknown>("/projects", {
      params: { page, pageSize },
      resource: "projects",
    });
    return toArray(raw);
  }

  getProject(id: number): Promise<CbProject> {
    return this.http.get(`/projects/${id}`, { resource: `project ${id}` });
  }

  // Trackers
  async listTrackers(
    projectId: number,
    page: number,
    pageSize: number,
  ): Promise<CbTracker[]> {
    const raw = await this.http.get<unknown>(`/projects/${projectId}/trackers`, {
      params: { page, pageSize },
      resource: `trackers for project ${projectId}`,
    });
    return toArray(raw);
  }

  getTracker(id: number): Promise<CbTracker> {
    return this.http.get(`/trackers/${id}`, { resource: `tracker ${id}` });
  }

  getTrackerFields(id: number): Promise<CbTrackerField[]> {
    return this.http.get(`/trackers/${id}/fields`, {
      resource: `fields for tracker ${id}`,
    });
  }

  getTrackerSchema(id: number): Promise<CbTrackerSchemaField[]> {
    return this.http.get(`/trackers/${id}/schema`, {
      resource: `schema for tracker ${id}`,
    });
  }

  // Items
  getItem(id: number): Promise<CbItem> {
    return this.http.get(`/items/${id}`, { resource: `item ${id}` });
  }

  async listTrackerItems(
    trackerId: number,
    page: number,
    pageSize: number,
  ): Promise<{ items: CbItem[]; debug?: string }> {
    const raw = await this.http.get<unknown>("/items/query", {
      params: { queryString: `tracker.id IN (${trackerId})`, page, pageSize },
      resource: `items for tracker ${trackerId}`,
    });
    const items = toArray<CbItem>(raw);
    if (items.length > 0) return { items };

    // Items empty — also try the direct endpoint so we can show raw debug info
    let rawDirect: unknown;
    try {
      rawDirect = await this.http.get<unknown>(`/trackers/${trackerId}/items`, {
        params: { page, pageSize },
        resource: `items for tracker ${trackerId} (direct)`,
      });
    } catch {
      rawDirect = null;
    }
    const rawObj = raw as Record<string, unknown> | null;
    const directObj = rawDirect as Record<string, unknown> | null;
    const queryTotal = rawObj?.["total"] ?? "?";
    const directTotal = directObj?.["total"] ?? "?";
    const directItems = toArray<CbItem>(rawDirect);
    const debug =
      `API vrátilo total=${queryTotal} pro cbQL query a total=${directTotal} pro přímý endpoint.\n` +
      `Pokud je total=0, Codebeamer říká že tam žádné itemy nejsou (špatný tracker ID, chybí oprávnění nebo prázdný tracker).\n` +
      `query: ${JSON.stringify(raw).slice(0, 300)}\n` +
      `direct: ${JSON.stringify(rawDirect).slice(0, 300)}`;
    return { items: directItems, debug };
  }

  async searchItems(
    queryString: string,
    page: number,
    pageSize: number,
  ): Promise<CbItem[]> {
    const raw = await this.http.get<unknown>("/items/query", {
      params: { queryString, page, pageSize },
      resource: "item query",
    });
    return toArray(raw);
  }

  // Item reviews (Review Hub)
  async getItemReviews(id: number): Promise<CbTrackerItemReview[]> {
    const raw = await this.http.get<unknown>(`/items/${id}/reviews`, {
      resource: `reviews for item ${id}`,
    });
    return Array.isArray(raw) ? raw : [];
  }

  // Item details
  getItemRelations(id: number): Promise<CbItemRelationsPage> {
    return this.http.get(`/items/${id}/relations`, {
      resource: `relations for item ${id}`,
    });
  }

  async getItemComments(id: number): Promise<CbComment[]> {
    const raw = await this.http.get<unknown>(`/items/${id}/comments`, {
      resource: `comments for item ${id}`,
    });
    return toArray(raw);
  }

  // Users
  getUser(id: number): Promise<CbUser> {
    return this.http.get(`/users/${id}`, { resource: `user ${id}` });
  }

  async listUsers(page = 1, pageSize = 100): Promise<CbUser[]> {
    const raw = await this.http.get<unknown>("/users", {
      params: { page, pageSize },
      resource: "users",
    });
    return toArray(raw);
  }

  // Field options
  async getFieldOptions(
    trackerId: number,
    fieldName: string,
  ): Promise<{ field: CbTrackerSchemaField; options: CbFieldOption[]; note?: string }> {
    const schema = await this.getTrackerSchema(trackerId);
    const normalized = fieldName.toLowerCase().trim();
    const field = schema.find((f) => {
      const nameMatch = f.name.replace(/<[^>]+>/g, "").toLowerCase().trim() === normalized;
      const legacyMatch = f.legacyRestName?.toLowerCase() === normalized;
      return nameMatch || legacyMatch;
    });
    if (!field) {
      throw new Error(`Field '${fieldName}' not found in tracker ${trackerId} schema.`);
    }

    if (field.type === "OptionChoiceField") {
      return {
        field,
        options: (field.options ?? []).map((o) => ({ id: o.id, name: o.name, type: "ChoiceOptionReference" })),
      };
    }

    if (field.type === "TrackerChoiceField") {
      const tracker = await this.getTracker(trackerId);
      const projectId = tracker.project?.id;
      if (!projectId) {
        return { field, options: [], note: "Cannot determine project for this tracker." };
      }
      const trackers = await this.listTrackers(projectId, 1, 100);
      return {
        field,
        options: trackers.map((t) => ({ id: t.id, name: t.name, type: "TrackerReference" })),
      };
    }

    if (field.type === "UserChoiceField") {
      const users = await this.listUsers(1, 100);
      return {
        field,
        options: users.map((u) => ({ id: u.id, name: u.name, type: "UserReference", description: u.email })),
      };
    }

    if (field.type === "TrackerItemChoiceField") {
      const decodedDescription = field.description
        ?.replace(/&#39;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, "&");

      const trackerNameMatch =
        decodedDescription?.match(/tracker\s+['"‘’“"]([^'"‘’“"]+)['"‘’“"]/i)
        ?? decodedDescription?.match(/tracker\s+['"]?([^'"\.\r\n]+?)['"]?(?=\s+in advance)/i);

      if (trackerNameMatch) {
        const targetName = trackerNameMatch[1].trim();
        const tracker = await this.getTracker(trackerId);
        const projectId = tracker.project?.id;
        if (projectId) {
          const trackers = await this.listTrackers(projectId, 1, 100);
          const targetTracker = trackers.find((t) =>
            t.name.toLowerCase().includes(targetName.toLowerCase()) ||
            targetName.toLowerCase().includes(t.name.toLowerCase())
          );
          if (targetTracker) {
            const { items } = await this.listTrackerItems(targetTracker.id, 1, 100);
            return {
              field,
              options: items.map((item) => ({
                id: item.id,
                name: item.name,
                type: "TrackerItemReference",
                description: item.status?.name,
              })),
            };
          }
        }
      }

      return {
        field,
        options: [],
        note:
          "This field references tracker items. Could not automatically discover the target tracker from the field description. " +
          "Use list_trackers and list_tracker_items to find valid item IDs, or provide the ID directly.",
      };
    }

    return {
      field,
      options: [],
      note: `Field type '${field.type}' has no predefined options. Provide a plain value of the appropriate type.`,
    };
  }

  // --- Attachments ---

  async listItemAttachments(itemId: number, fileName?: string): Promise<CbAttachment[]> {
    const raw = await this.http.get<unknown>(`/items/${itemId}/attachments`, {
      params: fileName ? { fileName } : undefined,
      resource: `attachments for item ${itemId}`,
    });
    if (Array.isArray(raw)) return raw;
    return (raw as { attachments?: CbAttachment[] }).attachments ?? [];
  }

  getItemAttachment(itemId: number, attachmentId: number): Promise<CbAttachment> {
    return this.http.get(`/items/${itemId}/attachments/${attachmentId}`, {
      resource: `attachment ${attachmentId} of item ${itemId}`,
    });
  }

  getItemAttachmentContent(itemId: number, attachmentId: number): Promise<ArrayBuffer> {
    return this.http.getBinary(`/items/${itemId}/attachments/${attachmentId}/content`, {
      resource: `attachment content ${attachmentId} of item ${itemId}`,
    });
  }

  async uploadItemAttachment(
    itemId: number,
    fileName: string,
    content: Buffer,
    mimeType?: string,
    description?: string,
  ): Promise<CbAttachment[]> {
    const formData: Record<string, string | { blob: Blob; filename: string }> = {
      attachments: {
        blob: new Blob([new Uint8Array(content)], { type: mimeType ?? "application/octet-stream" }),
        filename: fileName,
      },
    };
    if (description) {
      formData.description = description;
    }
    const raw = await this.http.post<unknown>(`/items/${itemId}/attachments`, {
      formData,
      resource: `upload attachment to item ${itemId}`,
    });
    return Array.isArray(raw) ? (raw as CbAttachment[]) : [];
  }

  updateItemAttachmentContent(
    itemId: number,
    attachmentId: number,
    fileName: string,
    content: Buffer,
    mimeType?: string,
    description?: string,
  ): Promise<CbAttachment> {
    const formData: Record<string, string | { blob: Blob; filename: string }> = {
      content: {
        blob: new Blob([new Uint8Array(content)], { type: mimeType ?? "application/octet-stream" }),
        filename: fileName,
      },
    };
    if (description) {
      formData.description = description;
    }
    return this.http.put(`/items/${itemId}/attachments/${attachmentId}/content`, {
      formData,
      resource: `update attachment ${attachmentId} of item ${itemId}`,
    });
  }

  // --- Write operations ---

  createItem(trackerId: number, data: CbCreateItemRequest, parentId?: number): Promise<CbItem> {
    return this.http.post(`/trackers/${trackerId}/items`, {
      params: parentId !== undefined ? { parentItemId: parentId } : undefined,
      body: data,
      resource: `create item in tracker ${trackerId}`,
    });
  }

  async updateItem(itemId: number, data: CbUpdateItemRequest): Promise<CbItem> {
    // Use the field-based endpoint so updates of individual fields (e.g. description)
    // do not trigger an unintended status transition on the full-item PUT endpoint.
    const item = await this.getItem(itemId);
    const trackerId = item.tracker?.id;
    if (!trackerId) throw new Error(`Cannot determine tracker for item ${itemId}`);

    const schema = await this.getTrackerSchema(trackerId);
    const fieldByLegacy = (legacyName: string) =>
      schema.find((f) => f.legacyRestName === legacyName);

    const fieldValues: Array<Record<string, unknown>> = [];

    if (data.name !== undefined) {
      const f = fieldByLegacy("name") ?? fieldByLegacy("summary");
      if (f) fieldValues.push({ fieldId: f.id, type: "TextFieldValue", value: data.name });
    }
    if (data.description !== undefined) {
      const f = fieldByLegacy("description");
      if (f) fieldValues.push({ fieldId: f.id, type: "WikiTextFieldValue", value: data.description });
    }
    if (data.descriptionFormat !== undefined) {
      const f =
        schema.find((f) => f.legacyRestName === "descriptionFormat") ??
        schema.find((f) => f.name.toLowerCase() === "description format");
      if (f) fieldValues.push({ fieldId: f.id, type: "TextFieldValue", value: data.descriptionFormat });
    }
    if (data.status !== undefined) {
      const f = fieldByLegacy("status");
      if (f) fieldValues.push({
        fieldId: f.id,
        type: "ChoiceFieldValue",
        values: [{ id: data.status.id, type: "ChoiceOptionReference" }],
      });
    }
    if (data.priority !== undefined) {
      const f = fieldByLegacy("priority");
      if (f) fieldValues.push({
        fieldId: f.id,
        type: "ChoiceFieldValue",
        values: [{ id: data.priority.id, type: "ChoiceOptionReference" }],
      });
    }
    if (data.assignedTo !== undefined) {
      const f = fieldByLegacy("assignedTo");
      if (f) fieldValues.push({
        fieldId: f.id,
        type: "ChoiceFieldValue",
        values: data.assignedTo.map((u) => ({ id: u.id, type: "UserReference" })),
      });
    }
    if (data.storyPoints !== undefined) {
      const f = fieldByLegacy("storyPoints");
      if (f) fieldValues.push({ fieldId: f.id, type: "IntegerFieldValue", value: data.storyPoints });
    }

    if (data.customFields && data.customFields.length > 0) {
      for (const customField of data.customFields) {
        const entry: Record<string, unknown> = {
          fieldId: customField.fieldId,
          type: customField.type,
        };
        if (customField.values !== undefined) {
          entry.values = customField.values;
        } else if (customField.value !== undefined) {
          entry.value = customField.value;
        }
        fieldValues.push(entry);
      }
    }

    if (fieldValues.length === 0) return item;

    await this.http.put(`/items/${itemId}/fields`, {
      params: { quietMode: true },
      body: { fieldValues },
      resource: `update item ${itemId}`,
    });

    return this.getItem(itemId);
  }

  addComment(itemId: number, data: CbCreateCommentRequest): Promise<CbComment> {
    return this.http.post(`/items/${itemId}/comments`, {
      formData: {
        comment: data.comment,
        ...(data.commentFormat ? { commentFormat: data.commentFormat } : {}),
      },
      resource: `add comment to item ${itemId}`,
    });
  }

  createAssociation(data: CbCreateAssociationRequest): Promise<CbAssociation> {
    return this.http.post("/associations", {
      body: data,
      resource: "create association",
    });
  }

  async getItemEditableFields(id: number): Promise<CbEditableField[]> {
    const raw = await this.http.get<{ editableFields?: CbEditableField[] }>(
      `/items/${id}/fields`,
      { resource: `editable fields for item ${id}` },
    );
    return raw.editableFields ?? [];
  }

  async createDownstreamReference(fromItemId: number, toItemId: number): Promise<void> {
    // Downstream reference is created by setting the "superordinateRequirement" field
    // on the downstream (to) item to point to the upstream (from) item.
    const toItem = await this.getItem(toItemId);
    const trackerId = toItem.tracker?.id;
    if (!trackerId) throw new Error(`Cannot determine tracker for item ${toItemId}`);

    const schema = await this.getTrackerSchema(trackerId);
    const superordinateField = schema.find(
      (f) => f.legacyRestName === "superordinateRequirement",
    );
    if (!superordinateField) {
      throw new Error(
        `Tracker ${trackerId} has no superordinateRequirement field. Cannot create downstream reference.`,
      );
    }

    const fields = await this.getItemEditableFields(toItemId);
    const currentField = fields.find((f) => f.fieldId === superordinateField.id);
    const existingValues = currentField?.values ?? [];
    if (existingValues.some((v) => v.id === fromItemId)) return; // already linked

    const newValues = [...existingValues, { id: fromItemId, type: "TrackerItemReference" }];

    await this.http.put(`/items/${toItemId}/fields`, {
      body: {
        fieldValues: [
          {
            fieldId: superordinateField.id,
            type: "ChoiceFieldValue",
            values: newValues,
          },
        ],
      },
      resource: `add downstream reference from ${fromItemId} to ${toItemId}`,
    });
  }
}
