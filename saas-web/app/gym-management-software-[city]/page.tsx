// Server Component — one file renders all 5 city landing pages.
// Route: /gym-management-software-cairo, /gym-management-software-dubai, etc.

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { locationPages, locationPageMap } from "@/lib/locations-data";

// ─── Static params ────────────────────────────────────────────────────────────
// Tell Next.js which city slugs exist at build time.
export function generateStaticParams() {
  return locationPages.map((p) => ({ city: p.slug }));
}

// ─── Per-page metadata ────────────────────────────────────────────────────────
export async function generateMetadata({
  params,
}: {
  params: Promise<{ city: string }>;
}): Promise<Metadata> {
  const { city } = await params;
  const page = locationPageMap[city];
  if (!page) return {};

  const title = `Gym Management Software in ${page.cityEn} | GymFlow`;
  const description = `GymFlow helps ${page.cityEn} gym owners automate memberships, QR check-in, renewals, and revenue reports. Trusted across ${page.countryEn}.`;
  const url = `https://gymflowsystem.com/gym-management-software-${city}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: "GymFlow",
      type: "website",
    },
  };
}

// ─── JSON-LD structured data ──────────────────────────────────────────────────
function JsonLd({ city }: { city: (typeof locationPages)[number] }) {
  const url = `https://gymflowsystem.com/gym-management-software-${city.slug}`;

  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SoftwareApplication",
        name: "GymFlow",
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web, iOS, Android",
        url: "https://gymflowsystem.com",
        description: `Gym management software for ${city.cityEn}, ${city.countryEn}. Automate memberships, QR check-in, renewals, and reports.`,
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
          description: "Free trial available",
        },
      },
      {
        "@type": "LocalBusiness",
        "@id": url,
        name: `GymFlow — Gym Management Software in ${city.cityEn}`,
        description: `GymFlow serves gym owners in ${city.cityEn}, ${city.countryEn} with automated membership management, QR check-in, and WhatsApp renewal reminders.`,
        url,
        areaServed: {
          "@type": "City",
          name: city.cityEn,
          containedInPlace: {
            "@type": "Country",
            name: city.countryEn,
          },
        },
      },
      {
        "@type": "FAQPage",
        mainEntity: city.faqEn.map((item) => ({
          "@type": "Question",
          name: item.q,
          acceptedAnswer: {
            "@type": "Answer",
            text: item.a,
          },
        })),
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

// ─── Feature list (shared across all pages, short labels) ────────────────────
const features = [
  {
    icon: "⚡",
    titleEn: "QR Check-In",
    titleAr: "تسجيل دخول QR",
    bodyEn:
      "Members scan a code on their phone. Check-in logs instantly — no manual search, no queue.",
    bodyAr:
      "يمسح الأعضاء رمزاً على هواتفهم. يُسجَّل الحضور فوراً — بلا بحث يدوي، بلا طابور.",
  },
  {
    icon: "🔔",
    titleEn: "WhatsApp Renewals",
    titleAr: "تجديدات واتساب",
    bodyEn:
      "Automated messages go out 7, 3, and 1 day before expiry. Members renew without your staff lifting a finger.",
    bodyAr:
      "تُرسل رسائل تلقائية قبل 7 و3 ويوم من انتهاء الصلاحية. يجدد الأعضاء دون أن يتحرك موظفوك.",
  },
  {
    icon: "📊",
    titleEn: "Revenue Reports",
    titleAr: "تقارير الإيرادات",
    bodyEn:
      "Real-time dashboard shows monthly revenue, active memberships, and churn — no spreadsheet needed.",
    bodyAr:
      "تُظهر لوحة التحكم الفورية الإيرادات الشهرية والعضويات النشطة والتقلبات — لا حاجة لجداول بيانات.",
  },
  {
    icon: "🌿",
    titleEn: "Subscription Freeze",
    titleAr: "تجميد الاشتراك",
    bodyEn:
      "Members can pause for a set number of days. Billing resumes automatically — you keep the member.",
    bodyAr:
      "يمكن للأعضاء الإيقاف المؤقت لعدد محدد من الأيام. تستأنف الفوترة تلقائياً — تحتفظ بالعضو.",
  },
  {
    icon: "🏢",
    titleEn: "Multi-Branch",
    titleAr: "فروع متعددة",
    bodyEn:
      "Run every branch from one login. Consolidated revenue, per-branch attendance, shared member profiles.",
    bodyAr:
      "أدر كل فرع من تسجيل دخول واحد. إيرادات موحدة، حضور لكل فرع، ملفات أعضاء مشتركة.",
  },
  {
    icon: "☁️",
    titleEn: "Cloud Backup",
    titleAr: "نسخ احتياطي سحابي",
    bodyEn:
      "All data is backed up continuously. No local server to maintain, no data loss if hardware fails.",
    bodyAr:
      "تُنسخ جميع البيانات باستمرار احتياطياً. لا خادم محلي للصيانة، لا فقدان بيانات عند عطل الأجهزة.",
  },
];

// ─── Other city links shown at the bottom of every page ──────────────────────
const otherCities = locationPages.map((p) => ({
  slug: p.slug,
  labelEn: `${p.cityEn}, ${p.countryEn}`,
  labelAr: `${p.cityAr}، ${p.countryAr}`,
}));

// ─── Page component ───────────────────────────────────────────────────────────
export default async function CityPage({
  params,
}: {
  params: Promise<{ city: string }>;
}) {
  const { city } = await params;
  const page = locationPageMap[city];
  if (!page) notFound();

  // Inline style tokens — match the locked brutalist design system
  const bg = "#0a0a0a";
  const surface = "#141414";
  const surface2 = "#1e1e1e";
  const border = "#2a2a2a";
  const accent = "#e63946";
  const text = "#f0f0f0";
  const muted = "#888888";
  const shadow = "6px 6px 0 #000000";

  return (
    <>
      <JsonLd city={page} />

      <div style={{ background: bg, color: text, minHeight: "100vh", fontFamily: "inherit" }}>

        {/* ── Minimal top nav ─────────────────────────────────────────────── */}
        <nav
          style={{
            borderBottom: `1px solid ${border}`,
            padding: "0 24px",
            height: 56,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: bg,
            position: "sticky",
            top: 0,
            zIndex: 50,
          }}
        >
          <Link href="/" style={{ color: text, textDecoration: "none", fontWeight: 700, fontSize: 18, letterSpacing: "-0.02em" }}>
            GymFlow
          </Link>
          <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
            <Link href="/#features" style={{ color: muted, textDecoration: "none", fontSize: 14 }}>
              Features
            </Link>
            <Link href="/#faq" style={{ color: muted, textDecoration: "none", fontSize: 14 }}>
              FAQ
            </Link>
            <Link
              href="/dashboard"
              style={{
                background: accent,
                color: "#fff",
                padding: "8px 18px",
                textDecoration: "none",
                fontWeight: 700,
                fontSize: 13,
                boxShadow: "3px 3px 0 #000",
                letterSpacing: "0.03em",
              }}
            >
              START FREE
            </Link>
          </div>
        </nav>

        {/* ── Hero ────────────────────────────────────────────────────────── */}
        <section
          style={{
            borderBottom: `1px solid ${border}`,
            padding: "80px 24px 72px",
            maxWidth: 900,
            margin: "0 auto",
          }}
        >
          {/* Breadcrumb label */}
          <p
            style={{
              color: accent,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              marginBottom: 24,
            }}
          >
            GYM MANAGEMENT · {page.cityEn.toUpperCase()}, {page.countryEn.toUpperCase()}
          </p>

          <h1
            style={{
              fontSize: "clamp(32px, 5vw, 60px)",
              fontWeight: 900,
              lineHeight: 1.05,
              letterSpacing: "-0.03em",
              margin: "0 0 24px",
              color: text,
            }}
          >
            Gym Management Software
            <br />
            <span style={{ color: accent }}>in {page.cityEn}.</span>
          </h1>

          {/* Arabic headline */}
          <h2
            dir="rtl"
            style={{
              fontSize: "clamp(22px, 3.5vw, 40px)",
              fontWeight: 700,
              color: muted,
              letterSpacing: "0",
              margin: "0 0 32px",
              lineHeight: 1.3,
            }}
          >
            برنامج إدارة الجيم في {page.cityAr}
          </h2>

          <p
            style={{
              fontSize: 18,
              color: muted,
              maxWidth: 600,
              lineHeight: 1.6,
              margin: "0 0 40px",
            }}
          >
            GymFlow automates memberships, QR check-in, renewals, and revenue reports for gym owners in {page.cityEn}. Set up in one day. No IT required.
          </p>

          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <Link
              href="/dashboard"
              style={{
                background: accent,
                color: "#fff",
                padding: "14px 32px",
                textDecoration: "none",
                fontWeight: 700,
                fontSize: 15,
                boxShadow: shadow,
                letterSpacing: "0.03em",
                display: "inline-block",
              }}
            >
              START FREE — NO CREDIT CARD
            </Link>
            <Link
              href="/#features"
              style={{
                border: `1px solid ${border}`,
                color: text,
                padding: "14px 32px",
                textDecoration: "none",
                fontWeight: 600,
                fontSize: 15,
                display: "inline-block",
              }}
            >
              See features →
            </Link>
          </div>
        </section>

        {/* ── Local market stats ───────────────────────────────────────────── */}
        <section
          style={{
            borderBottom: `1px solid ${border}`,
            padding: "64px 24px",
            maxWidth: 900,
            margin: "0 auto",
          }}
        >
          <p
            style={{
              color: accent,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              marginBottom: 32,
            }}
          >
            {page.cityEn.toUpperCase()} FITNESS MARKET
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 1,
              background: border,
              border: `1px solid ${border}`,
              boxShadow: shadow,
            }}
          >
            {[
              { label: "Population", value: page.population },
              { label: "Est. Gyms", value: page.estimatedGyms },
              { label: "Market Growth", value: page.marketGrowth },
            ].map((stat) => (
              <div
                key={stat.label}
                style={{
                  background: surface,
                  padding: "32px 24px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                <span
                  style={{
                    fontSize: 36,
                    fontWeight: 900,
                    color: text,
                    letterSpacing: "-0.03em",
                    lineHeight: 1,
                  }}
                >
                  {stat.value}
                </span>
                <span style={{ fontSize: 12, color: muted, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  {stat.label}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* ── Local insight ─────────────────────────────────────────────────── */}
        <section
          style={{
            borderBottom: `1px solid ${border}`,
            padding: "64px 24px",
            maxWidth: 900,
            margin: "0 auto",
          }}
        >
          <p
            style={{
              color: accent,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              marginBottom: 24,
            }}
          >
            THE {page.cityEn.toUpperCase()} GYM SCENE
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 24,
            }}
          >
            {/* English */}
            <div
              style={{
                background: surface,
                border: `1px solid ${border}`,
                padding: "32px",
                boxShadow: shadow,
              }}
            >
              <p
                style={{
                  fontSize: 11,
                  color: muted,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  marginBottom: 16,
                }}
              >
                EN
              </p>
              <p style={{ fontSize: 15, lineHeight: 1.75, color: text, margin: 0 }}>
                {page.localInsightEn}
              </p>
            </div>

            {/* Arabic */}
            <div
              dir="rtl"
              style={{
                background: surface,
                border: `1px solid ${border}`,
                padding: "32px",
                boxShadow: shadow,
              }}
            >
              <p
                style={{
                  fontSize: 11,
                  color: muted,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  marginBottom: 16,
                }}
              >
                AR
              </p>
              <p style={{ fontSize: 15, lineHeight: 1.75, color: text, margin: 0 }}>
                {page.localInsightAr}
              </p>
            </div>
          </div>
        </section>

        {/* ── Features grid ─────────────────────────────────────────────────── */}
        <section
          style={{
            borderBottom: `1px solid ${border}`,
            padding: "64px 24px",
            maxWidth: 900,
            margin: "0 auto",
          }}
        >
          <p
            style={{
              color: accent,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              marginBottom: 12,
            }}
          >
            BUILT FOR GYM OWNERS IN {page.cityEn.toUpperCase()}
          </p>
          <h2
            style={{
              fontSize: "clamp(24px, 3.5vw, 40px)",
              fontWeight: 900,
              letterSpacing: "-0.03em",
              margin: "0 0 40px",
              color: text,
            }}
          >
            Everything you need. Nothing you don&apos;t.
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: 1,
              background: border,
              border: `1px solid ${border}`,
            }}
          >
            {features.map((f) => (
              <div
                key={f.titleEn}
                style={{
                  background: surface2,
                  padding: "28px 24px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                }}
              >
                <span style={{ fontSize: 28 }}>{f.icon}</span>
                <h3
                  style={{
                    fontSize: 16,
                    fontWeight: 700,
                    color: text,
                    margin: 0,
                    letterSpacing: "-0.01em",
                  }}
                >
                  {f.titleEn}
                </h3>
                <p style={{ fontSize: 13, color: muted, lineHeight: 1.6, margin: 0 }}>
                  {f.bodyEn}
                </p>
                {/* Arabic subtitle */}
                <p
                  dir="rtl"
                  style={{
                    fontSize: 12,
                    color: muted,
                    lineHeight: 1.6,
                    margin: 0,
                    borderTop: `1px solid ${border}`,
                    paddingTop: 10,
                  }}
                >
                  {f.bodyAr}
                </p>
              </div>
            ))}
          </div>

          <p style={{ marginTop: 24, fontSize: 13, color: muted }}>
            See the full feature list →{" "}
            <Link href="/#features" style={{ color: accent, textDecoration: "none" }}>
              gymflowsystem.com/#features
            </Link>
          </p>
        </section>

        {/* ── FAQ ───────────────────────────────────────────────────────────── */}
        <section
          style={{
            borderBottom: `1px solid ${border}`,
            padding: "64px 24px",
            maxWidth: 900,
            margin: "0 auto",
          }}
        >
          <p
            style={{
              color: accent,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              marginBottom: 12,
            }}
          >
            FREQUENTLY ASKED — {page.cityEn.toUpperCase()}
          </p>
          <h2
            style={{
              fontSize: "clamp(22px, 3vw, 36px)",
              fontWeight: 900,
              letterSpacing: "-0.03em",
              margin: "0 0 40px",
              color: text,
            }}
          >
            Questions from {page.cityEn} gym owners.
          </h2>

          <div style={{ display: "flex", flexDirection: "column", gap: 1, background: border, border: `1px solid ${border}` }}>
            {page.faqEn.map((item, i) => (
              <div
                key={i}
                style={{
                  background: surface,
                  padding: "28px 24px",
                }}
              >
                <h3
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    color: text,
                    margin: "0 0 12px",
                    letterSpacing: "-0.01em",
                  }}
                >
                  {item.q}
                </h3>
                <p style={{ fontSize: 14, color: muted, lineHeight: 1.7, margin: "0 0 16px" }}>
                  {item.a}
                </p>
                {/* Arabic version */}
                <div
                  dir="rtl"
                  style={{
                    borderTop: `1px solid ${border}`,
                    paddingTop: 16,
                  }}
                >
                  <p
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: text,
                      margin: "0 0 8px",
                    }}
                  >
                    {page.faqAr[i]?.q}
                  </p>
                  <p style={{ fontSize: 13, color: muted, lineHeight: 1.7, margin: 0 }}>
                    {page.faqAr[i]?.a}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── CTA ───────────────────────────────────────────────────────────── */}
        <section
          style={{
            borderBottom: `1px solid ${border}`,
            padding: "80px 24px",
            maxWidth: 900,
            margin: "0 auto",
            textAlign: "center",
          }}
        >
          <p
            style={{
              color: accent,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              marginBottom: 20,
            }}
          >
            GET STARTED
          </p>
          <h2
            style={{
              fontSize: "clamp(28px, 4vw, 52px)",
              fontWeight: 900,
              letterSpacing: "-0.03em",
              margin: "0 0 16px",
              color: text,
            }}
          >
            Ready to run your {page.cityEn} gym{" "}
            <span style={{ color: accent }}>without the chaos?</span>
          </h2>
          <p
            style={{
              fontSize: 16,
              color: muted,
              margin: "0 auto 40px",
              maxWidth: 480,
              lineHeight: 1.6,
            }}
          >
            Join gym owners across {page.cityEn} and {page.countryEn} who use GymFlow to automate the admin and focus on their members.
          </p>
          <Link
            href="/dashboard"
            style={{
              background: accent,
              color: "#fff",
              padding: "18px 48px",
              textDecoration: "none",
              fontWeight: 900,
              fontSize: 16,
              boxShadow: shadow,
              letterSpacing: "0.04em",
              display: "inline-block",
            }}
          >
            START FOR FREE
          </Link>
          <p style={{ marginTop: 16, fontSize: 12, color: muted }}>
            No credit card · Setup in one day · Cancel anytime
          </p>
        </section>

        {/* ── Internal links to other city pages ────────────────────────────── */}
        <section
          style={{
            padding: "48px 24px",
            maxWidth: 900,
            margin: "0 auto",
            borderBottom: `1px solid ${border}`,
          }}
        >
          <p
            style={{
              color: muted,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              marginBottom: 20,
            }}
          >
            OTHER CITIES WE SERVE
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {otherCities
              .filter((c) => c.slug !== page.slug)
              .map((c) => (
                <Link
                  key={c.slug}
                  href={`/gym-management-software-${c.slug}`}
                  style={{
                    border: `1px solid ${border}`,
                    color: muted,
                    padding: "6px 14px",
                    fontSize: 13,
                    textDecoration: "none",
                    display: "inline-block",
                    lineHeight: 1.5,
                  }}
                >
                  {c.labelEn}
                </Link>
              ))}
          </div>
        </section>

        {/* ── Minimal footer ────────────────────────────────────────────────── */}
        <footer
          style={{
            padding: "32px 24px",
            maxWidth: 900,
            margin: "0 auto",
            display: "flex",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 16,
            alignItems: "center",
          }}
        >
          <span style={{ color: muted, fontSize: 13 }}>
            © {new Date().getFullYear()} GymFlow. Gym management software for {page.cityEn}.
          </span>
          <div style={{ display: "flex", gap: 20 }}>
            <Link href="/privacy-policy" style={{ color: muted, fontSize: 12, textDecoration: "none" }}>
              Privacy
            </Link>
            <Link href="/terms-of-service" style={{ color: muted, fontSize: 12, textDecoration: "none" }}>
              Terms
            </Link>
            <Link href="/blog" style={{ color: muted, fontSize: 12, textDecoration: "none" }}>
              Blog
            </Link>
          </div>
        </footer>
      </div>
    </>
  );
}
