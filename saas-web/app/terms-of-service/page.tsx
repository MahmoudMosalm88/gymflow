import Link from "next/link";

export const metadata = {
  title: "Terms of Service | GymFlow"
};

export default function TermsOfServicePage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="mb-6 text-3xl font-bold">Terms of Service</h1>
      <p className="mb-4 text-sm text-muted-foreground">Last updated: February 19, 2026</p>
      <div className="space-y-5 text-sm leading-7 text-foreground">
        <p>
          By using GymFlow, you agree to use the platform for lawful gym operations, keep account
          credentials secure, and provide accurate business information.
        </p>
        <p>
          Service availability and features may evolve over time. GymFlow may apply maintenance updates
          to improve reliability, security, and performance.
        </p>
        <p>
          You are responsible for data entered by your organization and for local compliance with
          applicable laws and member communication rules.
        </p>
      </div>
      <div className="mt-8">
        <Link className="text-sm font-medium text-primary hover:underline" href="/">
          Back to home
        </Link>
      </div>
    </main>
  );
}
