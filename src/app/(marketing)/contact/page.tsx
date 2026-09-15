export const metadata = { title: "Contact" };

export default function ContactPage() {
  return (
    <section style={{ maxWidth: "var(--nh-max)", margin: "0 auto", padding: "72px var(--nh-page-x)" }}>
      <p className="nh-eyebrow">Book a pilot</p>
      <h1>Let&rsquo;s talk.</h1>
      <p style={{ color: "var(--nh-ink-2)", marginTop: 12 }}>Contact form to follow. Until then: hello@nexthub.example</p>
    </section>
  );
}
