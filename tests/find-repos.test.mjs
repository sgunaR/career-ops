import assert from 'node:assert/strict';
import test from 'node:test';
import { CATEGORIES, buildAdvancedQuery, cleanQuery, contributionScore, keepRepo, parseFinderArgs } from '../strategy/find-repos.mjs';

const NOW = new Date('2026-10-17T12:00:00Z');

test('one category, a 90-day window, and a star floor', () => {
  const options = parseFinderArgs([]);
  assert.equal(options.category, 'webdev');
  assert.equal(options.days, 90);
  assert.equal(options.minStars, 20);
  const query = buildAdvancedQuery({ ...options, now: NOW });
  assert.equal(query.label, 'Web development');
  assert.match(query.q, /topic:web/);
  assert.match(query.q, /pushed:>2026-07-19/);
  assert.match(query.q, /stars:20\.\.50000/);
  assert.match(query.q, /fork:false/);
  assert.equal(CATEGORIES.length >= 30, true);
});

test('advanced search qualifiers narrow the GitHub query', () => {
  const options = parseFinderArgs([
    '--category', 'security',
    '--language', 'Python',
    '--license', 'mit',
    '--owner', 'org:evil',
    '--min-stars', '50',
    '--max-stars', '8000',
    '--min-forks', '10',
    '--q', 'rust OR org:evil',
    '--days', '30',
  ]);
  assert.equal(options.category, 'security');
  assert.equal(options.owner, 'orgevil');
  assert.equal(options.q, 'rust OR org evil');
  const query = buildAdvancedQuery({ ...options, now: NOW });
  assert.match(query.q, /topic:security/);
  assert.match(query.q, /language:Python/);
  assert.match(query.q, /license:mit/);
  assert.match(query.q, /user:orgevil/);
  assert.match(query.q, /stars:50\.\.8000/);
  assert.match(query.q, /forks:>=10/);
  assert.equal(parseFinderArgs(['--category', 'nope', '--language', 'Brainfuck', '--license', 'nope']).language, '');
});

test('cleanQuery drops GitHub operators and caps length', () => {
  assert.equal(cleanQuery('  fast:api "quoted"  '), 'fast api quoted');
  assert.equal(cleanQuery('x'.repeat(80)).length, 60);
});

test('keepRepo drops tutorials, forks, stale pushes, and issue spam', () => {
  const live = {
    full_name: 'org/scanner',
    description: 'A Go security scanner',
    archived: false,
    fork: false,
    pushed_at: '2026-10-16T00:00:00Z',
    open_issues_count: 12,
    stargazers_count: 400,
    language: 'Go',
  };
  assert.equal(keepRepo(live, { now: NOW, days: 90 }), true);
  assert.equal(keepRepo({ ...live, fork: true }, { now: NOW, days: 90 }), false);
  assert.equal(keepRepo({ ...live, description: 'Next.js starter template' }, { now: NOW, days: 90 }), false);
  assert.equal(keepRepo({ ...live, pushed_at: '2026-01-01T00:00:00Z' }, { now: NOW, days: 90 }), false);
  assert.equal(keepRepo({ ...live, open_issues_count: 900, stargazers_count: 40 }, { now: NOW, days: 90 }), false);
});

test('a recently pushed, licensed repo with takeable issues ranks above a stale one', () => {
  const fresh = contributionScore({
    pushed_at: '2026-10-16T00:00:00Z',
    open_issues_count: 20,
    stargazers_count: 500,
    license: { spdx_id: 'MIT' },
  }, NOW);
  const stale = contributionScore({
    pushed_at: '2026-08-01T00:00:00Z',
    open_issues_count: 2,
    stargazers_count: 10,
    license: null,
  }, NOW);
  assert.ok(fresh.score > stale.score);
  assert.match(fresh.why, /pushed this week/);
  assert.match(fresh.why, /MIT/);
  assert.ok(fresh.score <= 100);
});
