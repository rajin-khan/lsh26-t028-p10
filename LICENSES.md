# Third-party licences

The application uses no copied UI template, UI kit, stock image, external icon set, chart library, analytics SDK, database SDK or redistributed font file. The interface, SVG chart, meter mark and icons are original code created during the event. CSS uses locally available system font families and does not redistribute their files.

## Runtime dependencies

| Material | Version | Licence | Use |
| --- | --- | --- | --- |
| Next.js | 16.2.11 | MIT | Application framework and production build |
| React | 19.2.4 | MIT | Interface runtime |
| React DOM | 19.2.4 | MIT | Browser rendering |

## Development dependencies and tools

| Material | Version | Licence | Use |
| --- | --- | --- | --- |
| TypeScript | 5.8.3 | Apache-2.0 | Strict type checking |
| @types/node | 22.15.30 | MIT | Node.js type declarations |
| @types/react | 19.1.8 | MIT | React type declarations |
| @types/react-dom | 19.1.6 | MIT | React DOM type declarations |
| pnpm | 10.28.2 | MIT | Package installation and lockfile management |

## Data and event material

`data/P10_prepaid_meter_public.json` is the official LofiStack Hackathon 2026 P10 public fixture from the v2.2 submission kit, supplied to participants for this problem. Its SHA-256 is `13e7dd3d0ad55429bdce1db4c70175bb6f6c60a197826b9a8e87d3da210e4c4e`.

The event record and manifest use the organizer's templates. The calculation follows the P10 problem statement, published tariff and v2.2 clarifications. The kit does not specify a separate licence for its fixture or templates; they are used here as supplied participant materials.

## AI assistance

OpenAI Codex assisted with research, prior-project review, planning, domain modeling, source implementation, tests, documentation and browser review under the team lead's direction. `evaluation-manifest.json` records the assistance and verification method. The README contains the automated checks and browser test steps.

## Original work

Everything not declared in this file, `EVENT.md` or `evaluation-manifest.json` was created by the registered team during the event window, with the AI assistance disclosed above. `EVENT.md` records the metadata that existed before 6:00 PM. No pre-existing P10 solution source, model, dataset or runtime artifact was copied from the projects reviewed by the team.
