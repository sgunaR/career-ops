#!/usr/bin/env node
/**
 * India / Peerlist / Wellfound board health — Playwright selector canary
 * (zero LLM cost). Analog of `node verify-portals.mjs` for local/india-scan.
 *
 *   npm run verify:india
 *   node local/india-scan/health.mjs
 *   node local/india-scan/health.mjs --all
 *   node local/india-scan/health.mjs --board naukri
 *   node local/india-scan/health.mjs --board peerlist --board wellfound
 *   node local/india-scan/health.mjs --config   # only boards listed in config.yml
 */
import { newPage, closeBrowser } from './lib/browser.mjs';
import { loadIndiaScanConfig } from './lib/config.mjs';
import { getScraper, IMPLEMENTED_BOARDS, PLANNED_BOARDS } from './lib/registry.mjs';

function parseArgs(argv) {
  const boards = [];
  let useConfig = false;
  let all = false;
  let strict = false;
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--board' && argv[i + 1]) boards.push(argv[++i].toLowerCase());
    else if (a === '--config') useConfig = true;
    else if (a === '--all') all = true;
    else if (a === '--strict') strict = true;
    else if (a === '--help' || a === '-h') {
      console.log(`India board health (like verify-portals for india-scan)

Usage:
  node local/india-scan/health.mjs              # all implemented boards (exit 0; report only)
  node local/india-scan/health.mjs --all        # same
  node local/india-scan/health.mjs --config     # only config.yml boards
  node local/india-scan/health.mjs --board naukri
  node local/india-scan/health.mjs --board peerlist --board wellfound
  node local/india-scan/health.mjs --strict     # exit 1 if any board is not live

Implemented: ${IMPLEMENTED_BOARDS.join(', ')}
Planned:     ${PLANNED_BOARDS.join(', ')}

Exit codes (same idea as verify-portals):
  0  report finished (even if some boards need login / challenge)
  1  only with --strict when any board is not ✅ live
`);
      process.exit(0);
    }
  }
  return { boards, useConfig, all, strict };
}

/**
 * @param {import('playwright').Page} page
 * @param {{ ok: boolean, cardCount: number, url: string, loggedIn: boolean }} result
 */
async function classify(page, result) {
  let title = '';
  let bodyHint = '';
  try {
    title = await page.title();
    bodyHint = await page.evaluate(() => (document.body?.innerText || '').slice(0, 400));
  } catch {
    /* ignore */
  }
  const blob = `${title}\n${bodyHint}`.toLowerCase();
  if (/just a moment|attention required|cf-browser|datadome|access denied|verify you are human/.test(blob)) {
    return { kind: 'challenge', detail: 'auth / bot challenge' };
  }
  if (/sign in|log in|login/.test(blob) && result.cardCount === 0 && !result.loggedIn) {
    return { kind: 'login', detail: 'login required' };
  }
  if (result.ok) return { kind: 'live', detail: `${result.cardCount} cards` };
  return { kind: 'broken', detail: '0 cards (selectors or empty)' };
}

async function main() {
  const config = loadIndiaScanConfig();
  const args = parseArgs(process.argv);

  /** @type {string[]} */
  let boards;
  if (args.boards.length) {
    boards = args.boards;
  } else if (args.useConfig) {
    boards = config.boards.filter((b) => IMPLEMENTED_BOARDS.includes(b));
  } else {
    // Default: all implemented (verify-portals style), not only config.yml list
    boards = [...IMPLEMENTED_BOARDS];
  }

  console.log(`india-scan health: ${boards.length} board(s)\n`);

  for (const planned of PLANNED_BOARDS) {
    if (boards.includes(planned) || args.all || (!args.boards.length && !args.useConfig)) {
      console.log(`  ⏳ ${planned} — not implemented yet`);
    }
  }

  const page = await newPage({ headless: config.headless });
  let live = 0;
  let broken = 0;
  let challenge = 0;
  let loginNeeded = 0;
  let errors = 0;
  /** Soft failures (login / bot wall) — reported, but exit 0 unless --strict */
  let softFail = 0;

  try {
    for (const board of boards) {
      if (PLANNED_BOARDS.includes(board)) continue;
      const scraper = getScraper(board, config);
      if (!scraper) {
        console.log(`  ⏭  ${board} — no scraper`);
        continue;
      }
      const keywords = (config.keywords[0] || ['software engineer']).flat();
      try {
        const result = await scraper.healthCheck(page, keywords);
        const cls = await classify(page, result);
        if (cls.kind === 'live') {
          live += 1;
          console.log(
            `  ✅ ${board} — ${scraper.name || board} (${cls.detail}` +
              `${result.loggedIn ? ', logged in' : ''})`,
          );
        } else if (cls.kind === 'challenge') {
          challenge += 1;
          softFail += 1;
          console.log(`  🟡 ${board} — ${cls.detail}`);
          console.log(`     → node local/india-scan/run.mjs --login ${board}`);
        } else if (cls.kind === 'login') {
          loginNeeded += 1;
          softFail += 1;
          console.log(`  🟡 ${board} — ${cls.detail}`);
          console.log(`     → node local/india-scan/run.mjs --login ${board}`);
        } else {
          broken += 1;
          softFail += 1;
          console.log(`  ❌ ${board} — ${cls.detail}`);
          console.log(`     URL: ${result.url}`);
          console.log(
            `     → check lib/scrapers/${board}.mjs or: node local/india-scan/run.mjs --login ${board}`,
          );
        }
      } catch (err) {
        errors += 1;
        softFail += 1;
        console.log(`  ❌ ${board} — network/error — ${err.message}`);
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

  const parts = [`${live} live`];
  if (broken) parts.push(`${broken} broken selectors`);
  if (challenge) parts.push(`${challenge} bot challenge`);
  if (loginNeeded) parts.push(`${loginNeeded} login needed`);
  if (errors) parts.push(`${errors} errors`);
  if (PLANNED_BOARDS.length) parts.push(`${PLANNED_BOARDS.length} planned (apna)`);
  console.log(`\n${parts.join(', ')}`);

  // Match verify-portals: non-zero only with --strict when something is not live.
  if (args.strict && softFail > 0) {
    console.log('🔴 Unresolved boards found (--strict).');
    process.exit(1);
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
