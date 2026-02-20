// Server Component — no "use client" needed.
// Renders a feature detail page from the data file.
// URL pattern: /features/[slug]

import { Metadata } from "next";

import { notFound } from "next/navigation";
import {
  getAllFeatures,
  getFeatureBySlug,
  type FeaturePage,
} from "@/lib/features-data";

// ─── Static params — one page per feature slug ───────────────────────────────
export function generateStaticParams() {
  return getAllFeatures().map((f) => ({ slug: f.slug }));
}

// ─── Dynamic <head> metadata per feature ─────────────────────────────────────
export function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Metadata {
  const feature = getFeatureBySlug(params.slug);
  if (!feature) return {};

  return {
    title: `${feature.titleEn} — GymFlow`,
    description: feature.descriptionEn,
    alternates: {
      canonical: `https://gymflowsystem.com/features/${feature.slug}`,
      languages: {
        "ar-EG": `https://gymflowsystem.com/ar/features/${feature.slug}`,
      },
    },
    openGraph: {
      title: `${feature.titleEn} — GymFlow`,
      description: feature.descriptionEn,
      type: "website",
      locale: "en_US",
    },
  };
}

// ─── JSON-LD schemas ──────────────────────────────────────────────────────────

function FaqSchema({ faq }: { faq: { q: string; a: string }[] }) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

function SoftwareApplicationSchema({ feature }: { feature: FeaturePage }) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "GymFlow",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description: feature.descriptionEn,
    featureList: feature.benefitsEn.map((b) => b.title),
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      description: "Free trial available",
    },
    url: `https://gymflowsystem.com/features/${feature.slug}`,
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

// ─── Page component ───────────────────────────────────────────────────────────

