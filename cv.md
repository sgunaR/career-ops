# Guna Sekhar

**Full Stack + Applied AI  ·  SAP BTP & CPI Consultant**

## Contact

- Email: hi@sguna.dev
- Phone: 6309665267
- LinkedIn: https://www.linkedin.com/in/sgunaar/
- Portfolio: https://sguna.dev
- GitHub: https://github.com/sgunaR
- Location: Hyderabad, Telangana, India

## Summary

Software engineer with ~2.5 years of experience shipping full-stack and backend systems with Applied AI, and delivering enterprise SAP BTP / CPI work in the same career. On the product side: Node.js, React/Next.js, FastAPI, MCP/agent tooling, and end-to-end deployment (Docker, Kubernetes, AWS). On the SAP side: Integration Suite iFlows, Cloud Foundry & Kyma administration, and Joule / Generative AI Hub. Bridges both with MCP/FastAPI services that connect AI tools to SAP Integration Suite and S/4HANA — reliability and security first.

## Core Competencies

### Full-Stack + Applied AI & Deployment
- AI-driven multi-agent code review platform (security, quality, architecture) across enterprise repos
- Python / SQLAlchemy backends; Azure SQL & SQLite; interactive HTML/JS dashboards
- Azure DevOps CI/CD, Azure Blob Storage, SharePoint (Microsoft Graph), Key Vault, Entra ID
- MCP / FastMCP, CrewAI / LangGraph; Docker, Kubernetes, Terraform, CI/CD, Azure, AWS

### SAP BTP & CPI
- SAP BTP Integration Suite / CPI — iFlows across SAP and non-SAP systems
- SAP BTP administration: Cloud Foundry (subaccounts, spaces, entitlements) and Kyma workloads
- Destinations, Cloud Connector, IAS/IPS, API Management; Joule and Generative AI Hub
- PI/PO → Integration Suite migration assessments; 250+ Postman/SOAP UI test scenarios

## Skills

### Full-Stack & Applied AI
Python, JavaScript, FastAPI, Node.js, React, Next.js, SQLAlchemy, LangGraph, CrewAI, MCP, FastMCP, REST, GraphQL, WebSockets, gRPC, PostgreSQL, MSSQL, Azure SQL, SQLite, MongoDB, Redis, DynamoDB, AWS SQS/SNS, Azure DevOps, Azure Blob Storage, SharePoint, Microsoft Graph API, Azure Key Vault, Entra ID, Snyk, PowerShell, HTML/JS dashboards

### SAP BTP & CPI
SAP BTP (Cloud Foundry & Kyma administration), SAP BTP Integration Suite, SAP CPI, SOAP, OData, IDoc, SFTP, JMS, AS2, SAP HANA, SAP ECC, SAP S/4HANA (On-Premise/RISE/Public Cloud), SAP Concur, SAP SuccessFactors, SAP Joule, SAP Generative AI Hub, SAP Event Mesh, SAP Integration Advisor, MTA, Figaf

### Cloud
Docker, Kubernetes, Terraform, CI/CD, Azure, AWS

### Testing
Jest, React Testing Library, Pytest, Playwright, Postman, SOAP UI

### Soft Skills
Leadership, Cross-functional Collaboration, Problem Solving, Communication

## Experience

### Proclink — Hyderabad, India
**Software Developer**
May 2024 - Present

**Full-Stack, Applied AI & Deployment — Autonomous Code Review Agent**
Designed and maintained an AI-driven, multi-language code review platform that automates security, quality, and architecture analysis across 10+ enterprise repositories, with Azure DevOps CI/CD integration, multi-destination report distribution (Azure Blob Storage, SharePoint), dual SQL/filesystem persistence, and interactive multi-level dashboards.
- Built and maintained a parallel multi-agent analysis engine (9 autonomous subagents covering security, code quality, performance, architecture, testing, dependencies, JavaScript, DevOps, and database categories), cutting full-repository analysis time from 15–20 minutes to 3–5 minutes.
- Implemented OWASP Top 10/CWE-mapped security scanning with Snyk dependency-vulnerability integration, including root-causing and fixing a critical bug that silently discarded all findings from multi-project dependency scans.
- Designed persistent report storage across ephemeral Azure DevOps build agents using Azure Blob Storage sync (upload/download steps wired into every pipeline stage), ensuring report history survives across fresh VM instances with no shared disk.
- Built automated SharePoint publishing via Microsoft Graph API (app registration/OAuth-based PowerShell integration), including incremental sync logic that lists existing versioned report folders first to avoid re-uploading unchanged report history on every run.
- Migrated pipeline secrets management from Azure DevOps variable groups to Azure Key Vault with Entra ID (AAD) token-based authentication, designing an environment-aware (DEV/TEST/PROD) secret-retrieval architecture reusable across all application pipelines without per-repo duplication.
- Diagnosed and fixed a production authentication defect where re-deriving a SQLAlchemy engine from a stringified URL silently dropped AAD token_provider credentials, causing intermittent login failures during metadata persistence — restored by reusing the live engine instance.
- Built dialect-agnostic database access (SQLite for local dev, Azure SQL/mssql-python for production) using a shared ORM layer, replacing fragile raw-SQL queries that broke silently across database backends.
- Designed a dual-mode persistence strategy (database-first with filesystem fallback) for analysis results, including fixing a version-resolution bug that caused false "no history" resets when the database and filesystem drifted out of sync.
- Developed multi-level interactive HTML dashboards (organization → project → repository) sourced from a shared data layer, aggregating findings across 1,000+ tracked issues in production.
- Authored and maintained reusable Azure DevOps pipeline templates (YAML) powering automated code review for 10+ internal applications, including commit-change detection, versioned report generation, and Blob Storage/SharePoint artifact distribution.
- Implemented a cross-version issue-tracking (fingerprinting) system using content-based hashing to distinguish new, persisting, and resolved findings across repeated analysis runs, enabling technical-debt trend reporting.
- Planned and drove a multi-environment (DEV/TEST/PROD) rollout strategy with branch-based automatic environment selection, secure secret isolation per environment, and end-to-end validation workflows.

