---
name: wechat-content-workflow
description: "Run a structured Chinese WeChat content workflow around wechat-md-studio. Use when Codex needs to act like an article-account operator: plan or check a draft, use account knowledge, format Markdown, generate WeChat preview/output, prepare image2 prompts, prepare Xiaohongshu distribution, create a publishing checklist, or safely hand off to WeChat draft creation without mass publishing."
---

# WeChat Content Workflow

## Overview

Use this skill as the workflow shell for a Chinese content account. Keep `wechat-md-studio` as the formatting/publishing engine; this skill coordinates the SOP around it: knowledge intake, article readiness, WeChat package, Xiaohongshu package, draft-box safety, and review notes.

## Workflow

1. Identify the source article path and the intended account/channel.
2. Read local account notes or content catalog if the user mentions a knowledge base, old posts, deleted drafts, WordPress, or multi-channel publishing. Read `references/article-account-sop.md` for the detailed SOP in those cases.
3. Run an inspection or recommendation before formatting when the theme is not explicit.
4. Prefer the repo-local CLI when inside the project:

```bash
node ./bin/wechat-md-studio.js workflow <article.md> --theme auto --out-dir dist/<slug>-workflow --json
```

5. Use the generated `workflow-report.md` as the operator report. It should include theme, content warnings, channel plan, gates, outputs, and next actions.
6. Generate a live WeChat draft only when the user explicitly asks for draft creation. Run dry-run first unless the user clearly requested immediate draft creation:

```bash
node ./bin/wechat-md-studio.js draft <article.md> --cover <cover.jpg|first> --theme auto --dry-run --json
node ./bin/wechat-md-studio.js draft <article.md> --cover <cover.jpg|first> --theme auto --json
```

## Division Of Labor

- Use this skill for the operator workflow, account SOP, channel decisions, and final handoff summary.
- Use `wechat-md-studio` commands for Markdown parsing, theme selection, HTML rendering, preview generation, image2 prompts, Xiaohongshu packages, content catalog, design linting, and draft API calls.
- Do not put long-term article writing strategy, hot-topic scraping, or analytics code into `wechat-md-studio`; keep those as separate skills or upstream inputs.

## Recommended Commands

```bash
node ./bin/wechat-md-studio.js recommend <article.md> --json
node ./bin/wechat-md-studio.js inspect <article.md> --json
node ./bin/wechat-md-studio.js workflow <article.md> --out-dir dist/<slug>-workflow --json
node ./bin/wechat-md-studio.js catalog articles --out dist/content-index.json --json
node ./bin/wechat-md-studio.js themes lint --strict
```

Installed binary equivalents:

```bash
wmd workflow article.md --out-dir dist/article-workflow
wmd catalog articles --wechat --json
wmd draft article.md --cover first --dry-run --json
```

## Safety Rules

- Keep source Markdown read-only unless the user asks to edit it.
- Treat missing frontmatter as not publishable in catalog/batch flows.
- Keep old deleted, archived, or expired content out of queues unless explicitly re-enabled.
- Create WeChat drafts only; do not mass-send or final-publish.
- Never print AppSecret, access token, or full `.env` values.
- For Xiaohongshu, prepare copy and image-card prompts. Do not claim automatic draft-box support unless a verified platform API/automation exists.

## Output To User

Report:

- Selected theme and why.
- Workflow output directory.
- Key warnings from `workflow-report.md`.
- Whether a WeChat draft was only dry-run, created, or not touched.
- The exact next manual action, usually preview check, image generation, or WeChat backend confirmation.

Keep the reply Chinese-first for Chinese WeChat users.
