"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ChangeEvent, type FormEvent, type InputHTMLAttributes } from "react";
import { Button } from "@/components/ui/button";

type Mode = "login" | "signup";
type Values = { name: string; email: string; password: string; confirm: string };
type Errors = Partial<Record<keyof Values, string>>;

/**
 * TODO (backend): call the real login / signup endpoint here.
 * Throw an Error with a message the user can act on if it fails
 * (wrong password, email already in use, ...). On success, just return:
 * the form then sends the user to "/".
 */
async function submitAuth(mode: Mode, values: Values): Promise<void> {
  void mode;
  void values;
}

/** TODO (backend): start Google sign-in. Set SHOW_GOOGLE to false to hide the button. */
const SHOW_GOOGLE = true;
async function startGoogleSignIn(): Promise<void> {}

function validate(mode: Mode, v: Values): Errors {
  const errors: Errors = {};
  const signup = mode === "signup";
  if (signup && !v.name.trim()) errors.name = "Enter your name.";
  if (!/^\S+@\S+\.\S+$/.test(v.email.trim())) errors.email = "Enter a valid email address.";
  if (signup && v.password.length < 8) errors.password = "Use at least 8 characters.";
  if (!signup && !v.password) errors.password = "Enter your password.";
  if (signup && v.confirm !== v.password) errors.confirm = "Passwords don't match.";
  return errors;
}

function Field({
  id,
  label,
  error,
  ...input
}: { id: string; label: string; error?: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className="h-11 rounded-xl border border-[#d5cde3] bg-white px-3.5 text-[15px] outline-none transition-colors placeholder:text-[#a59fbd] focus-visible:border-[#9a7fb0] focus-visible:ring-3 focus-visible:ring-[#9a7fb0]/30 aria-invalid:border-red-500"
        {...input}
      />
      {error && (
        <p id={`${id}-error`} className="text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const signup = mode === "signup";
  const [values, setValues] = useState<Values>({ name: "", email: "", password: "", confirm: "" });
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const set = (key: keyof Values) => (e: ChangeEvent<HTMLInputElement>) => {
    setValues((v) => ({ ...v, [key]: e.target.value }));
    setErrors((er) => ({ ...er, [key]: undefined }));
  };

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const found = validate(mode, values);
    setErrors(found);
    setFormError(null);
    if (Object.keys(found).length > 0) return;

    setBusy(true);
    try {
      await submitAuth(mode, values);
      router.push("/groups");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-gradient-to-br from-[#e6dbe9] via-[#f1e4e8] to-[#e4d8e8] p-5 text-[#1c2750]">
      <div className="w-full max-w-md rounded-3xl border border-white/70 bg-[#f4f0f8]/90 p-7 shadow-xl shadow-[#1c2750]/10 sm:p-9">
        <div className="text-center">
          <div
            className="relative mx-auto h-14 w-14 rounded-2xl bg-gradient-to-br from-[#9a7fb0] to-[#1c2750] shadow-lg shadow-[#1c2750]/25"
            aria-hidden
          >
            <span className="absolute inset-3.5 rounded-lg border-2 border-b-[6px] border-white/85" />
          </div>
          <h1 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight">ChoreShare</h1>
          <p className="mt-1 text-[#6b6590]">Make shared chores fair — and a little more fun.</p>
        </div>

        <div className="mt-7 flex flex-col gap-5">
          <h2 className="text-xl font-semibold">{signup ? "Create your account" : "Welcome back"}</h2>

          {SHOW_GOOGLE && (
            <>
              <Button
                type="button"
                variant="outline"
                className="h-11 w-full rounded-xl bg-white text-[15px]"
                onClick={() => void startGoogleSignIn()}
              >
                Continue with Google
              </Button>
              <div className="flex items-center gap-3 text-sm text-[#6b6590]">
                <span className="h-px flex-1 bg-[#d5cde3]" />
                or
                <span className="h-px flex-1 bg-[#d5cde3]" />
              </div>
            </>
          )}

          <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
            {signup && (
              <Field
                id="name"
                label="Name"
                autoComplete="name"
                value={values.name}
                onChange={set("name")}
                error={errors.name}
              />
            )}
            <Field
              id="email"
              label="Email"
              type="email"
              autoComplete="email"
              placeholder="you@umass.edu"
              value={values.email}
              onChange={set("email")}
              error={errors.email}
            />
            <Field
              id="password"
              label="Password"
              type="password"
              autoComplete={signup ? "new-password" : "current-password"}
              value={values.password}
              onChange={set("password")}
              error={errors.password}
            />
            {signup && (
              <Field
                id="confirm"
                label="Confirm password"
                type="password"
                autoComplete="new-password"
                value={values.confirm}
                onChange={set("confirm")}
                error={errors.confirm}
              />
            )}

            {formError && (
              <p role="alert" className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
                {formError}
              </p>
            )}

            <Button
              type="submit"
              disabled={busy}
              className="h-11 w-full rounded-xl bg-[#1c2750] text-[15px] font-semibold text-white hover:bg-[#2b3a6e]"
            >
              {busy ? "Please wait…" : signup ? "Create account" : "Log in"}
            </Button>
          </form>

          <p className="text-center text-sm text-[#6b6590]">
            {signup ? "Already have an account? " : "New to ChoreShare? "}
            <Link
              href={signup ? "/login" : "/signup"}
              className="font-semibold text-[#1c2750] underline-offset-4 hover:underline"
            >
              {signup ? "Log in" : "Create an account"}
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