**SAP BTP Administration, Integration Suite & CPI**
- Designed and delivered integration flows (iFlows) on SAP BTP Integration Suite, connecting Coupa, Salesforce, ServiceNow, Blue Planner, and Blue Yonder via SFTP, HTTP, SOAP, IDoc, OData, JMS, AS2, Mail, Process Direct, and Salesforce Pub/Sub.
- Applied integration patterns (Router, Content Modifier, Multicast, Request-Reply) and Groovy-based transformations across JSON and XML payloads, improving mapping accuracy and reducing debugging time; applied Business Data Graph and clean-core principles to keep integrations upgrade-safe.
- Implemented exception handling in iFlows using Exception Subprocess, global and message-specific retry mechanisms, and logging to enterprise observability tools.
- Administered SAP BTP across Cloud Foundry and Kyma environments: managed subaccounts, spaces, entitlements, and service instances in Cloud Foundry, and deployed and managed workloads on the Kyma runtime.
- Configured BTP security and identity: Destinations, SAP Cloud Connector, IAS/IPS, role collections, and trust configuration across both Cloud Foundry and Kyma landscapes.
- Enabled AI on SAP BTP: configured and enabled Joule, built AI-enabled iFlows that integrate SAP data with AI services, and used SAP's Generative AI Hub on BTP.
- Strengthened security with OAuth 2.0, client certificates (mTLS for service-to-service), Basic Authentication, PGP encryption for sensitive data transmissions, and API proxies in SAP API Management using IP whitelisting and spike-arrest policies. Result: 100% of partner API calls encrypted and authenticated; zero breaches; compliance audit approved without findings.
- Performed migration assessments from SAP PI/PO to SAP BTP Integration Suite using SAP's native approach and the Figaf tool, categorizing interfaces from Ready-to-Migrate to Evaluation-Required.
- Led testing with Postman and SOAP UI across 250+ scenarios (unit, integration, performance); supported cutover and hypercare, delivering 99.2% uptime during go-live with zero data loss. Hypercare executed 8 hours ahead of schedule.
- Implemented event-driven architecture (SAP Event Mesh, Solace, JMS, AEM) and supported EDI mappings (850/855/856/810) using SAP Integration Advisor, including AS2/SFTP configuration with digital signatures and MDN acknowledgments and coordination with the B2B onboarding team.
- Worked across the SAP ERP and SaaS ecosystem (SAP ECC, S/4HANA On-Premise/RISE/Public Cloud, Concur, SuccessFactors) and produced technical documentation (high-level and low-level designs, checklists, test plans, and test reports); mentored team members in a distributed agile setup and shared knowledge through the SAP Community.

### eSource Solutions — The Woodlands, TX (Remote)
**SAP AI Engineer**
April 2026 - June 2026

- Built an AI-aware integration layer bridging MCP-based tools and SAP S/4HANA, using SAP BTP as the backbone.
- Engineered multiple MCP endpoints on SAP BTP Cloud Foundry, then consolidated them into a single FastMCP backend using dynamic tool registration, cutting cloud spend by ~70%. Result: new AI tools added in hours, not days; zero-downtime deployments.
- Built a FastAPI-based MCP server translating natural-language requests from AI tools (Claude Desktop) into structured calls to SAP Integration Suite iFlows. Result: 90%+ accuracy on 50+ test requests; AI agents could query enterprise data without custom coding.
- Applied agentic AI patterns to SAP BTP workflows: tool calling (agents select which iFlow to invoke), orchestration, memory and state handling across multi-step workflows, and safe action boundaries (validation gates before touching SAP).
- Designed RAG-style retrieval: queried SAP HANA CDS views and OData APIs, materialized results for LLM context, and returned grounded responses with fallback behavior when data is missing.
- Owned delivery end-to-end across MCP, FastAPI, SAP BTP, Cloud Connector, and S/4HANA, prioritizing reliability and security.

### FlowGen Labs — San Francisco Bay Area, USA (Remote)
**SAP AI Engineer**
August 2025 - February 2026

- Delivered intelligent enterprise automation for SAP transformation programs, evaluating Figaf and custom AI workflows to define migration strategy.
- Built the core AI engineering stack: Next.js frontend, XSUAA SSO, FastAPI backend services, CrewAI orchestration, and OpenAI as the LLM provider.
- Designed an SAP BTP Integration Suite MCP server with a Cloud Foundry proxy layer for secure on-premise connectivity.
- Built evaluation loops (offline test sets for prompt variants and retrieval quality, online monitoring of latency, cost, and user feedback) to catch AI behavior regressions early.
- Classified CDS views into RICEFW categories to support ECC modernization and migration planning, and applied HANA data modeling for AI retrieval: optimized for query flexibility and materialization, not just OLTP normalization.

## Education

### Malla Reddy Engineering College — Hyderabad, India
**Bachelor of Technology — Computer Science**

## Languages

- English (Professional Working)
