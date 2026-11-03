import { authConfigured, supabase } from "./supabase";

import * as auth from "@/lib/api/gen/auth";

export const SIGNED_IN_KEY = "choreshareUser";

export type SignedInUser = { id: number; name: string; email: string };

export async function signInWithGoogle(): Promise<void> {
  if (!authConfigured) {
    throw new Error("Sign-in is not set up. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_KEY to frontend/.env.local.");
  }
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${window.location.origin}/auth/callback` },
  });
  if (error) throw new Error(error.message);
}

/** Runs after Google sends the user back: ask the backend who this login is and remember it. */
export async function completeSignIn(accessToken: string): Promise<SignedInUser> {
  const response = await auth.me({ headers: { Authorization: `Bearer ${accessToken}` } });
  try {
    localStorage.setItem(SIGNED_IN_KEY, JSON.stringify(response));
  } catch {
    throw new Error("Your browser is blocking storage, so sign-in can't be remembered.");
  }
  return response;
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
  try {
    localStorage.removeItem(SIGNED_IN_KEY);
  } catch {
    // Nothing to clear if storage is blocked.
  }
}
