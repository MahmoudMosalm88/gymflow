"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Auth,
  ConfirmationResult,
  GoogleAuthProvider,
  RecaptchaVerifier,
  getRedirectResult,
  signInWithEmailAndPassword,
  signInWithPhoneNumber,
  signInWithRedirect,
  signInWithPopup
} from "firebase/auth";
import {
  FirebaseClientConfig,
  getFirebaseClientAuth,
  isFirebaseClientConfig
} from "@/lib/firebase-client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormDescription,
  FormLabel,
  FormMessage
} from "@/components/ui/form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Check, Terminal } from "lucide-react";

type Mode = "login" | "register";
type AuthMethod = "email" | "phone";
type Lang = "en" | "ar";
type Feedback = { kind: "error" | "success"; text: string } | null;
type SetupSnapshot = {
  ownerName: string;
  organizationName: string;
  branchName: string;
};
type GooglePendingState = {
  mode: Mode;
  setup?: SetupSnapshot;
  issuedAt: number;
};

type SessionPayload = {
  idToken?: string;
  branchId?: string;
  organizationId?: string;
  ownerId?: string;
};

type OwnerPayload = {
  owner_id?: string;
  organization_id?: string;
  branch_id?: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
};

type ApiDataPayload = {
  message?: string;
  owner?: OwnerPayload;
  session?: SessionPayload;
};

type ApiPayload = {
  success?: boolean;
  message?: string;
  data?: ApiDataPayload;
} & ApiDataPayload;

const SESSION_TOKEN_KEY = "session_token";
const BRANCH_ID_KEY = "branch_id";
const OWNER_PROFILE_KEY = "owner_profile";
const GOOGLE_PENDING_KEY = "google_auth_pending_v1";
const PHONE_REGEX = /^\+[1-9]\d{7,14}$/;

const copy = {
  en: {
    badge: "GymFlow",
    title: "Owner authentication",
    subtitle: "Fast setup for non-technical teams. Choose the easiest sign-in method.",
    signIn: "Sign in",
    createAccount: "Create account",
    noAccount: "Don't have an account?",
    haveAccount: "Already have an account?",
    methodEmail: "Email",
    methodPhone: "Phone",
    ownerName: "Owner name",
    organizationName: "Organization name",
    branchName: "First branch name",
    email: "Email",
    password: "Password",
    phone: "Phone number",
    phoneHint: "Use international format like +15551234567",
    otpCode: "Verification code",
    sendOtp: "Send code",
    verifyOtp: "Verify code",
    googleContinue: "Continue with Google",
    orContinueWith: "or continue with",
    forgotPassword: "Forgot password?",
    backHome: "Back to home",
    loginSuccess: "Signed in. Redirecting to dashboard...",
    registerSuccess: "Account created. Redirecting to dashboard...",
    otpSent: "Verification code sent. Enter it below.",
    invalidPhone: "Enter a valid phone number in international format, like +15551234567.",
    requiredSetupFields: "Owner name, organization name, and branch name are required.",
    genericError: "Something went wrong. Please try again.",
    googleNoEmail: "Google account did not provide an email. Please choose a Google account with email access.",
    googlePopupClosed: "Google sign-in was cancelled before completion.",
    googlePopupBlocked: "Popup was blocked. Continuing with Google redirect flow...",
    googleAccountMissing: "No GymFlow account found for this Google account. Use Create account first.",
    resendCodeIn: "Resend in",
    resendCode: "Resend code",
    errorTitle: "Error",
    successTitle: "Success"
  },
  ar: {
    badge: "GymFlow",
    title: "تسجيل مالك النظام",
    subtitle: "تهيئة سريعة لفريق العمل غير التقني. اختر أسهل طريقة تسجيل.",
    signIn: "تسجيل الدخول",
    createAccount: "إنشاء حساب",
    noAccount: "ليس لديك حساب؟",
    haveAccount: "لديك حساب بالفعل؟",
    methodEmail: "البريد",
    methodPhone: "الهاتف",
    ownerName: "اسم المالك",
    organizationName: "اسم المؤسسة",
    branchName: "اسم الفرع الأول",
    email: "البريد الإلكتروني",
    password: "كلمة المرور",
    phone: "رقم الهاتف",
    phoneHint: "استخدم الصيغة الدولية مثل +201XXXXXXXXX",
    otpCode: "رمز التحقق",
    sendOtp: "إرسال الرمز",
    verifyOtp: "تأكيد الرمز",
    googleContinue: "المتابعة عبر Google",
    orContinueWith: "أو تابع عبر",
    forgotPassword: "نسيت كلمة المرور؟",
    backHome: "العودة للرئيسية",
    loginSuccess: "تم تسجيل الدخول. جارٍ فتح لوحة التحكم...",
    registerSuccess: "تم إنشاء الحساب. جارٍ فتح لوحة التحكم...",
    otpSent: "تم إرسال رمز التحقق. أدخله بالأسفل.",
    invalidPhone: "أدخل رقماً صحيحاً بصيغة دولية مثل +201XXXXXXXXX.",
    requiredSetupFields: "اسم المالك واسم المؤسسة واسم الفرع مطلوبة.",
    genericError: "حدث خطأ. حاول مرة أخرى.",
    googleNoEmail: "حساب Google لم يرسل بريداً إلكترونياً. اختر حساباً يحتوي على بريد.",
    googlePopupClosed: "تم إلغاء تسجيل الدخول عبر Google قبل الاكتمال.",
    googlePopupBlocked: "تم حظر النافذة المنبثقة. سنكمل عبر إعادة التوجيه...",
    googleAccountMissing: "لا يوجد حساب GymFlow مرتبط بهذا Google. استخدم إنشاء حساب أولاً.",
    resendCodeIn: "إعادة إرسال خلال",
    resendCode: "إعادة إرسال الرمز",
    errorTitle: "خطأ",
    successTitle: "نجاح"
  }
} as const;

