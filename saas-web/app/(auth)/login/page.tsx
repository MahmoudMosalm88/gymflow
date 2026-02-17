"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
// No longer importing specific fonts here, using global ones from layout.tsx
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
// Shadcn/ui components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Check, Terminal, X } from "lucide-react"; // Icons
// Custom CSS module import removed

// (Font constant definitions removed)

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
    <main className="min-h-screen flex flex-col lg:flex-row font-sans" dir={isArabic ? "rtl" : "ltr"}>
      <section className="flex-1 flex flex-col items-center justify-center"> {/* Updated shell styling */}
        <aside className="relative flex flex-col justify-between p-8 lg:w-1/2 xl:w-2/5 bg-primary text-primary-foreground">
          <div className="space-y-4">
            <p className="inline-flex items-center rounded-full border border-primary-foreground/20 bg-primary-foreground/10 px-3 py-1 text-sm font-medium">
              {t.badge}
            </p>
            <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl">{t.title}</h1>
            <p className="text-lg opacity-80">{t.subtitle}</p>
            <p className="text-sm opacity-60">{t.ready}</p>
          </div>

          <div className="flex flex-col gap-4 mt-8 lg:mt-0">
            <div className="flex gap-2">
              <Button
                variant="secondary"
                className={cn("w-16", { "bg-primary-foreground text-primary hover:text-primary": lang === "en" })}
                onClick={() => setLang("en")}
                aria-pressed={lang === "en"}
              >
                EN
              </Button>
              <Button
                variant="secondary"
                className={cn("w-16", { "bg-primary-foreground text-primary hover:text-primary": lang === "ar" })}
                onClick={() => setLang("ar")}
                aria-pressed={lang === "ar"}
              >
                AR
              </Button>
            </div>

            <Button variant="link" asChild className="text-primary-foreground justify-start px-0">
              <Link href="/">{t.backHome}</Link>
            </Button>
          </div>
        </aside>

        <section className="flex-1 flex items-center justify-center p-4 lg:p-8 bg-background">
          <Card className="w-full max-w-md">
            <CardHeader>
              <div className="flex border-b border-border pb-4 mb-4">
                <Button
                  variant={mode === "login" ? "default" : "ghost"}
                  className="flex-1"
                  onClick={() => {
                    setMode("login");
                    setFeedback(null);
                  }}
                >
                  {t.signIn}
                </Button>
                <Button
                  variant={mode === "register" ? "default" : "ghost"}
                  className="flex-1"
                  onClick={() => {
                    setMode("register");
                    setFeedback(null);
                  }}
                >
                  {t.createAccount}
                </Button>
              </div>

            <div className="flex justify-center gap-2">
              <Button
                variant={method === "email" ? "outline" : "ghost"}
                onClick={() => {
                  setMethod("email");
                  setFeedback(null);
                }}
              >
                {t.methodEmail}
              </Button>
              <Button
                variant={method === "google" ? "outline" : "ghost"}
                onClick={() => {
                  setMethod("google");
                  setFeedback(null);
                }}
              >
                {t.methodGoogle}
              </Button>
              <Button
                variant={method === "phone" ? "outline" : "ghost"}
                onClick={() => {
                  setMethod("phone");
                  setFeedback(null);
                }}
              >
                {t.methodPhone}
              </Button>
            </div>
          </CardHeader>

          <CardContent>

            {mode === "register" && (
              <Form {...setupForm}>
                <form className="grid grid-cols-1 gap-4 mb-6">
                  <FormField
                    control={setupForm.control}
                    name="ownerName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t.ownerName}</FormLabel>
                        <FormControl>
                          <Input type="text" {...field} autoComplete="name" />
                        </FormControl>
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
                        <FormControl>
                          <Input type="text" {...field} />
                        </FormControl>
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
                        <FormControl>
                          <Input type="text" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </form>
                <Separator className="mb-6" />
              </Form>
            )}

            {method === "email" && (
              <Form {...(mode === "register" ? emailRegisterForm : emailLoginForm)}>
                <form
                  onSubmit={
                    mode === "register"
                      ? emailRegisterForm.handleSubmit(onEmailSubmit)
                      : emailLoginForm.handleSubmit(onEmailSubmit)
                  }
                  className="space-y-4"
                >
                  {mode === "register" ? (
                    <>
                      <FormField
                        control={emailRegisterForm.control}
                        name="registerEmail"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t.email}</FormLabel>
                            <FormControl>
                              <Input type="email" autoComplete="email" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={emailRegisterForm.control}
                        name="registerPhone"
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
                      <FormField
                        control={emailRegisterForm.control}
                        name="registerPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t.password}</FormLabel>
                            <FormControl>
                              <Input type="password" autoComplete="new-password" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </>
                  ) : (
                    <>
                      <FormField
                        control={emailLoginForm.control}
                        name="loginEmail"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t.email}</FormLabel>
                            <FormControl>
                              <Input type="email" autoComplete="email" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={emailLoginForm.control}
                        name="loginPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t.password}</FormLabel>
                            <FormControl>
                              <Input type="password" autoComplete="current-password" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </>
                  )}

                  <Button type="submit" className="w-full" disabled={isBusy}>
                    {busyKey === "email"
                      ? mode === "login"
                        ? `${t.signIn}...`
                        : `${t.createAccount}...`
                      : mode === "login"
                        ? t.continueEmail
                        : t.createAccount}
                  </Button>

                  {mode === "login" && (
                    <Button variant="link" asChild className="w-full text-sm mt-2">
                      <Link href="/forgot-password">{t.forgotPassword}</Link>
                    </Button>
                  )}
                </form>
              </Form>
            )}

            {method === "google" && (
              <div className="space-y-4">
                {mode === "register" && (
                  <Form {...googleRegisterForm}>
                    <form className="space-y-4">
                      <FormField
                        control={googleRegisterForm.control}
                        name="registerPhone"
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
                )}
                <Button className="w-full" type="button" onClick={onGoogleClick} disabled={isBusy}>
                  {busyKey === "google" ? `${t.googleContinue}...` : t.googleContinue}
                </Button>
              </div>
            )}

            {method === "phone" && (
              <div className="space-y-4">
                {/* Step Indicator */}
                <div className="flex items-center justify-center mb-6 gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "flex items-center justify-center h-8 w-8 rounded-full font-semibold",
                      !otpSent ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    )}>1</span>
                    <span className={cn(
                      "font-medium",
                      !otpSent ? "text-foreground" : "text-muted-foreground"
                    )}>
                      {t.enter_phone_number || "Enter phone number"}
                    </span>
                  </div>

                  <Separator orientation="horizontal" className="w-8" /> {/* Visual separator */}

                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "flex items-center justify-center h-8 w-8 rounded-full font-semibold",
                      otpSent ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    )}>2</span>
                    <span className={cn(
                      "font-medium",
                      otpSent ? "text-foreground" : "text-muted-foreground"
                    )}>
                      {t.enter_verification_code || "Enter verification code"}
                    </span>
                  </div>
                </div>

                <Form {...(mode === "register" ? phoneRegisterForm : phoneLoginForm)}>
                  <form onSubmit={e => e.preventDefault()} className="space-y-4">
                    <FormField
                      control={
                        mode === "register"
                          ? phoneRegisterForm.control
                          : phoneLoginForm.control
                      }
                      name={
                        mode === "register" ? "registerPhone" : "loginPhone"
                      }
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t.phone}</FormLabel>
                          <FormControl>
                            <Input
                              type="tel"
                              autoComplete="tel"
                              placeholder="+15551234567"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>{t.phoneHint}</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    {mode === "register" && (
                      <FormField
                        control={phoneRegisterForm.control}
                        name="registerEmail"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t.recoveryEmail}</FormLabel>
                            <FormControl>
                              <Input type="email" autoComplete="email" {...field} />
                            </FormControl>
                            <FormDescription>{t.recoveryHint}</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                    {mode === "login" && (
                      <p className="text-sm text-muted-foreground mt-2">{t.phoneResetHint}</p>
                    )}
                  </form>
                </Form>

                {!otpSent ? (
                  <Button className="w-full" type="button" onClick={onSendOtpClick} disabled={isBusy}>
                    {busyKey === "send-otp" ? `${t.sendOtp}...` : t.sendOtp}
                  </Button>
                ) : (
                  <Form {...otpVerifyForm}>
                    <form onSubmit={otpVerifyForm.handleSubmit(onVerifyOtpClick)} className="space-y-4">
                      <FormField
                        control={otpVerifyForm.control}
                        name="otpCode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t.otpCode}</FormLabel>
                            <FormControl>
                              <Input type="text" inputMode="numeric" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Countdown Timer / Resend Button */}
                      <div className="text-center text-sm text-muted-foreground">
                        {!canResend ? (
                          <p>{`${t.resendCodeIn} ${countdown}s`}</p>
                        ) : (
                          <Button variant="link" onClick={onSendOtpClick} disabled={isBusy} className="p-0 h-auto">
                            {t.resendCode}
                          </Button>
                        )}
                      </div>

                      <Button className="w-full" type="submit" disabled={isBusy}>
                        {busyKey === "verify-otp" ? `${t.verifyOtp}...` : t.verifyOtp}
                      </Button>
                    </form>
                  </Form>
                )}
              </div>
            )}
            <div id={recaptchaSlotId} className="hidden" aria-hidden="true" /> {/* Hide recaptcha container visually */}

            {feedback && (
              <Alert variant={feedback.kind === "error" ? "destructive" : "success"} className="mt-6">
                {feedback.kind === "error" ? <Terminal className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                <AlertTitle>{feedback.kind === "error" ? t.errorTitle : t.successTitle}</AlertTitle>
                <AlertDescription>{feedback.text}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
