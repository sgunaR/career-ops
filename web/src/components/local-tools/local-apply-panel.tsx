"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { CopyLine, LocalSection } from "@/components/local-tools/local-ui";

type Block = {
  id: string;
  n: number;
  title: string;
  hint: string;
  what: ReactNode;
  web?: { href: string; label: string }[];
  webNote?: string;
  chat?: string[];
  cli?: string[];
  note?: ReactNode;
};

const BLOCKS: Block[] = [
  {
    id: "shortlist",
    n: 6,
    title: "Shortlist",
    hint: "Free",
    what: "The inbox is everything the scanners kept. Cut it to about 15 roles that fit (right title, 2–4 years, a location you accept) before spending AI tokens.",
    web: [{ href: "/pipeline", label: "Open Pipeline" }],
    cli: ["node check-liveness.mjs <url>"],
    note: "Naukri often blocks automated checks (Access Denied, or a redirect to a search page). Open the link yourself in a normal browser; don't try to bypass it.",
  },
  {
    id: "evaluate",
    n: 7,
    title: "Evaluate JDs",
    hint: "First AI step",
    what: "Scores each job A–G against your CV and profile, writes a report, and adds a tracker row. Below 4.0 out of 5, don't apply unless you have a specific reason.",
    web: [
      { href: "/pipeline", label: "Score rows in Pipeline" },
      { href: "/", label: "Quick evaluate (Today)" },
    ],
    chat: ["/career-ops pipeline", "Paste a JD or URL, or: /career-ops oferta"],
    cli: ['node find.mjs "Company"', "node merge-tracker.mjs"],
    note: "The report's tailoring and draft-answer blocks are model-written and can contain numbers that are not in your cv.md. Check any figure against cv.md before you use it anywhere.",
  },
  {
    id: "cv",
    n: 8,
    title: "Generate the CV",
    hint: "One CV per role type",
    what: (
      <>
        Two base CVs, picked by the JD title — SAP anywhere in it → <code>cv-sap-btp-cpi.md</code>; Software Engineer / Full Stack
        Engineer / Developer / Backend Engineer / AI Engineer with no SAP mention → <code>cv-full-stack.md</code> (DevOps is folded
        into this one, not a third CV). The LaTeX house style tailors whichever base CV to the JD, then runs the fact gate, the ATS
        check, keyword coverage and the page limit, and writes a <code>.tex</code> and <code>.pdf</code> to <code>output/</code>.
      </>
    ),
    web: [
      { href: "/pipeline", label: "Report → Generate PDF" },
      { href: "/cv", label: "Edit cv.md" },
    ],
    webNote: "Generate PDF compiles the small-caps LaTeX house style (local/cv-template.smallcaps.tex), the same format as chat and node local/make-cv.mjs.",
    chat: [
      "Generate the LaTeX CV for report 38",
      "Generate LaTeX CVs for reports 30, 35 and 38   — bulk: one chat message, each still tailored to its own JD",
    ],
    cli: [
      'node local/make-cv.mjs local/cv-payload-sap.example.json --company acme --jd jds/acme-role.md --keywords "keyword1,keyword2"   # SAP archetype',
      'node local/make-cv.mjs local/cv-payload-fullstack.example.json --company acme --jd jds/acme-role.md --keywords "keyword1,keyword2"   # Full Stack archetype',
    ],
    note: (
      <>
        Keywords that cv.md doesn&rsquo;t back are real gaps: they&rsquo;re listed, never added. To close one honestly, add the true
        fact to cv.md and regenerate.
        <br />
        <strong className="text-foreground">Bulk from the CLI:</strong> there&rsquo;s no single bulk command — tailoring per JD is
        the point of this pipeline. Build one payload per application (start from the example above), then loop:{" "}
        <code>for c in acme other-co; do node local/make-cv.mjs local/cv-payload-sap.example.json --company &quot;$c&quot; --jd
        jds/&quot;$c&quot;.md; done</code>. In chat, bulk is just naming several report numbers in one message, as above.
      </>
    ),
  },
  {
    id: "apply",
    n: 9,
    title: "Apply",
    hint: "You click Submit",
    what: "Drafts the form answers from your CV and profile and stops before Submit. Confirm the posting is still open, the score is 4.0 or more, and the CV is ready, then review every answer.",
    web: [
      { href: "/pipeline", label: "Report → Apply" },
      { href: "/apply", label: "Apply sessions" },
    ],
    chat: ["/career-ops apply"],
  },
  {
    id: "contacts",
    n: 10,
    title: "Contacts at the company",
    hint: "Chat only",
    what: "Finds the hiring manager, recruiter or peers by web search and drafts a short LinkedIn message (within the 200-character free / 300 Premium note limit). Draft only: you send it. Check warm intros first.",
    chat: ["/career-ops contacto"],
    cli: ['node linkedin-join.mjs --company "<Company>"', "node contacts.mjs --summary"],
    note: "There is no web page for this step. linkedin-join reads your own LinkedIn Connections.csv export, offline.",
  },
  {
    id: "cover",
    n: 11,
    title: "Cover letter & email",
    hint: "Drafts only",
    what: "A tailored cover letter written to output/, and a formal application email with subject, body and an attachment checklist. Nothing is ever sent. Your 60-day notice period comes from your profile.",
    web: [{ href: "/pipeline", label: "Report → View cover (once one exists)" }],
    chat: ["/career-ops cover", "/career-ops email"],
  },
  {
    id: "track",
    n: 12,
    title: "Track & follow up",
    hint: "Keep the tracker honest",
    what: "Mark it Applied, then follow up on schedule and log replies and outcomes. Status flows Evaluated → Applied → Responded → Interview → Offer → Hired (or Rejected / Discarded / SKIP).",
    web: [
      { href: "/followups", label: "Follow-ups due" },
      { href: "/analytics", label: "Analytics" },
    ],
    chat: ["/career-ops followup", "/career-ops reply-watch", "/career-ops outcome"],
    cli: ['node set-status.mjs 38 Applied --note "applied via LinkedIn"', "node followup-cadence.mjs"],
    note: "Change a tracker row with set-status (or the status dropdown), never by hand-editing applications.md.",
  },
];

