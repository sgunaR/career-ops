# Proof-of-work outreach

A developer version of the approach in Ritu’s *LinkedIn Job Hack Kit* (GTM Engineer, personal job-search use). This file is the working strategy for Guna Sekhar. It is not a copy of that guide.

The idea: a normal application asks for a chance. A short, specific build shows the work already. The kit’s author reports a much higher reply rate from a few custom projects than from a large pile of applications. Those rates are her results, not a promise.

This sits beside career-ops, not instead of it. Scores, CVs, and tracker rows still come from the usual pipeline. Nothing here is sent, submitted, or posted unless Guna reviews it and sends it.

## Who this is for

- Hyderabad. About 2.5 years. No visa needed for India roles.
- Two kinds of role: SAP BTP and Integration Suite (CPI), and full-stack work that includes applied AI and delivery (Node, React, Next.js, FastAPI, LangGraph, Docker, CI).
- Floor ₹9,00,000. Prefer mid-level software engineer seats, not Staff, Principal, or Architect.
- Time budget from the kit: about 25–35 hours across 4 weeks, 3 companies, one project each, 4–6 hours per project.

## When to use it

Use it for a company Guna actually wants, where someone on the team has talked in public about a concrete problem, and a small build can speak to that problem with skills already on `cv.md`.

Do not use it to blast the scored list. A 3.5–3.8 aggregator posting is a lead, not a confirmed opening, and a score under 4.0 is still a recommendation not to apply unless Guna chooses that company on purpose.

Skip a target when any of these are true:

- The only source is a blocked or unconfirmed aggregator page and nobody at the company has described a real problem.
- The role is women-only and eligibility is not confirmed.
- The must-have stack is not on `cv.md` (Java as the core, Django, .NET, TypeScript as a requirement, Go, React Native, SAP CAP, UI5).
- The years band or the title is Staff, Lead-of-team, or 6+ years with no mid-level opening beside it.

## The five steps

### 1. Pick 3 companies (about 1 hour)

Pick places Guna would join, not places that merely have a matching title.

A fit here looks like:

- Someone senior posts often (a few times a week is the kit’s bar).
- The work is SAP integration, product engineering, or applied AI, and it is moving.
- A founder, head of engineering, or hiring manager talks about a specific bottleneck.
- Size is roughly 10–200 people, unless a larger company has a named team with a named problem (Accenture-scale accounts only if a person, not a brand, has described the pain).
- Guna wants the work.

Where to look: LinkedIn job search for the two archetypes, recent public posts from people at those companies, and company engineering or product blogs. YC and Indie Hackers are in the original kit; use them only when the role is actually build-and-ship engineering.

Write the three names down before researching. Three is the cap. Five is the stretch. Twenty breaks the strategy.

### 2. Read what they already said (about 2 hours per company)

This is public posts, job text, and talks. It is not private data, logins, or bought contact lists.

People, in order:

1. Founder or CEO, and the head of engineering or the hiring manager for the role.
2. A recent hire in a similar seat, and a product or delivery lead if the role sits next to them.

Copy a row only when the post states the problem. Columns:

| Person | Role | Problem or project they named | Link | What a 4-hour build could show |
| --- | --- | --- | --- | --- |
| | | | | |

Look for their words: struggling with, wish we could, spending too much time, just shipped, working on, looking for someone who can.

Checklist, about 2 hours:

- Founder or CEO, 30 min: last 10 posts, comments that show what they care about, any essay or podcast where they name a constraint.
- Hiring manager or eng lead, 30 min: what they are building, stack they mention, what they say is slow, skills they praise.
- A recent hire, 20 min: what they showed before they joined. Use it as a pattern, not as a script to imitate.
- Company, 20 min: the live job post, the engineering blog, the company LinkedIn page.
- Patterns, 10 min: a problem that shows up three times; a tool they already use; a gap they have not mentioned (do not build that gap — it is a guess).

### 3. Choose one problem (about 1 hour)

Keep a problem only if all four are true:

- They said it more than once, or a job post and a person both say it.
- A believable slice fits in 4–6 hours.
- The slice uses proof already on `cv.md`.
- It is the work of the role, not “grow revenue” or “hire faster.”

Good shapes for this profile:

- They describe SAP integration that breaks between S/4HANA and a SaaS system. Show one iFlow-style path: trigger, map, error subprocess, retry. Use a fake payload. Do not claim their tenant.
- They want AI on top of existing APIs. Show a small FastAPI tool that turns a natural-language request into a structured call, with a test set. The 90%+ on 50+ requests figure may be stated only as Guna’s own past result, never as this demo’s result unless the demo actually measures it.
- They are hiring full-stack and talk about a slow internal workflow. Show a thin Node or FastAPI service plus a React screen that does that one workflow, with a real empty and error state.

