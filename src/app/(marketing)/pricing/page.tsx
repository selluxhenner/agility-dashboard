export const metadata = { title: "Pricing" };

export default function PricingPage() {
  return (
    <section style={{ maxWidth: "var(--nh-max)", margin: "0 auto", padding: "72px var(--nh-page-x)" }}>
      <p className="nh-eyebrow">Pricing</p>
      <h1>Per company, not per seat.</h1>
      <p style={{ color: "var(--nh-ink-2)", marginTop: 12 }}>Tiers to follow after the first pilot.</p>
    </section>
  );
}
