#!/usr/bin/env node
/**
 * India job board scanner — zero LLM cost, Playwright + persistent login.
 * Lives under local/india-scan/ (gitignored). Bootstrap from templates/india-scan/.
 *
 * Usage:
 *   node templates/india-scan/bootstrap.mjs
 *
 *   node local/india-scan/run.mjs --login naukri
 *   node local/india-scan/run.mjs --login linkedin
 *   node local/india-scan/run.mjs --login instahyre
 *
 *   # Health (selector canary)
 *   node local/india-scan/health.mjs
 *   node local/india-scan/run.mjs --health
 *   node local/india-scan/run.mjs --health --board cutshort
 *
 *   # One board
 *   node local/india-scan/run.mjs --board naukri --max-pages 3
 *   node local/india-scan/run.mjs --board hirist --max-pages 2 --dry-run
 *
 *   # All implemented boards
 *   node local/india-scan/run.mjs --all --max-pages 2
 *
 *   # Several boards (comma list)
 *   node local/india-scan/run.mjs --boards naukri,foundit,indeed-india --max-pages 2
 */
import { newPage, closeBrowser, openLoginPage } from './lib/browser.mjs';
import { loadIndiaScanConfig } from './lib/config.mjs';
import { getScraper, IMPLEMENTED_BOARDS, PLANNED_BOARDS } from './lib/registry.mjs';
import {
  buildFiltersFromPortals,
  filterJob,
  appendOffers,
  loadSeenUrlSet,
  normalizeUrlKey,
  companyRoleKey,
  recordScanRun,
  sortByFreshness,
} from './lib/pipeline.mjs';

function printHelp() {
  console.log(`
India scan — Playwright discovery (zero LLM cost)

Login (once per board):
  node local/india-scan/run.mjs --login <board>
    boards: naukri | linkedin | instahyre | cutshort | foundit | hirist | indeed-india
    (planned / skipped: apna)

Health check (selector canary):
  node local/india-scan/run.mjs --health [--board <name>]

Scan one board:
  node local/india-scan/run.mjs --board naukri --max-pages 3
  node local/india-scan/run.mjs --board hirist --max-pages 2 --dry-run

Scan all implemented boards:
  node local/india-scan/run.mjs --all --max-pages 2

Scan a list:
  node local/india-scan/run.mjs --boards naukri,foundit,indeed-india --max-pages 2

Options:
  --board <name>       Single board (${IMPLEMENTED_BOARDS.join(' | ')})
  --boards a,b         Comma-separated boards
  --all                All implemented boards (${IMPLEMENTED_BOARDS.join(', ')})
  --max-pages <n>      Pages per keyword search (default: config max_pages, like job-hunt-ai)
  --dry-run            Do not write pipeline / scan-history / scan-runs
  --login <board>      Open login page, save session, quit
  --health             Selector health check
  --help               Show this help

If you omit --board / --boards / --all, config.yml "boards" list is used.
`);
}

function parseArgs(argv) {
  const out = {
    help: false,
    health: false,
    dryRun: false,
    login: null,
    all: false,
    boards: [],
    maxPages: null,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--help' || a === '-h') out.help = true;
    else if (a === '--health') out.health = true;
    else if (a === '--dry-run') out.dryRun = true;
    else if (a === '--all') out.all = true;
    else if (a === '--login' && argv[i + 1]) out.login = argv[++i].toLowerCase();
    else if ((a === '--board' || a === '--boards') && argv[i + 1]) {
      const raw = argv[++i];
      out.boards.push(...raw.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean));
    } else if (a === '--max-pages' && argv[i + 1]) {
      const n = Number(argv[++i]);
      if (!Number.isInteger(n) || n < 1) {
        throw new Error(`--max-pages must be a positive integer (got ${argv[i]})`);
      }
      out.maxPages = n;
    } else if (a.startsWith('-')) {
      throw new Error(`Unknown flag: ${a} (try --help)`);
    }
  }
  // de-dupe boards while preserving order
  out.boards = [...new Set(out.boards)];
  return out;
}

/** Resolve which boards to run. */
function resolveBoards(args, config) {
  if (args.all) return [...IMPLEMENTED_BOARDS];
  if (args.boards.length) return args.boards;
  return Array.isArray(config.boards) && config.boards.length
    ? config.boards.map((b) => String(b).toLowerCase())
    : [...IMPLEMENTED_BOARDS];
}