Bad shapes: a generic CRUD app, a slide deck, a tool aimed at a problem they never mentioned, anything that needs Clay, Smartlead, or a sales stack Guna does not use.

### 4. Build for 4–6 hours

Hour 1. Write the smallest version. Name the tools. Screenshot the post that justifies the build.

Hours 2–3. Make it run on one realistic example. Ugly is fine. Broken is not.

Hour 4. One extra detail a reviewer can see (validation, a retry, a test, a log line). Record a 3–5 minute walkthrough. Watch the link in a private window.

Do not spend 20 hours polishing. Do not put their logo on it unless the asset is clearly free to use. Do not invent metrics.

Walkthrough shape:

1. Half a minute: who Guna is, which post, what was built.
2. Next minute: the problem in their words.
3. Two minutes: the path, on screen, with one example.
4. Close: what it changes, and a single ask to talk if they are hiring for that role.

### 5. Send once, follow up once

Preferred channel is a LinkedIn message to the person who described the problem. If the message is email, use an address already published by that person or the company. Do not buy or guess addresses.

Wait 3 days. Send one follow-up. Then stop and spend the time on the next company.

Messages stay under about 100 words, name the specific post, and talk about their problem. Guna reviews every draft before it goes out.

## Message shapes

Founder, when they named the pain:

> Hey [Name],
>
> Your post about [their words] is the kind of integration work I do.
>
> I put a small version together: [link]
>
> It [what the demo does] with [FastAPI / an iFlow-style flow / Node and React].
>
> If you are hiring for [role], I would like to walk through it.
>
> Guna

Hiring manager, when the job post and a public complaint match:

> Hi [Name],
>
> You are hiring for [role]. Instead of only a CV, I built a short demo for [problem from their post or the job text]: [link]
>
> It is how I would approach that on the team. Happy to talk through the choices.
>
> Guna

Engineering lead, when the hook is a project they said they are shipping:

> Hey [Name],
>
> Saw that the team is working on [project they named].
>
> I made a small version over a weekend: [link]
>
> It covers [one slice] using [tools on cv.md].
>
> I am not assuming there is an opening. If you are adding people who do this, I would like to connect.
>
> Guna

One follow-up, day 3, then nothing:

> Hey [Name],
>
> Following up on the [demo] I sent. No stress if you are not hiring.
>
> If you had two minutes, I would like to know whether the approach matched the problem, and what you would drop.
>
> Either way, thank you for writing about the work in public.
>
> Guna

## Four weeks

Week 1. Choose 3 companies. Finish research on company 1. Build and send project 1 by Friday. Start notes for company 2.

Week 2. Build and send project 2. One follow-up to company 1 if there is no reply. Answer any real reply the same day. Do not invent a meeting.

Week 3. Build and send project 3. Take conversations that they offered. Prepare from `cv.md` and the demo, not from a new story.

Week 4. If an offer shows up, read it before signing. Salary, notice (60 days), and location still follow `config/profile.yml`. A demo does not waive the ₹9L floor.

The kit’s author expected roughly 1–2 offers from 3 companies and reply rates far above a normal application pile. Plan the hours. Do not plan the offers.

## Mistakes that waste the month

- A production system instead of a 4–6 hour slice.
- A build aimed at a problem they never stated.
- A message about Guna’s skills instead of their bottleneck.
- A repo link with no walkthrough.
- Several follow-ups.
- More than 5 companies at once.
- A tool, metric, or employer claim that is not on `cv.md`.
- Sending from this file without Guna pressing send.

## How this uses the current search

The eight roles scored 3.5–3.8 on 17 Oct 2026 are optional seeds, not the company list. Use one only if Guna wants that employer and can point at a public problem:

- Aifa Labs, CPI, Hyderabad
- Celerity Consulting, FastAPI and LangGraph, Delhi
- Accenture, SAP BTP application development, Gurugram
- NullAxis, FastAPI and React, Bengaluru
- Studio Management, Node or Python with React, remote
- American Express, Python and React, Gurugram hybrid
- KAS Services, Node, React, AWS, Bengaluru
- Enterprise Bot, full stack and AI workflows, Bengaluru

Foundit links, the two Infosys posts marked exclusive for women, and any page that never yielded a description stay out of this plan until there is a real public problem and a real eligibility answer.

## Done when

A company is ready to receive a demo only if:

- The Loom or walkthrough link opens in a private window.
- The message quotes their post, not a generic pain.
- The demo runs.
- The person is the one who owns that problem.
- The draft is short, the name is spelled correctly, and Guna has read it.
