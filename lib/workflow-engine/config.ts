/**
 * Parses a configJson string (stored as String? in SQLite) into a plain object.
 *
 * - null => returns {}
 * - valid JSON object => returns the parsed object
 * - invalid JSON => throws
 * - non-object JSON value => throws
 */
export function parseActionConfig(
  configJson: string | null
): Record<string, unknown> {
  if (configJson === null) {
    return {};
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(configJson);
  } catch {
    throw new Error(`parseActionConfig: invalid JSON — ${configJson}`);
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error(
      `parseActionConfig: expected a JSON object, got ${JSON.stringify(parsed)}`
    );
  }

  return parsed as Record<string, unknown>;
}
