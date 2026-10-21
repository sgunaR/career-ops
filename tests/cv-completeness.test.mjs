import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cvCompletenessIssues } from '../lib/cv-completeness.mjs';

const cv = `# Name

## Skills

### Languages

Python, JavaScript

## Experience

### Proclink

#### Software Developer
May 2024 - Present

- Designed 20+ iFlows on SAP BTP Integration Suite.
- Set up CI/CD with Jenkins.

### FlowGen Labs

#### SAP AI Engineer

- Built a Next.js frontend with XSUAA SSO.
`;

const full = {
  summary: 'SAP BTP and CI/CD.',
  experience: [
    { company: 'Proclink', bullets: ['Designed 20+ iFlows on SAP BTP Integration Suite.', 'Set up CI/CD with Jenkins.'] },
    { company: 'FlowGen Labs', bullets: ['Built a Next.js frontend with XSUAA SSO.'] },
  ],
  skills: [{ category: 'Languages', items: 'Python, JavaScript' }],
};

test('a shortened role is rejected and a full payload is accepted', () => {
  const short = { ...full, summary: 'Backend work.', experience: [{ company: 'Proclink', bullets: ['Designed 20+ iFlows.'] }] };
  const issues = cvCompletenessIssues(cv, short, 'SAP BTP,Java');
  assert.ok(issues.some((line) => line.includes('Proclink has 1 bullets')));
  assert.ok(issues.some((line) => line.includes('FlowGen Labs')));
  assert.ok(issues.some((line) => line.includes('SAP BTP')));
  assert.equal(issues.some((line) => line.includes('Java')), false);
  assert.deepEqual(cvCompletenessIssues(cv, full, 'SAP BTP,Java'), []);
});
