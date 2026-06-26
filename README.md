# WeChat MD Studio

Free, local-first Markdown formatter for WeChat Official Account articles.

It turns Markdown into WeChat-friendly inline HTML, recommends a theme from the article topic, generates a local preview page, and ships with a Codex skill wrapper for agent-assisted publishing workflows.

## Why This Exists

Many WeChat Markdown tools are either web-only, hard to automate, or place the best formatting behind a hosted API. WeChat MD Studio keeps the core workflow free and local:

- Write Markdown.
- Let the tool choose a suitable theme.
- Preview locally.
- Copy HTML into the WeChat editor.
- Optionally extend it with official WeChat draft APIs later.

No paid API key is required for local formatting.

## Features

- Markdown to WeChat-compatible inline HTML.
- Smart theme recommendation for AI monetization, tutorials, science, food, health, essays, and news.
- Local preview page with one-click HTML copy.
- Theme catalog with human-readable design intent.
- CLI commands for formatting, previewing, inspection, and recommendations.
- Codex skill wrapper in `skills/wechat-md-studio`.
- MIT licensed and designed for self-hosting, forks, and community themes.

## Quick Start

```bash
git clone https://github.com/your-name/wechat-md-studio.git
cd wechat-md-studio
node ./bin/wechat-md-studio.js recommend examples/ai-money.md
node ./bin/wechat-md-studio.js format examples/ai-money.md --out dist/ai-money.html
node ./bin/wechat-md-studio.js preview examples/ai-money.md --out dist/ai-money.preview.html --open
```

After publishing to npm:

```bash
npm install -g wechat-md-studio
wechat-md-studio preview article.md --theme auto --open
```

## CLI

```bash
wechat-md-studio recommend <article.md> [--json]
wechat-md-studio inspect <article.md> [--json]
wechat-md-studio format <article.md> [--theme auto|theme-id] [--out file.html] [--copy] [--json]
wechat-md-studio preview <article.md> [--theme auto|theme-id] [--out file.html] [--open] [--json]
wechat-md-studio themes list [--json]
wechat-md-studio themes show <theme-id> [--json]
```

Short alias after install:

```bash
wmd preview article.md --open
```

## Theme Recommendation

The first version uses a transparent rule engine instead of a black-box model. It scores article content and structure, then maps the dominant signal to a theme.

| Topic signal | Default theme |
| --- | --- |
| AI赚钱, tools, automation, workflow | `tech-pulse` |
| Tutorial, code, API, deployment | `github-doc` |
| Science, research, mechanism | `science-clean` |
| Food, recipe, restaurant, lifestyle | `food-magazine` |
| Health, safety, elder care | `health-trust` |
| Personal essay, field notes | `essay-paper` |
| News, official updates, commentary | `news-brief` |
| Weak signal | `minimal-ink` |

You can always override it:

```bash
wechat-md-studio format article.md --theme health-trust
```

## Markdown Support

Current support:

- Frontmatter: `title`, `description`, `category`.
- Headings.
- Paragraphs and inline emphasis.
- Links.
- Images.
- Blockquotes.
- Ordered and unordered lists.
- Fenced code blocks.
- Tables.
- Horizontal rules.

## Codex Skill

The skill wrapper lives at:

```text
skills/wechat-md-studio
```

Use it in Codex-style environments as:

```text
Use $wechat-md-studio to format this Markdown article for WeChat.
```

The skill calls the local CLI and follows a safe flow: inspect, recommend, preview, then format or copy only when requested.

## Roadmap

See [docs/ROADMAP.md](docs/ROADMAP.md).

## Project Status

This is an early v0.1 scaffold. The local formatter works, but the project still needs real-world article testing, more themes, browser copy validation against WeChat's editor, and optional draft publishing.

## License

MIT.
