import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllPosts, getPostBySlug } from "@/lib/blog/registry";
import type { Section, BlogPost } from "@/lib/blog/types";

// Generate static params for all blog posts
export function generateStaticParams() {
  return getAllPosts().map((p) => ({ slug: p.slug }));
}

// Dynamic metadata per post
export function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Metadata {
  const post = getPostBySlug(params.slug);
  if (!post) return {};

  return {
    title: post.title,
    description: post.description,
    alternates: {
      canonical: `https://gymflowsystem.com/blog/${post.slug}`,
    },
    openGraph: {
      title: post.title,
      description: post.description,
      type: "article",
      publishedTime: post.date,
      locale: post.lang === "ar" ? "ar_EG" : "en_US",
      tags: post.tags,
    },
  };
}

// Render a content section
function RenderSection({ section }: { section: Section }) {
  switch (section.type) {
    case "heading":
      return section.level === 2 ? (
        <h2 style={{ fontSize: "1.5rem", fontWeight: 700, marginTop: "2.5rem", marginBottom: "0.75rem" }}>
          {section.text}
        </h2>
      ) : (
        <h3 style={{ fontSize: "1.2rem", fontWeight: 600, marginTop: "2rem", marginBottom: "0.5rem" }}>
          {section.text}
        </h3>
      );

    case "paragraph":
      return (
        <p style={{ color: "#ccc", lineHeight: 1.75, marginBottom: "1rem", fontSize: "1rem" }}>
          {section.text}
        </p>
      );

    case "list":
      const Tag = section.ordered ? "ol" : "ul";
      return (
        <Tag style={{ color: "#ccc", lineHeight: 1.75, marginBottom: "1rem", paddingInlineStart: "1.5rem" }}>
          {section.items.map((item, i) => (
            <li key={i} style={{ marginBottom: "0.5rem" }}>
              {item}
            </li>
          ))}
        </Tag>
      );

    case "table":
      return (
        <div style={{ overflowX: "auto", marginBottom: "1.5rem" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              border: "2px solid #2a2a2a",
              fontSize: "0.9rem",
            }}
          >
            <thead>
              <tr>
                {section.headers.map((h) => (
                  <th
                    key={h}
                    style={{
                      background: "#1e1e1e",
                      padding: "0.75rem 1rem",
                      textAlign: "start",
                      borderBottom: "2px solid #2a2a2a",
                      fontWeight: 600,
                      color: "#f0f0f0",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {section.rows.map((row, ri) => (
                <tr key={ri}>
                  {row.map((cell, ci) => (
                    <td
                      key={ci}
                      style={{
                        padding: "0.65rem 1rem",
                        borderBottom: "1px solid #2a2a2a",
                        color: "#ccc",
                      }}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    case "callout":
      return (
        <div
          style={{
            background: "rgba(230,57,70,0.08)",
            borderLeft: "4px solid #e63946",
            padding: "1rem 1.25rem",
            marginBottom: "1.5rem",
            color: "#f0f0f0",
            fontSize: "0.95rem",
            lineHeight: 1.65,
          }}
        >
          {section.text}
        </div>
      );

    case "cta":
      return (
        <div style={{ marginTop: "1.5rem", marginBottom: "1.5rem" }}>
          <Link
            href={section.href}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.4rem",
              background: "#e63946",
              color: "#fff",
              fontWeight: 700,
              fontSize: "0.95rem",
              padding: "0.75rem 1.5rem",
              border: "2px solid #e63946",
              textDecoration: "none",
              boxShadow: "4px 4px 0 rgba(230,57,70,0.4)",
            }}
          >
            {section.text} →
          </Link>
        </div>
      );

    default:
      return null;
  }
}

// FAQ schema JSON-LD
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

// Article schema
function ArticleSchema({ post }: { post: BlogPost }) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    author: { "@type": "Organization", name: "GymFlow" },
    publisher: {
      "@type": "Organization",
      name: "GymFlow",
      logo: { "@type": "ImageObject", url: "https://gymflowsystem.com/icons/icon-512.png" },
    },
    mainEntityOfPage: `https://gymflowsystem.com/blog/${post.slug}`,
    inLanguage: post.lang === "ar" ? "ar" : "en",
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

export default function BlogPostPage({
  params,
}: {
  params: { slug: string };
}) {
  const post = getPostBySlug(params.slug);
  if (!post) notFound();

  const isAr = post.lang === "ar";
  const relatedPosts = (post.relatedSlugs ?? [])
    .map((s) => getPostBySlug(s))
    .filter(Boolean) as BlogPost[];

  return (
    <main
      dir={isAr ? "rtl" : "ltr"}
      style={{
        minHeight: "100vh",
        background: "#0a0a0a",
        color: "#f0f0f0",
        padding: "4rem 1.5rem",
      }}
    >
      <ArticleSchema post={post} />
      {post.faq && post.faq.length > 0 && <FaqSchema faq={post.faq} />}

      <article style={{ maxWidth: 720, margin: "0 auto" }}>
        {/* Breadcrumb */}
        <div style={{ marginBottom: "2rem", fontSize: "0.875rem" }}>
          <Link href="/" style={{ color: "#888", textDecoration: "none" }}>
            GymFlow
          </Link>
          <span style={{ color: "#444", margin: "0 0.5rem" }}>/</span>
          <Link href="/blog" style={{ color: "#888", textDecoration: "none" }}>
            Blog
          </Link>
          <span style={{ color: "#444", margin: "0 0.5rem" }}>/</span>
          <span style={{ color: "#e63946" }}>{post.category}</span>
        </div>

        {/* Title */}
        <h1
          style={{
            fontSize: "clamp(1.75rem, 4vw, 2.75rem)",
            fontWeight: 700,
            lineHeight: 1.15,
            marginBottom: "1rem",
          }}
        >
          {post.title}
        </h1>

        {/* Meta */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "1rem",
            fontSize: "0.8125rem",
            color: "#888",
            marginBottom: "2.5rem",
            paddingBottom: "1.5rem",
            borderBottom: "2px solid #2a2a2a",
          }}
        >
          <span>{post.date}</span>
          <span>{post.author}</span>
          <span style={{ textTransform: "uppercase", letterSpacing: "0.08em" }}>
            {post.category}
          </span>
        </div>

        {/* Content sections */}
        {post.sections.map((section, i) => (
          <RenderSection key={i} section={section} />
        ))}

        {/* FAQ section */}
        {post.faq && post.faq.length > 0 && (
          <div style={{ marginTop: "3rem" }}>
            <h2
              style={{
                fontSize: "1.5rem",
                fontWeight: 700,
                marginBottom: "1.5rem",
              }}
            >
              {isAr ? "أسئلة شائعة" : "Frequently Asked Questions"}
            </h2>
            <div
              style={{
                border: "2px solid #2a2a2a",
                background: "#141414",
              }}
            >
              {post.faq.map((item, i) => (
                <div
                  key={i}
                  style={{
                    padding: "1.25rem 1.5rem",
                    borderBottom:
                      i < post.faq!.length - 1 ? "2px solid #2a2a2a" : "none",
                  }}
                >
                  <h3
                    style={{
                      fontSize: "0.95rem",
                      fontWeight: 600,
                      marginBottom: "0.5rem",
                    }}
                  >
                    {item.q}
                  </h3>
                  <p style={{ color: "#888", fontSize: "0.9rem", margin: 0, lineHeight: 1.6 }}>
                    {item.a}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Related posts */}
        {relatedPosts.length > 0 && (
          <div style={{ marginTop: "3rem" }}>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "1rem" }}>
              {isAr ? "مقالات ذات صلة" : "Related Articles"}
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {relatedPosts.map((rp) => (
                <Link
                  key={rp.slug}
                  href={`/blog/${rp.slug}`}
                  style={{
                    display: "block",
                    background: "#141414",
                    border: "2px solid #2a2a2a",
                    padding: "1rem 1.25rem",
                    textDecoration: "none",
                    color: "inherit",
                  }}
                >
                  <span style={{ fontWeight: 600 }}>{rp.title}</span>
                  <p style={{ color: "#888", fontSize: "0.85rem", margin: "0.25rem 0 0" }}>
                    {rp.description}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Bottom CTA */}
        <div
          style={{
            marginTop: "4rem",
            padding: "2rem",
            background: "#141414",
            border: "2px solid #2a2a2a",
            textAlign: "center",
          }}
        >
          <h2 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.5rem" }}>
            {isAr ? "جاهز تجرب GymFlow؟" : "Ready to try GymFlow?"}
          </h2>
          <p style={{ color: "#888", marginBottom: "1.5rem", fontSize: "0.95rem" }}>
            {isAr
              ? "ابدأ مجاناً بدون بطاقة ائتمانية. الإعداد في 10 دقائق."
              : "Start free — no credit card required. Setup in 10 minutes."}
          </p>
          <Link
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
            {isAr ? "ابدأ مجاناً" : "Start free"} →
          </Link>
        </div>
      </article>
    </main>
  );
}