/* ---------- Schemas ---------- */

const setupFieldsSchema = z.object({
  ownerName: z.string().min(2, "Owner name must be at least 2 characters"),
  organizationName: z.string().min(2, "Organization name must be at least 2 characters"),
  branchName: z.string().min(2, "Branch name must be at least 2 characters")
});

const emailLoginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters")
});

const emailRegisterSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  phone: z.string().regex(PHONE_REGEX, "Invalid phone format").optional().or(z.literal(""))
});

const phoneLoginSchema = z.object({
  phone: z.string().regex(PHONE_REGEX, "Invalid phone format")
});

const phoneRegisterSchema = z.object({
  phone: z.string().regex(PHONE_REGEX, "Invalid phone format")
});

const otpVerifySchema = z.object({
  otpCode: z.string().min(4, "Code must be at least 4 characters").max(8, "Code must be at most 8 characters")
});

/* ---------- Helpers ---------- */

function isSuccessPayload(payload: unknown): payload is ApiPayload {
  return Boolean(payload && typeof payload === "object" && (payload as ApiPayload).success === true);
}

function unwrapData(payload: unknown): ApiDataPayload {
  if (!payload || typeof payload !== "object") return {};
  const record = payload as ApiPayload;
  return record.data && typeof record.data === "object" ? record.data : record;
}

function readMessage(payload: unknown, fallback: string) {
  const data = unwrapData(payload);
  if (typeof data.message === "string" && data.message) return data.message;
  if (payload && typeof payload === "object" && "message" in payload) {
    const message = (payload as ApiPayload).message;
    if (typeof message === "string" && message) return message;
  }
  return fallback;
}

function mapFirebaseClientAuthError(code: string) {
  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Incorrect email or password. Please check your credentials and try again.";
    case "auth/user-disabled":
      return "Your account has been disabled. Please contact support.";
    case "auth/too-many-requests":
      return "Too many attempts. Please wait a few minutes and try again.";
    default:
      return "We couldn't sign you in with Firebase. Please try again.";
  }
}

function mapPhoneAuthError(code: string, fallbackMessage: string, t: (typeof copy)[Lang]) {
  switch (code) {
    case "auth/invalid-phone-number":
      return t.invalidPhone;
    case "auth/too-many-requests":
      return "Too many verification attempts. Firebase temporarily blocked SMS for this number/device. Wait longer (up to 1 hour) or try a different number.";
    case "auth/operation-not-allowed":
      return "Phone sign-in is disabled in Firebase. Enable Phone provider and SMS region support in Firebase Auth settings.";
    case "auth/captcha-check-failed":
      return "Phone verification failed captcha checks. Refresh the page and try again.";
    case "auth/invalid-app-credential":
    case "auth/missing-app-credential":
      return "Phone verification app credential is invalid. Disable ad-blockers/privacy extensions and try again.";
    case "auth/network-request-failed":
      return "Network issue while sending verification code. Check your connection and try again.";
    case "auth/internal-error":
      return "Firebase phone auth failed due project configuration. Please contact support.";
    default:
      return fallbackMessage;
  }
}

async function postJson(path: string, body: Record<string, unknown>) {
  const response = await fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
  const payload = await response.json().catch(() => null);
  return { response, payload };
}

function persistSession(payload: unknown) {
  const data = unwrapData(payload);
  const session = data.session;
  const owner = data.owner;
  if (!session || typeof session !== "object") return;
  try {
    if (typeof session.idToken === "string" && session.idToken.length > 20) {
      localStorage.setItem(SESSION_TOKEN_KEY, session.idToken);
    }
    if (typeof session.branchId === "string" && session.branchId) {
      localStorage.setItem(BRANCH_ID_KEY, session.branchId);
    }
    if (owner && typeof owner === "object") {
      localStorage.setItem(OWNER_PROFILE_KEY, JSON.stringify(owner));
    }
  } catch {
    // ignore storage errors
  }
}

