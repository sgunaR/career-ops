// Zero-token posting calendar. Counts rows already in data/scan-history.tsv.
// Employer posted_at is used only when it is close to the day the scanner
// first saw the row. Older dates are leftover ads, not that month's market.

const FRESH_DAYS = 45;

export function roleFamily(title) {
  const value = String(title || "").toLowerCase();
  if (/\bsap\b/.test(value) && /\b(btp|cpi|integration suite|integration)\b/.test(value)) return "SAP BTP & CPI";
  if (/\bsap\b/.test(value)) return "SAP";
  if (/full[\s-]?stack/.test(value)) return "Full Stack";
  if (/\b(ai|ml|llm|genai|agentic)\b/.test(value)) return "AI";
  if (/back[\s-]?end/.test(value)) return "Backend";
  if (/\b(devops|sre|platform)\b/.test(value)) return "DevOps";
  if (/\b(software|developer|engineer)\b/.test(value)) return "Software Engineer";
  return "Other";
}

export function parseScanHistory(text) {
  const lines = String(text || "").split(/\r?\n/).filter(Boolean);
  if (!lines.length) return [];
  const header = lines[0].split("\t");
  const index = Object.fromEntries(header.map((name, i) => [name, i]));
  const rows = [];
  for (const line of lines.slice(1)) {
    const cells = line.split("\t");
    const url = cell(cells, index, "url");
    if (!url) continue;
    rows.push({
      url,
      firstSeen: isoDate(cell(cells, index, "first_seen")),
      portal: cell(cells, index, "portal") || "unknown",
      title: cell(cells, index, "title"),
      company: cell(cells, index, "company"),
      postedAt: isoDate(cell(cells, index, "posted_at")),
    });
  }
  return rows;
}

function cell(cells, index, name) {
  const at = index[name];
  return at === undefined ? "" : String(cells[at] || "").trim();
}

function isoDate(value) {
  return /^\d{4}-\d{2}-\d{2}/.test(value) ? value.slice(0, 10) : "";
}

function dayNumber(iso) {
  const [year, month, day] = iso.split("-").map(Number);
  return Date.UTC(year, month - 1, day) / 86400000;
}

function monthKey(iso) {
  return iso.slice(0, 7);
}

function weekKey(iso) {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const weekday = date.getUTCDay() || 7;
  const thursday = new Date(date);
  thursday.setUTCDate(date.getUTCDate() + 4 - weekday);
  const yearStart = new Date(Date.UTC(thursday.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((thursday - yearStart) / 86400000 + 1) / 7);
  return `${thursday.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

function daysInMonth(month) {
  const [year, mon] = month.split("-").map(Number);
  return new Date(Date.UTC(year, mon, 0)).getUTCDate();
}

function addDays(iso, days) {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return date.toISOString().slice(0, 10);
}

function direction(recent, prior) {
  if (!prior) return "not-enough-history";
  const change = (recent - prior) / prior;
  if (change <= -0.15) return "falling";
  if (change >= 0.15) return "rising";
  return "flat";
}

function mean(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function tally(rows, keyFn) {
  const counts = new Map();
  for (const row of rows) {
    const key = keyFn(row);
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  const total = rows.length || 1;
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count, pct: (count / total) * 100 }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

/**
 * @param {ReturnType<typeof parseScanHistory>} rows
 * @param {{ board?: string, role?: string, now?: string, freshDays?: number }} [options]
 */
export function analyzePostings(rows, options = {}) {
  const freshDays = options.freshDays ?? FRESH_DAYS;
  const now = isoDate(options.now) || new Date().toISOString().slice(0, 10);
  const seen = new Set();
  const unique = [];
  for (const row of rows) {
    if (seen.has(row.url)) continue;
    seen.add(row.url);
    unique.push(row);
  }

  const board = options.board && options.board !== "all" ? options.board : "";
  const role = options.role && options.role !== "all" ? options.role : "";
  const filtered = unique.filter((row) => {
    if (board && row.portal !== board) return false;
    if (role && roleFamily(row.title) !== role) return false;
    return true;
  });

  const fresh = [];
  let stalePosted = 0;
  let missingPosted = 0;
  for (const row of filtered) {
    if (!row.postedAt) {
      missingPosted += 1;
      continue;
    }
    if (!row.firstSeen) continue;
    const age = dayNumber(row.firstSeen) - dayNumber(row.postedAt);
    if (age < 0 || age > freshDays) {
      stalePosted += 1;
      continue;
    }
    fresh.push({ ...row, date: row.postedAt });
  }

  const observed = filtered.filter((row) => row.firstSeen).map((row) => ({ ...row, date: row.firstSeen }));
  const months = tally(fresh, (row) => monthKey(row.date)).sort((a, b) => a.label.localeCompare(b.label));
  const weeks = tally(fresh, (row) => weekKey(row.date)).sort((a, b) => a.label.localeCompare(b.label));
  const currentMonth = monthKey(now);
  const completeMonths = months.filter((row) => row.label < currentMonth);
  const current = months.find((row) => row.label === currentMonth);
  const dayOfMonth = Number(now.slice(8, 10));
  const currentProjected = current ? Math.round(current.count / dayOfMonth * daysInMonth(currentMonth)) : 0;
  const priorComplete = completeMonths.at(-1);
  const recentWeeks = weeks.slice(-4);
  const priorWeeks = weeks.slice(-8, -4);
  const recentWeekTotal = recentWeeks.reduce((sum, row) => sum + row.count, 0);
  const priorWeekTotal = priorWeeks.reduce((sum, row) => sum + row.count, 0);
  const weekDirection = direction(recentWeekTotal, priorWeekTotal);
  const monthDirection = direction(currentProjected, priorComplete?.count || 0);
  const baseline = Math.round(mean(completeMonths.slice(-3).map((row) => row.count)));
  const nextMonth = addDays(`${currentMonth}-01`, 32).slice(0, 7);
  const weeklyBaseline = Math.round(mean(recentWeeks.map((row) => row.count)));
  const nextMonthExpected = Math.round(weeklyBaseline * 4.3);

  return {
    generatedAt: now,
    method: "trailing-average",
    freshDays,
    filters: { board: board || "all", role: role || "all" },
    coverage: {
      rows: filtered.length,
      freshPosted: fresh.length,
      stalePosted,
      missingPosted,
      history: "Employer dates count only when the scanner saw the ad within 45 days of posted_at. Older dates stay out of the calendar.",
    },
    boards: tally(fresh, (row) => row.portal),
    roles: tally(fresh, (row) => roleFamily(row.title)),
    months,
    weeks,
    observedMonths: tally(observed, (row) => monthKey(row.date)).sort((a, b) => a.label.localeCompare(b.label)),
    outlook: {
      currentMonth,
      currentCount: current?.count || 0,
      currentProjected,
      priorCompleteMonth: priorComplete?.label || null,
      priorCompleteCount: priorComplete?.count || 0,
      monthDirection,
      weekDirection,
      nextMonth,
      nextMonthExpected,
      threeMonthAverage: baseline,
      nextFourWeeksEach: weeklyBaseline,
      note: completeMonths.length < 3
        ? "Fewer than three complete months of fresh employer dates. The next-month number extends the last four weeks. It is not a season."
        : "Next month extends the last four weeks of fresh employer dates. The three-month average is beside it so a thin earlier month does not hide a recent rise. Both are this scanner's history, not the whole market.",
    },
    boardOptions: [...new Set(unique.map((row) => row.portal))].sort(),
    roleOptions: [...new Set(unique.map((row) => roleFamily(row.title)))].sort(),
  };
}
