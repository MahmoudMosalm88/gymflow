"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Check, Terminal } from "lucide-react";

const GENERIC_MESSAGE =
  "If an account exists for this email, a password reset link has been sent.";
const GENERIC_MESSAGE_AR =
  "إذا كان هذا البريد مرتبطاً بحساب، فسيتم إرسال رابط إعادة تعيين كلمة المرور.";

const copy = {
  en: {
    title: "Reset password",
    description: "Enter your account email and we'll send a reset link.",
    phoneRecovery: "Phone-only users should use their recovery email.",
    email: "Email",
    send: "Send reset link",
    sending: "Sending...",
    success: "Success",
    error: "Error",
    back: "Back to sign in",
    required: "Email is required.",
    failed: "Could not send reset link right now.",
  },
  ar: {
    title: "إعادة تعيين كلمة المرور",
    description: "أدخل بريد الحساب وسنرسل لك رابط إعادة التعيين.",
    phoneRecovery: "إذا كنت تعتمد على الهاتف فقط فاستخدم بريد الاسترداد المرتبط بالحساب.",
    email: "البريد الإلكتروني",
    send: "إرسال رابط إعادة التعيين",
    sending: "جارٍ الإرسال...",
    success: "تم",
    error: "خطأ",
    back: "العودة لتسجيل الدخول",
    required: "البريد الإلكتروني مطلوب.",
    failed: "تعذر إرسال رابط إعادة التعيين الآن.",
  },
} as const;

export default function ForgotPasswordPage() {
  const pathname = usePathname();
  const isArabic = pathname?.startsWith("/ar") ?? false;
  const t = copy[isArabic ? "ar" : "en"];
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
        setError(t.required);
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
          typeof payload?.message === "string" ? payload.message : t.failed
        );
        return;
      }

      setMessage(
        typeof payload?.data?.message === "string"
          ? payload.data.message
          : (isArabic ? GENERIC_MESSAGE_AR : GENERIC_MESSAGE)
      );
    } catch {
      setError(t.failed);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#0a0a0a] p-4" dir={isArabic ? "rtl" : "ltr"}>
      <div
        className="w-full max-w-sm bg-[#1e1e1e] p-8"
        style={{ border: '2px solid #2a2a2a', boxShadow: '6px 6px 0 #000000' }}
      >
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#e8e4df]">{t.title}</h1>
          <p className="text-sm text-[#888888] mt-2">
            {t.description}
            <br />
            {t.phoneRecovery}
          </p>
        </div>

        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="grid gap-2">
            <Label htmlFor="email" className="text-[#e8e4df] font-medium">{t.email}</Label>
            <Input id="email" name="email" type="email" autoComplete="email" required />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? t.sending : t.send}
          </Button>
        </form>

        {message && (
          <Alert variant="success" className="mt-4">
            <Check className="h-4 w-4" />
            <AlertTitle>{t.success}</AlertTitle>
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive" className="mt-4">
            <Terminal className="h-4 w-4" />
            <AlertTitle>{t.error}</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Link
          href={isArabic ? "/ar/login" : "/login"}
          className="block mt-4 text-center text-sm text-[#888888] hover:text-[#e63946] transition-colors"
        >
          ← {t.back}
        </Link>
      </div>
    </main>
  );
}
