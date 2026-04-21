import type { MetadataRoute } from "next";
import { getAllPosts } from "@/lib/blog/registry";
import { comparisons } from "@/lib/comparisons-data";
import { solutions } from "@/lib/solutions-data";
import { locationPageMap } from "@/lib/locations-data";
import type { LocationPage } from "@/lib/locations-data";

const BASE_URL = "https://gymflowsystem.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const allPosts = getAllPosts();

  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: now, changeFrequency: "weekly", priority: 1.0 },
    { url: `${BASE_URL}/ar`, lastModified: now, changeFrequency: "weekly", priority: 1.0 },
    { url: `${BASE_URL}/legal`, lastModified: now, changeFrequency: "yearly", priority: 0.4 },
    { url: `${BASE_URL}/privacy-policy`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE_URL}/terms-of-service`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE_URL}/billing-and-refunds`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE_URL}/cookie-notice`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
    { url: `${BASE_URL}/security-and-data-handling`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE_URL}/contact-and-data-requests`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE_URL}/contact`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE_URL}/features`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${BASE_URL}/solutions`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${BASE_URL}/compare`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${BASE_URL}/blog`, lastModified: now, changeFrequency: "weekly", priority: 0.6 },
  ];

  const featurePages: MetadataRoute.Sitemap = [
    "qr-check-in",
    "whatsapp-notifications",
    "subscription-management",
  ].map((slug) => ({
    url: `${BASE_URL}/features/${slug}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  const cityPages: MetadataRoute.Sitemap = (Object.values(locationPageMap) as LocationPage[]).map((loc) => ({
    url: `${BASE_URL}/gym-management-software-${loc.slug}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  const comparePages: MetadataRoute.Sitemap = comparisons.map((c) => ({
    url: `${BASE_URL}/compare/gymflow-vs-${c.slug}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  const solutionsPages: MetadataRoute.Sitemap = solutions.map((s) => ({
    url: `${BASE_URL}/solutions/${s.slug}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  const blogPages: MetadataRoute.Sitemap = allPosts.map((post) => ({
    url: `${BASE_URL}/blog/${post.slug}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));

  return [
    ...staticPages,
    ...featurePages,
    ...cityPages,
    ...comparePages,
    ...solutionsPages,
    ...blogPages,
  ];
}
