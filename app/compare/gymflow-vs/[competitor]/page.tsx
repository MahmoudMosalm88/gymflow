// Server Component — one page per competitor comparison.
// Route: /compare/gymflow-vs-[competitor]
// e.g. /compare/gymflow-vs-gym-engine

import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { comparisons, getComparison } from "@/lib/comparisons-data";

// ─────────────────────────────────────────────────────────
// Static params — pre-render all known competitors at build time
// ─────────────────────────────────────────────────────────
export function generateStaticParams() {
  return comparisons.map((c) => ({ competitor: c.slug }));
}

// ─────────────────────────────────────────────────────────
// Metadata — SEO title and description per competitor
// ─────────────────────────────────────────────────────────
export async function generateMetadata({
  params,
}: {
  params: { competitor: string };
}): Promise<Metadata> {
  const data = getComparison(params.competitor);
  if (!data) return {};

  const title = `GymFlow vs ${data.competitorName}: Which Gym Software Is Better?`;
  const description = data.verdictEn.slice(0, 155);

  return {
    title,
    description,
    alternates: {
      canonical: `https://gymflowsystem.com/compare/gymflow-vs-${data.slug}`,
    },
    openGraph: {
      title,
      description,
      url: `https://gymflowsystem.com/compare/gymflow-vs-${data.slug}`,
      type: "article",
    },
  };
}

// ─────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────

// Returns a styled badge for yes / no / partial values
function Badge({ value }: { value: string }) {
  // Treat anything that isn't a keyword as a plain text label (e.g. "From $29/mo")
  const isKeyword = ["yes", "no", "partial"].includes(value.toLowerCase());

  if (!isKeyword) {
    return (
      <span style={{ color: "#888", fontSize: "0.8125rem" }}>{value}</span>
    );
  }

  const styles: Record<string, { color: string; label: string }> = {
    yes:     { color: "#22c55e", label: "✓ Yes" },
    no:      { color: "#e63946", label: "✗ No" },
    partial: { color: "#f59e0b", label: "~ Partial" },
  };
  const s = styles[value.toLowerCase()];

  return (
    <span
      style={{
        color: s.color,
        fontWeight: 600,
        fontSize: "0.875rem",
        letterSpacing: "0.02em",
      }}
    >
      {s.label}
    </span>
  );
}

// A simple section heading with a red left border accent
function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2
      style={{
        fontSize: "clamp(1.25rem, 2.5vw, 1.75rem)",
        fontWeight: 700,
        borderLeft: "4px solid #e63946",
        paddingLeft: "0.875rem",
        marginBottom: "1.25rem",
        lineHeight: 1.2,
      }}
    >
      {children}
    </h2>
  );
}

