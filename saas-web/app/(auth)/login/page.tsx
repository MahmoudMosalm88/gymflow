"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
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
import { cn } from "@/lib/utils";

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
    backHome: "Back to home",
    ready: "Ready in under 2 minutes.",
    loginSuccess: "Signed in. Redirecting to dashboard...",
    registerSuccess: "Account created. Redirecting to dashboard...",
    otpSent: "Verification code sent. Enter it below.",
    invalidPhone: "Enter a valid phone number in international format, like +15551234567.",
    requiredSetupFields: "Owner name, organization name, and branch name are required.",
    requiredEmailFallback: "Recovery email is required for phone sign-up.",
    genericError: "Something went wrong. Please try again.",
    enter_phone_number: "Enter phone",
    enter_verification_code: "Verify code",
    resendCodeIn: "Resend in",
    resendCode: "Resend code",
    errorTitle: "Error",
    successTitle: "Success"
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
    backHome: "العودة للرئيسية",
    ready: "جاهز خلال أقل من دقيقتين.",
    loginSuccess: "تم تسجيل الدخول. جارٍ فتح لوحة التحكم...",
    registerSuccess: "تم إنشاء الحساب. جارٍ فتح لوحة التحكم...",
    otpSent: "تم إرسال رمز التحقق. أدخله بالأسفل.",
    invalidPhone: "أدخل رقماً صحيحاً بصيغة دولية مثل +201XXXXXXXXX.",
    requiredSetupFields: "اسم المالك واسم المؤسسة واسم الفرع مطلوبة.",
    requiredEmailFallback: "بريد الاستعادة مطلوب عند التسجيل بالهاتف.",
    genericError: "حدث خطأ. حاول مرة أخرى.",
    enter_phone_number: "أدخل الهاتف",
    enter_verification_code: "أدخل الرمز",
    resendCodeIn: "إعادة إرسال خلال",
    resendCode: "إعادة إرسال الرمز",
    errorTitle: "خطأ",
    successTitle: "تم بنجاح"
  }
} as const;

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

  const setupForm = useForm<SetupFieldsForm>({
    resolver: zodResolver(setupFieldsSchema),
    mode: "onBlur",
    defaultValues: { ownerName: "", organizationName: "", branchName: "" }
  });

  const emailLoginForm = useForm<EmailLoginForm>({
    resolver: zodResolver(emailLoginSchema),
    mode: "onBlur",
    defaultValues: { loginEmail: "", loginPassword: "" }
  });

  const emailRegisterForm = useForm<EmailRegisterForm>({
    resolver: zodResolver(emailRegisterSchema),
    mode: "onBlur",
    defaultValues: { registerEmail: "", registerPassword: "", registerPhone: "" }
  });

  const googleRegisterForm = useForm<GoogleRegisterForm>({
    resolver: zodResolver(googleRegisterSchema),
    mode: "onBlur",
    defaultValues: { registerPhone: "" }
  });

  const phoneLoginForm = useForm<PhoneLoginForm>({
    resolver: zodResolver(phoneLoginSchema),
    mode: "onBlur",
    defaultValues: { loginPhone: "" }
  });

  const phoneRegisterForm = useForm<PhoneRegisterForm>({
    resolver: zodResolver(phoneRegisterSchema),
    mode: "onBlur",
    defaultValues: { registerPhone: "", registerEmail: "" }
  });

  const otpVerifyForm = useForm<OtpVerifyForm>({
    resolver: zodResolver(otpVerifySchema),
    mode: "onBlur",
    defaultValues: { otpCode: "" }
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
    recaptchaRef.current = new RecaptchaVerifier(auth, recaptchaSlotId, { size: "invisible" });
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
        if (!phoneValid) return;

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
        if (!phoneValid) return;

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
      setFeedback({ kind: "error", text: error instanceof Error ? error.message : t.genericError });
    } finally {
      setBusyKey(null);
    }
  }

  async function onVerifyOtpClick() {
    setFeedback(null);

    const otpValid = await otpVerifyForm.trigger();
    if (!otpValid) return;

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
      {/* Dark left panel */}
      <aside
        className="lg:w-1/2 bg-[#0a0a0a] text-white flex flex-col justify-between p-10 lg:p-16 border-b-2 border-[#2a2a2a] lg:border-b-0 lg:border-r-2 relative overflow-hidden"
        style={{ backgroundImage: 'radial-gradient(#1d1d1d 1px, transparent 1px)', backgroundSize: '28px 28px' }}
      >
        {/* Oversized watermark */}
        <div
          aria-hidden="true"
          className="absolute -bottom-12 -right-8 select-none pointer-events-none font-black text-[#e63946]"
          style={{ fontSize: '20rem', lineHeight: 1, opacity: 0.045, letterSpacing: '-0.04em' }}
        >
          GF
        </div>

        <div className="relative z-10">
          {/* Brand mark */}
          <div className="flex items-center gap-2 mb-12">
            <span style={{ background: '#e63946', color: '#fff', padding: '6px 9px', fontWeight: 800, fontSize: '0.75rem', lineHeight: 1 }}>GF</span>
            <span className="font-bold text-white text-sm tracking-tight">GymFlow</span>
          </div>

          {/* Red rule */}
          <div className="h-[3px] w-12 bg-[#e63946] mb-8" />

          <h1 className="font-black text-white mb-6 leading-[1.05]" style={{ fontSize: 'clamp(2.2rem, 4vw, 3.4rem)' }}>
            {isArabic ? (
              <>نظام إدارة الجيم<br />الذي لا يكون<br />عائقاً في طريقك.</>
            ) : (
              <>The gym OS<br />that stays<br />out of your way.</>
            )}
          </h1>
          <p className="text-[#666666] text-sm leading-relaxed mb-10 max-w-xs">{t.subtitle}</p>

          {/* Feature bullets */}
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
          {/* Stats row */}
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

          {/* Language toggle + back link */}
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

      {/* Light right panel */}
      <section className="lg:w-1/2 flex items-start lg:items-center justify-center p-6 lg:p-12 bg-[#141414] overflow-y-auto">
        <div className="w-full max-w-md">
          {/* Red accent bar */}
          <div className="h-1 bg-[#e63946]" />
          <div
            className="bg-[#1e1e1e] p-8"
            style={{ border: '2px solid #2a2a2a', borderTop: 'none', boxShadow: '6px 6px 0 #000000' }}
          >
          {/* Mode tabs */}
          <div className="flex mb-6">
            <button
              type="button"
              onClick={() => { setMode("login"); setFeedback(null); }}
              className={`flex-1 px-4 py-2.5 text-sm font-bold border-2 transition-colors ${
                mode === "login"
                  ? "bg-[#e63946] text-white border-[#e63946]"
                  : "bg-[#1e1e1e] text-[#8a8578] border-[#2a2a2a] hover:border-[#e8e4df] hover:text-[#e8e4df]"
              }`}
            >
              {t.signIn}
            </button>
            <button
              type="button"
              onClick={() => { setMode("register"); setFeedback(null); }}
              className={`flex-1 px-4 py-2.5 text-sm font-bold border-2 border-l-0 transition-colors ${
                mode === "register"
                  ? "bg-[#e63946] text-white border-[#e63946]"
                  : "bg-[#1e1e1e] text-[#8a8578] border-[#2a2a2a] hover:border-[#e8e4df] hover:text-[#e8e4df]"
              }`}
            >
              {t.createAccount}
            </button>
          </div>

          {/* Auth method selector */}
          <div className="flex gap-2 mb-6">
            {(["email", "google", "phone"] as AuthMethod[]).map((m) => (
              <button
                type="button"
                key={m}
                onClick={() => { setMethod(m); setFeedback(null); }}
                className={`flex-1 px-2 py-2 text-xs font-bold border-2 transition-colors ${
                  method === m
                    ? "border-[#e63946] text-[#e63946] bg-[#e63946]/5"
                    : "border-[#2a2a2a] text-[#8a8578] hover:border-[#e63946] hover:text-[#e63946]"
                }`}
              >
                {m === "email" ? t.methodEmail : m === "google" ? t.methodGoogle : t.methodPhone}
              </button>
            ))}
          </div>

          {/* Register setup fields */}
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

          {/* Email method */}
          {method === "email" && (
            <Form {...(mode === "register" ? emailRegisterForm : emailLoginForm) as any}>
              <form
                onSubmit={mode === "register"
                  ? emailRegisterForm.handleSubmit(onEmailSubmit)
                  : emailLoginForm.handleSubmit(onEmailSubmit)}
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
                          <FormControl><Input type="email" autoComplete="email" {...field} /></FormControl>
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
                          <FormControl><Input type="tel" autoComplete="tel" placeholder="+15551234567" {...field} /></FormControl>
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
                          <FormControl><Input type="password" autoComplete="new-password" {...field} /></FormControl>
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
                          <FormControl><Input type="email" autoComplete="email" {...field} /></FormControl>
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
                          <FormControl><Input type="password" autoComplete="current-password" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}

                <Button type="submit" className="w-full" disabled={isBusy}>
                  {busyKey === "email"
                    ? mode === "login" ? `${t.signIn}...` : `${t.createAccount}...`
                    : mode === "login" ? t.continueEmail : t.createAccount}
                </Button>

                {mode === "login" && (
                  <Link
                    href="/forgot-password"
                    className="block text-center text-sm text-[#888888] hover:text-[#e63946] transition-colors mt-2"
                  >
                    {t.forgotPassword}
                  </Link>
                )}
              </form>
            </Form>
          )}

          {/* Google method */}
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
                          <FormControl><Input type="tel" autoComplete="tel" placeholder="+15551234567" {...field} /></FormControl>
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

          {/* Phone method */}
          {method === "phone" && (
            <div className="space-y-4">
              {/* Step indicator — brutalist */}
              <div className="flex items-center gap-2 mb-4">
                <div className="flex items-center gap-2">
                  <span className={`flex items-center justify-center h-7 w-7 text-xs font-bold border-2 ${!otpSent ? "border-[#e63946] text-[#e63946]" : "border-[#2a2a2a] text-[#888888]"}`}>
                    1
                  </span>
                  <span className={`text-xs font-medium ${!otpSent ? "text-[#e8e4df]" : "text-[#888888]"}`}>
                    {t.enter_phone_number}
                  </span>
                </div>
                <div className="flex-1 border-t-2 border-[#2a2a2a]" />
                <div className="flex items-center gap-2">
                  <span className={`flex items-center justify-center h-7 w-7 text-xs font-bold border-2 ${otpSent ? "border-[#e63946] text-[#e63946]" : "border-[#2a2a2a] text-[#888888]"}`}>
                    2
                  </span>
                  <span className={`text-xs font-medium ${otpSent ? "text-[#e8e4df]" : "text-[#888888]"}`}>
                    {t.enter_verification_code}
                  </span>
                </div>
              </div>

              <Form {...(mode === "register" ? phoneRegisterForm : phoneLoginForm) as any}>
                <form onSubmit={e => e.preventDefault()} className="space-y-4">
                  <FormField
                    control={(mode === "register" ? phoneRegisterForm.control : phoneLoginForm.control) as any}
                    name={(mode === "register" ? "registerPhone" : "loginPhone") as any}
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
                  {mode === "register" && (
                    <FormField
                      control={phoneRegisterForm.control}
                      name="registerEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t.recoveryEmail}</FormLabel>
                          <FormControl><Input type="email" autoComplete="email" {...field} /></FormControl>
                          <FormDescription>{t.recoveryHint}</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                  {mode === "login" && (
                    <p className="text-sm text-[#888888] mt-2">{t.phoneResetHint}</p>
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
                          <FormControl><Input type="text" inputMode="numeric" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="text-center text-sm text-[#888888]">
                      {!canResend ? (
                        <p>{`${t.resendCodeIn} ${countdown}s`}</p>
                      ) : (
                        <button
                          onClick={onSendOtpClick}
                          disabled={isBusy}
                          className="text-[#e63946] hover:underline font-medium"
                        >
                          {t.resendCode}
                        </button>
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

          <div id={recaptchaSlotId} className="hidden" aria-hidden="true" />

          {feedback && (
            <Alert variant={feedback.kind === "error" ? "destructive" : "success"} className="mt-6">
              {feedback.kind === "error" ? <Terminal className="h-4 w-4" /> : <Check className="h-4 w-4" />}
              <AlertTitle>{feedback.kind === "error" ? t.errorTitle : t.successTitle}</AlertTitle>
              <AlertDescription>{feedback.text}</AlertDescription>
            </Alert>
          )}
        </div>
        </div>
      </section>
    </main>
  );
}
