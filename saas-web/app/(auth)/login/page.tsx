"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Plus_Jakarta_Sans, Tajawal } from "next/font/google";
import {
  Auth,
  ConfirmationResult,
  GoogleAuthProvider,
  RecaptchaVerifier,
  signInWithPhoneNumber,
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
import styles from "./login.module.css";

const latinFont = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"]
});

const arabicFont = Tajawal({
  subsets: ["arabic"],
  weight: ["500", "700", "800"]
});

type Mode = "login" | "register";
type AuthMethod = "email" | "google" | "phone";
type Lang = "en" | "ar";
type Feedback = { kind: "error" | "success"; text: string } | null;

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
const PHONE_REGEX = /^\+[1-9]\d{7,14}$/;

const copy = {
  en: {
    badge: "GymFlow SaaS",
    title: "Owner authentication",
    subtitle: "Fast setup for non-technical teams. Choose the easiest sign-in method.",
    signIn: "Sign in",
    createAccount: "Create account",
    methodEmail: "Email",
    methodGoogle: "Google",
    methodPhone: "Phone OTP",
    ownerName: "Owner name",
    organizationName: "Organization name",
    branchName: "First branch name",
    email: "Email",
    password: "Password",
    phone: "Phone number",
    phoneHint: "Use international format like +15551234567",
    recoveryEmail: "Recovery email",
    recoveryHint: "Required for password recovery when you sign up with phone.",
    otpCode: "Verification code",
    sendOtp: "Send code",
    verifyOtp: "Verify code",
    googleContinue: "Continue with Google",
    continueEmail: "Continue with email",
    forgotPassword: "Forgot password?",
    phoneResetHint: "Phone users: password reset uses your recovery email.",
    backHome: "Back to landing",
    ready: "Ready in under 2 minutes.",
    loginSuccess: "Signed in. Redirecting to dashboard...",
    registerSuccess: "Account created. Redirecting to dashboard...",
    otpSent: "Verification code sent. Enter it below.",
    invalidPhone: "Enter a valid phone number in international format, like +15551234567.",
    requiredSetupFields: "Owner name, organization name, and branch name are required.",
    requiredEmailFallback: "Recovery email is required for phone sign-up.",
    genericError: "Something went wrong. Please try again."
  },
  ar: {
    badge: "GymFlow SaaS",
    title: "تسجيل مالك النظام",
    subtitle: "تهيئة سريعة لفريق العمل غير التقني. اختر أسهل طريقة تسجيل.",
    signIn: "تسجيل الدخول",
    createAccount: "إنشاء حساب",
    methodEmail: "البريد",
    methodGoogle: "Google",
    methodPhone: "OTP الهاتف",
    ownerName: "اسم المالك",
    organizationName: "اسم المؤسسة",
    branchName: "اسم الفرع الأول",
    email: "البريد الإلكتروني",
    password: "كلمة المرور",
    phone: "رقم الهاتف",
    phoneHint: "استخدم الصيغة الدولية مثل +201XXXXXXXXX",
    recoveryEmail: "بريد الاستعادة",
    recoveryHint: "مطلوب لاستعادة كلمة المرور عند التسجيل بالهاتف.",
    otpCode: "رمز التحقق",
    sendOtp: "إرسال الرمز",
    verifyOtp: "تأكيد الرمز",
    googleContinue: "المتابعة عبر Google",
    continueEmail: "المتابعة بالبريد",
    forgotPassword: "نسيت كلمة المرور؟",
    phoneResetHint: "لمستخدمي الهاتف: استعادة كلمة المرور عبر بريد الاستعادة.",
    backHome: "العودة للصفحة الرئيسية",
    ready: "جاهز خلال أقل من دقيقتين.",
    loginSuccess: "تم تسجيل الدخول. جارٍ فتح لوحة التحكم...",
    registerSuccess: "تم إنشاء الحساب. جارٍ فتح لوحة التحكم...",
    otpSent: "تم إرسال رمز التحقق. أدخله بالأسفل.",
    invalidPhone: "أدخل رقماً صحيحاً بصيغة دولية مثل +201XXXXXXXXX.",
    requiredSetupFields: "اسم المالك واسم المؤسسة واسم الفرع مطلوبة.",
    requiredEmailFallback: "بريد الاستعادة مطلوب عند التسجيل بالهاتف.",
    genericError: "حدث خطأ. حاول مرة أخرى."
  }
} as const;

