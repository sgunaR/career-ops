// tests/providers/topstartups.test.mjs
import { pass, fail, ROOT } from '../helpers.mjs';
import { join } from 'path';
import { pathToFileURL } from 'url';

console.log('\nProvider — topstartups');

try {
  const mod = await import(pathToFileURL(join(ROOT, 'providers/topstartups.mjs')).href);
  const topstartups = mod.default;
  const { parseTopstartupsPage, parseRelativePostedAt } = mod;

  if (topstartups.id === 'topstartups') pass('topstartups.id is "topstartups"');
  else fail(`topstartups.id is ${JSON.stringify(topstartups.id)}`);

  const hit = topstartups.detect({ provider: 'topstartups' });
  if (hit?.url?.includes('topstartups.io/jobs')) {
    pass('topstartups.detect() claims explicit provider config');
  } else {
    fail(`topstartups.detect() returned ${JSON.stringify(hit)}`);
  }

  if (topstartups.detect({ careers_url: 'https://topstartups.io/jobs/?job_location=Remote' })?.url) {
    pass('topstartups.detect() claims careers_url host');
  } else {
    fail('topstartups.detect() should claim topstartups.io careers_url');
  }

  if (topstartups.detect({ provider: 'other' }) === null) {
    pass('topstartups.detect() ignores other provider ids');
  } else {
    fail('topstartups.detect() should ignore other providers');
  }

  const html = `
    <div class="col-12 infinite-item">
      <a href="http://example.com" id="startup-website-link"><h7>Acme</h7></a>
      <a href="https://job-boards.greenhouse.io/acme/jobs/1" id="startup-website-link">
        <h5 id="job-title">Senior Backend EngineerNew</h5>
      </a>
      <h7><i class="fas fa-map-marker-alt"></i>  Remote - India </h7>
      <h7><i class="far fa-clock"></i> Posted: 2 days ago</h7>
      <a href=https://job-boards.greenhouse.io/acme/jobs/1 target="_blank" class="btn btn-primary" id="apply-button">Apply</a>
    </div>
    <div class="col-12 infinite-item">
      <a id="startup-website-link"><h7>Evil</h7></a>
      <h5 id="job-title">Bad</h5>
      <a href="javascript:alert(1)" id="apply-button">Apply</a>
    </div>
    <div class="col-12 infinite-item">
      <a id="startup-website-link"><h7>Dup</h7></a>
      <h5 id="job-title">Dup Role</h5>
      <a href="https://job-boards.greenhouse.io/acme/jobs/1" id="apply-button">Apply</a>
    </div>
  `;

  const jobs = parseTopstartupsPage(html);
  if (jobs.length === 1) pass('parseTopstartupsPage keeps one trusted apply URL');
  else fail(`expected 1 job, got ${jobs.length}`);

  if (
    jobs[0]?.title === 'Senior Backend Engineer' &&
    jobs[0]?.company === 'Acme' &&
    jobs[0]?.url === 'https://job-boards.greenhouse.io/acme/jobs/1' &&
    /Remote/i.test(jobs[0]?.location || '') &&
    typeof jobs[0]?.postedAt === 'number'
  ) {
    pass('parseTopstartupsPage maps title, company, url, location, postedAt');
  } else {
    fail(`unexpected job: ${JSON.stringify(jobs[0])}`);
  }

  const ago = parseRelativePostedAt('3 days ago', Date.parse('2026-08-08T12:00:00Z'));
  const expected = Date.parse('2026-08-05T12:00:00Z');
  if (ago === expected) pass('parseRelativePostedAt handles N days ago');
  else fail(`parseRelativePostedAt got ${ago}, expected ${expected}`);

  const fetched = await topstartups.fetch(
    { name: 'Top Startups', role: 'Software Engineer', max_pages: 1, job_location: 'Remote' },
    {
      fetchText: async () => html,
    },
  );
  if (fetched.length === 1 && fetched[0].company === 'Acme') {
    pass('topstartups.fetch() returns parsed jobs from HTML');
  } else {
    fail(`fetch unexpected: ${JSON.stringify(fetched)}`);
  }
} catch (err) {
  fail(`topstartups test crashed: ${err instanceof Error ? err.message : err}`);
}
