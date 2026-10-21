// tests/providers/hubstaff-talent.test.mjs
import { pass, fail, ROOT } from '../helpers.mjs';
import { join } from 'path';
import { pathToFileURL } from 'url';

console.log('\nProvider — hubstaff-talent');

try {
  const mod = await import(pathToFileURL(join(ROOT, 'providers/hubstaff-talent.mjs')).href);
  const hub = mod.default;
  const { parseHubstaffTalentHtml, titleFromHubstaffSlug } = mod;

  if (hub.id === 'hubstaff-talent') pass('hubstaff-talent.id is "hubstaff-talent"');
  else fail(`hubstaff-talent.id is ${JSON.stringify(hub.id)}`);

  if (hub.detect({ provider: 'hubstaff-talent' })?.url?.includes('talent.hubstaff.com')) {
    pass('hubstaff-talent.detect() claims explicit provider config');
  } else {
    fail('hubstaff-talent.detect() failed');
  }

  if (hub.detect({ provider: 'other' }) === null) {
    pass('hubstaff-talent.detect() ignores other provider ids');
  } else {
    fail('hubstaff-talent.detect() should ignore other providers');
  }

  if (titleFromHubstaffSlug('backend-engineer-acme') === 'Backend Engineer Acme') {
    pass('titleFromHubstaffSlug formats slug');
  } else {
    fail(`slug title: ${titleFromHubstaffSlug('backend-engineer-acme')}`);
  }

  const html = `
    <a href="/jobs/new">Post a job</a>
    <a href="/jobs/backend-engineer-python-remote">Backend Engineer Python Remote</a>
    <a href="/jobs/evil" onclick="">ignore short</a>
    <a href="https://evil.com/jobs/nope">nope</a>
  `;
  const jobs = parseHubstaffTalentHtml(html);
  if (jobs.length === 1) pass('parseHubstaffTalentHtml keeps real job links only');
  else fail(`expected 1, got ${jobs.length}: ${JSON.stringify(jobs)}`);

  if (
    jobs[0]?.url === 'https://talent.hubstaff.com/jobs/backend-engineer-python-remote' &&
    jobs[0]?.title === 'Backend Engineer Python Remote' &&
    jobs[0]?.location === 'Remote'
  ) {
    pass('parseHubstaffTalentHtml maps url/title/location');
  } else {
    fail(`unexpected job: ${JSON.stringify(jobs[0])}`);
  }
} catch (err) {
  fail(`hubstaff-talent test threw: ${err.message}`);
}
