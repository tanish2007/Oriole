export class ApiError extends Error
{
  constructor(public status: number, public body: unknown) {
    const detail = (body as { detail?: unknown } | undefined)?.detail;
    super(typeof detail === "string" ? detail : `Request failed (${status})`);
  }
}

// can add auth here later

export const apiFetch = async <T>(url: string, options: RequestInit): Promise<T> =>
{
  const res = await fetch(url, options);
  const text = [204, 205, 304].includes(res.status) ? "" : await res.text();
  let body: unknown;
  try {
    body = text ? JSON.parse(text) : undefined;
  } catch {
    body = text;
  }
  if (!res.ok) throw new ApiError(res.status, body);
  return body as T;
};