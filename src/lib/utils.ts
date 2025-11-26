import { MessageContent, TextContent } from "@/types/claude";

/**
 * Get text content from a message
 */
export function getTextContent(content: string | MessageContent[]): string {
  if (typeof content === "string") {
    return content;
  }

  return content
    .filter((c): c is TextContent => c.type === "text")
    .map((c) => c.text)
    .join("\n\n");
}
