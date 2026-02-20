// Index page listing all GymFlow competitor comparisons.
// Route: /compare

import type { Metadata } from "next";
import Link from "next/link";
import { comparisons } from "@/lib/comparisons-data";

export const metadata: Metadata = {
  title: "GymFlow vs Competitors — Gym Software Comparisons",
  description:
    "See how GymFlow compares to Gym Engine, Tamarran, Gymista and other gym management platforms in Egypt and the MENA region.",
  alternates: {
    canonical: "https://gymflowsystem.com/compare",
  },
  openGraph: {
    title: "GymFlow vs Competitors — Gym Software Comparisons",
    description:
      "Side-by-side comparison of GymFlow against the leading gym management platforms in Egypt and the GCC.",
    url: "https://gymflowsystem.com/compare",
    type: "website",
  },
};

export default function CompareIndexPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#0a0a0a",
        color: "#f0f0f0",
        padding: "5rem 1.5rem 7rem",
        fontFamily: "var(--font-sans, sans-serif)",
      }}
    >
      <div style={{ maxWidth: 860, margin: "0 auto" }}>

        {/* ── Breadcrumb ── */}
        <nav style={{ marginBottom: "2rem", fontSize: "0.8125rem", color: "#888" }}>
          <Link href="/" style={{ color: "#888", textDecoration: "none" }}>
            GymFlow
          </Link>
          {" / "}
          <span style={{ color: "#f0f0f0" }}>Compare</span>
        </nav>

        {/* ── Header ── */}
        <header style={{ marginBottom: "3.5rem" }}>
          <h1
            style={{
              fontSize: "clamp(1.75rem, 4vw, 2.75rem)",
              fontWeight: 700,
              lineHeight: 1.1,
              marginBottom: "0.875rem",
            }}
          >
            GymFlow vs Competitors
          </h1>
          <p
            style={{
              color: "#888",
              fontSize: "1.0625rem",
              maxWidth: 560,
              lineHeight: 1.65,
            }}
          >
            Honest, side-by-side comparisons of GymFlow against the leading gym management
            platforms in Egypt and the MENA region. We cover features, pricing, and who
            each product is actually built for.
          </p>
          {/* Arabic subtitle */}
          <p
            dir="rtl"
            lang="ar"
            style={{
              color: "#555",
              fontSize: "0.9375rem",
              marginTop: "0.75rem",
              fontFamily: "var(--font-arabic, sans-serif)",
              lineHeight: 1.8,
            }}
          >
            مقارنات صريحة بين GymFlow وأبرز منصات إدارة الصالات في مصر ومنطقة الشرق الأوسط وشمال أفريقيا.
          </p>
        </header>

        {/* ── Comparison cards grid ── */}
        <section>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
              gap: "1rem",
            }}
          >
            {comparisons.map((c) => {
              // Count how many features GymFlow wins on vs the competitor
              const gymflowWins = c.features.filter(
                (f) => f.gymflow === "yes" && f.competitor !== "yes"
              ).length;

              return (
                <Link
                  key={c.slug}
                  href={`/compare/gymflow-vs-${c.slug}`}
                  style={{ textDecoration: "none", display: "block" }}
                >
                  <article
                    style={{
                      background: "#141414",
                      border: "1px solid #2a2a2a",
                      padding: "1.5rem",
                      height: "100%",
                      boxSizing: "border-box",
                      transition: "border-color 0.15s, box-shadow 0.15s",
                      // hover handled inline — Next.js Server Components can't use :hover CSS,
                      // so we rely on the link cursor + subtle shadow
                      boxShadow: "0 0 0 transparent",
                    }}
                  >
                    {/* Country tag */}
                    <span
                      style={{
                        display: "inline-block",
                        background: "#1e1e1e",
                        border: "1px solid #2a2a2a",
                        color: "#888",
                        fontSize: "0.75rem",
                        padding: "0.2rem 0.6rem",
                        marginBottom: "0.875rem",
                        letterSpacing: "0.04em",
                        textTransform: "uppercase",
                      }}
                    >
                      {c.competitorCountry}
                    </span>

                    <h2
                      style={{
                        fontSize: "1.125rem",
                        fontWeight: 700,
                        marginBottom: "0.5rem",
                        color: "#f0f0f0",
                        lineHeight: 1.3,
                      }}
                    >
                      GymFlow vs {c.competitorName}
                    </h2>

                    <p
                      style={{
                        color: "#888",
                        fontSize: "0.875rem",
                        lineHeight: 1.6,
                        marginBottom: "1.25rem",
                      }}
                    >
                      {/* Show just the first sentence of the verdict */}
                      {c.verdictEn.split(".")[0]}.
                    </p>

                    {/* Feature win count badge */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        borderTop: "1px solid #2a2a2a",
                        paddingTop: "0.875rem",
                      }}
                    >
                      <span
                        style={{
                          background: "#e63946",
                          color: "#fff",
                          fontWeight: 700,
                          fontSize: "0.8125rem",
                          padding: "0.2rem 0.6rem",
                          minWidth: 28,
                          textAlign: "center",
                        }}
                      >
                        {gymflowWins}
                      </span>
                      <span style={{ color: "#555", fontSize: "0.8125rem" }}>
                        features where GymFlow leads
                      </span>
                      <span
                        style={{
                          marginLeft: "auto",
                          color: "#e63946",
                          fontWeight: 600,
                          fontSize: "0.875rem",
                        }}
                      >
                        Compare →
                      </span>
                    </div>
                  </article>
                </Link>
              );
            })}
          </div>
        </section>

        {/* ── Bottom note ── */}
        <p
          style={{
            color: "#444",
            fontSize: "0.8125rem",
            marginTop: "3rem",
            lineHeight: 1.7,
          }}
        >
          All comparisons are based on publicly available information as of February 2026.
          We aim to be fair — if you spot an error, {" "}
          <a href="mailto:hello@gymflowsystem.com" style={{ color: "#888" }}>
            let us know
          </a>
          .
        </p>

        {/* ── CTA strip ── */}
        <div
          style={{
            marginTop: "3rem",
            background: "#141414",
            border: "1px solid #2a2a2a",
            borderLeft: "4px solid #e63946",
            padding: "1.5rem",
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "1rem",
          }}
        >
          <div>
            <p style={{ fontWeight: 700, fontSize: "1rem", marginBottom: "0.25rem" }}>
              Not sure which platform fits your gym?
            </p>
            <p style={{ color: "#888", fontSize: "0.875rem" }}>
              Try GymFlow free — no credit card required.
            </p>
          </div>
          <Link
            href="/#pricing"
            style={{
              background: "#e63946",
              color: "#fff",
              padding: "0.75rem 1.5rem",
              fontWeight: 700,
              fontSize: "0.9375rem",
              textDecoration: "none",
              boxShadow: "4px 4px 0 #000",
            }}
          >
            Start Free Trial
          </Link>
        </div>

      </div>
    </main>
  );
}
