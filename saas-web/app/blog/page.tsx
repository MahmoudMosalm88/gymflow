import { Metadata } from "next";
import Link from "next/link";
import { getAllPosts } from "@/lib/blog/registry";

export const metadata: Metadata = {
  title: "Blog — Gym Management Tips & Insights",
  description:
    "Expert guides on gym management, membership retention, check-in systems, and revenue optimization. In Arabic and English.",
  alternates: {
    canonical: "https://gymflowsystem.com/blog",
  },
};

export default function BlogListingPage() {
  const posts = getAllPosts();
  const enPosts = posts.filter((p) => p.lang === "en");
  const arPosts = posts.filter((p) => p.lang === "ar");

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
        {/* Header */}
        <div style={{ marginBottom: "3rem" }}>
          <Link
            href="/"
            style={{
              color: "#888",
              textDecoration: "none",
              fontSize: "0.875rem",
            }}
          >
            &larr; GymFlow
          </Link>
          <h1
            style={{
              fontSize: "clamp(2rem, 4vw, 3rem)",
              fontWeight: 700,
              marginTop: "1rem",
              lineHeight: 1.1,
            }}
          >
            Blog
          </h1>
          <p style={{ color: "#888", marginTop: "0.5rem", fontSize: "1.0625rem" }}>
            Expert guides on gym management, membership retention, and growing
            your fitness business.
          </p>
        </div>

        {/* English posts */}
        {enPosts.length > 0 && (
          <section style={{ marginBottom: "3rem" }}>
            <h2
              style={{
                fontSize: "0.75rem",
                fontWeight: 600,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "#e63946",
                marginBottom: "1.5rem",
              }}
            >
              English
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {enPosts.map((post) => (
                <Link
                  key={post.slug}
                  href={`/blog/${post.slug}`}
                  style={{
                    display: "block",
                    background: "#141414",
                    border: "2px solid #2a2a2a",
                    padding: "1.5rem",
                    textDecoration: "none",
                    color: "inherit",
                    transition: "border-color 0.15s, box-shadow 0.15s, transform 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "#e63946";
                    e.currentTarget.style.boxShadow = "4px 4px 0 #e63946";
                    e.currentTarget.style.transform = "translate(-2px,-2px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "#2a2a2a";
                    e.currentTarget.style.boxShadow = "none";
                    e.currentTarget.style.transform = "none";
                  }}
                >
                  <span
                    style={{
                      fontSize: "0.72rem",
                      fontWeight: 600,
                      textTransform: "uppercase",
                      color: "#888",
                      letterSpacing: "0.08em",
                    }}
                  >
                    {post.category} · {post.date}
                  </span>
                  <h3
                    style={{
                      fontSize: "1.25rem",
                      fontWeight: 600,
                      margin: "0.5rem 0 0.25rem",
                    }}
                  >
                    {post.title}
                  </h3>
                  <p style={{ color: "#888", fontSize: "0.9rem", margin: 0 }}>
                    {post.description}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Arabic posts */}
        {arPosts.length > 0 && (
          <section dir="rtl" style={{ marginBottom: "3rem" }}>
            <h2
              style={{
                fontSize: "0.75rem",
                fontWeight: 600,
                letterSpacing: "0.1em",
                color: "#e63946",
                marginBottom: "1.5rem",
              }}
            >
              عربي
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {arPosts.map((post) => (
                <Link
                  key={post.slug}
                  href={`/blog/${post.slug}`}
                  style={{
                    display: "block",
                    background: "#141414",
                    border: "2px solid #2a2a2a",
                    padding: "1.5rem",
                    textDecoration: "none",
                    color: "inherit",
                    transition: "border-color 0.15s, box-shadow 0.15s, transform 0.15s",
                  }}
                >
                  <span
                    style={{
                      fontSize: "0.72rem",
                      fontWeight: 600,
                      color: "#888",
                      letterSpacing: "0.08em",
                    }}
                  >
                    {post.category} · {post.date}
                  </span>
                  <h3
                    style={{
                      fontSize: "1.25rem",
                      fontWeight: 600,
                      margin: "0.5rem 0 0.25rem",
                    }}
                  >
                    {post.title}
                  </h3>
                  <p style={{ color: "#888", fontSize: "0.9rem", margin: 0 }}>
                    {post.description}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
