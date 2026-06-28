# 内容总账与知识库入口

`wechat-md-studio catalog` 用来把内容生产目录变成一份可检查的总账，避免文章号、贴图号、废稿、未来稿和资料卡混在一起被误发布。

它借鉴的是内容工作流里最有用的一层：先把内容统一成 Markdown，再用 frontmatter 标清来源、状态和分发资格。它不会替你自动发布，也不会改动源文件。

## 推荐 frontmatter

文章号长文：

```markdown
---
title: 别再收藏 AI 教程了，能做出这 5 件事就可以开始赚钱
date: 2026-06-27
channel: article
status: published
series: ai-money
site: true
wechat_draft: true
xhs: true
---
```

贴图号内容：

```markdown
---
title: 爸妈手机防骗 9 个提醒
date: 2026-06-25
channel: image-post
status: published
series: parent-safety
site: false
wechat_draft: false
xhs: true
---
```

外部素材或资料卡：

```markdown
---
title: 一篇值得拆解的外部文章
date: 2026-06-27
channel: source
status: draft
source_type: article
source_url: https://example.com/article
tags: ai-workflow, example
---
```

## 状态约定

| status | 含义 |
| --- | --- |
| `idea` | 只有想法 |
| `draft` | 草稿 |
| `review` | 待自查或待用户确认 |
| `scheduled` | 已排期 |
| `published` | 已发布或允许进入公开站 |
| `archived` | 归档，不再分发 |
| `deleted` | 已删除或废稿，不再分发 |

## 发布资格

默认规则：

- 自有站：必须 `channel: article`、`status: published`、`site: true`，且日期不晚于今天。
- 公众号草稿：必须 `channel: article`，状态不是 `archived/deleted`，且 `wechat_draft: true`。
- 小红书：允许 `channel: article` 或 `channel: image-post`，状态不是 `archived/deleted`，且 `xhs: true`。
- 没有 frontmatter 的旧稿默认不具备公开发布资格，只会出现在总账和 warning 里。

## 常用命令

扫描内容目录：

```bash
wechat-md-studio catalog ../articles --json
```

生成内容总账：

```bash
wechat-md-studio catalog ../articles --out content-index.json
```

只看会进入自有站的内容：

```bash
wechat-md-studio catalog ../articles --site
```

生成 frontmatter 模板：

```bash
wechat-md-studio catalog template --channel article --status published --site true
wechat-md-studio catalog template --channel source
```

严格检查：

```bash
wechat-md-studio catalog ../articles --strict
```

`--strict` 会在存在 warning 时退出失败，适合以后接入定时任务或部署流程。
