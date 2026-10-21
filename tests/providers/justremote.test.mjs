// tests/providers/justremote.test.mjs
import { pass, fail, ROOT } from '../helpers.mjs';
import { join } from 'path';
import { pathToFileURL } from 'url';

console.log('\nProvider — justremote');

try {
  const mod = await import(pathToFileURL(join(ROOT, 'providers/justremote.mjs')).href);
  const justremote = mod.default;
  const { parseJustremotePage } = mod;

  if (justremote.id === 'justremote') pass('justremote.id is "justremote"');
  else fail(`justremote.id is ${JSON.stringify(justremote.id)}`);

  const hit = justremote.detect({ provider: 'justremote' });
  if (hit?.url === 'https://justremote.co/remote-developer-jobs') {
    pass('justremote.detect() claims explicit provider config');
  } else {
    fail(`justremote.detect() returned ${JSON.stringify(hit)}`);
  }

  if (justremote.detect({ provider: 'other' }) === null) {
    pass('justremote.detect() ignores other provider ids');
  } else {
    fail('justremote.detect() should ignore other providers');
  }

  const state = {
    jobsState: {
      entity: {
        all: [
          {
            id: 1,
            title: 'Software Engineer II, Fullstack',
            company_name: 'Dave',
            href: 'remote-developer-jobs/software-engineer-ii-fullstack-dave',
            remote_type: 'Fully Remote',
            job_country: null,
            is_active: true,
            location_restrictions: ['United States'],
          },
          {
            id: 2,
            title: 'Inactive Role',
            company_name: 'X',
            href: 'remote-developer-jobs/inactive',
            remote_type: 'Fully Remote',
            is_active: false,
          },
          {
            id: 3,
            title: 'Evil Host',
            company_name: 'X',
            href: 'https://evil.com/job',
            remote_type: 'Fully Remote',
            is_active: true,
          },
        ],
      },
    },
  };

  const jobs = parseJustremotePage(state);
  if (jobs.length === 1) pass('parseJustremotePage keeps active trusted jobs only');
  else fail(`expected 1 job, got ${jobs.length}`);

  if (
    jobs[0]?.title === 'Software Engineer II, Fullstack' &&
    jobs[0]?.company === 'Dave' &&
    jobs[0]?.url ===
      'https://justremote.co/remote-developer-jobs/software-engineer-ii-fullstack-dave' &&
    /Remote/i.test(jobs[0]?.location || '')
  ) {
    pass('parseJustremotePage maps title, company, url, location');
  } else {
    fail(`unexpected job: ${JSON.stringify(jobs[0])}`);
  }

  const html = `<script>window.__PRELOADED_STATE__ = ${JSON.stringify(state)};</script>`;
  if (parseJustremotePage(html).length === 1) {
    pass('parseJustremotePage extracts state from HTML');
  } else {
    fail('HTML parse failed');
  }
} catch (err) {
  fail(`justremote test threw: ${err.message}`);
}
