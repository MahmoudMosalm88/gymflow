import { Metadata } from "next";

import { notFound } from "next/navigation";
import { solutions, getSolutionBySlug } from "@/lib/solutions-data";

export function generateStaticParams() {
  return solutions.map((s) => ({ slug: s.slug }));
}

export function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Metadata {
  const page = getSolutionBySlug(params.slug);
  if (!page) return {};
  return {
    title: page.titleEn,
    description: page.descriptionEn,
    alternates: {
      canonical: `https://gymflowsystem.com/solutions/${page.slug}`,
    },
    openGraph: {
      title: page.titleEn,
      description: page.descriptionEn,
    },
  };
}

export default function SolutionPage({
  params,
}: {
  params: { slug: string };
}) {
  const page = getSolutionBySlug(params.slug);
  if (!page) notFound();

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: page.faqEn.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  const related = page.relatedSolutions
    .map((s) => getSolutionBySlug(s))
    .filter(Boolean);

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#0a0a0a",
        color: "#f0f0f0",
        padding: "5rem 1.5rem",
      }}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <div style={{ maxWidth: 960, margin: "0 auto" }}>
        {/* Breadcrumb */}
        <div style={{ marginBottom: "2rem", fontSize: "0.875rem" }}>
          <a href="/" style={{ color: "#888", textDecoration: "none" }}>
            GymFlow
          </a>
          <span style={{ color: "#444", margin: "0 0.5rem" }}>/</span>
          <a
            href="/solutions"
            style={{ color: "#888", textDecoration: "none" }}
          >
            Solutions
          </a>
          <span style={{ color: "#444", margin: "0 0.5rem" }}>/</span>
          <span style={{ color: "#e63946" }}>{page.titleEn}</span>
        </div>

        {/* Hero */}
        <section style={{ marginBottom: "4rem" }}>
          <p
            style={{
              fontSize: "0.72rem",
              fontWeight: 600,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "#e63946",
              marginBottom: "0.75rem",
            }}
          >
            SOLUTION
          </p>
          <h1
            style={{
              fontSize: "clamp(2rem, 4vw, 3rem)",
              fontWeight: 700,
              lineHeight: 1.1,
              marginBottom: "1rem",
            }}
          >
            {page.titleEn}
          </h1>
          <p
            style={{
              color: "#888",
              fontSize: "1.0625rem",
              lineHeight: 1.7,
              maxWidth: "56ch",
            }}
          >
            {page.heroSubEn}
          </p>
        </section>

        {/* Challenges */}
        <section style={{ marginBottom: "4rem" }}>
          <h2
            style={{
              fontSize: "1.5rem",
              fontWeight: 700,
              marginBottom: "1.5rem",
            }}
          >
            The Challenges
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "1rem",
            }}
          >
            {page.challengesEn.map((c) => (
              <div
                key={c.title}
                style={{
                  background: "#141414",
                  border: "2px solid #2a2a2a",
                  padding: "1.5rem",
                }}
              >
                <h3
                  style={{
                    fontSize: "1rem",
                    fontWeight: 600,
                    marginBottom: "0.5rem",
                  }}
                >
                  {c.title}
                </h3>
                <p style={{ color: "#888", fontSize: "0.9rem", margin: 0, lineHeight: 1.6 }}>
                  {c.body}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Solutions */}
        <section style={{ marginBottom: "4rem" }}>
          <h2
            style={{
              fontSize: "1.5rem",
              fontWeight: 700,
              marginBottom: "1.5rem",
            }}
          >
            How GymFlow Helps
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "1rem",
            }}
          >
            {page.solutionsEn.map((s) => (
              <div
                key={s.title}
                style={{
                  background: "#141414",
                  border: "2px solid #2a2a2a",
                  borderLeft: "4px solid #e63946",
                  padding: "1.5rem",
                }}
              >
                <h3
                  style={{
                    fontSize: "1rem",
                    fontWeight: 600,
                    marginBottom: "0.5rem",
                  }}
                >
                  {s.title}
                </h3>
                <p style={{ color: "#888", fontSize: "0.9rem", margin: 0, lineHeight: 1.6 }}>
                  {s.body}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Key features */}
        <section style={{ marginBottom: "4rem" }}>
          <h2
            style={{
              fontSize: "1.5rem",
              fontWeight: 700,
              marginBottom: "1.5rem",
            }}
          >
            Key Features
          </h2>
          <div
            style={{
              background: "#141414",
              border: "2px solid #2a2a2a",
              padding: "1.5rem",
            }}
          >
            <ul style={{ margin: 0, paddingInlineStart: "1.5rem" }}>
              {page.keyFeaturesEn.map((f) => (
                <li
                  key={f}
                  style={{
                    color: "#ccc",
                    marginBottom: "0.75rem",
                    lineHeight: 1.6,
                  }}
                >
                  {f}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* FAQ */}
        <section style={{ marginBottom: "4rem" }}>
          <h2
            style={{
              fontSize: "1.5rem",
              fontWeight: 700,
              marginBottom: "1.5rem",
            }}
          >
            Frequently Asked Questions
          </h2>
          <div
            style={{
              border: "2px solid #2a2a2a",
              background: "#141414",
            }}
          >
            {page.faqEn.map((f, i) => (
              <div
                key={i}
                style={{
                  padding: "1.25rem 1.5rem",
                  borderBottom:
                    i < page.faqEn.length - 1 ? "2px solid #2a2a2a" : "none",
                }}
              >
                <h3
                  style={{
                    fontSize: "0.95rem",
                    fontWeight: 600,
                    marginBottom: "0.5rem",
                  }}
                >
                  {f.q}
                </h3>
                <p style={{ color: "#888", fontSize: "0.9rem", margin: 0, lineHeight: 1.6 }}>
                  {f.a}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Related solutions */}
        {related.length > 0 && (
          <section style={{ marginBottom: "4rem" }}>
            <h2
              style={{
                fontSize: "1.25rem",
                fontWeight: 600,
                marginBottom: "1rem",
              }}
            >
              Related Solutions
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {related.map((r) =>
                r ? (
                  <a
                    key={r.slug}
                    href={`/solutions/${r.slug}`}
                    style={{
                      display: "block",
                      background: "#141414",
                      border: "2px solid #2a2a2a",
                      padding: "1rem 1.25rem",
                      textDecoration: "none",
                      color: "inherit",
                    }}
                  >
                    <span style={{ fontWeight: 600 }}>{r.titleEn}</span>
                    <p
                      style={{
                        color: "#888",
                        fontSize: "0.85rem",
                        margin: "0.25rem 0 0",
                      }}
                    >
                      {r.descriptionEn}
                    </p>
                  </a>
                ) : null
              )}
            </div>
          </section>
        )}

        {/* CTA */}
        <div
          style={{
            padding: "2rem",
            background: "#141414",
            border: "2px solid #2a2a2a",
            textAlign: "center",
          }}
        >
          <h2
            style={{
              fontSize: "1.5rem",
              fontWeight: 700,
              marginBottom: "0.5rem",
            }}
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
