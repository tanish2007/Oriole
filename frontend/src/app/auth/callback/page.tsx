"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { completeSignIn } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export default function AuthCallbackPage() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let done = false;

    async function finish(accessToken: string) {
      if (done) return;
      done = true;
      try {
        await completeSignIn(accessToken);
        // Full reload so the rest of the app starts with the signed-in user.
        window.location.replace("/groups");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Sign-in failed. Try again.");
      }
    }

    // Supabase finishes the Google handshake in the background; take the session once it exists.
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) void finish(session.access_token);
    });
    void supabase.auth.getSession().then(({ data: current }) => {
      if (current.session) void finish(current.session.access_token);
    });
    const timeout = window.setTimeout(() => {
      if (!done) setError("Sign-in took too long. Try again.");
    }, 15000);

    return () => {
      data.subscription.unsubscribe();
      window.clearTimeout(timeout);
    };
  }, []);

  return (
    <main className="grid min-h-screen place-items-center bg-gradient-to-br from-[#e6dbe9] via-[#f1e4e8] to-[#e4d8e8] p-5 text-[#1c2750]">
      <div className="w-full max-w-md rounded-3xl border border-white/70 bg-[#f4f0f8]/90 p-7 text-center shadow-xl shadow-[#1c2750]/10">
        {error ? (
          <>
            <p role="alert" className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
              {error}
            </p>
            <Link href="/login" className="mt-4 inline-block font-semibold underline-offset-4 hover:underline">
              Back to log in
            </Link>
          </>
        ) : (
          <p className="text-[#6b6590]">Signing you in…</p>
        )}
      </div>
    </main>
  );
}
