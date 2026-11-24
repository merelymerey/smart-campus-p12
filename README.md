# AI-Driven Software Engineering — Practice #12: code-based vs low-code

Bakhytzhan Merey · 24B030999 · Tuesday 13:00–16:00 · 24 Nov 2026

Smart Campus Room Availability Checker built twice from one shared contract.

**Report (everything in one PDF):** [`report/Practice12_Bakhytzhan_Merey.pdf`](report/Practice12_Bakhytzhan_Merey.pdf)

| | |
|---|---|
| Live demo, code-based | https://merelymerey.github.io/smart-campus-p12/code-based/ |
| Live demo, low-code (Appsmith, public) | https://app.appsmith.com/app/smart-campus-p12-low-code/page1-6b05614eb238dbe867c49a0e |
| Low-code export | [`low-code/appsmith-export.json`](low-code/appsmith-export.json) |

## Folders

* `contract/` — user story, six acceptance criteria, inputs/outputs, common test inputs (written first)
* `code-based/` — static HTML/JavaScript implementation; `npm install && npm test && npm run serve`
* `low-code/` — Appsmith export, the `Rules` JS object (AI version and final)
* `evidence/` — baseline record, AI prompts and answers, test results, time log, effort and defects, npm audit
* `screenshots/` — both implementations and their test results
* `report/` — report source (`report.md`) and the PDF

## Result

| Criterion | Code-based | Low-code |
|---|---|---|
| Functional tests | 8 / 8 | 8 / 8 (after one repair) |
| Build and repair time (AI-operated) | 4.2 min | about 10.9 min |
| Unresolved defects | 0 | 2 |

## AI tools

Claude Code CLI 2.1.331 (Anthropic): working session `claude-fable-5-2`; three headless sessions
(`claude -p`) with `claude-opus-5-5` for the implementation and review prompts. Exact prompts and
unedited answers are in `evidence/03-code-ai`, `evidence/04-lowcode-ai`, `evidence/08-review-ai`.