/** Offer shape matching scan.mjs writers (dashboard reads pipeline + scan-history). */
function normalizeOffer(job) {
  const source = job.source || 'india-scan';
  return {
    url: job.url,
    title: job.title,
    company: job.company || source || 'Unknown',
    location: job.location || '',
    source,
    salary: job.salary,
    note: `india:${source}`,
    postedAt: typeof job.postedAt === 'number' && Number.isFinite(job.postedAt) ? job.postedAt : undefined,
  };
}

async function runHealth(boards) {
  const { spawn } = await import('node:child_process');
  const { fileURLToPath } = await import('node:url');
  const healthPath = fileURLToPath(new URL('./health.mjs', import.meta.url));
  const healthArgs = [healthPath];
  for (const b of boards) {
    healthArgs.push('--board', b);
  }
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, healthArgs, { stdio: 'inherit', cwd: process.cwd() });
    child.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`health exit ${code}`))));
  });
}

async function main() {
  let args;
  try {
    args = parseArgs(process.argv);
  } catch (err) {
    console.error(err.message);
    printHelp();
    process.exit(1);
  }

  if (args.help) {
    printHelp();
    process.exit(0);
  }

  const config = loadIndiaScanConfig();

  if (args.login) {
    const known = [...IMPLEMENTED_BOARDS, ...PLANNED_BOARDS];
    if (!known.includes(args.login)) {
      console.error(`Unknown board for --login: ${args.login}`);
      console.error(`Known: ${known.join(', ')}`);
      process.exit(1);
    }
    try {
      // Verify the session actually took: after the login wait, reload the board's own search
      // page and reuse the same check `--health` uses (real cards + isLoggedIn markers), instead
      // of trusting an Enter press or (over the web app, which has no TTY to press Enter in) a
      // blind timer. Only possible for a board with a real scraper (not a PLANNED_BOARDS stub).
      const keywords = config.keywords?.[0]?.length ? config.keywords[0] : ['software engineer'];
      const verify = IMPLEMENTED_BOARDS.includes(args.login)
        ? (page) => getScraper(args.login, config).healthCheck(page, keywords)
        : undefined;
      const result = await openLoginPage(args.login, { headless: false, verify });
      console.log(`Session saved under local/india-scan/.browser-data/`);
      if (!result) console.log('Login complete — exiting. (No automatic check ran for this board.)');
      else if (!result.verified) console.log('Login saved, but not confirmed — run `--health --board ' + args.login + '` to check again after a moment.');
      else console.log('Login complete and verified — exiting.');
    } catch (err) {
      console.error(err);
      try {
        await closeBrowser();
      } catch {
        /* ignore */
      }
      process.exit(1);
    }
    process.exit(0);
  }

  const boards = resolveBoards(args, config);

  if (args.health) {
    try {
      await runHealth(boards);
      process.exit(0);
    } catch (err) {
      console.error(err.message || err);
      process.exit(1);
    }
  }

  const maxPages = args.maxPages ?? config.max_pages;
  console.log(`Boards: ${boards.join(', ')} | max-pages: ${maxPages}${args.dryRun ? ' | dry-run' : ''}`);

  const filters = await buildFiltersFromPortals();
  const seen = await loadSeenUrlSet();

  let totalFound = 0;
  let filteredTitle = 0;
  let filteredLocation = 0;
  let filteredAge = 0;
  let duplicates = 0;
  let crossBoardDupes = 0;
  let scrapeErrors = 0;
  let boardsRun = 0;
  /** @type {ReturnType<normalizeOffer>[]} */
  const toAdd = [];
  /** New offers per board, in scrape order: the cap is shared out fairly after every board ran. */
  const perBoard = new Map();
  /** Same company+role already kept from an earlier board this run. */
  const seenRoles = new Set();

  const page = await newPage({ headless: config.headless });

  try {
    for (const board of boards) {
      if (PLANNED_BOARDS.includes(board) && !IMPLEMENTED_BOARDS.includes(board)) {
        console.log(`⏳ skip ${board} — scraper not built yet`);
        continue;
      }
      const scraper = getScraper(board, config);
      if (!scraper) {
        console.warn(`Unknown board: ${board}`);
        continue;
      }
      boardsRun++;

      for (const kwGroup of config.keywords) {
        const keywords = Array.isArray(kwGroup) ? kwGroup : [kwGroup];
        console.log(`\n━━ ${board} | ${keywords.join(' ')} | pages≤${maxPages} ━━`);
        const { jobs, errors } = await scraper.scrapeSearch(page, {
          keywords,
          maxPages,
          requestDelayMs: config.request_delay_ms,
        });
        if (errors.length) {
          scrapeErrors += errors.length;
          console.warn(`  warnings: ${errors.slice(0, 3).join('; ')}`);
        }
        totalFound += jobs.length;

        for (const job of jobs) {
          const offer = normalizeOffer(job);
          const reject = await filterJob(offer, filters);
          if (reject === 'title') {
            filteredTitle++;
            continue;
          }
          if (reject === 'location') {
            filteredLocation++;
            continue;
          }
          if (reject === 'age') {
            filteredAge++;
            continue;
          }
          const key = await normalizeUrlKey(offer.url);
          if (seen.has(key)) {
            duplicates++;
            continue;
          }
          const roleKey = await companyRoleKey(offer);
          if (roleKey && seenRoles.has(roleKey)) {
            crossBoardDupes++;
            continue;
          }
          seen.add(key);
          if (roleKey) seenRoles.add(roleKey);
          if (!perBoard.has(board)) perBoard.set(board, []);
          perBoard.get(board).push(offer);
        }
      }
    }
  } finally {
    try {
      await page.close();
    } catch {
      /* ignore */
    }
    await closeBrowser();
  }

  // Round-robin across boards until the cap: a board scraped first (Naukri, LinkedIn) must not
  // use up the whole allowance and starve the ones after it. Each board's own queue is sorted
  // freshest-and-priority-first (portals.yml priority_posting_age_hours), so within the cap the
  // last-24h postings win a slot over the 24-48h ones before undated/older postings are reached.
  const queues = await Promise.all([...perBoard.values()].map((q) => sortByFreshness([...q], filters)));
  while (toAdd.length < config.max_new_offers && queues.some((q) => q.length)) {
    for (const q of queues) {
      if (q.length && toAdd.length < config.max_new_offers) toAdd.push(q.shift());
    }
  }
  const capped = toAdd.slice(0, config.max_new_offers);
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`India scan — ${new Date().toISOString().slice(0, 10)}`);
  console.log(`Boards run:            ${boardsRun} (${boards.join(', ')})`);
  console.log(`Max pages / keyword:   ${maxPages}`);
  console.log(`Raw cards scraped:     ${totalFound}`);
  console.log(`Filtered (title):      ${filteredTitle}`);
  console.log(`Filtered (location):   ${filteredLocation}`);
  console.log(`Filtered (age):        ${filteredAge} (older than portals.yml max_posting_age_hours)`);
  console.log(`Duplicates skipped:    ${duplicates} (same URL)`);
  console.log(`Cross-board dupes:     ${crossBoardDupes} (same company+role on another board)`);
  console.log(`New offers:            ${capped.length}`);
  const priorityKept = capped.filter((o) => filters.isPriority(o.postedAt)).length;
  console.log(`  of which fresh (within priority_posting_age_hours): ${priorityKept}`);
  for (const [b, q] of perBoard) {
    const kept = capped.filter((o) => o.source === b).length;
    console.log(`  ${b.padEnd(14)} ${String(kept).padStart(3)} kept of ${q.length} new`);
  }
  if (args.dryRun) console.log('(dry run — pipeline / dashboard not updated)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  await appendOffers(capped, { dryRun: args.dryRun });
  await recordScanRun(
    {
      boards: boardsRun,
      found: totalFound,
      filteredTitle,
      filteredLocation,
      filteredAge,
      dupes: duplicates + crossBoardDupes,
      newAdded: capped.length,
      errors: scrapeErrors,
    },
    { dryRun: args.dryRun },
  );

  if (!args.dryRun && capped.length > 0) {
    console.log('→ Visible in web dashboard: Pipeline inbox + What\'s New.');
    console.log('→ Review data/pipeline.md, then /career-ops pipeline for shortlisted URLs only.');
  }

  process.exit(0);
}

main().catch(async (err) => {
  console.error(err);
  try {
    await closeBrowser();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
