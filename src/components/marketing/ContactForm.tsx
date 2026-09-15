"use client";
// Pilot request form. There is no backend yet, so submitting opens a pre-filled draft in the
// visitor's own mail program (mailto:). Nothing typed here is sent to or stored by this site -
// the privacy policy says exactly that, keep both in sync.
import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import styles from "./ContactForm.module.css";

type Props = { to: string };

export function ContactForm({ to }: Props) {
  const [opened, setOpened] = useState(false);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const v = (k: string) => String(f.get(k) ?? "").trim();
    const subject = `Pilot request - ${v("company") || v("name")}`;
    const body = [
      `Name: ${v("name")}`,
      `Company: ${v("company")}`,
      `Work e-mail: ${v("email")}`,
      `Works council: ${v("council")}`,
      "",
      "The decision that keeps waiting:",
      v("decision"),
      "",
      v("message"),
    ].join("\n");
    window.location.href = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    setOpened(true);
  }

  return (
    <form className={styles.form} onSubmit={onSubmit}>
      <div className={styles.two}>
        <Field id="name" label="Your name">
          <input className="nh-input" id="name" name="name" type="text" autoComplete="name" required />
        </Field>
        <Field id="company" label="Company">
          <input className="nh-input" id="company" name="company" type="text" autoComplete="organization" required />
        </Field>
      </div>
      <Field id="email" label="Work e-mail" hint="So we can reply. Not used for anything else.">
        <input className="nh-input" id="email" name="email" type="email" autoComplete="email" placeholder="you@company.com" required />
      </Field>
      <Field id="decision" label="The decision that keeps waiting" hint="One recurring decision type. Approving a tool, signing off a clause, answering a data request.">
        <input className="nh-input" id="decision" name="decision" type="text" placeholder="e.g. approving a tool under €5k" required />
      </Field>
      <Field id="council" label="Do you have a works council?" hint="Changes nothing about the pilot - only about who we talk to first.">
        <select className="nh-input nh-select" id="council" name="council" defaultValue="not sure">
          <option value="no">No</option>
          <option value="yes">Yes</option>
          <option value="not sure">Not sure</option>
        </select>
      </Field>
      <Field id="message" label="Anything else">
        <textarea className="nh-input nh-textarea" id="message" name="message" rows={4} />
      </Field>

      <Button type="submit" variant="accent" block>Open the request in my mail program</Button>

      <p className={styles.privacy} aria-live="polite">
        {opened ? (
          <>A draft should have opened in your mail program. If it did not, write to <a href={`mailto:${to}`}>{to}</a> directly.</>
        ) : (
          <>This opens a pre-filled e-mail in your own mail program. Nothing you type here is stored on this site. <Link href="/privacy">Privacy policy</Link>.</>
        )}
      </p>
    </form>
  );
}
