/**
 * Helpers for serializing/deserializing values to/from SQLite String columns.
 * Prisma schema uses String? for JSON-like fields due to SQLite limitations.
 */

/**
 * Serializes any value to a JSON string for DB storage.
 * Throws if serialization fails.
 */
export function serializeForDb(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch (err) {
    throw new Error(
      `serializeForDb: failed to serialize value — ${String(err)}`
    );
  }
}

/**
 * Serializes any value to a JSON string, returns null for null/undefined.
 */
export function safeSerializeForDb(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  return serializeForDb(value);
}

/**
 * Parses a JSON string from DB into a typed value.
 * Returns null for null input.
 * Throws for invalid JSON.
 */
export function parseDbJson<T>(value: string | null): T | null {
  if (value === null) {
    return null;
  }
  try {
    return JSON.parse(value) as T;
  } catch (err) {
    throw new Error(
      `parseDbJson: invalid JSON in DB value — ${String(err)}`
    );
  }
}
