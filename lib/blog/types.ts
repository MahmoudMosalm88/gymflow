export type BlogPost = {
  slug: string;
  lang: "en" | "ar";
  title: string;
  description: string;
  date: string; // ISO date
  author: string;
  category: "guide" | "comparison" | "feature" | "industry";
  tags: string[];
  // Content as structured sections for clean rendering
  sections: Section[];
  // FAQ items for FAQPage schema
  faq?: { q: string; a: string }[];
  // Related post slugs for internal linking
  relatedSlugs?: string[];
};

export type Section =
  | { type: "paragraph"; text: string }
  | { type: "heading"; level: 2 | 3; text: string }
  | { type: "list"; ordered: boolean; items: string[] }
  | { type: "table"; headers: string[]; rows: string[][] }
  | { type: "callout"; text: string }
  | { type: "cta"; text: string; href: string };
