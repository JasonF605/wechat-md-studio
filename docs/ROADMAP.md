# Roadmap

## v0.1 Local Formatting

- Markdown to inline WeChat HTML.
- Smart rule-based theme recommendation.
- Preview page with copy button.
- CLI commands.
- Codex skill wrapper.

## v0.2 WeChat Draft Publishing

- Official Account draft creation through WeChat APIs.
- Local article image upload and replacement.
- Cover image upload as permanent material.
- Dry-run payload validation.
- Safe config diagnostics that never print secrets.

## v0.3 Content Distribution

- image2 / gpt-image-2 cover and article-illustration prompts.
- Xiaohongshu card copy and image prompt packages.
- One-command WeChat + Xiaohongshu publishing package.
- Publishing checklist for preview, dry-run, images, and draft records.

## v0.4 Content Operations

- Content catalog command for article, image-post, source, and note files.
- Frontmatter conventions for channel, status, site, WeChat draft, and Xiaohongshu routing.
- Safe default that treats legacy files without frontmatter as not publishable.
- Strict mode for automation and static-site deployment gates.
- Content-index JSON output for self-owned sites and future multi-platform workflows.

## v0.5 Theme Design System

- WeChat-focused DESIGN.md generation for built-in themes.
- Theme lint command for token completeness, hex colors, and reading contrast.
- Theme token export for future preview galleries, self-owned sites, and editor tooling.
- Human-readable design intent for AI agents, adapted from DESIGN.md-style workflows.
- Agent guidance that avoids generic AI-looking color swaps and web-app-only layout assumptions.

Planned follow-ups:

- More theme packs for finance, education, travel, parenting, and product launches.
- Theme token editor.
- Visual gallery.
- Per-account brand profile.
- Typography density presets for short posts, long essays, and tutorials.

## v0.6 Workflow Shell

- Article-account workflow command that creates `workflow-report.md` and `workflow-report.json`.
- Baoyu-style operator shell through `skills/wechat-content-workflow` without bloating the core formatter.
- One-command SOP package: WeChat HTML, preview, image2 prompts, Xiaohongshu pack, checklist, and workflow gates.
- Content readiness checks for title length, structure, frontmatter, and channel status.
- Clear division between core formatter, workflow skill, upstream authoring, and downstream platform adapters.

Planned follow-ups:

- Multi-account profile support.
- Draft update and delete helpers.
- Cover image media handling improvements.
- Publish readiness checks for high-risk topics.
- Safe config diagnostics that never print secrets.

## v0.7 Intelligent Authoring

- Optional LLM theme reasoning.
- Article preflight checks.
- Hook and title suggestions.
- Compliance guardrails for health, finance, and sensitive claims.
- Rewrite suggestions that preserve the author's voice.

## v0.8 Community Platform

- Theme marketplace folder format.
- Contributor theme previews.
- Import/export theme packs.
- Browser extension or bookmarklet for WeChat editor handoff.
