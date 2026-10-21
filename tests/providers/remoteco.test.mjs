// tests/providers/remoteco.test.mjs
import { pass, fail, ROOT } from '../helpers.mjs';
import { join } from 'path';
import { pathToFileURL } from 'url';

console.log('\nProvider — remoteco');

try {
  const mod = await import(pathToFileURL(join(ROOT, 'providers/remoteco.mjs')).href);
  const remoteco = mod.default;
  const { parseRemotecoHtml, parseRemotecoNextData } = mod;

  if (remoteco.id === 'remoteco') pass('remoteco.id is "remoteco"');
  else fail(`remoteco.id is ${JSON.stringify(remoteco.id)}`);

  if (remoteco.detect({ provider: 'remoteco' })?.url?.includes('remote.co')) {
    pass('remoteco.detect() claims explicit provider config');
  } else {
    fail('remoteco.detect() failed');
  }

  if (remoteco.detect({ provider: 'other' }) === null) {
    pass('remoteco.detect() ignores other provider ids');
  } else {
    fail('remoteco.detect() should ignore other providers');
  }

  const pageProps = {
    jobCardData: {
      jobs: [
        {
          title: 'Full Stack Developer',
          companyName: 'Acme',
          jobId: 12345,
          slug: 'full-stack-developer-acme',
          location: '100% Remote Work',
        },
        {
          title: 'Noise Facet',
          // no job id / company — should be dropped unless /job/ url
        },
      ],
    },
  };

  const jobs = parseRemotecoNextData(pageProps);
  if (jobs.length === 1 && jobs[0].company === 'Acme') {
    pass('parseRemotecoNextData keeps real job cards');
  } else {
    fail(`unexpected jobs: ${JSON.stringify(jobs)}`);
  }

  if (jobs[0]?.url === 'https://remote.co/job/12345/full-stack-developer-acme/') {
    pass('parseRemotecoNextData builds job URL from id+slug');
  } else {
    fail(`unexpected url: ${jobs[0]?.url}`);
  }

  const html = `<script id="__NEXT_DATA__" type="application/json">${JSON.stringify({
    props: { pageProps },
  })}</script>`;
  if (parseRemotecoHtml(html).length === 1) pass('parseRemotecoHtml reads __NEXT_DATA__');
  else fail('parseRemotecoHtml failed');
} catch (err) {
  fail(`remoteco test threw: ${err.message}`);
}
