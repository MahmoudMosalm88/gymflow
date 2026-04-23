import { Metadata } from "next";

import { solutions } from "@/lib/solutions-data";

export const metadata: Metadata = {
  title: "Solutions — Gym Management for Every Type of Gym",
  description:
    "Whether you run a women's gym, CrossFit box, or multi-branch chain — GymFlow has a solution tailored to your needs.",
  alternates: { canonical: "https://gymflowsystem.com/solutions" },
};

export default function SolutionsIndexPage() {
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
        <a
          href="/"
          style={{ color: "#888", textDecoration: "none", fontSize: "0.875rem" }}
        >
          &larr; GymFlow
        </a>
        <h1
          style={{
            fontSize: "clamp(2rem, 4vw, 3rem)",
            fontWeight: 700,
            marginTop: "1rem",
            marginBottom: "0.5rem",
          }}
        >
          Solutions
        </h1>
        <p style={{ color: "#888", fontSize: "1.0625rem", marginBottom: "3rem" }}>
          GymFlow adapts to your gym type. Choose your use case below.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: "1rem",
          }}
        >
          {solutions.map((s) => (
            <a
              key={s.slug}
              href={`/solutions/${s.slug}`}
              style={{
                display: "block",
                background: "#141414",
                border: "2px solid #2a2a2a",
                padding: "1.5rem",
                textDecoration: "none",
                color: "inherit",
                transition:
                  "border-color 0.15s, box-shadow 0.15s, transform 0.15s",
              }}
            >
              <h2
                style={{
                  fontSize: "1.125rem",
                  fontWeight: 600,
                  marginBottom: "0.5rem",
                }}
              >
                {s.titleEn}
              </h2>
              <p
                style={{
                  color: "#888",
                  fontSize: "0.9rem",
                  margin: 0,
                  lineHeight: 1.6,
                }}
              >
                {s.descriptionEn}
              </p>
            </a>
          ))}
        </div>
      </div>
    </main>
  );
}