// Zod schemas for form validation
const setupFieldsSchema = z.object({
  ownerName: z.string().min(2, "Owner name must be at least 2 characters"),
  organizationName: z.string().min(2, "Organization name must be at least 2 characters"),
  branchName: z.string().min(2, "Branch name must be at least 2 characters")
});

const emailLoginSchema = z.object({
  loginEmail: z.string().email("Invalid email address"),
  loginPassword: z.string().min(8, "Password must be at least 8 characters")
});

const emailRegisterSchema = z.object({
  registerEmail: z.string().email("Invalid email address"),
  registerPassword: z.string().min(8, "Password must be at least 8 characters"),
  registerPhone: z.string().regex(PHONE_REGEX, "Invalid phone format").optional().or(z.literal(""))
});

const googleRegisterSchema = z.object({
  registerPhone: z.string().regex(PHONE_REGEX, "Invalid phone format").optional().or(z.literal(""))
});

const phoneLoginSchema = z.object({
  loginPhone: z.string().regex(PHONE_REGEX, "Invalid phone format")
});

const phoneRegisterSchema = z.object({
  registerPhone: z.string().regex(PHONE_REGEX, "Invalid phone format"),
  registerEmail: z.string().email("Invalid email address")
});

const otpVerifySchema = z.object({
  otpCode: z.string().min(4, "Code must be at least 4 characters").max(8, "Code must be at most 8 characters")
});

type SetupFieldsForm = z.infer<typeof setupFieldsSchema>;
type EmailLoginForm = z.infer<typeof emailLoginSchema>;
type EmailRegisterForm = z.infer<typeof emailRegisterSchema>;
type GoogleRegisterForm = z.infer<typeof googleRegisterSchema>;
type PhoneLoginForm = z.infer<typeof phoneLoginSchema>;
type PhoneRegisterForm = z.infer<typeof phoneRegisterSchema>;
type OtpVerifyForm = z.infer<typeof otpVerifySchema>;

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

