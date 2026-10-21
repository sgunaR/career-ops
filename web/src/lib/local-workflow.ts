/**
 * The job-search flow shown under /local, in order. Mirrors docs/portal-expansion-plan.md
 * (same step numbers, same names) so the guide, the tabs and the pager cannot drift.
 * Safe for client components (no node:).
 */

export type PhaseId = "ready" | "find" | "run" | "apply" | "keep";

export type WorkflowStep = {
  n: number;
  title: string;
  blurb: string;
  href: string;
  phase: PhaseId;
  cli?: string;
  /** A second, alternative CLI command — e.g. "one board" vs "every board at once". */
  cliAlt?: { label: string; command: string };
  chat?: string;
};

export const PHASES: { id: PhaseId; title: string; hint: string }[] = [
  { id: "ready", title: "Get ready", hint: "Once per machine" },
  { id: "find", title: "Find jobs", hint: "Free — no AI tokens" },
  { id: "run", title: "Run it", hint: "Daily habit" },
  { id: "apply", title: "Choose & apply", hint: "AI steps — you stay in control" },
  { id: "keep", title: "Keep it healthy", hint: "Now and then" },
];

export const STEPS: WorkflowStep[] = [
  {
    n: 1,
    title: "Initial setup",
    blurb: "Install tools, set up the India scanner, log in to the boards, check everything is healthy.",
    href: "/local/setup",
    phase: "ready",
    cli: "node doctor.mjs --json",
  },
  {
    n: 2,
    title: "Discover outside India",
    blurb: "Startups (YC, a16z, funded), remote job boards worldwide, and single company career pages.",
    href: "/local/outside-india",
    phase: "find",
    cli: "npm run scan",
  },
  {
    n: 3,
    title: "Discover in India",
    blurb: "Naukri, LinkedIn, Peerlist, Cutshort, Hirist, Instahyre and more — one or two boards a day, or all nine at once for a periodic sweep.",
    href: "/local/india",
    phase: "find",
    cli: "node local/india-scan/run.mjs --board naukri --max-pages 1",
    cliAlt: { label: "All 9 boards at once (weekly sweep, not a daily habit)", command: "node local/india-scan/run.mjs --all --max-pages 1" },
  },
  {
    n: 4,
    title: "Run from the command line",
    blurb: "The daily wave in priority order — copy-paste it, or run each part with a button.",
    href: "/local/run#cli",
    phase: "run",
    cli: "node local/india-scan/run.mjs --board naukri --max-pages 1",
    cliAlt: { label: "All 9 India boards at once", command: "node local/india-scan/run.mjs --all --max-pages 1" },
  },
  {
    n: 5,
    title: "Run from chat",
    blurb: "The same flow driven by Claude Code, Cursor or the Assistant — prompts for every step.",
    href: "/local/run#chat",
    phase: "run",
    chat: "/career-ops pipeline",
  },
  {
    n: 6,
    title: "Shortlist",
    blurb: "Cut the inbox to about 15 roles worth spending AI tokens on.",
    href: "/local/apply#shortlist",
    phase: "apply",
  },
  {
    n: 7,
    title: "Evaluate JDs",
    blurb: "Score each shortlisted job against your CV. Below 4.0 out of 5, don't apply.",
    href: "/local/apply#evaluate",
    phase: "apply",
    chat: "/career-ops pipeline",
  },
  {
    n: 8,
    title: "Generate the CV",
    blurb: "Two base CVs, picked by the JD title (SAP anywhere in it → SAP CV, otherwise → Full Stack). Ask in chat for one or several at once; the CLI lines are real, working examples for each archetype.",
    href: "/local/apply#cv",
    phase: "apply",
    cli: "node local/make-cv.mjs local/cv-payload-sap.example.json --company acme --jd jds/acme-role.md --keywords \"keyword1,keyword2\"",
    cliAlt: { label: "Full Stack archetype (no SAP mention in the JD title)", command: "node local/make-cv.mjs local/cv-payload-fullstack.example.json --company acme --jd jds/acme-role.md --keywords \"keyword1,keyword2\"" },
    chat: "Generate LaTeX CVs for reports 30, 35 and 38",
  },
  {
    n: 9,
    title: "Apply",
    blurb: "Draft the form answers. It stops before Submit — you click it.",
    href: "/local/apply#apply",
    phase: "apply",
    chat: "/career-ops apply",
  },
  {
    n: 10,
    title: "Contacts at the company",
    blurb: "Find the hiring manager, recruiter or peers and draft a short LinkedIn message.",
    href: "/local/apply#contacts",
    phase: "apply",
    cli: "node linkedin-join.mjs --company \"<Company>\"",
    chat: "/career-ops contacto",
  },
  {
    n: 11,
    title: "Cover letter & email",
    blurb: "A tailored cover letter and a formal application email. Drafts only — nothing is sent.",
    href: "/local/apply#cover",
    phase: "apply",
    chat: "/career-ops cover",
  },
  {
    n: 12,
    title: "Track & follow up",
    blurb: "Mark it Applied, then follow up on schedule and log replies and outcomes.",
    href: "/local/apply#track",
    phase: "apply",
    cli: "node set-status.mjs 38 Applied",
    chat: "/career-ops followup",
  },
  {
    n: 13,
    title: "Maintenance",
    blurb: "Health checks, clean-slate resets, updates. Destructive actions ask first.",
    href: "/local/setup#maintenance",
    phase: "keep",
    cli: "node verify-portals.mjs",
  },
];

/** Sub-navigation tabs, in reading order. `steps` is the range of guide steps the page covers. */
export const LOCAL_TABS = [
  { href: "/local", label: "Guide", steps: "", exact: true },
  { href: "/local/setup", label: "Setup", steps: "1" },
  { href: "/local/outside-india", label: "Outside India", steps: "2" },
  { href: "/local/india", label: "India", steps: "3" },
  { href: "/local/run", label: "Run", steps: "4–5" },
  { href: "/local/apply", label: "Apply", steps: "6–12" },
  { href: "/local/companies", label: "Companies", steps: "", optional: true },
] as const;

/** Tabs that form the linear path (previous / next). Companies is an optional side page. */
export const LOCAL_PATH = LOCAL_TABS.filter((t) => !("optional" in t && t.optional));
