"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import styles from "./forgot-password.module.css";

const GENERIC_MESSAGE =
  "If an account exists for this email, a password reset link has been sent.";

export default function ForgotPasswordPage() {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const formData = new FormData(event.currentTarget);
      const email = String(formData.get("email") || "").trim();
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email })
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        setMessage(
          typeof payload?.message === "string" ? payload.message : "Could not send reset link right now."
        );
        return;
      }

      setMessage(typeof payload?.data?.message === "string" ? payload.data.message : GENERIC_MESSAGE);
    } catch {
      setMessage("Could not send reset link right now.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <h1>Reset password</h1>
        <p>
          Enter your account email and we&apos;ll send a reset link.
          <br />
          Phone-only users should use their recovery email.
        </p>

        <form className={styles.form} onSubmit={onSubmit}>
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" autoComplete="email" required />
          <button type="submit" disabled={loading}>
            {loading ? "Sending..." : "Send reset link"}
          </button>
        </form>

        {message ? <p className={styles.message}>✓ {message}</p> : null}

        <Link href="/login" className={styles.backLink}>
          Back to sign in
        </Link>
      </section>
    </main>
  );
}