export default function LoginPage() {
  // Non-form state (preserved as-is)
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
  const confirmationRef = useRef<ConfirmationResult | null>(null);
  const recaptchaSlotId = "phone-auth-recaptcha";

  const isArabic = lang === "ar";
  const t = useMemo(() => copy[lang], [lang]);
  const isBusy = Boolean(busyKey);

  // React Hook Form instances
  const setupForm = useForm<SetupFieldsForm>({
    resolver: zodResolver(setupFieldsSchema),
    mode: "onBlur",
    defaultValues: {
      ownerName: "",
      organizationName: "",
      branchName: ""
    }
  });

  const emailLoginForm = useForm<EmailLoginForm>({
    resolver: zodResolver(emailLoginSchema),
    mode: "onBlur",
    defaultValues: {
      loginEmail: "",
      loginPassword: ""
    }
  });

  const emailRegisterForm = useForm<EmailRegisterForm>({
    resolver: zodResolver(emailRegisterSchema),
    mode: "onBlur",
    defaultValues: {
      registerEmail: "",
      registerPassword: "",
      registerPhone: ""
    }
  });

  const googleRegisterForm = useForm<GoogleRegisterForm>({
    resolver: zodResolver(googleRegisterSchema),
    mode: "onBlur",
    defaultValues: {
      registerPhone: ""
    }
  });

  const phoneLoginForm = useForm<PhoneLoginForm>({
    resolver: zodResolver(phoneLoginSchema),
    mode: "onBlur",
    defaultValues: {
      loginPhone: ""
    }
  });

  const phoneRegisterForm = useForm<PhoneRegisterForm>({
    resolver: zodResolver(phoneRegisterSchema),
    mode: "onBlur",
    defaultValues: {
      registerPhone: "",
      registerEmail: ""
    }
  });

  const otpVerifyForm = useForm<OtpVerifyForm>({
    resolver: zodResolver(otpVerifySchema),
    mode: "onBlur",
    defaultValues: {
      otpCode: ""
    }
  });

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const paramMode = searchParams.get("mode");
    if (paramMode === "login" || paramMode === "register") {
      setMode(paramMode);
    }
  }, []);

  useEffect(() => {
    return () => {
      recaptchaRef.current?.clear();
      recaptchaRef.current = null;
    };
  }, []);

  // Countdown timer effect
  useEffect(() => {
    if (countdown > 0) {
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [countdown]);

  async function getAuthClient() {
    if (authRef.current) return authRef.current;

    const response = await fetch("/api/auth/firebase-config");
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(readMessage(payload, "Firebase auth is not configured."));
    }

    const candidate = unwrapData(payload);
    if (!isFirebaseClientConfig(candidate)) {
      throw new Error("Firebase auth configuration is incomplete.");
    }

    const auth = await getFirebaseClientAuth(candidate as FirebaseClientConfig);
    authRef.current = auth;
    return auth;
  }

  function getRecaptcha(auth: Auth) {
    if (recaptchaRef.current) return recaptchaRef.current;
    recaptchaRef.current = new RecaptchaVerifier(auth, recaptchaSlotId, {
      size: "invisible"
    });
    return recaptchaRef.current;
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

  // Email submit handler - refactored to use React Hook Form
  async function onEmailSubmit(data: EmailLoginForm | EmailRegisterForm) {
    setFeedback(null);
    setBusyKey("email");

    try {
      if (mode === "login") {
        const loginData = data as EmailLoginForm;
        const login = await postJson("/api/auth/login", {
          email: loginData.loginEmail.trim(),
          password: loginData.loginPassword
        });

        if (!login.response.ok || !isSuccessPayload(login.payload)) {
          setFeedback({ kind: "error", text: readMessage(login.payload, t.genericError) });
          return;
        }

        persistSession(login.payload);
        setFeedback({ kind: "success", text: t.loginSuccess });
        window.location.assign("/dashboard");
        return;
      }

      // Register mode - validate setup fields first
      const setupValid = await setupForm.trigger();
      if (!setupValid) {
        setFeedback({ kind: "error", text: t.requiredSetupFields });
        return;
      }

      const registerData = data as EmailRegisterForm;
      const setupData = setupForm.getValues();

      const register = await postJson("/api/auth/register", {
        authMethod: "email",
        ownerName: setupData.ownerName.trim(),
        organizationName: setupData.organizationName.trim(),
        branchName: setupData.branchName.trim(),
        email: registerData.registerEmail.trim(),
        password: registerData.registerPassword,
        phone: registerData.registerPhone?.trim() || undefined
      });

      if (!register.response.ok || !isSuccessPayload(register.payload)) {
        setFeedback({ kind: "error", text: readMessage(register.payload, t.genericError) });
        return;
      }

      const login = await postJson("/api/auth/login", {
        email: registerData.registerEmail.trim(),
        password: registerData.registerPassword
      });
      if (!login.response.ok || !isSuccessPayload(login.payload)) {
        setFeedback({
          kind: "error",
          text: "Account created, but automatic sign-in failed. Use Sign in to continue."
        });
        return;
      }

      persistSession(login.payload);
      setFeedback({ kind: "success", text: t.registerSuccess });
      window.location.assign("/dashboard");
    } catch (error) {
      setFeedback({ kind: "error", text: error instanceof Error ? error.message : t.genericError });
    } finally {
      setBusyKey(null);
    }
  }

  // Google click handler - refactored to use React Hook Form
  async function onGoogleClick() {
    setFeedback(null);
    setBusyKey("google");
    try {
      if (mode === "register") {
        const setupValid = await setupForm.trigger();
        if (!setupValid) {
          setFeedback({ kind: "error", text: t.requiredSetupFields });
          return;
        }
      }

      const auth = await getAuthClient();
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      const credential = await signInWithPopup(auth, provider);
      const idToken = await credential.user.getIdToken(true);

      if (mode === "register") {
        const setupData = setupForm.getValues();
        const googleData = googleRegisterForm.getValues();

        const register = await postJson("/api/auth/register", {
          authMethod: "google",
          idToken,
          ownerName: setupData.ownerName.trim(),
          organizationName: setupData.organizationName.trim(),
          branchName: setupData.branchName.trim(),
          email: credential.user.email || undefined,
          phone: googleData.registerPhone?.trim() || undefined
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

  // Send OTP handler - refactored to use React Hook Form
  async function onSendOtpClick() {
    setFeedback(null);
    setBusyKey("send-otp");

    try {
      if (mode === "register") {
        const setupValid = await setupForm.trigger();
        if (!setupValid) {
          setFeedback({ kind: "error", text: t.requiredSetupFields });
          return;
        }

        const phoneValid = await phoneRegisterForm.trigger();
        if (!phoneValid) {
          return;
        }

        const phoneData = phoneRegisterForm.getValues();
        if (!phoneData.registerEmail.trim()) {
          setFeedback({ kind: "error", text: t.requiredEmailFallback });
          return;
        }

        const phone = phoneData.registerPhone.trim();
        const auth = await getAuthClient();
        const verifier = getRecaptcha(auth);
        const confirmation = await signInWithPhoneNumber(auth, phone, verifier);

        confirmationRef.current = confirmation;
        setPhoneTarget(phone);
        setOtpSent(true);
        setCountdown(60);
        setCanResend(false);
        setFeedback({ kind: "success", text: t.otpSent });
      } else {
        const phoneValid = await phoneLoginForm.trigger();
        if (!phoneValid) {
          return;
        }

        const phoneData = phoneLoginForm.getValues();
        const phone = phoneData.loginPhone.trim();

        const auth = await getAuthClient();
        const verifier = getRecaptcha(auth);
        const confirmation = await signInWithPhoneNumber(auth, phone, verifier);

        confirmationRef.current = confirmation;
        setPhoneTarget(phone);
        setOtpSent(true);
        setCountdown(60);
        setCanResend(false);
        setFeedback({ kind: "success", text: t.otpSent });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : t.genericError;
      setFeedback({ kind: "error", text: message });
    } finally {
      setBusyKey(null);
    }
  }

  // Verify OTP handler - refactored to use React Hook Form
  async function onVerifyOtpClick() {
    setFeedback(null);

    const otpValid = await otpVerifyForm.trigger();
    if (!otpValid) {
      return;
    }

    setBusyKey("verify-otp");

    try {
      const confirmation = confirmationRef.current;
      if (!confirmation) {
        setFeedback({ kind: "error", text: "Please request a verification code first." });
        return;
      }

      const otpData = otpVerifyForm.getValues();
      const result = await confirmation.confirm(otpData.otpCode.trim());
      const idToken = await result.user.getIdToken(true);

      if (mode === "register") {
        const phoneData = phoneRegisterForm.getValues();
        if (!phoneData.registerEmail.trim()) {
          setFeedback({ kind: "error", text: t.requiredEmailFallback });
          return;
        }

        const setupData = setupForm.getValues();

        const register = await postJson("/api/auth/register", {
          authMethod: "phone",
          idToken,
          ownerName: setupData.ownerName.trim(),
          organizationName: setupData.organizationName.trim(),
          branchName: setupData.branchName.trim(),
          phone: phoneTarget,
          email: phoneData.registerEmail.trim()
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

  return (
    <main className={`${styles.page} ${isArabic ? arabicFont.className : latinFont.className}`} dir={isArabic ? "rtl" : "ltr"}>
      <section className={styles.shell}>
        <aside className={styles.storyPanel}>
          <p className={styles.badge}>{t.badge}</p>
          <h1 className={styles.title}>{t.title}</h1>
          <p className={styles.subtitle}>{t.subtitle}</p>
          <p className={styles.readyNote}>{t.ready}</p>

          <div className={styles.languageSwitch} role="group" aria-label={isArabic ? "تبديل اللغة" : "Language switch"}>
            <button
              type="button"
              onClick={() => setLang("en")}
              className={lang === "en" ? styles.langActive : styles.langButton}
              aria-pressed={lang === "en"}
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => setLang("ar")}
              className={lang === "ar" ? styles.langActive : styles.langButton}
              aria-pressed={lang === "ar"}
            >
              AR
            </button>
          </div>

          <Link href="/" className={styles.backLink}>
            {t.backHome}
          </Link>
        </aside>

        <section className={styles.card}>
          <div className={styles.modeTabs} role="tablist" aria-label={isArabic ? "وضع المصادقة" : "Authentication mode"}>
            <button
              type="button"
              role="tab"
              aria-selected={mode === "login"}
              className={mode === "login" ? styles.modeActive : styles.modeButton}
              onClick={() => {
                setMode("login");
                setFeedback(null);
              }}
            >
              {t.signIn}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === "register"}
              className={mode === "register" ? styles.modeActive : styles.modeButton}
              onClick={() => {
                setMode("register");
                setFeedback(null);
              }}
            >
              {t.createAccount}
            </button>
          </div>

          <div className={styles.methodTabs} role="tablist" aria-label={isArabic ? "طريقة تسجيل الدخول" : "Sign-in method"}>
            <button
              type="button"
              className={method === "email" ? styles.methodActive : styles.methodButton}
              onClick={() => {
                setMethod("email");
                setFeedback(null);
              }}
              aria-pressed={method === "email"}
            >
              {t.methodEmail}
            </button>
            <button
              type="button"
              className={method === "google" ? styles.methodActive : styles.methodButton}
              onClick={() => {
                setMethod("google");
                setFeedback(null);
              }}
              aria-pressed={method === "google"}
            >
              {t.methodGoogle}
            </button>
            <button
              type="button"
              className={method === "phone" ? styles.methodActive : styles.methodButton}
              onClick={() => {
                setMethod("phone");
                setFeedback(null);
              }}
              aria-pressed={method === "phone"}
            >
              {t.methodPhone}
            </button>
          </div>

          {mode === "register" ? (
            <div className={styles.setupGrid}>
              <div className={styles.field}>
                <label htmlFor="owner-name">{t.ownerName}</label>
                <input
                  id="owner-name"
                  type="text"
                  {...setupForm.register("ownerName")}
                  minLength={2}
                  autoComplete="name"
                />
                {setupForm.formState.errors.ownerName && (
                  <small style={{ fontSize: "0.8rem", color: "red" }}>
                    {setupForm.formState.errors.ownerName.message}
                  </small>
                )}
              </div>
              <div className={styles.field}>
                <label htmlFor="organization-name">{t.organizationName}</label>
                <input
                  id="organization-name"
                  type="text"
                  {...setupForm.register("organizationName")}
                  minLength={2}
                />
                {setupForm.formState.errors.organizationName && (
                  <small style={{ fontSize: "0.8rem", color: "red" }}>
                    {setupForm.formState.errors.organizationName.message}
                  </small>
                )}
              </div>
              <div className={styles.field}>
                <label htmlFor="branch-name">{t.branchName}</label>
                <input
                  id="branch-name"
                  type="text"
                  {...setupForm.register("branchName")}
                  minLength={2}
                />
                {setupForm.formState.errors.branchName && (
                  <small style={{ fontSize: "0.8rem", color: "red" }}>
                    {setupForm.formState.errors.branchName.message}
                  </small>
                )}
              </div>
            </div>
          ) : null}

          {method === "email" ? (
            <form
              className={styles.form}
              onSubmit={
                mode === "register"
                  ? emailRegisterForm.handleSubmit(onEmailSubmit)
                  : emailLoginForm.handleSubmit(onEmailSubmit)
              }
            >
              {mode === "register" ? (
                <>
                  <div className={styles.field}>
                    <label htmlFor="register-email">{t.email}</label>
                    <input
                      id="register-email"
                      type="email"
                      autoComplete="email"
                      {...emailRegisterForm.register("registerEmail")}
                    />
                    {emailRegisterForm.formState.errors.registerEmail && (
                      <small style={{ fontSize: "0.8rem", color: "red" }}>
                        {emailRegisterForm.formState.errors.registerEmail.message}
                      </small>
                    )}
                  </div>
                  <div className={styles.field}>
                    <label htmlFor="register-phone">{t.phone}</label>
                    <input
                      id="register-phone"
                      type="tel"
                      autoComplete="tel"
                      placeholder="+15551234567"
                      {...emailRegisterForm.register("registerPhone")}
                    />
                    <small>{t.phoneHint}</small>
                    {emailRegisterForm.formState.errors.registerPhone && (
                      <small style={{ fontSize: "0.8rem", color: "red" }}>
                        {emailRegisterForm.formState.errors.registerPhone.message}
                      </small>
                    )}
                  </div>
                  <div className={styles.field}>
                    <label htmlFor="register-password">{t.password}</label>
                    <input
                      id="register-password"
                      type="password"
                      minLength={8}
                      autoComplete="new-password"
                      {...emailRegisterForm.register("registerPassword")}
                    />
                    {emailRegisterForm.formState.errors.registerPassword && (
                      <small style={{ fontSize: "0.8rem", color: "red" }}>
                        {emailRegisterForm.formState.errors.registerPassword.message}
                      </small>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div className={styles.field}>
                    <label htmlFor="login-email">{t.email}</label>
                    <input
                      id="login-email"
                      type="email"
                      autoComplete="email"
                      {...emailLoginForm.register("loginEmail")}
                    />
                    {emailLoginForm.formState.errors.loginEmail && (
                      <small style={{ fontSize: "0.8rem", color: "red" }}>
                        {emailLoginForm.formState.errors.loginEmail.message}
                      </small>
                    )}
                  </div>
                  <div className={styles.field}>
                    <label htmlFor="login-password">{t.password}</label>
                    <input
                      id="login-password"
                      type="password"
                      minLength={8}
                      autoComplete="current-password"
                      {...emailLoginForm.register("loginPassword")}
                    />
                    {emailLoginForm.formState.errors.loginPassword && (
                      <small style={{ fontSize: "0.8rem", color: "red" }}>
                        {emailLoginForm.formState.errors.loginPassword.message}
                      </small>
                    )}
                  </div>
                </>
              )}

              <button className={styles.submit} type="submit" disabled={isBusy}>
                {busyKey === "email"
                  ? mode === "login"
                    ? `${t.signIn}...`
                    : `${t.createAccount}...`
                  : mode === "login"
                    ? t.continueEmail
                    : t.createAccount}
              </button>

              {mode === "login" ? (
                <Link href="/forgot-password" className={styles.subtleLink}>
                  {t.forgotPassword}
                </Link>
              ) : null}
            </form>
          ) : null}

          {method === "google" ? (
            <div className={styles.form}>
              {mode === "register" ? (
                <div className={styles.field}>
                  <label htmlFor="google-register-phone">{t.phone}</label>
                  <input
                    id="google-register-phone"
                    type="tel"
                    autoComplete="tel"
                    placeholder="+15551234567"
                    {...googleRegisterForm.register("registerPhone")}
                  />
                  <small>{t.phoneHint}</small>
                  {googleRegisterForm.formState.errors.registerPhone && (
                    <small style={{ fontSize: "0.8rem", color: "red" }}>
                      {googleRegisterForm.formState.errors.registerPhone.message}
                    </small>
                  )}
                </div>
              ) : null}
              <button className={styles.submit} type="button" onClick={onGoogleClick} disabled={isBusy}>
                {busyKey === "google" ? `${t.googleContinue}...` : t.googleContinue}
              </button>
            </div>
          ) : null}

          {method === "phone" ? (
            <div className={styles.form}>
              {/* Step Indicator */}
              <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "1.5rem",
                gap: "0.5rem"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "32px",
                    height: "32px",
                    borderRadius: "50%",
                    backgroundColor: !otpSent ? "#6366f1" : "#9ca3af",
                    color: "white",
                    fontWeight: "600",
                    fontSize: "0.875rem"
                  }}>1</span>
                  <span style={{
                    fontSize: "0.875rem",
                    color: !otpSent ? "#111827" : "#9ca3af",
                    fontWeight: !otpSent ? "600" : "400"
                  }}>
                    {isArabic ? "إدخال رقم الهاتف" : "Enter phone number"}
                  </span>
                </div>

                <div style={{
                  width: "40px",
                  height: "2px",
                  backgroundColor: otpSent ? "#6366f1" : "#e5e7eb"
                }} />

                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "32px",
                    height: "32px",
                    borderRadius: "50%",
                    backgroundColor: otpSent ? "#6366f1" : "#e5e7eb",
                    color: otpSent ? "white" : "#9ca3af",
                    fontWeight: "600",
                    fontSize: "0.875rem"
                  }}>2</span>
                  <span style={{
                    fontSize: "0.875rem",
                    color: otpSent ? "#111827" : "#9ca3af",
                    fontWeight: otpSent ? "600" : "400"
                  }}>
                    {isArabic ? "إدخال رمز التحقق" : "Enter verification code"}
                  </span>
                </div>
              </div>

              <div className={styles.field}>
                <label htmlFor="phone-input">{t.phone}</label>
                <input
                  id="phone-input"
                  type="tel"
                  autoComplete="tel"
                  placeholder="+15551234567"
                  {...(mode === "register"
                    ? phoneRegisterForm.register("registerPhone")
                    : phoneLoginForm.register("loginPhone")
                  )}
                />
                <small>{t.phoneHint}</small>
                {mode === "register" && phoneRegisterForm.formState.errors.registerPhone && (
                  <small style={{ fontSize: "0.8rem", color: "red" }}>
                    {phoneRegisterForm.formState.errors.registerPhone.message}
                  </small>
                )}
                {mode === "login" && phoneLoginForm.formState.errors.loginPhone && (
                  <small style={{ fontSize: "0.8rem", color: "red" }}>
                    {phoneLoginForm.formState.errors.loginPhone.message}
                  </small>
                )}
              </div>

              {mode === "register" ? (
                <div className={styles.field}>
                  <label htmlFor="phone-recovery-email">{t.recoveryEmail}</label>
                  <input
                    id="phone-recovery-email"
                    type="email"
                    autoComplete="email"
                    {...phoneRegisterForm.register("registerEmail")}
                  />
                  <small>{t.recoveryHint}</small>
                  {phoneRegisterForm.formState.errors.registerEmail && (
                    <small style={{ fontSize: "0.8rem", color: "red" }}>
                      {phoneRegisterForm.formState.errors.registerEmail.message}
                    </small>
                  )}
                </div>
              ) : (
                <p className={styles.inlineHint}>{t.phoneResetHint}</p>
              )}

              {!otpSent ? (
                <button className={styles.submit} type="button" onClick={onSendOtpClick} disabled={isBusy}>
                  {busyKey === "send-otp" ? `${t.sendOtp}...` : t.sendOtp}
                </button>
              ) : (
                <>
                  <div className={styles.field}>
                    <label htmlFor="otp-code">{t.otpCode}</label>
                    <input
                      id="otp-code"
                      type="text"
                      inputMode="numeric"
                      {...otpVerifyForm.register("otpCode")}
                    />
                    {otpVerifyForm.formState.errors.otpCode && (
                      <small style={{ fontSize: "0.8rem", color: "red" }}>
                        {otpVerifyForm.formState.errors.otpCode.message}
                      </small>
                    )}
                  </div>

                  {/* Countdown Timer / Resend Button */}
                  <div style={{
                    textAlign: "center",
                    marginTop: "0.5rem",
                    marginBottom: "1rem"
                  }}>
                    {!canResend ? (
                      <p style={{
                        fontSize: "0.875rem",
                        color: "#6b7280",
                        margin: 0
                      }}>
                        {isArabic ? `إعادة إرسال الرمز في ${countdown}ث` : `Resend code in ${countdown}s`}
                      </p>
                    ) : (
                      <button
                        type="button"
                        onClick={onSendOtpClick}
                        disabled={isBusy}
                        style={{
                          background: "none",
                          border: "none",
                          color: "#6366f1",
                          fontSize: "0.875rem",
                          fontWeight: "600",
                          cursor: "pointer",
                          textDecoration: "underline",
                          padding: 0
                        }}
                      >
                        {isArabic ? "إعادة إرسال الرمز" : "Resend code"}
                      </button>
                    )}
                  </div>

                  <button className={styles.submit} type="button" onClick={onVerifyOtpClick} disabled={isBusy}>
                    {busyKey === "verify-otp" ? `${t.verifyOtp}...` : t.verifyOtp}
                  </button>
                </>
              )}
            </div>
          ) : null}

          <div id={recaptchaSlotId} className={styles.recaptchaSlot} aria-hidden="true" />

          {feedback ? (
            <p className={feedback.kind === "error" ? styles.errorMessage : styles.successMessage} role="status">
              {feedback.kind === "error" ? "✗ " : "✓ "}{feedback.text}
            </p>
          ) : null}
        </section>
      </section>
    </main>
  );
}
