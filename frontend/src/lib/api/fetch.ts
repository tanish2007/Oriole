import { supabase } from "@/lib/supabase";

export class ApiError extends Error
{
  constructor(public status: number, public body: unknown) {
    const detail = (body as { detail?: unknown } | undefined)?.detail;
    super(typeof detail === "string" ? detail : `Request failed (${status})`);
  }
}

export const apiFetch = async <T>(url: string, options: RequestInit): Promise<T> =>
{
  const headers = new Headers(options.headers);
  if (!headers.has("Authorization")) {
    const { data } = await supabase.auth.getSession();
    if (data.session) headers.set("Authorization", `Bearer ${data.session.access_token}`);
  }
  const res = await fetch(url, { ...options, headers });
  const text = [204, 205, 304].includes(res.status) ? "" : await res.text();
  let body: unknown;
  try {
    body = text ? JSON.parse(text) : undefined;
  } catch {
    body = text;
  }
  // Signed out or expired. The callback page shows its own sign-in errors.
  if (res.status === 401 && typeof window !== "undefined" && window.location.pathname !== "/auth/callback") {
    window.location.replace("/login");
  }
  if (!res.ok) throw new ApiError(res.status, body);
  return body as T;
};