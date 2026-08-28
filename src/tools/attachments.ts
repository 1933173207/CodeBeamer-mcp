import { z } from "zod";
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
        "Optionally filter by filename.",
      inputSchema: {
        itemId: z
          .number()
          .int()
          .positive()
          .describe("Numeric item ID"),
        fileName: z
          .string()
          .optional()
          .describe("Optional filename filter (partial match)"),
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
        "Provide file content as a base64-encoded string.",
      inputSchema: {
        itemId: z
          .number()
          .int()
          .positive()
          .describe("Numeric item ID"),
        fileName: z
          .string()
          .min(1)
          .describe("Attachment file name including extension"),
        fileContentBase64: z
          .string()
          .min(1)
          .describe("Base64-encoded file content"),
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
    async ({ itemId, fileName, fileContentBase64, mimeType, description }) => {
      const buffer = Buffer.from(fileContentBase64, "base64");
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
        "Provide new content as a base64-encoded string.",
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
        fileName: z
          .string()
          .min(1)
          .describe("Attachment file name including extension"),
        fileContentBase64: z
          .string()
          .min(1)
          .describe("Base64-encoded new file content"),
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
    async ({ itemId, attachmentId, fileName, fileContentBase64, mimeType, description }) => {
      const buffer = Buffer.from(fileContentBase64, "base64");
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
