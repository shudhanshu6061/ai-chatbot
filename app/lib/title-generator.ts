/**
 * Generates a concise, readable, deterministic conversation title from the first message.
 * Does not make external AI API calls.
 */
export function generateConversationTitle(prompt: string): string {
  if (!prompt || typeof prompt !== "string") return "New Chat";

  // Take the first line and remove markdown/control characters
  let clean = prompt
    .split("\n")[0]
    .replace(/[#*_`~>[\]()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!clean) return "New Chat";

  // Strip conversational filler prefixes
  clean = clean.replace(
    /^(can you (please )?|please |could you (please )?|what is |what are |how do (i|we) |how to |tell me about |explain )/i,
    ""
  ).trim();

  if (!clean) {
    clean = prompt.split("\n")[0].trim().slice(0, 30);
  }

  // Truncate cleanly at word boundary (target length ~35 chars)
  const maxLength = 36;
  if (clean.length > maxLength) {
    const truncated = clean.slice(0, maxLength);
    const lastSpace = truncated.lastIndexOf(" ");
    if (lastSpace > 18) {
      clean = truncated.slice(0, lastSpace).trim() + "...";
    } else {
      clean = truncated.trim() + "...";
    }
  }

  // Capitalize first character
  if (clean.length > 0) {
    clean = clean.charAt(0).toUpperCase() + clean.slice(1);
  }

  return clean || "New Chat";
}
