import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "GymFlow | برنامج إدارة الجيم في مصر والشرق الأوسط",
  description:
    "إدارة الاشتراكات، تسجيل الحضور بالـ QR، تذكيرات واتساب تلقائية، تقارير فورية. مصمم لصالات الجيم في مصر والسعودية والخليج. عربي + إنجليزي.",
  openGraph: {
    title: "GymFlow | برنامج إدارة الجيم في مصر والشرق الأوسط",
    description:
      "أدِر جيمك بدون وجع راس. تسجيل دخول QR، إشعارات واتساب، إدارة اشتراكات، تقارير فورية. تجربة مجانية بدون بطاقة ائتمانية.",
    locale: "ar_EG",
    alternateLocale: "en_US",
  },
  alternates: {
    canonical: "https://gymflowsystem.com/ar",
    languages: {
      en: "https://gymflowsystem.com",
      ar: "https://gymflowsystem.com/ar",
    },
  },
};

export default function ArabicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div lang="ar" dir="rtl">{children}</div>;
}
