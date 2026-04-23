import type { BlogPost } from "./types";

import bestGymSoftwareEgypt from "./posts/best-gym-software-egypt-2026";
import qrCheckInGuide from "./posts/qr-check-in-for-gyms";
import dalilIdaratAlGym from "./posts/dalil-idarat-al-gym";
import kayifTakhtarBarnamij from "./posts/kayif-takhtar-barnamij-idarat-gym";
import gymMemberRetentionEgypt2026 from "./posts/gym-member-retention-egypt-2026";
import arMemberManagementGuide from "./posts/إدارة-العضويات-في-الجيم";
import qrCodeCheckinGymGuide from "./posts/qr-code-checkin-gym-guide";
import whyEgyptianGymsSwitchingDigital2026 from "./posts/why-egyptian-gyms-switching-digital-2026";
import saudiGymMarket2026 from "./posts/saudi-gym-market-2026-opportunities";
import gymMembershipRetentionMistakes from "./posts/gym-membership-retention-mistakes";
import gymManagementRiyadh from "./posts/gym-management-software-riyadh-guide";
import gymManagementDubaiAr from "./posts/gym-management-software-dubai-guide-ar";
import gymManagementDubai from "./posts/gym-management-software-dubai-guide";
import gymManagementCairoAr from "./posts/gym-management-software-cairo-guide-ar";
import gymManagementCairo from "./posts/gym-management-software-cairo-guide";

const ALL_POSTS: BlogPost[] = [
  bestGymSoftwareEgypt,
  qrCheckInGuide,
  dalilIdaratAlGym,
  kayifTakhtarBarnamij,
  gymMemberRetentionEgypt2026,
  arMemberManagementGuide,
  qrCodeCheckinGymGuide,
  whyEgyptianGymsSwitchingDigital2026,
  saudiGymMarket2026,
  gymManagementCairo,
  gymManagementCairoAr,
  gymManagementDubai,
  gymManagementDubaiAr,
  gymManagementRiyadh,
  gymMembershipRetentionMistakes,
];

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

export const blogPosts = ALL_POSTS;
