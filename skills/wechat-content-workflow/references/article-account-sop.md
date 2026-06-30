# Article Account SOP

## Boundaries

This workflow is an operator shell, not a giant content platform. Keep the responsibilities separate:

- `wechat-md-studio`: Markdown formatting, theme rendering, preview, image prompts, Xiaohongshu pack, catalog checks, WeChat draft API.
- `wechat-content-workflow`: account-specific SOP, knowledge lookup, readiness gates, final handoff.
- Upstream authoring skills: topic selection, article drafting, research, rewriting.
- Downstream platform skills: WordPress, knowledge base, analytics, scheduling, or other channels.

## Daily Article Flow

1. Confirm article path.
2. Read account notes if available: account positioning, banned topics, style examples, past article list.
3. Run `recommend` or `inspect` if the theme or article status is unclear.
4. Run `workflow` to create:
   - `wechat.html`
   - `preview.html`
   - `image2-prompts.md`
   - `xhs.md`
   - `xhs.json`
   - `publish-checklist.md`
   - `workflow-report.md`
   - `workflow-report.json`
5. Open or report the preview path.
6. Generate images through the user's selected image flow only after prompts are accepted.
7. Run `draft --dry-run --json` before live draft creation.
8. Create a live WeChat draft only when the user says to push/create/upload to draft box.
9. Leave final publish/mass-send to the user because WeChat requires human verification.

## Knowledge Base Rules

Use frontmatter to separate content types:

```markdown
---
title: 内容标题
date: 2026-06-30
channel: article
status: draft
series: ai-money
site: false
wechat_draft: true
xhs: true
---
```

Required before batch publishing:

- `channel`: `article`, `image-post`, `source`, or `note`
- `status`: `idea`, `draft`, `review`, `scheduled`, `published`, `archived`, or `deleted`
- `date`

Safe defaults:

- No frontmatter means not publishable.
- `archived` and `deleted` never enter draft queues.
- `source` is research material, not a publishable post.
- `image-post` may go to Xiaohongshu, but should not be treated as a long article by default.

## Review Gates

Before WeChat draft:

- Title is specific and not too long.
- Opening explains the reader problem quickly.
- Mobile preview has no overlapping text, oversized tables, or cramped blocks.
- Cover image exists or `thumb_media_id` is provided.
- Local images are available or external image behavior is explicit.
- Dry-run has passed.

Before Xiaohongshu:

- First card explains the topic in 3 seconds.
- Each card has one idea.
- Text is short enough for mobile reading.
- Caption is not a copy-paste of the full WeChat article.

Before self-owned site:

- `channel: article`
- `status: published`
- `site: true`
- Date is not in the future.
