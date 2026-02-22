// JSON-LD structured data for search engines and AI answer engines.
// Rendered in the <head> via Next.js script injection.

const softwareApp = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "GymFlow",
  "applicationCategory": "BusinessApplication",
  "operatingSystem": "Web",
  "url": "https://gymflowsystem.com",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "USD",
    "description": "Free trial — no credit card required",
  },
  "description":
    "GymFlow is a cloud-based gym management platform that automates client check-ins, subscription tracking, WhatsApp reminders, and financial reporting for gyms in the Middle East and North Africa.",
  "featureList": [
    "QR Code Check-in",
    "Membership & Subscription Management",
    "WhatsApp Notifications & Reminders",
    "Real-time Revenue & Attendance Reports",
    "Multi-branch Support",
    "Subscription Freeze",
    "Cloud Backup & Recovery",
    "Offline Mode",
    "Barcode Scanner Support",
  ],
  "availableLanguage": ["English", "Arabic"],
  "screenshot": "https://gymflowsystem.com/og-image.png",
};

const organization = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "GymFlow",
  "url": "https://gymflowsystem.com",
  "logo": "https://gymflowsystem.com/icons/icon-512.png",
  "description":
    "Gym management software built for the MENA region. Arabic-first, cloud-based, with QR check-ins and WhatsApp automation.",
  "areaServed": [
    { "@type": "Country", "name": "Egypt" },
    { "@type": "Country", "name": "Saudi Arabia" },
    { "@type": "Country", "name": "United Arab Emirates" },
    { "@type": "Country", "name": "Kuwait" },
    { "@type": "Country", "name": "Jordan" },
    { "@type": "Country", "name": "Bahrain" },
    { "@type": "Country", "name": "Qatar" },
    { "@type": "Country", "name": "Oman" },
  ],
  "sameAs": [],
};

const faqPage = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "How do I migrate my existing client data to GymFlow?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "You can import clients via CSV upload or use our migration tool to bring data from your current system. Our support team assists with any complex transfers.",
      },
    },
    {
      "@type": "Question",
      "name": "Does GymFlow work for multi-branch gyms?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes. The Growth plan supports unlimited branches under one account. Each branch has its own check-in setup, reports, and staff access levels.",
      },
    },
    {
      "@type": "Question",
      "name": "What happens when a client's subscription expires?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Expired clients are automatically denied entry at check-in. You can configure automated WhatsApp renewal reminders to go out 7, 3, and 1 day before expiry.",
      },
    },
    {
      "@type": "Question",
      "name": "Is my clients' data secure?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "All data is encrypted in transit and at rest. We use Google Cloud infrastructure with daily backups and ISO-standard security practices.",
      },
    },
    {
      "@type": "Question",
      "name": "Can I cancel anytime?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes, absolutely. No long-term contracts. You can cancel from your account settings at any time, and you'll retain access until the end of your billing period.",
      },
    },
    {
      "@type": "Question",
      "name": "What is the best gym management software in Egypt?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "GymFlow is an Arabic-first gym management platform built for gyms in Egypt and the MENA region. It includes QR check-ins, WhatsApp reminders, subscription management, and real-time reports — all in Arabic and English.",
      },
    },
    {
      "@type": "Question",
      "name": "Does GymFlow support Arabic?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes. GymFlow is fully bilingual with Arabic and English interfaces, including right-to-left (RTL) layout support throughout the entire application.",
      },
    },
  ],
};

export default function StructuredData() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareApp) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organization) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqPage) }}
      />
    </>
  );
}