export function LocalApplyPanel() {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-surface/40 p-4 text-xs text-muted">
        <strong className="text-foreground">From here on the steps use AI</strong> (they cost tokens) and involve real applications.
        Nothing is submitted or sent for you. Each step shows where it lives in this app, and what to say in chat or run in a terminal.
      </div>

      {BLOCKS.map((b) => (
        <LocalSection key={b.id} id={b.id} n={b.n} title={b.title} hint={b.hint}>
          <p className="text-xs text-muted">{b.what}</p>

          {b.web && (
            <div className="mt-3">
              <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-faint">In the web app</p>
              <div className="flex flex-wrap gap-2">
                {b.web.map((w) => (
                  <Link
                    key={w.href + w.label}
                    href={w.href}
                    className="inline-flex items-center gap-1 rounded-full border border-border px-3.5 py-1.5 text-sm hover:border-brand/40"
                  >
                    {w.label} <ArrowUpRight className="size-3.5 text-faint" />
                  </Link>
                ))}
              </div>
              {b.webNote && <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">{b.webNote}</p>}
            </div>
          )}

          {b.chat && (
            <div className="mt-3">
              <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-faint">From chat</p>
              <div className="space-y-1.5">
                {b.chat.map((c) => (
                  <CopyLine key={c} text={c} prefix="›" />
                ))}
              </div>
            </div>
          )}

          {b.cli && (
            <div className="mt-3">
              <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-faint">Command line</p>
              <div className="space-y-1.5">
                {b.cli.map((c) => (
                  <CopyLine key={c} text={c} />
                ))}
              </div>
            </div>
          )}

          {b.note && <p className="mt-3 text-xs text-faint">{b.note}</p>}
        </LocalSection>
      ))}
    </div>
  );
}
