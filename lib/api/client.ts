const BASE_URL = process.env.NEXT_PUBLIC_API_BASE ?? "";

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${url}`, { cache: "no-store" });
  if (!res.ok) {
    let errorMessage = `HTTP ${res.status}`;
    try {
      const body = (await res.json()) as { error?: string };
      if (body.error) errorMessage = body.error;
    } catch {
      // ignore parse error
    }
    throw new Error(errorMessage);
  }
  return res.json() as Promise<T>;
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE_URL}${url}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    let errorMessage = `HTTP ${res.status}`;
    try {
      const b = (await res.json()) as { error?: string };
      if (b.error) errorMessage = b.error;
    } catch {
      // ignore parse error
    }
    throw new Error(errorMessage);
  }
  return res.json() as Promise<T>;
}

export const apiClient = { fetchJson, postJson };
