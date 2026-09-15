import Link from "next/link";

// Also what an unknown company slug lands on (the [company] layout calls notFound()).
export default function NotFound() {
  return (
    <main style={{ padding: 48, display: "grid", gap: 12 }}>
      <p className="nh-eyebrow">404</p>
      <h1>Nothing here</h1>
      <p style={{ color: "var(--nh-ink-2)" }}>
        That page does not exist, or the company in the link is unknown.
      </p>
      <p><Link href="/">Back to the start</Link> · <Link href="/login">Find your company</Link></p>
    </main>
  );
}
