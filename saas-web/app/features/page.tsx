// Features index page — lists all feature pages as cards.
// URL: /features

import { Metadata } from "next";

import { getAllFeatures } from "@/lib/features-data";

export const metadata: Metadata = {
  title: "Features — GymFlow Gym Management Software",
  description:
    "Explore all GymFlow features: QR code check-in, WhatsApp notifications, subscription management, attendance reports, and more. Built for gyms in Egypt and MENA.",
  alternates: {
    canonical: "https://gymflowsystem.com/features",
    languages: {
      "ar-EG": "https://gymflowsystem.com/ar/features",
    },
  },
};

export default function FeaturesIndexPage() {
  const features = getAllFeatures();

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#0a0a0a",
        color: "#f0f0f0",
        padding: "5rem 1.5rem",
      }}
    >
      <div style={{ maxWidth: 960, margin: "0 auto" }}>

        {/* ── Header ── */}
        <div style={{ marginBottom: "3rem" }}>
          <a
            href="/"
            style={{ color: "#888", textDecoration: "none", fontSize: "0.875rem" }}
          >
            &larr; GymFlow
          </a>

          {/* Section label */}
          <div
            style={{
              marginTop: "1.5rem",
              marginBottom: "0.75rem",
              fontSize: "0.72rem",
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "#e63946",
            }}
          >
            Platform
          </div>

          <h1
            style={{
              fontSize: "clamp(2rem, 4vw, 3rem)",
              fontWeight: 700,
              lineHeight: 1.1,
              marginBottom: "0.75rem",
            }}
          >
            Features
          </h1>
          <p
            style={{
              color: "#888",
              fontSize: "1.0625rem",
              maxWidth: 540,
              lineHeight: 1.65,
            }}
          >
            Everything you need to run your gym — from client check-in to
            subscription tracking to automated WhatsApp reminders.
          </p>
        </div>

        {/* ── Feature cards grid ── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: "1.25rem",
          }}
        >
          {features.map((feature) => (
            <a
              key={feature.slug}
              href={`/features/${feature.slug}`}
              style={{
                display: "flex",
                flexDirection: "column",
                background: "#141414",
                border: "2px solid #2a2a2a",
                padding: "1.75rem",
                textDecoration: "none",
                color: "inherit",
                boxShadow: "4px 4px 0 #000",
                // Hover effect applied via className would need CSS;
                // keeping it purely inline here to match the blog approach.
              }}
            >
              {/* Feature name */}
              <h2
                style={{
                  fontSize: "1.125rem",
                  fontWeight: 700,
                  marginBottom: "0.5rem",
                  color: "#f0f0f0",
                }}
              >
                {feature.titleEn}
              </h2>

              {/* One-line hero subtitle */}
              <p
                style={{
                  fontSize: "0.875rem",
                  color: "#888",
                  lineHeight: 1.6,
                  margin: 0,
                  flexGrow: 1,
                }}
              >
                {feature.heroEn}
              </p>

              {/* "Learn more" affordance */}
              <span
                style={{
                  display: "inline-block",
                  marginTop: "1.25rem",
                  fontSize: "0.8125rem",
                  fontWeight: 700,
                  color: "#e63946",
                }}
              >
                Learn more →
              </span>
            </a>
          ))}
        </div>

        {/* ── Bottom CTA ── */}
        <div
          style={{
            marginTop: "4rem",
            padding: "2.5rem",
            background: "#141414",
            border: "2px solid #2a2a2a",
            textAlign: "center",
            boxShadow: "6px 6px 0 #000",
          }}
        >
          <h2
            style={{
              fontSize: "1.5rem",
              fontWeight: 700,
              marginBottom: "0.5rem",
            }}
          >
            Ready to see it all in action?
          </h2>
          <p
            style={{
              color: "#888",
              marginBottom: "1.5rem",
              fontSize: "0.95rem",
            }}
          >
            Start free — no credit card required. Setup takes 10 minutes.
          </p>
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
        </div>

      </div>
    </main>
  );
}
