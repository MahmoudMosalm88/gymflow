"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Check, Terminal } from "lucide-react";

const GENERIC_MESSAGE =
  "If an account exists for this email, a password reset link has been sent.";

export default function ForgotPasswordPage() {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");

    try {
      const formData = new FormData(event.currentTarget);
      const email = String(formData.get("email") || "").trim();

      if (!email) {
        setError("Email is required.");
        setLoading(false);
        return;
      }

      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email })
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        setError(
          typeof payload?.message === "string" ? payload.message : "Could not send reset link right now."
        );
        return;
      }

      setMessage(typeof payload?.data?.message === "string" ? payload.data.message : GENERIC_MESSAGE);
    } catch {
      setError("Could not send reset link right now.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#0a0a0a] p-4">
      <div
        className="w-full max-w-sm bg-[#1e1e1e] p-8"
        style={{ border: '2px solid #2a2a2a', boxShadow: '6px 6px 0 #000000' }}
      >
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#e8e4df]">Reset password</h1>
          <p className="text-sm text-[#888888] mt-2">
            Enter your account email and we&apos;ll send a reset link.
            <br />
            Phone-only users should use their recovery email.
          </p>
        </div>

        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="grid gap-2">
            <Label htmlFor="email" className="text-[#e8e4df] font-medium">Email</Label>
            <Input id="email" name="email" type="email" autoComplete="email" required />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Sending..." : "Send reset link"}
          </Button>
        </form>

        {message && (
          <Alert variant="success" className="mt-4">
            <Check className="h-4 w-4" />
            <AlertTitle>Success</AlertTitle>
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive" className="mt-4">
            <Terminal className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Link
          href="/login"
          className="block mt-4 text-center text-sm text-[#888888] hover:text-[#e63946] transition-colors"
        >
          ← Back to sign in
        </Link>
      </div>
    </main>
  );
}
