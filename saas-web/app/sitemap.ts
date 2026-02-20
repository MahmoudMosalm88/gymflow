import type { MetadataRoute } from "next";

// Static public pages — extend this as blog/feature/location pages are added
const BASE_URL = "https://gymflowsystem.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/ar`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/privacy-policy`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/terms-of-service`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];

  // Feature pages (will be added in task #14)
  const features = [
    "qr-check-in",
    "whatsapp-notifications",
    "subscription-management",
    "attendance-reports",
    "revenue-analytics",
    "subscription-freeze",
    "multi-branch",
    "cloud-backup",
    "member-profiles",
    "offline-mode",
  ];

  const featurePages: MetadataRoute.Sitemap = features.flatMap((slug) => [
    {
      url: `${BASE_URL}/features/${slug}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/ar/features/${slug}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    },
  ]);

  // Location pages (will be added in task #15)
  const cities = [
    "cairo", "alexandria", "giza", "new-cairo", "6th-of-october",
    "mansoura", "tanta", "zagazig", "ismailia", "port-said",
    "nasr-city", "heliopolis", "maadi", "hurghada", "sharm-el-sheikh",
    "riyadh", "jeddah", "dammam", "mecca", "medina", "khobar",
    "dubai", "abu-dhabi", "sharjah",
    "kuwait-city", "doha", "manama", "muscat", "amman",
  ];

  const locationPages: MetadataRoute.Sitemap = cities.flatMap((city) => [
    {
      url: `${BASE_URL}/gym-management-software-${city}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/ar/gym-management-software-${city}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    },
  ]);

  // Comparison pages (will be added in task #16)
  const competitors = [
    "gym-engine", "gymista", "egypt-gym-manager", "tamarran",
    "logit-me", "perfect-gym", "fekrait", "mindbody", "glofox", "zenoti",
  ];

  const comparePages: MetadataRoute.Sitemap = competitors.flatMap((comp) => [
    {
      url: `${BASE_URL}/compare/gymflow-vs-${comp}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/ar/compare/gymflow-vs-${comp}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    },
  ]);

  // Use-case pages (will be added in task #17)
  const useCases = [
    "womens-gym", "crossfit", "multi-branch", "martial-arts",
    "personal-training", "budget-gym", "swimming-pool", "corporate-gym",
    "new-gym", "yoga-pilates",
  ];

  const useCasePages: MetadataRoute.Sitemap = useCases.flatMap((uc) => [
    {
      url: `${BASE_URL}/solutions/${uc}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/ar/solutions/${uc}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    },
  ]);

  return [
    ...staticPages,
    ...featurePages,
    ...locationPages,
    ...comparePages,
    ...useCasePages,
  ];
}