export default function FeaturePage({
  params,
}: {
  params: { slug: string };
}) {
  const feature = getFeatureBySlug(params.slug);
  if (!feature) notFound();

  // Resolve related feature objects for the sidebar links
  const related = feature.relatedFeatures
    .map((s) => getFeatureBySlug(s))
    .filter((f): f is FeaturePage => f !== undefined);

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#0a0a0a",
        color: "#f0f0f0",
        padding: "4rem 1.5rem",
      }}
    >
      {/* JSON-LD schemas injected in <head> via Next.js */}
      <FaqSchema faq={feature.faqEn} />
      <SoftwareApplicationSchema feature={feature} />

      <div style={{ maxWidth: 800, margin: "0 auto" }}>

        {/* ── Breadcrumb ── */}
        <div style={{ marginBottom: "2rem", fontSize: "0.875rem" }}>
          <a href="/" style={{ color: "#888", textDecoration: "none" }}>
            GymFlow
          </a>
          <span style={{ color: "#444", margin: "0 0.5rem" }}>/</span>
          <a
            href="/features"
            style={{ color: "#888", textDecoration: "none" }}
          >
            Features
          </a>
          <span style={{ color: "#444", margin: "0 0.5rem" }}>/</span>
          <span style={{ color: "#e63946" }}>{feature.titleEn}</span>
        </div>

        {/* ── Hero ── */}
        <section style={{ marginBottom: "3.5rem" }}>
          {/* Accent label */}
          <span
            style={{
              display: "inline-block",
              fontSize: "0.72rem",
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "#e63946",
              marginBottom: "1rem",
            }}
          >
            Feature
          </span>

          <h1
            style={{
              fontSize: "clamp(2rem, 5vw, 3rem)",
              fontWeight: 700,
              lineHeight: 1.1,
              marginBottom: "1rem",
            }}
          >
            {feature.titleEn}
          </h1>

          <p
            style={{
              fontSize: "1.125rem",
              color: "#aaa",
              lineHeight: 1.65,
              marginBottom: "2rem",
              maxWidth: 640,
            }}
          >
            {feature.heroEn}
          </p>

          {/* Primary CTA */}
          <a
            href="/login?mode=register"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.4rem",
              background: "#e63946",
              color: "#fff",
              fontWeight: 700,
              fontSize: "0.95rem",
              padding: "0.75rem 1.75rem",
              border: "2px solid #e63946",
              textDecoration: "none",
              boxShadow: "4px 4px 0 rgba(230,57,70,0.4)",
            }}
          >
            Start free →
          </a>
        </section>

        {/* ── Description ── */}
        <section style={{ marginBottom: "3.5rem" }}>
          <p
            style={{
              fontSize: "1rem",
              color: "#ccc",
              lineHeight: 1.75,
            }}
          >
            {feature.descriptionEn}
          </p>
        </section>

        {/* ── Benefits grid ── */}
        <section style={{ marginBottom: "3.5rem" }}>
          <h2
            style={{
              fontSize: "1.5rem",
              fontWeight: 700,
              marginBottom: "1.5rem",
            }}
          >
            Why it matters
          </h2>

          {/* 3-column grid that collapses to 1 on narrow screens via flex-wrap */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "1rem",
            }}
          >
            {feature.benefitsEn.map((benefit, i) => (
              <div
                key={i}
                style={{
                  flex: "1 1 220px",
                  background: "#141414",
                  border: "2px solid #2a2a2a",
                  padding: "1.5rem",
                  boxShadow: "4px 4px 0 #000",
                }}
              >
                {/* Red number accent */}
                <span
                  style={{
                    display: "block",
                    fontSize: "0.7rem",
                    fontWeight: 700,
                    letterSpacing: "0.1em",
                    color: "#e63946",
                    marginBottom: "0.5rem",
                    textTransform: "uppercase",
                  }}
                >
                  0{i + 1}
                </span>
                <h3
                  style={{
                    fontSize: "1rem",
                    fontWeight: 700,
                    marginBottom: "0.5rem",
                  }}
                >
                  {benefit.title}
                </h3>
                <p
                  style={{
                    fontSize: "0.875rem",
                    color: "#888",
                    lineHeight: 1.6,
                    margin: 0,
                  }}
                >
                  {benefit.body}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ── How it works ── */}
        <section style={{ marginBottom: "3.5rem" }}>
          <h2
            style={{
              fontSize: "1.5rem",
              fontWeight: 700,
              marginBottom: "1.5rem",
            }}
          >
            How it works
          </h2>

          {/* Numbered vertical steps */}
          <div
            style={{
              border: "2px solid #2a2a2a",
              background: "#141414",
            }}
          >
            {feature.howItWorksEn.map((item, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  gap: "1.25rem",
                  padding: "1.5rem",
                  borderBottom:
                    i < feature.howItWorksEn.length - 1
                      ? "2px solid #2a2a2a"
                      : "none",
                  alignItems: "flex-start",
                }}
              >
                {/* Step number badge */}
                <div
                  style={{
                    flexShrink: 0,
                    width: 36,
                    height: 36,
                    background: "#e63946",
                    color: "#fff",
                    fontWeight: 700,
                    fontSize: "0.875rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {i + 1}
                </div>

                <div>
                  <h3
                    style={{
                      fontSize: "0.95rem",
                      fontWeight: 700,
                      marginBottom: "0.35rem",
                    }}
                  >
                    {item.step}
                  </h3>
                  <p
                    style={{
                      fontSize: "0.875rem",
                      color: "#888",
                      margin: 0,
                      lineHeight: 1.6,
                    }}
                  >
                    {item.detail}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── FAQ ── */}
        <section style={{ marginBottom: "3.5rem" }}>
          <h2
            style={{
              fontSize: "1.5rem",
              fontWeight: 700,
              marginBottom: "1.5rem",
            }}
          >
            Frequently asked questions
          </h2>

          <div
            style={{
              border: "2px solid #2a2a2a",
              background: "#141414",
            }}
          >
            {feature.faqEn.map((item, i) => (
              <div
                key={i}
                style={{
                  padding: "1.25rem 1.5rem",
                  borderBottom:
                    i < feature.faqEn.length - 1
                      ? "2px solid #2a2a2a"
                      : "none",
                }}
              >
                <h3
                  style={{
                    fontSize: "0.95rem",
                    fontWeight: 700,
                    marginBottom: "0.4rem",
                  }}
                >
                  {item.q}
                </h3>
                <p
                  style={{
                    fontSize: "0.875rem",
                    color: "#888",
                    margin: 0,
                    lineHeight: 1.65,
                  }}
                >
                  {item.a}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Related features ── */}
        {related.length > 0 && (
          <section style={{ marginBottom: "3.5rem" }}>
            <h2
              style={{
                fontSize: "1.25rem",
                fontWeight: 700,
                marginBottom: "1rem",
              }}
            >
              Related features
            </h2>

            <div
              style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}
            >
              {related.map((rf) => (
                <a
                  key={rf.slug}
                  href={`/features/${rf.slug}`}
                  style={{
                    display: "block",
                    background: "#141414",
                    border: "2px solid #2a2a2a",
                    padding: "1rem 1.25rem",
                    textDecoration: "none",
                    color: "inherit",
                  }}
                >
                  <span style={{ fontWeight: 700, fontSize: "0.95rem" }}>
                    {rf.titleEn}
                  </span>
                  <p
                    style={{
                      color: "#888",
                      fontSize: "0.85rem",
                      margin: "0.2rem 0 0",
                    }}
                  >
                    {rf.heroEn}
                  </p>
                </a>
              ))}
            </div>
          </section>
        )}

        {/* ── Bottom CTA ── */}
        <div
          style={{
            padding: "2.5rem",
            background: "#141414",
            border: "2px solid #2a2a2a",
            textAlign: "center",
            boxShadow: "6px 6px 0 #000",
          }}
        >
          <h2
            style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.5rem" }}
          >
            Ready to try GymFlow?
          </h2>
          <p
            style={{
              color: "#888",
              marginBottom: "1.5rem",
              fontSize: "0.95rem",
            }}
          >
            Start free — no credit card required. Setup in 10 minutes.
          </p>
          <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
            <a
              href="/login?mode=register"
              style={{
                display: "inline-flex",
                background: "#e63946",
                color: "#fff",
                fontWeight: 700,
                padding: "0.75rem 2rem",
                border: "2px solid #e63946",
                textDecoration: "none",
                boxShadow: "4px 4px 0 rgba(230,57,70,0.4)",
              }}
            >
              Start free →
            </a>
            <a
              href="/features"
              style={{
                display: "inline-flex",
                background: "transparent",
                color: "#f0f0f0",
                fontWeight: 700,
                padding: "0.75rem 2rem",
                border: "2px solid #2a2a2a",
                textDecoration: "none",
              }}
            >
              All features
            </a>
          </div>
        </div>

      </div>
    </main>
  );
}
