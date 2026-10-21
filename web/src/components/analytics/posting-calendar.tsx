import Link from "next/link";

type Row = { label: string; count: number; pct: number };

type Report = {
  coverage: { rows: number; freshPosted: number; stalePosted: number; missingPosted: number; history: string };
  boards: Row[];
  roles: Row[];
  months: Row[];
  weeks: Row[];
  outlook: {
    currentMonth: string;
    currentCount: number;
    currentProjected: number;
    priorCompleteMonth: string | null;
    priorCompleteCount: number;
    monthDirection: string;
    weekDirection: string;
    nextMonth: string;
    nextMonthExpected: number;
    threeMonthAverage: number;
    nextFourWeeksEach: number;
    note: string;
  };
  filters: { board: string; role: string };
  boardOptions: string[];
  roleOptions: string[];
};

function href(board: string, role: string) {
  const params = new URLSearchParams({ view: "calendar" });
  if (board && board !== "all") params.set("board", board);
  if (role && role !== "all") params.set("role", role);
  return `/analytics?${params.toString()}`;
}

function Bars({ rows }: { rows: Row[] }) {
  const max = Math.max(1, ...rows.map((row) => row.count));
  if (!rows.length) return <p className="mt-4 text-sm text-muted">No fresh employer dates for this filter.</p>;
  return (
    <div className="mt-4 space-y-2">
      {rows.map((row) => (
        <div key={row.label} className="grid grid-cols-[minmax(88px,0.4fr)_minmax(80px,1fr)_auto] items-center gap-3">
          <span className="truncate text-xs text-muted" title={row.label}>{row.label}</span>
          <div className="h-2 overflow-hidden rounded-full bg-surface-hover" role="img" aria-label={`${row.label}: ${row.count}`}>
            <div className="h-full rounded-full bg-brand" style={{ width: `${(row.count / max) * 100}%` }} />
          </div>
          <span className="min-w-14 text-right font-mono text-xs tabular-nums text-foreground">{row.count}</span>
        </div>
      ))}
    </div>
  );
}

export function PostingCalendar({ report }: { report: Report }) {
  const { outlook, filters } = report;
  return (
    <div className="mt-6 space-y-4">
      <section className="rounded-2xl border border-border bg-surface/55 p-4 sm:p-5">
        <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.17em] text-brand">When to apply</p>
        <h2 className="mt-2 font-display text-xl tracking-tight text-landing">Posting calendar</h2>
        <p className="mt-1 max-w-3xl text-xs leading-5 text-muted">{report.coverage.history} {outlook.note}</p>
        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <FilterLinks label="Board" current={filters.board} options={["all", ...report.boardOptions]} other={filters.role} kind="board" />
        </div>
        <div className="mt-2 flex flex-wrap gap-2 text-xs">
          <FilterLinks label="Role" current={filters.role} options={["all", ...report.roleOptions]} other={filters.board} kind="role" />
        </div>
        <dl className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Stat label={`${outlook.currentMonth} so far`} value={String(outlook.currentCount)} />
          <Stat label={`${outlook.currentMonth} if this pace holds`} value={String(outlook.currentProjected)} detail={outlook.monthDirection} />
          <Stat label="Last 4 weeks vs the 4 before" value={outlook.weekDirection} />
          <Stat label={`${outlook.nextMonth} if recent weeks hold`} value={String(outlook.nextMonthExpected)} detail={`about ${outlook.nextFourWeeksEach} a week · 3-month average ${outlook.threeMonthAverage}`} />
        </dl>
        <p className="mt-3 text-xs text-faint">{report.coverage.freshPosted} fresh dates · {report.coverage.stalePosted} old ads left out · {report.coverage.missingPosted} rows with no employer date</p>
      </section>
      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title="By month" rows={report.months} />
        <Panel title="By week" rows={report.weeks.slice(-16)} />
        <Panel title="By job board" rows={report.boards} />
        <Panel title="By role" rows={report.roles} />
      </div>
    </div>
  );
}

function FilterLinks({ label, current, options, other, kind }: { label: string; current: string; options: string[]; other: string; kind: "board" | "role" }) {
  return (
    <>
      <span className="self-center font-mono text-[10px] uppercase tracking-[0.14em] text-faint">{label}</span>
      {options.map((option) => {
        const active = option === current;
        const board = kind === "board" ? option : other;
        const role = kind === "role" ? option : other;
        return (
          <Link key={option} href={href(board, role)} aria-current={active ? "page" : undefined} className={`rounded-full border px-2.5 py-1 ${active ? "border-brand text-foreground" : "border-border text-muted"}`}>
            {option}
          </Link>
        );
      })}
    </>
  );
}

function Stat({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface/45 p-4">
      <dt className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-muted">{label}</dt>
      <dd className="mt-2 font-display text-3xl tracking-tight text-landing tabular-nums">{value}</dd>
      {detail ? <p className="mt-1 text-xs text-faint">{detail}</p> : null}
    </div>
  );
}

function Panel({ title, rows }: { title: string; rows: Row[] }) {
  return (
    <section className="rounded-2xl border border-border bg-surface/55 p-4 sm:p-5">
      <h2 className="font-display text-xl tracking-tight text-landing">{title}</h2>
      <Bars rows={rows} />
    </section>
  );
}
