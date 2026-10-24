function errorMessage(body: unknown, status: number) {
  if (body && typeof body === "object") {
    const record = body as { detail?: unknown; message?: unknown };
    if (typeof record.message === "string") return record.message;
    if (typeof record.detail === "string") return record.detail;
    if (Array.isArray(record.detail)) {
      const first = record.detail[0] as { msg?: unknown } | undefined;
      if (first && typeof first.msg === "string") return first.msg;
    }
  }
  return `Request failed (${status})`;
}

/** API origin, with no trailing slash. Override with NEXT_PUBLIC_API_URL. */
export function apiBase() {
  return (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/$/, "");
}

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBase()}${path}`, {
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
