import type { CbAttachment } from "../client/codebeamer-client.js";

export function formatAttachment(attachment: CbAttachment): string {
  const lines: string[] = [`## [${attachment.id}] ${attachment.name}`];

  if (attachment.description) {
    lines.push(`- **Description:** ${attachment.description}`);
  }
  if (attachment.mimeType) {
    lines.push(`- **MIME type:** ${attachment.mimeType}`);
  }
  if (attachment.fileSize !== undefined) {
    lines.push(`- **Size:** ${attachment.fileSize} bytes`);
  }
  if (attachment.createdAt) {
    lines.push(`- **Created:** ${attachment.createdAt} by ${attachment.createdBy?.name ?? "?"}`);
  }
  if (attachment.modifiedAt) {
    lines.push(`- **Modified:** ${attachment.modifiedAt} by ${attachment.modifiedBy?.name ?? "?"}`);
  }

  return lines.join("\n");
}

export function formatAttachments(attachments: CbAttachment[]): string {
  if (attachments.length === 0) return "_No attachments found._";
  return [`## Attachments (${attachments.length})`, "", ...attachments.map(formatAttachment)].join("\n\n");
}
