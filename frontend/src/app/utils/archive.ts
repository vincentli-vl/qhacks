/**
 * Encode/decode archive payload for URL to avoid URI malformed (special chars, long text).
 * Uses base64 with UTF-8 safe encoding so JSON with any content works.
 */
export function encodeArchivePayload(data: Record<string, unknown>): string {
  const json = JSON.stringify(data);
  return btoa(unescape(encodeURIComponent(json)));
}

export function decodeArchivePayload(encoded: string): Record<string, unknown> {
  try {
    const decoded = decodeURIComponent(escape(atob(encoded)));
    return JSON.parse(decoded) as Record<string, unknown>;
  } catch {
    throw new Error("Invalid archive data");
  }
}
