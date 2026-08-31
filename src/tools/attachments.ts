import { z } from "zod";
import { promises as fs } from "node:fs";
import { basename } from "node:path";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CodebeamerClient } from "../client/codebeamer-client.js";
import {
  formatAttachment,
  formatAttachments,
} from "../formatters/attachment-formatter.js";

export function registerAttachmentTools(
  server: McpServer,
  client: CodebeamerClient,
): void {
  server.registerTool(
    "list_item_attachments",
    {
      title: "List Item Attachments",
      description:
        "List all attachments of a Codebeamer tracker item. " +
        "Optionally filter by filename (case-sensitive prefix match).",
      inputSchema: {
        itemId: z
          .number()
          .int()
          .positive()
          .describe("Numeric item ID"),
        fileName: z
          .string()
          .optional()
          .describe("Optional filename filter (case-sensitive prefix match)"),
      },
    },
    async ({ itemId, fileName }) => {
      const attachments = await client.listItemAttachments(itemId, fileName);
      return {
        content: [{ type: "text", text: formatAttachments(attachments) }],
      };
    },
  );

  server.registerTool(
    "get_item_attachment",
    {
      title: "Get Item Attachment",
      description: "Get metadata of a single attachment on a Codebeamer item.",
      inputSchema: {
        itemId: z
          .number()
          .int()
          .positive()
          .describe("Numeric item ID"),
        attachmentId: z
          .number()
          .int()
          .positive()
          .describe("Numeric attachment ID"),
      },
    },
    async ({ itemId, attachmentId }) => {
      const attachment = await client.getItemAttachment(itemId, attachmentId);
      return {
        content: [{ type: "text", text: formatAttachment(attachment) }],
      };
    },
  );

  server.registerTool(
    "download_item_attachment",
    {
      title: "Download Item Attachment",
      description:
        "Download the binary content of an attachment. " +
        "Returns base64-encoded data together with metadata.",
      inputSchema: {
        itemId: z
          .number()
          .int()
          .positive()
          .describe("Numeric item ID"),
        attachmentId: z
          .number()
          .int()
          .positive()
          .describe("Numeric attachment ID"),
      },
    },
    async ({ itemId, attachmentId }) => {
      const [meta, buffer] = await Promise.all([
        client.getItemAttachment(itemId, attachmentId),
        client.getItemAttachmentContent(itemId, attachmentId),
      ]);
      const base64 = Buffer.from(buffer).toString("base64");
      const header = [
        `File: ${meta.name}`,
        `MIME type: ${meta.mimeType ?? "unknown"}`,
        `Size: ${meta.fileSize ?? buffer.byteLength} bytes`,
        "",
      ].join("\n");
      return {
        content: [{ type: "text", text: `${header}${base64}` }],
      };
    },
  );

  server.registerTool(
    "upload_item_attachment",
    {
      title: "Upload Item Attachment",
      description:
        "Upload a new attachment to a Codebeamer item. " +
        "Either provide a local file path (filePath) or the file content as a base64-encoded string (fileContentBase64). " +
        "If filePath is provided, the file is read from disk and uploaded automatically.",
      inputSchema: {
        itemId: z
          .number()
          .int()
          .positive()
          .describe("Numeric item ID"),
        filePath: z
          .string()
          .min(1)
          .optional()
          .describe("Local file path to upload (alternative to fileContentBase64)"),
        fileName: z
          .string()
          .min(1)
          .optional()
          .describe("Attachment file name including extension (defaults to the basename of filePath)"),
        fileContentBase64: z
          .string()
          .min(1)
          .optional()
          .describe("Base64-encoded file content (alternative to filePath)"),
        mimeType: z
          .string()
          .optional()
          .describe("MIME type (default: application/octet-stream)"),
        description: z
          .string()
          .optional()
          .describe("Optional attachment description"),
      },
    },
    async ({ itemId, filePath, fileName, fileContentBase64, mimeType, description }) => {
      let buffer: Buffer;
      if (filePath) {
        buffer = await fs.readFile(filePath);
        if (!fileName) fileName = basename(filePath);
      } else if (fileContentBase64) {
        if (!fileName) throw new Error("fileName is required when using fileContentBase64.");
        buffer = Buffer.from(fileContentBase64, "base64");
      } else {
        throw new Error("Either filePath or fileContentBase64 must be provided.");
      }
      const attachments = await client.uploadItemAttachment(
        itemId,
        fileName,
        buffer,
        mimeType,
        description,
      );
      return {
        content: [{ type: "text", text: formatAttachments(attachments) }],
      };
    },
  );

  server.registerTool(
    "update_item_attachment",
    {
      title: "Update Item Attachment",
      description:
        "Replace the content of an existing attachment. " +
        "Either provide a local file path (filePath) or the new file content as a base64-encoded string (fileContentBase64). " +
        "If filePath is provided, the file is read from disk and uploaded automatically.",
      inputSchema: {
        itemId: z
          .number()
          .int()
          .positive()
          .describe("Numeric item ID"),
        attachmentId: z
          .number()
          .int()
          .positive()
          .describe("Numeric attachment ID to update"),
        filePath: z
          .string()
          .min(1)
          .optional()
          .describe("Local file path to upload (alternative to fileContentBase64)"),
        fileName: z
          .string()
          .min(1)
          .optional()
          .describe("Attachment file name including extension (defaults to the basename of filePath)"),
        fileContentBase64: z
          .string()
          .min(1)
          .optional()
          .describe("Base64-encoded new file content (alternative to filePath)"),
        mimeType: z
          .string()
          .optional()
          .describe("MIME type (default: application/octet-stream)"),
        description: z
          .string()
          .optional()
          .describe("Optional attachment description"),
      },
    },
    async ({ itemId, attachmentId, filePath, fileName, fileContentBase64, mimeType, description }) => {
      let buffer: Buffer;
      if (filePath) {
        buffer = await fs.readFile(filePath);
        if (!fileName) fileName = basename(filePath);
      } else if (fileContentBase64) {
        if (!fileName) throw new Error("fileName is required when using fileContentBase64.");
        buffer = Buffer.from(fileContentBase64, "base64");
      } else {
        throw new Error("Either filePath or fileContentBase64 must be provided.");
      }
      const attachment = await client.updateItemAttachmentContent(
        itemId,
        attachmentId,
        fileName,
        buffer,
        mimeType,
        description,
      );
      return {
        content: [{ type: "text", text: formatAttachment(attachment) }],
      };
    },
  );
}
