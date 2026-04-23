"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import type { Auth, ConfirmationResult, RecaptchaVerifier } from "firebase/auth";
import type { FirebaseClientConfig } from "@/lib/firebase-client";
import { BRANCH_ID_KEY, SESSION_PROFILE_KEY, SESSION_TOKEN_KEY } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type InvitePayload = {
  token: string;
  phone: string;
  status: string;
  expiresAt: string;
  acceptedAt: string | null;
  staff: {
    id: string;
    name: string;
    email: string | null;
    role: "manager" | "staff" | "trainer";
  };
  organization: {
    id: string;
    name: string;
  };
  branch: {
    id: string;
    name: string;
  };
};

let firebaseRuntimePromise:
  | Promise<{
      authModule: typeof import("firebase/auth");
      clientModule: typeof import("@/lib/firebase-client");
    }>
  | null = null;

async function loadFirebaseRuntime() {
  if (!firebaseRuntimePromise) {
    firebaseRuntimePromise = Promise.all([
      import("firebase/auth"),
      import("@/lib/firebase-client"),
    ]).then(([authModule, clientModule]) => ({ authModule, clientModule }));
  }
  return firebaseRuntimePromise;
}

function unwrapData(payload: unknown) {
  if (!payload || typeof payload !== "object") return null;
  const record = payload as Record<string, unknown>;
  return record.data && typeof record.data === "object" ? (record.data as Record<string, unknown>) : record;
}

function persistSession(payload: unknown) {
  const data = unwrapData(payload);
  if (!data || typeof data !== "object") return;
  const session = data.session as Record<string, unknown> | undefined;
  const profile = (data.user || data.owner) as Record<string, unknown> | undefined;
  if (typeof session?.idToken === "string") {
    localStorage.setItem(SESSION_TOKEN_KEY, session.idToken);
  }
  if (typeof session?.branchId === "string") {
    localStorage.setItem(BRANCH_ID_KEY, session.branchId);
  }
  if (profile) {
    localStorage.setItem(SESSION_PROFILE_KEY, JSON.stringify(profile));
  }
}

export default function InvitePage() {
  const params = useParams<{ token: string }>();
  const token = Array.isArray(params?.token) ? params.token[0] : params?.token;
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [invite, setInvite] = useState<InvitePayload | null>(null);
  const [message, setMessage] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const confirmationRef = useRef<ConfirmationResult | null>(null);
  const recaptchaRef = useRef<RecaptchaVerifier | null>(null);
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadInvite() {
      if (!token) return;
      setLoading(true);
      const response = await fetch(`/api/staff/invites/${token}`, { cache: "no-store" });
      const payload = await response.json().catch(() => null);
      if (!cancelled) {
        if (response.ok) {
          setInvite((payload?.data || payload) as InvitePayload);
        } else {
          setMessage(payload?.message || "Invite not found.");
        }
        setLoading(false);
      }
    }
    loadInvite();
    return () => {
      cancelled = true;
      try {
        recaptchaRef.current?.clear();
      } catch {
        // ignore cleanup issues
      }
    };
  }, [token]);

  async function getAuthClient() {
    const runtime = await loadFirebaseRuntime();
    const response = await fetch("/api/auth/firebase-config", { cache: "no-store" });
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error("Firebase auth config is missing.");
    const candidate = payload && payload.data && typeof payload.data === "object" ? payload.data : payload;
    if (!runtime.clientModule.isFirebaseClientConfig(candidate)) throw new Error("Firebase auth config is invalid.");
    return runtime.clientModule.getFirebaseClientAuth(candidate as FirebaseClientConfig);
  }

  async function getRecaptcha(auth: Auth) {
    if (recaptchaRef.current) return recaptchaRef.current;
    const runtime = await loadFirebaseRuntime();
    const host = hostRef.current;
    if (!host) throw new Error("Phone verification is not ready.");
    host.innerHTML = "";
    const target = document.createElement("div");
    host.appendChild(target);
    recaptchaRef.current = new runtime.authModule.RecaptchaVerifier(auth, target, { size: "invisible" });
    return recaptchaRef.current;
  }

  function resetRecaptcha() {
    try {
      recaptchaRef.current?.clear();
    } catch {
      // ignore cleanup issues
    }
    recaptchaRef.current = null;
    if (hostRef.current) {
      hostRef.current.innerHTML = "";
    }
  }

  async function sendOtp() {
    if (!invite) return;
    setBusy(true);
    setMessage("");
    try {
      const auth = await getAuthClient();
      auth.settings.appVerificationDisabledForTesting = false;
      resetRecaptcha();
      const verifier = await getRecaptcha(auth);
      await verifier.render();
      const runtime = await loadFirebaseRuntime();
      confirmationRef.current = await runtime.authModule.signInWithPhoneNumber(auth, invite.phone, verifier);
      setOtpSent(true);
      setMessage("Verification code sent to WhatsApp invite phone.");
    } catch (error) {
      const code =
        typeof error === "object" && error && "code" in error
          ? String((error as { code?: string }).code || "")
          : "";
      if (
        code === "auth/invalid-app-credential" ||
        code === "auth/missing-app-credential" ||
        code === "auth/captcha-check-failed"
      ) {
        resetRecaptcha();
      }
      setMessage(error instanceof Error ? error.message : "Failed to send verification code.");
    } finally {
      setBusy(false);
    }
  }

  async function acceptInvite() {
    if (!token) return;
    const confirmation = confirmationRef.current;
    if (!confirmation) {
      setMessage("Send the code first.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const result = await confirmation.confirm(otpCode.trim());
      const idToken = await result.user.getIdToken(true);
      const response = await fetch("/api/staff/accept-invite", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, idToken }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        setMessage(payload?.message || "Failed to accept invite.");
        return;
      }
      persistSession(payload);
      sessionStorage.setItem("gymflow_prompt_install", "1");
      window.location.assign("/dashboard");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to accept invite.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <main className="min-h-screen bg-background p-6 text-foreground">Loading invite...</main>;
  }

  if (!invite) {
    return <main className="min-h-screen bg-background p-6 text-foreground">{message || "Invite not found."}</main>;
  }

  return (
    <main className="min-h-screen bg-background px-4 py-8 text-foreground">
      <div className="mx-auto max-w-xl">
        <Card>
          <CardHeader>
            <CardTitle>Activate your GymFlow team account</CardTitle>
            <p className="text-sm text-muted-foreground">
              {invite.staff.name} was added to {invite.organization.name} / {invite.branch.name} as {invite.staff.role}.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded border border-border bg-muted/20 p-3 text-sm">
              <p>1. Send the OTP to {invite.phone}</p>
              <p>2. Verify the code</p>
              <p>3. You will land in the browser first. Install the PWA after login.</p>
            </div>

            <div className="space-y-2">
              <Button onClick={sendOtp} disabled={busy || !!invite.acceptedAt}>
                {busy ? "Working..." : otpSent ? "Resend code" : "Send verification code"}
              </Button>
            </div>

            <div className="space-y-2">
              <Label htmlFor="otp">Verification code</Label>
              <Input id="otp" value={otpCode} onChange={(event) => setOtpCode(event.target.value)} />
            </div>

            <Button onClick={acceptInvite} disabled={busy || !otpCode.trim() || !!invite.acceptedAt}>
              {invite.acceptedAt ? "Invite already accepted" : busy ? "Activating..." : "Activate account"}
            </Button>

            {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
            <div ref={hostRef} />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
