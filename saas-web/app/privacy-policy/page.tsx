import Link from "next/link";

export const metadata = {
  title: "Privacy Policy | GymFlow"
};

export default function PrivacyPolicyPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="mb-6 text-3xl font-bold">Privacy Policy</h1>
      <p className="mb-4 text-sm text-muted-foreground">Last updated: February 19, 2026</p>
      <div className="space-y-5 text-sm leading-7 text-foreground">
        <p>
          GymFlow stores account and membership data to operate the platform, including authentication,
          member records, subscriptions, reports, and system security logs.
        </p>
        <p>
          We process only the data required to provide service features and protect accounts. Data is
          handled over encrypted connections and access is restricted to authorized operators.
        </p>
        <p>
          If you need data export, correction, or deletion support, contact GymFlow support from your
          registered organization email so ownership can be verified.
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
