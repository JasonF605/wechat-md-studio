---
name: wechat-md-studio
description: Format Markdown articles for WeChat Official Account publishing with the local wechat-md-studio CLI. Use when Codex needs to convert `.md` articles to WeChat-compatible inline HTML, preview a WeChat article, recommend or override a theme based on topics such as AI monetization, science explainers, food, health, tutorials, essays, or news, inspect article metadata/readiness, prepare copy-paste publishing output, or explicitly create a WeChat Official Account draft through the official API.
---

# WeChat MD Studio

## Overview

Use the local `wechat-md-studio` CLI to turn Markdown into WeChat-friendly inline HTML, pick a theme, and create preview files. The formatter is local-first and does not require paid API keys for conversion or preview.

## Workflow

1. Inspect or recommend first when the user has not chosen a theme.
2. Generate a preview before final copy/publish work.
3. Format to an HTML snippet only after the article path and theme are clear.
4. Use `--copy` only when the user asks to place HTML on the clipboard.
5. Create WeChat drafts only when the user explicitly asks for draft creation or upload to the WeChat draft box.

## Commands

Use the repo-local binary when working inside the project:

```bash
node ./bin/wechat-md-studio.js recommend <article.md> --json
node ./bin/wechat-md-studio.js inspect <article.md> --json
node ./bin/wechat-md-studio.js preview <article.md> --theme auto --out dist/article.preview.html
node ./bin/wechat-md-studio.js format <article.md> --theme auto --out dist/article.html
node ./bin/wechat-md-studio.js doctor --json
node ./bin/wechat-md-studio.js draft <article.md> --cover <cover.jpg|first> --theme auto --dry-run --json
node ./bin/wechat-md-studio.js draft <article.md> --cover <cover.jpg|first> --theme auto --json
```

Use the installed binary when available:

```bash
wechat-md-studio preview <article.md> --theme auto --open
wmd format <article.md> --theme tech-pulse --copy
wmd draft <article.md> --cover first --theme auto --json
```

## Theme Selection

- Use `--theme auto` unless the user requests a specific theme.
- Use `tech-pulse` for AI monetization, tools, automation, workflow, and side-hustle articles.
- Use `science-clean` for science explainers, research, mechanism, and educational articles.
- Use `food-magazine` for food, recipes, restaurants, and lifestyle food writing.
- Use `health-trust` for health, elder care, safety reminders, and medical literacy.
- Use `github-doc` for tutorials, API notes, code, deployment, and tool documentation.
- Use `essay-paper` for personal essays, diaries, field notes, and reflective posts.
- Use `news-brief` for timely announcements, policy, news commentary, and official updates.
- Use `minimal-ink` when the signal is weak or the user wants a quiet evergreen style.

## Output Rules

- Keep source Markdown read-only unless the user asks to edit it.
- Write generated HTML under `dist/` by default or the user-specified output path.
- Report the selected theme, output path, and whether clipboard copy was performed.
- If preview is requested, return the preview HTML file path and mention that `--open` opens it in a browser.
- If a command fails, run `inspect` or `recommend --json` to narrow whether the issue is parsing, theme selection, or output path.
- Run `draft --dry-run --json` before creating a live WeChat draft unless the user explicitly asks to publish immediately.
- Never print full AppSecret values, access tokens, or `.env` contents.
- Draft creation requires `WECHAT_APPID`, `WECHAT_APPSECRET` or `WECHAT_SECRET`, and a cover via `--cover`, `--thumb-media-id`, or `WECHAT_THUMB_MEDIA_ID`.
- Local article images are uploaded to WeChat during live `draft`; dry-run uses placeholders.
- This skill creates drafts only. It does not mass-send or publish.

## Useful Checks

```bash
node ./bin/wechat-md-studio.js themes list
node ./bin/wechat-md-studio.js themes show tech-pulse --json
node ./bin/wechat-md-studio.js inspect examples/ai-money.md --json
node ./bin/wechat-md-studio.js draft examples/ai-money.md --thumb-media-id TEST_THUMB_MEDIA_ID --dry-run --json
npm run smoke
```

Read `references/theme-routing.md` only when tuning or explaining theme recommendation behavior.
