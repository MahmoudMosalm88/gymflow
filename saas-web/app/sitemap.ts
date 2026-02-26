import type { MetadataRoute } from "next";

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

  // Only include slugs that have actual data/pages built
  const features = [
    "qr-check-in",
    "whatsapp-notifications",
    "subscription-management",
  ];

  const featurePages: MetadataRoute.Sitemap = features.map((slug) => ({
    url: `${BASE_URL}/features/${slug}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  const cities = [
    "cairo", "alexandria", "riyadh", "jeddah", "dubai",
  ];

  const locationPages: MetadataRoute.Sitemap = cities.map((city) => ({
    url: `${BASE_URL}/gym-management-software-${city}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  const competitors = ["gym-engine", "gymista", "tamarran"];

  const comparePages: MetadataRoute.Sitemap = competitors.map((comp) => ({
    url: `${BASE_URL}/compare/gymflow-vs-${comp}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  const useCases = ["womens-gym", "crossfit", "multi-branch"];

  const useCasePages: MetadataRoute.Sitemap = useCases.map((uc) => ({
    url: `${BASE_URL}/solutions/${uc}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  return [
    ...staticPages,
    ...featurePages,
    ...locationPages,
    ...comparePages,
    ...useCasePages,
  ];
}
