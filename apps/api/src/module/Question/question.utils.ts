/**
 * Escapes HTML special characters to prevent XSS attacks
 */
export function escapeHtml(s: string): string {
  return (s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Generates a user-friendly message for bulk action results
 */
export function generateBulkActionMessage(
  action: string,
  result: {
    updated?: number;
    deleted?: number;
    published?: number;
    publishError?: string;
  }
): string {
  if (action === "approve") {
    if (result.published !== undefined && result.published > 0) {
      let message = `${
        result.updated || result.published
      } question(s) approved and published to Question Bank`;
      if (result.publishError) {
        message += ` (Note: ${result.publishError})`;
      }
      return message;
    } else {
      return `${result.updated || 0} question(s) approved`;
    }
  } else if (action === "reject") {
    return `${result.deleted || 0} question(s) rejected and deleted`;
  } else if (action === "delete") {
    return `${result.deleted || 0} question(s) deleted`;
  } else if (action === "needs_fix") {
    return `${result.updated || 0} question(s) marked as needs fix`;
  } else if (action === "publish") {
    return `${result.published || 0} question(s) published to Question Bank`;
  }
  return `Bulk action completed: ${action}`;
}