// ─────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────
export default function ComparisonPage({
  params,
}: {
  params: { competitor: string };
}) {
  const data = getComparison(params.competitor);
  if (!data) notFound();

  // JSON-LD FAQPage schema for rich results
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: data.faqEn.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.a,
      },
    })),
  };

  // Shared card style used across sections
  const card: React.CSSProperties = {
    background: "#141414",
    border: "1px solid #2a2a2a",
    padding: "1.5rem",
    marginBottom: "1rem",
  };

  // Shared section wrapper
  const section: React.CSSProperties = {
    marginBottom: "3.5rem",
  };

  return (
    <>
      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <main
        style={{
          minHeight: "100vh",
          background: "#0a0a0a",
          color: "#f0f0f0",
          padding: "4rem 1.5rem 6rem",
          fontFamily: "var(--font-sans, sans-serif)",
        }}
      >
        <div style={{ maxWidth: 900, margin: "0 auto" }}>

          {/* ── Breadcrumb ── */}
          <nav style={{ marginBottom: "2rem", fontSize: "0.8125rem", color: "#888" }}>
            <a href="/" style={{ color: "#888", textDecoration: "none" }}>
              GymFlow
            </a>
            {" / "}
            <a href="/compare" style={{ color: "#888", textDecoration: "none" }}>
              Compare
            </a>
            {" / "}
            <span style={{ color: "#f0f0f0" }}>
              GymFlow vs {data.competitorName}
            </span>
          </nav>

          {/* ── Hero heading ── */}
          <header style={{ marginBottom: "3rem" }}>
            <h1
              style={{
                fontSize: "clamp(1.75rem, 4vw, 2.75rem)",
                fontWeight: 700,
                lineHeight: 1.1,
                marginBottom: "1rem",
              }}
            >
              GymFlow vs {data.competitorName}
              <br />
              <span style={{ color: "#888", fontSize: "0.65em", fontWeight: 400 }}>
                Which Gym Software Is Better?
              </span>
            </h1>
            <p style={{ color: "#888", fontSize: "0.875rem" }}>
              {data.competitorCountry} market · Updated February 2026
            </p>
          </header>

          {/* ── 1. Quick Verdict ── */}
          <section style={{ ...section }}>
            <SectionHeading>Quick Verdict</SectionHeading>
            {/* English */}
            <div style={{ ...card, borderLeft: "4px solid #e63946" }}>
              <p style={{ lineHeight: 1.75, marginBottom: "1rem" }}>{data.verdictEn}</p>
              {/* Arabic — RTL block */}
              <p
                dir="rtl"
                lang="ar"
                style={{
                  lineHeight: 1.9,
                  color: "#c8c4bf",
                  fontFamily: "var(--font-arabic, sans-serif)",
                  borderTop: "1px solid #2a2a2a",
                  paddingTop: "1rem",
                  marginTop: "0.25rem",
                }}
              >
                {data.verdictAr}
              </p>
            </div>
          </section>

          {/* ── 2. Feature Comparison Table ── */}
          <section style={{ ...section }}>
            <SectionHeading>Feature Comparison</SectionHeading>
            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: "0.9375rem",
                }}
              >
                <thead>
                  <tr style={{ borderBottom: "2px solid #e63946" }}>
                    <th
                      style={{
                        textAlign: "left",
                        padding: "0.75rem 1rem",
                        fontWeight: 600,
                        color: "#888",
                        width: "40%",
                      }}
                    >
                      Feature
                    </th>
                    <th
                      style={{
                        textAlign: "center",
                        padding: "0.75rem 1rem",
                        fontWeight: 700,
                        color: "#e63946",
                      }}
                    >
                      GymFlow
                    </th>
                    <th
                      style={{
                        textAlign: "center",
                        padding: "0.75rem 1rem",
                        fontWeight: 600,
                        color: "#f0f0f0",
                      }}
                    >
                      {data.competitorName}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.features.map((row, i) => (
                    <tr
                      key={row.name}
                      style={{
                        borderBottom: "1px solid #2a2a2a",
                        background: i % 2 === 0 ? "#0a0a0a" : "#141414",
                      }}
                    >
                      <td style={{ padding: "0.75rem 1rem", color: "#c8c4bf" }}>
                        {row.name}
                      </td>
                      <td style={{ padding: "0.75rem 1rem", textAlign: "center" }}>
                        <Badge value={row.gymflow} />
                      </td>
                      <td style={{ padding: "0.75rem 1rem", textAlign: "center" }}>
                        <Badge value={row.competitor} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p style={{ color: "#555", fontSize: "0.75rem", marginTop: "0.75rem" }}>
              Based on publicly available information. Reach out if anything is inaccurate.
            </p>
          </section>

          {/* ── 3. Advantages: two columns ── */}
          <section style={{ ...section }}>
            <SectionHeading>Strengths & Advantages</SectionHeading>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: "1rem",
              }}
            >
              {/* GymFlow pros */}
              <div style={{ ...card }}>
                <h3
                  style={{
                    color: "#e63946",
                    fontWeight: 700,
                    marginBottom: "1rem",
                    fontSize: "1rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                  }}
                >
                  GymFlow Advantages
                </h3>
                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  {data.prosGymflowEn.map((pro) => (
                    <li
                      key={pro}
                      style={{
                        paddingBottom: "0.625rem",
                        borderBottom: "1px solid #2a2a2a",
                        marginBottom: "0.625rem",
                        paddingLeft: "1.25rem",
                        position: "relative",
                        color: "#c8c4bf",
                        fontSize: "0.9375rem",
                        lineHeight: 1.5,
                      }}
                    >
                      <span
                        style={{
                          position: "absolute",
                          left: 0,
                          color: "#e63946",
                          fontWeight: 700,
                        }}
                      >
                        +
                      </span>
                      {pro}
                    </li>
                  ))}
                </ul>
                {/* Arabic */}
                <ul
                  dir="rtl"
                  lang="ar"
                  style={{
                    listStyle: "none",
                    padding: 0,
                    margin: "1rem 0 0",
                    borderTop: "1px solid #2a2a2a",
                    paddingTop: "1rem",
                    fontFamily: "var(--font-arabic, sans-serif)",
                  }}
                >
                  {data.prosGymflowAr.map((pro) => (
                    <li
                      key={pro}
                      style={{
                        paddingBottom: "0.5rem",
                        borderBottom: "1px solid #1e1e1e",
                        marginBottom: "0.5rem",
                        paddingRight: "1.25rem",
                        position: "relative",
                        color: "#8a8578",
                        fontSize: "0.875rem",
                        lineHeight: 1.7,
                      }}
                    >
                      <span
                        style={{
                          position: "absolute",
                          right: 0,
                          color: "#e63946",
                        }}
                      >
                        +
                      </span>
                      {pro}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Competitor pros */}
              <div style={{ ...card }}>
                <h3
                  style={{
                    color: "#f0f0f0",
                    fontWeight: 700,
                    marginBottom: "1rem",
                    fontSize: "1rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                  }}
                >
                  {data.competitorName} Advantages
                </h3>
                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  {data.prosCompetitorEn.map((pro) => (
                    <li
                      key={pro}
                      style={{
                        paddingBottom: "0.625rem",
                        borderBottom: "1px solid #2a2a2a",
                        marginBottom: "0.625rem",
                        paddingLeft: "1.25rem",
                        position: "relative",
                        color: "#c8c4bf",
                        fontSize: "0.9375rem",
                        lineHeight: 1.5,
                      }}
                    >
                      <span
                        style={{
                          position: "absolute",
                          left: 0,
                          color: "#888",
                          fontWeight: 700,
                        }}
                      >
                        +
                      </span>
                      {pro}
                    </li>
                  ))}
                </ul>
                {/* Arabic */}
                <ul
                  dir="rtl"
                  lang="ar"
                  style={{
                    listStyle: "none",
                    padding: 0,
                    margin: "1rem 0 0",
                    borderTop: "1px solid #2a2a2a",
                    paddingTop: "1rem",
                    fontFamily: "var(--font-arabic, sans-serif)",
                  }}
                >
                  {data.prosCompetitorAr.map((pro) => (
                    <li
                      key={pro}
                      style={{
                        paddingBottom: "0.5rem",
                        borderBottom: "1px solid #1e1e1e",
                        marginBottom: "0.5rem",
                        paddingRight: "1.25rem",
                        position: "relative",
                        color: "#8a8578",
                        fontSize: "0.875rem",
                        lineHeight: 1.7,
                      }}
                    >
                      <span
                        style={{
                          position: "absolute",
                          right: 0,
                          color: "#888",
                        }}
                      >
                        +
                      </span>
                      {pro}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          {/* ── 4. Decision guide: choose X if... ── */}
          <section style={{ ...section }}>
            <SectionHeading>Which One Should You Pick?</SectionHeading>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: "1rem",
              }}
            >
              {/* Choose GymFlow */}
              <div
                style={{
                  ...card,
                  borderTop: "3px solid #e63946",
                }}
              >
                <h3
                  style={{
                    fontWeight: 700,
                    marginBottom: "1rem",
                    color: "#e63946",
                    fontSize: "1rem",
                  }}
                >
                  Choose GymFlow if...
                </h3>
                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  {data.chooseGymflowIfEn.map((item) => (
                    <li
                      key={item}
                      style={{
                        paddingBottom: "0.625rem",
                        marginBottom: "0.625rem",
                        borderBottom: "1px solid #2a2a2a",
                        paddingLeft: "1.25rem",
                        position: "relative",
                        color: "#c8c4bf",
                        fontSize: "0.9375rem",
                        lineHeight: 1.5,
                      }}
                    >
                      <span
                        style={{
                          position: "absolute",
                          left: 0,
                          color: "#e63946",
                        }}
                      >
                        →
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
                {/* Arabic */}
                <ul
                  dir="rtl"
                  lang="ar"
                  style={{
                    listStyle: "none",
                    padding: 0,
                    margin: "1rem 0 0",
                    borderTop: "1px solid #2a2a2a",
                    paddingTop: "1rem",
                    fontFamily: "var(--font-arabic, sans-serif)",
                  }}
                >
                  {data.chooseGymflowIfAr.map((item) => (
                    <li
                      key={item}
                      style={{
                        paddingBottom: "0.5rem",
                        marginBottom: "0.5rem",
                        borderBottom: "1px solid #1e1e1e",
                        paddingRight: "1.25rem",
                        position: "relative",
                        color: "#8a8578",
                        fontSize: "0.875rem",
                        lineHeight: 1.7,
                      }}
                    >
                      <span
                        style={{
                          position: "absolute",
                          right: 0,
                          color: "#e63946",
                        }}
                      >
                        ←
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Choose Competitor */}
              <div
                style={{
                  ...card,
                  borderTop: "3px solid #3a3a3a",
                }}
              >
                <h3
                  style={{
                    fontWeight: 700,
                    marginBottom: "1rem",
                    color: "#f0f0f0",
                    fontSize: "1rem",
                  }}
                >
                  Choose {data.competitorName} if...
                </h3>
                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  {data.chooseCompetitorIfEn.map((item) => (
                    <li
                      key={item}
                      style={{
                        paddingBottom: "0.625rem",
                        marginBottom: "0.625rem",
                        borderBottom: "1px solid #2a2a2a",
                        paddingLeft: "1.25rem",
                        position: "relative",
                        color: "#c8c4bf",
                        fontSize: "0.9375rem",
                        lineHeight: 1.5,
                      }}
                    >
                      <span
                        style={{
                          position: "absolute",
                          left: 0,
                          color: "#888",
                        }}
                      >
                        →
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
                {/* Arabic */}
                <ul
                  dir="rtl"
                  lang="ar"
                  style={{
                    listStyle: "none",
                    padding: 0,
                    margin: "1rem 0 0",
                    borderTop: "1px solid #2a2a2a",
                    paddingTop: "1rem",
                    fontFamily: "var(--font-arabic, sans-serif)",
                  }}
                >
                  {data.chooseCompetitorIfAr.map((item) => (
                    <li
                      key={item}
                      style={{
                        paddingBottom: "0.5rem",
                        marginBottom: "0.5rem",
                        borderBottom: "1px solid #1e1e1e",
                        paddingRight: "1.25rem",
                        position: "relative",
                        color: "#8a8578",
                        fontSize: "0.875rem",
                        lineHeight: 1.7,
                      }}
                    >
                      <span
                        style={{
                          position: "absolute",
                          right: 0,
                          color: "#888",
                        }}
                      >
                        ←
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          {/* ── 5. FAQ ── */}
          <section style={{ ...section }}>
            <SectionHeading>Frequently Asked Questions</SectionHeading>
            <div>
              {data.faqEn.map((item, i) => {
                const arItem = data.faqAr[i];
                return (
                  <div key={item.q} style={{ ...card, marginBottom: "0.75rem" }}>
                    <h3
                      style={{
                        fontWeight: 600,
                        fontSize: "1rem",
                        marginBottom: "0.5rem",
                        color: "#f0f0f0",
                      }}
                    >
                      {item.q}
                    </h3>
                    <p
                      style={{
                        color: "#c8c4bf",
                        lineHeight: 1.7,
                        marginBottom: arItem ? "0.875rem" : 0,
                      }}
                    >
                      {item.a}
                    </p>
                    {arItem && (
                      <div
                        dir="rtl"
                        lang="ar"
                        style={{
                          borderTop: "1px solid #2a2a2a",
                          paddingTop: "0.75rem",
                          fontFamily: "var(--font-arabic, sans-serif)",
                        }}
                      >
                        <p
                          style={{
                            fontWeight: 600,
                            fontSize: "0.9375rem",
                            marginBottom: "0.35rem",
                            color: "#e8e4df",
                          }}
                        >
                          {arItem.q}
                        </p>
                        <p style={{ color: "#8a8578", lineHeight: 1.8, fontSize: "0.875rem" }}>
                          {arItem.a}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* ── 6. Internal links ── */}
          <section style={{ ...section }}>
            <SectionHeading>Learn More About GymFlow</SectionHeading>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: "0.75rem",
              }}
            >
              {[
                { label: "QR Check-in Feature", href: "/#features" },
                { label: "WhatsApp Automation", href: "/#features" },
                { label: "Pricing Plans", href: "/#pricing" },
                { label: "All Comparisons", href: "/compare" },
                { label: "Blog & Guides", href: "/blog" },
              ].map((link) => (
                <a
                  key={link.href + link.label}
                  href={link.href}
                  style={{
                    display: "block",
                    background: "#141414",
                    border: "1px solid #2a2a2a",
                    padding: "0.875rem 1rem",
                    color: "#c8c4bf",
                    textDecoration: "none",
                    fontSize: "0.9375rem",
                    transition: "border-color 0.15s",
                  }}
                >
                  {link.label} →
                </a>
              ))}
            </div>
          </section>

          {/* ── 7. CTA ── */}
          <section
            style={{
              background: "#141414",
              border: "1px solid #2a2a2a",
              borderLeft: "4px solid #e63946",
              padding: "2rem 1.5rem",
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "1.25rem",
            }}
          >
            <div>
              <p
                style={{
                  fontWeight: 700,
                  fontSize: "1.125rem",
                  marginBottom: "0.375rem",
                }}
              >
                Try GymFlow free — no credit card needed.
              </p>
              <p style={{ color: "#888", fontSize: "0.9375rem" }}>
                Set up your gym in under 10 minutes.
              </p>
              {/* Arabic tagline */}
              <p
                dir="rtl"
                lang="ar"
                style={{
                  color: "#8a8578",
                  fontSize: "0.875rem",
                  marginTop: "0.375rem",
                  fontFamily: "var(--font-arabic, sans-serif)",
                }}
              >
                جرّب GymFlow مجاناً — بدون بطاقة ائتمان.
              </p>
            </div>
            <a
              href="/#pricing"
              style={{
                background: "#e63946",
                color: "#fff",
                padding: "0.875rem 1.75rem",
                fontWeight: 700,
                fontSize: "0.9375rem",
                textDecoration: "none",
                display: "inline-block",
                boxShadow: "4px 4px 0 #000",
                letterSpacing: "0.02em",
              }}
            >
              Start Free Trial
            </a>
          </section>

        </div>
      </main>
    </>
  );
}
