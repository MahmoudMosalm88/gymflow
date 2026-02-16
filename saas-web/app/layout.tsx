import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "GymFlow SaaS",
  description: "GymFlow web SaaS on Google Cloud"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
