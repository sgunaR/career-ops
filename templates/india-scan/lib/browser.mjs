import { existsSync, mkdirSync } from 'node:fs';
import { chromium } from 'playwright';
import { BROWSER_DATA_DIR } from './paths.mjs';

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

/** @type {import('playwright').BrowserContext | null} */
let context = null;

/**
 * Real Chrome first. Playwright's bundled Chromium is fingerprinted and refused outright by
 * Akamai (foundit answers "Access Denied" even on its home page), while the same profile in
 * installed Chrome passes. Set INDIA_SCAN_BROWSER=chromium to force the bundled build, or
 * INDIA_SCAN_BROWSER=msedge for Edge. Falls back to bundled Chromium if Chrome is missing.
 */
const CHANNELS = () => {
  const forced = (process.env.INDIA_SCAN_BROWSER || '').trim().toLowerCase();
  if (forced === 'chromium') return [undefined];
  if (forced) return [forced, undefined];
  return ['chrome', 'msedge', undefined];
};

export async function getBrowserContext({ headless = false } = {}) {
  if (context) return context;
  if (!existsSync(BROWSER_DATA_DIR)) mkdirSync(BROWSER_DATA_DIR, { recursive: true });

  let lastErr;
  for (const channel of CHANNELS()) {
    try {
      // No custom user agent for real browsers: the genuine one matches the TLS fingerprint.
      context = await chromium.launchPersistentContext(BROWSER_DATA_DIR, {
        ...(channel ? { channel } : { userAgent: USER_AGENT }),
        headless,
        viewport: { width: 1280, height: 800 },
        locale: 'en-US',
        args: ['--disable-blink-features=AutomationControlled', '--no-sandbox'],
      });
      console.log(`[browser] ${channel ?? 'bundled chromium'}`);
      return context;
    } catch (err) {
      lastErr = err;
      if (!/executable doesn't exist|not found|no such file|Chromium distribution/i.test(String(err?.message))) throw err;
    }
  }
  throw lastErr;
}

export async function newPage(opts) {
  const ctx = await getBrowserContext(opts);
  const page = await ctx.newPage();
  page.setDefaultTimeout(30_000);
  page.setDefaultNavigationTimeout(60_000);
  return page;
}

export async function closeBrowser() {
  if (context) {
    await context.close();
    context = null;
  }
}

export function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export function jitteredDelay(baseMs) {
  if (!baseMs || baseMs <= 0) return 0;
  return baseMs + Math.floor(Math.random() * baseMs);
}

const LOGIN_URLS = {
  naukri: 'https://www.naukri.com/nlogin/login',
  linkedin: 'https://www.linkedin.com/login',
  instahyre: 'https://www.instahyre.com/login',
  cutshort: 'https://cutshort.io/login',
  foundit: 'https://www.foundit.in/seeker/login',
  hirist: 'https://www.hirist.tech/login',
  'indeed-india': 'https://secure.indeed.com/auth',
  peerlist: 'https://peerlist.io/login',
  wellfound: 'https://wellfound.com/login',
};

// Non-interactive (no TTY — this is what the web app's spawned process always is): there is no
// "press Enter" to wait for, so this used to be a BLIND 60s timer that then closed the browser
// and saved whatever session existed — pass or fail, nothing told the caller which. That is the
// exact "no verification" the web Login button suffered from. Interactive (a real terminal) still
// waits for Enter, on the reasonable assumption a person watching the window knows when they're
// done — but it had the same blind-trust problem: pressing Enter never checked anything either.
const NON_INTERACTIVE_LOGIN_WINDOW_MS = 120_000; // was 60s — too tight for an OTP/captcha step

function waitForEnter() {
  return new Promise((resolve) => {
    if (process.stdin.isTTY) {
      process.stdin.setEncoding('utf8');
      process.stdin.resume();
      const onData = () => {
        process.stdin.off('data', onData);
        try {
          process.stdin.pause();
        } catch {
          /* ignore */
        }
        resolve();
      };
      process.stdin.once('data', onData);
    } else {
      // Non-interactive: wait a fixed window then continue
      setTimeout(resolve, NON_INTERACTIVE_LOGIN_WINDOW_MS);
    }
  });
}

/**
 * Open login page, wait for the person to finish, then verify the session actually took before
 * saving and closing — instead of trusting an Enter press or a blind timer.
 *
 * `verify(page)`, when given, is called on the SAME page right after the wait (before it
 * navigates anywhere else or closes) and must return `{ ok, cardCount }` — the shape
 * `BaseScraper.healthCheck()` already returns, so callers can pass
 * `(page) => getScraper(site, config).healthCheck(page, someKeywords)` directly. Its result is
 * both printed here (so a CLI run and the web app's streamed log both show it) and returned, so
 * the caller can act on it (e.g. the web route surfacing a real pass/fail instead of just "done").
 *
 * Caller should process.exit(0) after this returns, in the CLI path.
 * @param {string} site
 * @param {{ headless?: boolean, verify?: (page: import('playwright').Page) => Promise<{ok: boolean, cardCount: number}> }} [opts]
 * @returns {Promise<{ verified: boolean, cardCount: number | null } | null>} null when no `verify` was given —
 *   the caller asked for none, not "verification failed".
 */
export async function openLoginPage(site, { headless = false, verify } = {}) {
  const url = LOGIN_URLS[site];
  if (!url) throw new Error(`No login URL for board: ${site}`);
  const page = await newPage({ headless });
  let result = null;
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    console.log(`\nLog in manually in the browser window for ${site}.`);
    console.log('When done, press Enter here to save the session and quit…\n');
    await waitForEnter();

    if (verify) {
      try {
        const { ok, cardCount } = await verify(page);
        result = { verified: Boolean(ok), cardCount: Number.isFinite(cardCount) ? cardCount : null };
        console.log(
          result.verified
            ? `✅ Login verified for ${site} — ${result.cardCount ?? '?'} job cards visible after login. Session saved.`
            : `⚠️  Could not confirm login for ${site} (${result.cardCount ?? 0} cards, logged-in markers not found). The session is saved anyway — but if this board still fails on the next scan, log in again and make sure the page fully loads (past any OTP/captcha) before it saves.`,
        );
      } catch (err) {
        console.log(`⚠️  Login verification for ${site} could not run (${err?.message ?? err}). Session saved unverified.`);
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
  return result;
}
