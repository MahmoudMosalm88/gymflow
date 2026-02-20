import type { BlogPost } from "./types";

// Import all posts manually. Add new imports as posts are created.
// This is the single source of truth for the blog.

import bestGymSoftwareEgypt from "./posts/best-gym-software-egypt-2026";
import qrCheckInGuide from "./posts/qr-check-in-for-gyms";
import dalilIdaratAlGym from "./posts/dalil-idarat-al-gym";
import kayifTakhtarBarnamij from "./posts/kayif-takhtar-barnamij-idarat-gym";

const ALL_POSTS: BlogPost[] = [
  bestGymSoftwareEgypt,
  qrCheckInGuide,
  dalilIdaratAlGym,
  kayifTakhtarBarnamij,
];

// Sort by date descending
ALL_POSTS.sort(
  (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
);

export function getAllPosts(): BlogPost[] {
  return ALL_POSTS;
}

export function getPostBySlug(slug: string): BlogPost | null {
  return ALL_POSTS.find((p) => p.slug === slug) ?? null;
}

export function getPostsByLang(lang: "en" | "ar"): BlogPost[] {
  return ALL_POSTS.filter((p) => p.lang === lang);
}

export function getPostsByCategory(
  category: BlogPost["category"]
): BlogPost[] {
  return ALL_POSTS.filter((p) => p.category === category);
}
