import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_KEY;

/** Browser client for Supabase Auth. Only ever given the publishable key. */
export const supabase = createClient(url ?? "http://localhost", key ?? "missing-key");

export const authConfigured = Boolean(url && key);
