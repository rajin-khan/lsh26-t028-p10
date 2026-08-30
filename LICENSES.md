# Third-party licences

KotoDin contains no copied template, UI kit, stock image, external icon set, chart library, analytics SDK, database SDK, or redistributed font file. The interface, SVG chart, meter mark, and icons are original code created during the event. CSS uses locally available system font families and does not redistribute their files.

## Runtime dependencies

| Material | Version | Licence | Use |
| --- | --- | --- | --- |
| Next.js | 16.2.11 | MIT | Application framework and Vercel build |
| React | 19.2.4 | MIT | Interface runtime |
| React DOM | 19.2.4 | MIT | Browser rendering |

## Development dependencies and tools

| Material | Version | Licence | Use |
| --- | --- | --- | --- |
| TypeScript | 5.8.3 | Apache-2.0 | Strict type checking |
| @types/node | 22.15.30 | MIT | Node.js type declarations |
| @types/react | 19.1.8 | MIT | React type declarations |
| @types/react-dom | 19.1.6 | MIT | React DOM type declarations |
| pnpm | 10.28.2 | MIT | Package manager; all packages were reused from the existing local store with zero downloads |

## Data and event material

`data/P10_prepaid_meter_public.json` is the official LofiStack Hackathon 2026 P10 public fixture, release 2.1, supplied to participants for this problem. `EVENT.md`, the problem statement, tariff, clarifications, and manifest fields come from the same event participant materials.

## AI assistance

OpenAI Codex assisted with research, prior-project audits, planning, domain modeling, source implementation, tests, documentation, and browser QA under the team lead's direction. AI use is disclosed in `evaluation-manifest.json`; the team verified the result with deterministic tests, TypeScript, a production build, and browser checks.