function saveGooglePendingState(state: GooglePendingState) {
  try {
    sessionStorage.setItem(GOOGLE_PENDING_KEY, JSON.stringify(state));
  } catch {
    // ignore storage errors
  }
}

function readGooglePendingState() {
  try {
    const raw = sessionStorage.getItem(GOOGLE_PENDING_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GooglePendingState;
    if (!parsed || (parsed.mode !== "login" && parsed.mode !== "register")) return null;
    if (typeof parsed.issuedAt !== "number" || Date.now() - parsed.issuedAt > 15 * 60 * 1e3) {
      sessionStorage.removeItem(GOOGLE_PENDING_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function clearGooglePendingState() {
  try {
    sessionStorage.removeItem(GOOGLE_PENDING_KEY);
  } catch {
    // ignore storage errors
  }
}

/* ---------- Component ---------- */

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>("login");
  const [lang, setLang] = useState<Lang>("en");
  const [method, setMethod] = useState<AuthMethod>("email");
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [otpSent, setOtpSent] = useState(false);
  const [phoneTarget, setPhoneTarget] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [canResend, setCanResend] = useState(false);

  const authRef = useRef<Auth | null>(null);
  const recaptchaRef = useRef<RecaptchaVerifier | null>(null);
  const recaptchaContainerRef = useRef<HTMLDivElement | null>(null);
  const recaptchaTargetRef = useRef<HTMLDivElement | null>(null);
  const confirmationRef = useRef<ConfirmationResult | null>(null);
  const recaptchaSlotId = "phone-auth-recaptcha";

  const isArabic = lang === "ar";
  const t = useMemo(() => copy[lang], [lang]);

  // Forms
  const setupForm = useForm<z.infer<typeof setupFieldsSchema>>({
    resolver: zodResolver(setupFieldsSchema),
    mode: "onBlur",
    defaultValues: { ownerName: "", organizationName: "", branchName: "" }
  });

  const emailLoginForm = useForm<z.infer<typeof emailLoginSchema>>({
    resolver: zodResolver(emailLoginSchema),
    mode: "onBlur",
    defaultValues: { email: "", password: "" }
  });

  const emailRegisterForm = useForm<z.infer<typeof emailRegisterSchema>>({
    resolver: zodResolver(emailRegisterSchema),
    mode: "onBlur",
    defaultValues: { email: "", password: "", phone: "" }
  });

  const phoneLoginForm = useForm<z.infer<typeof phoneLoginSchema>>({
    resolver: zodResolver(phoneLoginSchema),
    mode: "onBlur",
    defaultValues: { phone: "" }
  });

  const phoneRegisterForm = useForm<z.infer<typeof phoneRegisterSchema>>({
    resolver: zodResolver(phoneRegisterSchema),
    mode: "onBlur",
    defaultValues: { phone: "" }
  });

  const otpVerifyForm = useForm<z.infer<typeof otpVerifySchema>>({
    resolver: zodResolver(otpVerifySchema),
    mode: "onBlur",
    defaultValues: { otpCode: "" }
  });

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const paramMode = searchParams.get("mode");
    if ((paramMode === "login" || paramMode === "register") && paramMode !== mode) {
      setMode(paramMode);
      setFeedback(null);
      setOtpSent(false);
    }
  }, []);

  useEffect(() => {
    return () => {
      resetRecaptcha();
    };
  }, []);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) { setCanResend(true); return 0; }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [countdown]);

  /* ---------- Auth helpers ---------- */

  async function getAuthClient() {
    if (authRef.current) return authRef.current;
    const response = await fetch("/api/auth/firebase-config", { cache: "no-store" });
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error(readMessage(payload, "Firebase auth is not configured."));
    const candidate = unwrapData(payload);
    if (!isFirebaseClientConfig(candidate)) throw new Error("Firebase auth configuration is incomplete.");
    const auth = await getFirebaseClientAuth(candidate as FirebaseClientConfig);
    const host = window.location.hostname;
    auth.settings.appVerificationDisabledForTesting = host === "localhost" || host === "127.0.0.1";
    authRef.current = auth;
    return auth;
  }

  async function signInEmailOnClient(email: string, password: string) {
    try {
      const auth = await getAuthClient();
      const credential = await signInWithEmailAndPassword(auth, email, password);
      return await credential.user.getIdToken(true);
    } catch (error) {
      const code =
        typeof error === "object" && error && "code" in error
          ? String((error as { code?: string }).code || "")
          : "";
      throw new Error(mapFirebaseClientAuthError(code));
    }
  }

  function getRecaptcha(auth: Auth) {
    if (recaptchaRef.current) return recaptchaRef.current;

    const host = recaptchaContainerRef.current;
    if (!host) {
      throw new Error("Phone verification container is not ready. Please refresh and try again.");
    }

    // Recreate target node every time to avoid "already rendered" collisions.
    host.innerHTML = "";
    const target = document.createElement("div");
    host.appendChild(target);
    recaptchaTargetRef.current = target;

    recaptchaRef.current = new RecaptchaVerifier(auth, target, { size: "invisible" });
    return recaptchaRef.current;
  }

  function resetRecaptcha() {
    try {
      recaptchaRef.current?.clear();
    } catch {
      // ignore cleanup issues
    }
    recaptchaRef.current = null;
    recaptchaTargetRef.current = null;
    if (recaptchaContainerRef.current) {
      recaptchaContainerRef.current.innerHTML = "";
    }
  }

  async function requestPhoneOtp(auth: Auth, phone: string) {
    const verifier = getRecaptcha(auth);
    try {
      return await signInWithPhoneNumber(auth, phone, verifier);
    } catch (error) {
      const code =
        typeof error === "object" && error && "code" in error
          ? String((error as { code?: string }).code || "")
          : "";

      if (code === "auth/invalid-app-credential" || code === "auth/missing-app-credential") {
        // Reset stale verifier state; user should click "Send code" once again.
        resetRecaptcha();
      }
      throw error;
    }
  }

  async function loginWithIdToken(idToken: string, successMessage: string) {
    const login = await postJson("/api/auth/login", { idToken });
    if (!login.response.ok || !isSuccessPayload(login.payload)) {
      throw new Error(readMessage(login.payload, t.genericError));
    }
    persistSession(login.payload);
    setFeedback({ kind: "success", text: successMessage });
    window.location.assign("/dashboard");
  }

  function getSetupSnapshot() {
    const values = setupForm.getValues();
    const setup: SetupSnapshot = {
      ownerName: values.ownerName.trim(),
      organizationName: values.organizationName.trim(),
      branchName: values.branchName.trim()
    };
    if (!setup.ownerName || !setup.organizationName || !setup.branchName) {
      return null;
    }
    return setup;
  }

  function mapGoogleClientError(code: string, fallbackMessage: string) {
    switch (code) {
      case "auth/popup-closed-by-user":
        return "Google sign-in did not complete. If this keeps happening, your Firebase Google OAuth client is likely misconfigured.";
      case "auth/popup-blocked":
      case "auth/web-storage-unsupported":
      case "auth/operation-not-supported-in-this-environment":
        return t.googlePopupBlocked;
      case "auth/unauthorized-domain":
        return "This domain is not authorized for Firebase Google sign-in. Add it in Firebase Auth > Authorized domains.";
      case "auth/operation-not-allowed":
        return "Google sign-in is disabled in Firebase. Enable the Google provider in Firebase Auth settings.";
      case "auth/internal-error":
        return "Firebase Google sign-in failed due project configuration. Please contact support.";
      case "auth/account-exists-with-different-credential":
        return "This email is already linked with a different sign-in method.";
      default:
        return fallbackMessage;
    }
  }

  async function registerGoogleIfNeeded(
    idToken: string,
    modeValue: Mode,
    email: string | undefined,
    setupOverride?: SetupSnapshot
  ) {
    if (modeValue !== "register") return;
    const setup = setupOverride || getSetupSnapshot();
    if (!setup) throw new Error(t.requiredSetupFields);
    if (!email) throw new Error(t.googleNoEmail);

    const register = await postJson("/api/auth/register", {
      authMethod: "google",
      idToken,
      ownerName: setup.ownerName,
      organizationName: setup.organizationName,
      branchName: setup.branchName,
      email
    });
    if (!register.response.ok && register.response.status !== 409) {
      throw new Error(readMessage(register.payload, t.genericError));
    }
  }

  async function completeGoogleFlow(
    idToken: string,
    email: string | undefined,
    modeValue: Mode,
    setupOverride?: SetupSnapshot
  ) {
    await registerGoogleIfNeeded(idToken, modeValue, email, setupOverride);
    try {
      await loginWithIdToken(idToken, modeValue === "register" ? t.registerSuccess : t.loginSuccess);
    } catch (error) {
      const message = error instanceof Error ? error.message : t.genericError;
      if (modeValue === "login" && message.toLowerCase().includes("isn't fully set up")) {
        throw new Error(t.googleAccountMissing);
      }
      throw error;
    }
  }

  useEffect(() => {
    let cancelled = false;
    async function continueGoogleRedirectIfAny() {
      const pending = readGooglePendingState();
      if (!pending) return;
      setBusyKey("google");
      try {
        const auth = await getAuthClient();
        const result = await getRedirectResult(auth);
        if (!result?.user) {
          clearGooglePendingState();
          return;
        }
        const idToken = await result.user.getIdToken(true);
        const email = result.user.email || undefined;
        await completeGoogleFlow(idToken, email, pending.mode, pending.setup);
      } catch (error) {
        if (!cancelled) {
          setFeedback({ kind: "error", text: error instanceof Error ? error.message : t.genericError });
        }
      } finally {
        clearGooglePendingState();
        if (!cancelled) setBusyKey(null);
      }
    }
    void continueGoogleRedirectIfAny();
    return () => {
      cancelled = true;
    };
  }, []);

  /* ---------- Handlers ---------- */

  async function onEmailSubmit(data: z.infer<typeof emailLoginSchema> | z.infer<typeof emailRegisterSchema>) {
    setFeedback(null);
    setBusyKey("email");
    try {
      if (mode === "login") {
        const d = data as z.infer<typeof emailLoginSchema>;
        const idToken = await signInEmailOnClient(d.email.trim(), d.password);
        await loginWithIdToken(idToken, t.loginSuccess);
        return;
      }

      // Register mode
      const setupValid = await setupForm.trigger();
      if (!setupValid) { setFeedback({ kind: "error", text: t.requiredSetupFields }); return; }

      const d = data as z.infer<typeof emailRegisterSchema>;
      const s = setupForm.getValues();
      const register = await postJson("/api/auth/register", {
        authMethod: "email",
        ownerName: s.ownerName.trim(),
        organizationName: s.organizationName.trim(),
        branchName: s.branchName.trim(),
        email: d.email.trim(),
        password: d.password,
        phone: d.phone?.trim() || undefined
      });
      if (!register.response.ok || !isSuccessPayload(register.payload)) {
        setFeedback({ kind: "error", text: readMessage(register.payload, t.genericError) });
        return;
      }

      const idToken = await signInEmailOnClient(d.email.trim(), d.password);
      await loginWithIdToken(idToken, t.registerSuccess);
    } catch (error) {
      setFeedback({ kind: "error", text: error instanceof Error ? error.message : t.genericError });
    } finally {
      setBusyKey(null);
    }
  }

  async function onGoogleClick() {
    setFeedback(null);
    setBusyKey("google");
    try {
      let setupSnapshot: SetupSnapshot | undefined;
      if (mode === "register") {
        const setupValid = await setupForm.trigger();
        if (!setupValid) { setFeedback({ kind: "error", text: t.requiredSetupFields }); return; }
        const setup = getSetupSnapshot();
        if (!setup) { setFeedback({ kind: "error", text: t.requiredSetupFields }); return; }
        setupSnapshot = setup;
      }
      const auth = await getAuthClient();
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      provider.addScope("email");
      provider.addScope("profile");
      const credential = await signInWithPopup(auth, provider);
      const idToken = await credential.user.getIdToken(true);
      await completeGoogleFlow(idToken, credential.user.email || undefined, mode, setupSnapshot);
    } catch (error) {
      const code =
        typeof error === "object" && error && "code" in error
          ? String((error as { code?: string }).code || "")
          : "";
      if (
        code === "auth/popup-blocked" ||
        code === "auth/web-storage-unsupported" ||
        code === "auth/operation-not-supported-in-this-environment"
      ) {
        try {
          const auth = await getAuthClient();
          const provider = new GoogleAuthProvider();
          provider.setCustomParameters({ prompt: "select_account" });
          provider.addScope("email");
          provider.addScope("profile");
          saveGooglePendingState({
            mode,
            setup: mode === "register" ? getSetupSnapshot() || void 0 : void 0,
            issuedAt: Date.now()
          });
          setFeedback({ kind: "success", text: t.googlePopupBlocked });
          await signInWithRedirect(auth, provider);
          return;
        } catch (redirectError) {
          setFeedback({
            kind: "error",
            text: redirectError instanceof Error ? redirectError.message : t.genericError
          });
          return;
        }
      }
      setFeedback({
        kind: "error",
        text: mapGoogleClientError(code, error instanceof Error ? error.message : t.genericError)
      });
    } finally {
      setBusyKey(null);
    }
  }

  async function onSendOtp() {
    setFeedback(null);
    setBusyKey("send-otp");
    try {
      if (mode === "register") {
        const setupValid = await setupForm.trigger();
        if (!setupValid) { setFeedback({ kind: "error", text: t.requiredSetupFields }); return; }
        const phoneValid = await phoneRegisterForm.trigger();
        if (!phoneValid) return;
        const d = phoneRegisterForm.getValues();
        const auth = await getAuthClient();
        const confirmation = await requestPhoneOtp(auth, d.phone.trim());
        confirmationRef.current = confirmation;
        setPhoneTarget(d.phone.trim());
      } else {
        const phoneValid = await phoneLoginForm.trigger();
        if (!phoneValid) return;
        const d = phoneLoginForm.getValues();
        const auth = await getAuthClient();
        const confirmation = await requestPhoneOtp(auth, d.phone.trim());
        confirmationRef.current = confirmation;
        setPhoneTarget(d.phone.trim());
      }
      setOtpSent(true);
      setCountdown(60);
      setCanResend(false);
      setFeedback({ kind: "success", text: t.otpSent });
    } catch (error) {
      const code =
        typeof error === "object" && error && "code" in error
          ? String((error as { code?: string }).code || "")
          : "";
      const fallback = error instanceof Error ? error.message : t.genericError;
      setFeedback({ kind: "error", text: mapPhoneAuthError(code, fallback, t) });
    } finally {
      setBusyKey(null);
    }
  }

  async function onVerifyOtp() {
    setFeedback(null);
    const otpValid = await otpVerifyForm.trigger();
    if (!otpValid) return;
    setBusyKey("verify-otp");
    try {
      const confirmation = confirmationRef.current;
      if (!confirmation) { setFeedback({ kind: "error", text: "Please request a verification code first." }); return; }
      const otpData = otpVerifyForm.getValues();
      const result = await confirmation.confirm(otpData.otpCode.trim());
      const idToken = await result.user.getIdToken(true);

      if (mode === "register") {
        const s = setupForm.getValues();
        const register = await postJson("/api/auth/register", {
          authMethod: "phone",
          idToken,
          ownerName: s.ownerName.trim(),
          organizationName: s.organizationName.trim(),
          branchName: s.branchName.trim(),
          phone: phoneTarget
        });
        if (!register.response.ok && register.response.status !== 409) {
          setFeedback({ kind: "error", text: readMessage(register.payload, t.genericError) });
          return;
        }
      }
      await loginWithIdToken(idToken, mode === "register" ? t.registerSuccess : t.loginSuccess);
    } catch (error) {
      setFeedback({ kind: "error", text: error instanceof Error ? error.message : t.genericError });
    } finally {
      setBusyKey(null);
    }
  }

  function switchMode() {
    const nextMode: Mode = mode === "login" ? "register" : "login";
    setMode(nextMode);
    setFeedback(null);
    setOtpSent(false);
    setBusyKey(null);
    const params = new URLSearchParams(window.location.search);
    params.set("mode", nextMode);
    const qs = params.toString();
    window.history.replaceState(null, "", qs ? `${window.location.pathname}?${qs}` : window.location.pathname);
  }

  /* ---------- Render ---------- */

  return (
    <main className="min-h-screen flex flex-col lg:flex-row font-sans" dir={isArabic ? "rtl" : "ltr"}>
      {/* ── Left panel ── */}
      <aside
        className="lg:w-1/2 bg-[#0a0a0a] text-white flex flex-col justify-between p-10 lg:p-16 border-b-2 border-[#2a2a2a] lg:border-b-0 lg:border-r-2 relative overflow-hidden"
        style={{ backgroundImage: 'radial-gradient(#1d1d1d 1px, transparent 1px)', backgroundSize: '28px 28px' }}
      >
        {/* Watermark */}
        <div
          aria-hidden="true"
          className="absolute -bottom-12 -right-8 select-none pointer-events-none font-black text-[#e63946]"
          style={{ fontSize: '20rem', lineHeight: 1, opacity: 0.045, letterSpacing: '-0.04em' }}
        >
          GF
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-12">
            <span style={{ background: '#e63946', color: '#fff', padding: '6px 9px', fontWeight: 800, fontSize: '0.75rem', lineHeight: 1 }}>GF</span>
            <span className="font-bold text-white text-sm tracking-tight">GymFlow</span>
          </div>

          <div className="h-[3px] w-12 bg-[#e63946] mb-8" />

          <h1 className="font-black text-white mb-6 leading-[1.05]" style={{ fontSize: 'clamp(2.2rem, 4vw, 3.4rem)' }}>
            {isArabic ? (
              <>نظام إدارة الجيم<br />الذي لا يكون<br />عائقاً في طريقك.</>
            ) : (
              <>The gym OS<br />that stays<br />out of your way.</>
            )}
          </h1>
          <p className="text-[#666666] text-sm leading-relaxed mb-10 max-w-xs">{t.subtitle}</p>

          <div className="space-y-4">
            {(isArabic ? [
              "تسجيل دخول الأعضاء في ثوانٍ",
              "اشتراكات ومدفوعات وتقارير فورية",
              "اللغة العربية والإنجليزية مدمجتان",
              "يعمل على الهاتف والكمبيوتر",
            ] : [
              "Member check-in in seconds",
              "Subscriptions, payments & instant reports",
              "Arabic & English built-in",
              "Works on mobile and desktop",
            ]).map((item) => (
              <div key={item} className="flex items-start gap-4">
                <span className="mt-1.5 h-4 w-1 bg-[#e63946] shrink-0" />
                <span className="text-[#bbbbbb] text-sm leading-snug">{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10">
          <div className="flex gap-8 border-t-2 border-[#2a2a2a] pt-8 mb-8">
            <div>
              <p className="text-2xl font-black text-white">∞</p>
              <p className="text-xs text-[#555555] mt-1">{isArabic ? "أعضاء بدون حد" : "Unlimited members"}</p>
            </div>
            <div>
              <p className="text-2xl font-black text-white">2 min</p>
              <p className="text-xs text-[#555555] mt-1">{isArabic ? "للبدء الفوري" : "To get started"}</p>
            </div>
            <div>
              <p className="text-2xl font-black text-white">AR+EN</p>
              <p className="text-xs text-[#555555] mt-1">{isArabic ? "ثنائي اللغة" : "Bilingual built-in"}</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex border-2 border-[#2a2a2a]">
              <button
                onClick={() => setLang("en")}
                className={`px-3 py-1.5 text-xs font-bold transition-colors ${lang === "en" ? "bg-[#e63946] text-white" : "bg-transparent text-[#888888] hover:text-white"}`}
              >
                EN
              </button>
              <button
                onClick={() => setLang("ar")}
                className={`px-3 py-1.5 text-xs font-bold transition-colors ${lang === "ar" ? "bg-[#e63946] text-white" : "bg-transparent text-[#888888] hover:text-white"}`}
              >
                AR
              </button>
            </div>
            <Link href="/" className="text-sm text-[#555555] hover:text-white transition-colors">
              ← {t.backHome}
            </Link>
          </div>
        </div>
      </aside>

      {/* ── Right panel ── */}
      <section className="lg:w-1/2 flex items-start lg:items-center justify-center p-6 lg:p-12 bg-[#141414] overflow-y-auto">
        <div className="w-full max-w-md">
          {/* Red accent bar */}
          <div className="h-1 bg-[#e63946]" />
          <div
            className="bg-[#1e1e1e] p-8 text-[#e8e4df]"
            style={{ border: '2px solid #2a2a2a', borderTop: 'none', boxShadow: '6px 6px 0 #000000' }}
          >
            {/* Title */}
            <h2 className="text-xl font-black text-[#e8e4df] mb-6">
              {mode === "login" ? t.signIn : t.createAccount}
            </h2>

            {/* Setup fields — only in register mode */}
            {mode === "register" && (
              <>
                <Form {...setupForm}>
                  <form onSubmit={e => e.preventDefault()} className="grid grid-cols-1 gap-4 mb-6">
                    <FormField
                      control={setupForm.control}
                      name="ownerName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t.ownerName}</FormLabel>
                          <FormControl><Input type="text" {...field} autoComplete="name" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={setupForm.control}
                      name="organizationName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t.organizationName}</FormLabel>
                          <FormControl><Input type="text" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={setupForm.control}
                      name="branchName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t.branchName}</FormLabel>
                          <FormControl><Input type="text" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </form>
                </Form>
                <div className="border-t-2 border-[#2a2a2a] mb-6" />
              </>
            )}

            {/* Google — always visible as a standalone button */}
            <Button
              type="button"
              className="w-full mb-4"
              onClick={onGoogleClick}
              disabled={busyKey === "google"}
              variant="outline"
            >
              {/* Google icon */}
              <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="none">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 001 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              {busyKey === "google" ? `${t.googleContinue}...` : t.googleContinue}
            </Button>

            {/* Divider */}
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 border-t-2 border-[#2a2a2a]" />
              <span className="text-xs text-[#8a8578] font-medium">{t.orContinueWith}</span>
              <div className="flex-1 border-t-2 border-[#2a2a2a]" />
            </div>

            {/* Method tabs — just Email and Phone */}
            <div className="flex gap-2 mb-6">
              {(["email", "phone"] as AuthMethod[]).map((m) => (
                <button
                  type="button"
                  key={m}
                  onClick={() => { setMethod(m); setFeedback(null); setOtpSent(false); }}
                  className={`flex-1 px-2 py-2 text-xs font-bold border-2 transition-colors ${
                    method === m
                      ? "border-[#e63946] text-[#e63946] bg-[#e63946]/5"
                      : "border-[#2a2a2a] text-[#8a8578] hover:border-[#e63946] hover:text-[#e63946]"
                  }`}
                >
                  {m === "email" ? t.methodEmail : t.methodPhone}
                </button>
              ))}
            </div>

            {/* ── Email form ── */}
            {method === "email" && (
              <Form key={`email-form-${mode}`} {...(mode === "register" ? emailRegisterForm : emailLoginForm) as any}>
                <form
                  key={`email-form-inner-${mode}`}
                  onSubmit={mode === "register"
                    ? emailRegisterForm.handleSubmit(onEmailSubmit)
                    : emailLoginForm.handleSubmit(onEmailSubmit)}
                  className="space-y-4"
                >
                  {mode === "register" ? (
                    <>
                      <FormField
                        key="register-email"
                        control={emailRegisterForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t.email}</FormLabel>
                            <FormControl><Input type="email" autoComplete="email" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        key="register-phone"
                        control={emailRegisterForm.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t.phone}</FormLabel>
                            <FormControl><Input type="tel" autoComplete="tel" placeholder="+15551234567" {...field} /></FormControl>
                            <FormDescription>{t.phoneHint}</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        key="register-password"
                        control={emailRegisterForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t.password}</FormLabel>
                            <FormControl><Input type="password" autoComplete="new-password" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </>
                  ) : (
                    <>
                      <FormField
                        key="login-email"
                        control={emailLoginForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t.email}</FormLabel>
                            <FormControl><Input type="email" autoComplete="email" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        key="login-password"
                        control={emailLoginForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t.password}</FormLabel>
                            <FormControl><Input type="password" autoComplete="current-password" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </>
                  )}

                  <Button type="submit" className="w-full" disabled={busyKey === "email"}>
                    {busyKey === "email"
                      ? (mode === "login" ? `${t.signIn}...` : `${t.createAccount}...`)
                      : (mode === "login" ? t.signIn : t.createAccount)}
                  </Button>

                  {mode === "login" && (
                    <Link
                      href="/forgot-password"
                      className="block text-center text-sm text-[#8a8578] hover:text-[#e63946] transition-colors mt-2"
                    >
                      {t.forgotPassword}
                    </Link>
                  )}
                </form>
              </Form>
            )}

            {/* ── Phone form ── */}
            {method === "phone" && (
              <div className="space-y-4">
                {!otpSent ? (
                  /* Step 1: Enter phone */
                  <>
                    <Form key={`phone-form-${mode}`} {...(mode === "register" ? phoneRegisterForm : phoneLoginForm) as any}>
                      <form key={`phone-inner-${mode}`} onSubmit={e => e.preventDefault()} className="space-y-4">
                        <FormField
                          key={`phone-field-${mode}`}
                          control={(mode === "register" ? phoneRegisterForm.control : phoneLoginForm.control) as any}
                          name={(mode === "register" ? "phone" : "phone") as any}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t.phone}</FormLabel>
                              <FormControl>
                                <Input type="tel" autoComplete="tel" placeholder="+15551234567" {...field} />
                              </FormControl>
                              <FormDescription>{t.phoneHint}</FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </form>
                    </Form>
                    <Button className="w-full" type="button" onClick={onSendOtp} disabled={busyKey === "send-otp"}>
                      {busyKey === "send-otp" ? `${t.sendOtp}...` : t.sendOtp}
                    </Button>
                  </>
                ) : (
                  /* Step 2: Enter OTP */
                  <Form {...otpVerifyForm}>
                    <form onSubmit={otpVerifyForm.handleSubmit(onVerifyOtp)} className="space-y-4">
                      <p className="text-sm text-[#8a8578]">
                        {isArabic ? `تم إرسال الرمز إلى ${phoneTarget}` : `Code sent to ${phoneTarget}`}
                      </p>
                      <FormField
                        control={otpVerifyForm.control}
                        name="otpCode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t.otpCode}</FormLabel>
                            <FormControl><Input type="text" inputMode="numeric" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="text-center text-sm text-[#8a8578]">
                        {!canResend ? (
                          <p>{`${t.resendCodeIn} ${countdown}s`}</p>
                        ) : (
                          <button
                            type="button"
                            onClick={onSendOtp}
                            disabled={busyKey === "send-otp"}
                            className="text-[#e63946] hover:underline font-medium"
                          >
                            {t.resendCode}
                          </button>
                        )}
                      </div>
                      <Button className="w-full" type="submit" disabled={busyKey === "verify-otp"}>
                        {busyKey === "verify-otp" ? `${t.verifyOtp}...` : t.verifyOtp}
                      </Button>
                    </form>
                  </Form>
                )}
              </div>
            )}

            <div
              ref={recaptchaContainerRef}
              id={recaptchaSlotId}
              className="fixed -left-[9999px] top-0 h-px w-px overflow-hidden pointer-events-none"
              aria-hidden="true"
            />

            {/* Feedback alert */}
            {feedback && (
              <Alert variant={feedback.kind === "error" ? "destructive" : "success"} className="mt-6">
                {feedback.kind === "error" ? <Terminal className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                <AlertTitle>{feedback.kind === "error" ? t.errorTitle : t.successTitle}</AlertTitle>
                <AlertDescription>{feedback.text}</AlertDescription>
              </Alert>
            )}

            {/* Mode toggle — simple text link */}
            <div className="mt-6 text-center text-sm">
              <span className="text-[#8a8578]">
                {mode === "login" ? t.noAccount : t.haveAccount}{" "}
              </span>
              <button
                type="button"
                onClick={switchMode}
                className="text-[#e63946] font-bold hover:underline"
              >
                {mode === "login" ? t.createAccount : t.signIn}
              </button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
