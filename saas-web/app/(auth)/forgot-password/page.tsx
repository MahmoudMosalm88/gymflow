"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
// import styles from "./forgot-password.module.css"; // Removed custom CSS module

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Check, Terminal } from "lucide-react"; // Icons

const GENERIC_MESSAGE =
  "If an account exists for this email, a password reset link has been sent.";

export default function ForgotPasswordPage() {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(""); // For API errors

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setError(""); // Clear previous errors

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
    <main className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Reset password</CardTitle>
          <CardDescription>
            Enter your account email and we&apos;ll send a reset link.
            <br />
            Phone-only users should use their recovery email.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
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

          <Button variant="link" asChild className="w-full text-sm mt-4">
            <Link href="/login">Back to sign in</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
