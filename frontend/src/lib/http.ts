/** True when the UI should call the API instead of the in-memory stand-in. */
export function liveApiEnabled() {
  return Boolean(process.env.NEXT_PUBLIC_API_URL);
}

function errorMessage(body: unknown, status: number) {
  if (body && typeof body === "object") {
    const record = body as { detail?: unknown; message?: unknown };
    if (typeof record.message === "string") return record.message;
    if (typeof record.detail === "string") return record.detail;
  }
  return `Request failed (${status})`;
}

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const base = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
  if (!base) throw new Error("NEXT_PUBLIC_API_URL is not set.");

  const response = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(errorMessage(body, response.status));
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
