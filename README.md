# WeChat MD Studio

一个免费、本地优先的微信公众号 Markdown 排版工具。

它可以把 Markdown 文章转换成微信公众号编辑器更容易粘贴的 inline HTML，并根据文章主题自动推荐排版风格。比如写 AI 赚钱、工具教程、科普、美食、健康提醒、个人随笔时，会自动匹配不同主题。

## 为什么做这个项目

很多公众号 Markdown 排版工具都有几个问题：

- 只能在线用，不方便接入自己的写作工作流。
- 自动化能力弱，批量处理或交给 Agent 调用不顺手。
- 好看的主题和高级排版依赖付费 API。
- 主题选择太机械，写什么内容都像同一个模板。

WeChat MD Studio 的目标是把核心排版能力做成免费的本地工具：

- 本地转换，不需要付费 API key。
- Markdown 写作，HTML 粘贴到公众号后台。
- 根据文章内容自动推荐主题。
- 可以被 Codex、Claude Code 等 Agent 调用。
- 后续可扩展到图片上传、草稿箱发布、品牌风格配置。

## 当前功能

- Markdown 转微信公众号兼容 inline HTML。
- 本地预览页，一键复制 HTML。
- 智能主题推荐。
- 推送到微信公众号草稿箱。
- 生成 image2 / gpt-image-2 封面和正文图提示词。
- 拆出小红书图文卡片脚本和提示词。
- 一键生成公众号 + 小红书多渠道发布包。
- 扫描内容目录，生成内容总账，区分文章号、贴图号、素材、草稿、废稿和公开站资格。
- 支持主题列表查看和手动指定主题。
- CLI 命令：推荐、检查、转换、预览、配图、小红书、分发包、内容总账。
- 内置 Codex Skill：`skills/wechat-md-studio`。
- MIT 开源协议，可自由 fork、二次开发、自托管。

## 快速开始

```bash
git clone https://github.com/JasonF605/wechat-md-studio.git
cd wechat-md-studio

node ./bin/wechat-md-studio.js recommend examples/ai-money.md
node ./bin/wechat-md-studio.js format examples/ai-money.md --out dist/ai-money.html
node ./bin/wechat-md-studio.js preview examples/ai-money.md --out dist/ai-money.preview.html --open
node ./bin/wechat-md-studio.js package examples/ai-money.md --out-dir dist/ai-money-package
```

如果以后发布到 npm，可以这样用：

```bash
npm install -g wechat-md-studio
wechat-md-studio preview article.md --theme auto --open
```

也可以使用短命令：

```bash
wmd preview article.md --open
```

## 常用命令

```bash
wechat-md-studio recommend <article.md> [--json]
wechat-md-studio inspect <article.md> [--json]
wechat-md-studio format <article.md> [--theme auto|theme-id] [--out file.html] [--copy] [--json]
wechat-md-studio preview <article.md> [--theme auto|theme-id] [--out file.html] [--open] [--json]
wechat-md-studio doctor [--json]
wechat-md-studio token [--force-refresh] [--json]
wechat-md-studio upload-cover <cover.jpg> [--json]
wechat-md-studio draft <article.md> --cover <cover.jpg|first> [--theme auto|theme-id] [--dry-run] [--json]
wechat-md-studio visuals <article.md> [--theme auto|theme-id] [--count 1-4] [--out prompts.md] [--json]
wechat-md-studio xhs <article.md> [--theme auto|theme-id] [--cards 4-9] [--out xhs.md] [--json]
wechat-md-studio package <article.md> [--theme auto|theme-id] [--out-dir dir] [--cards 4-9] [--visuals 1-4] [--json]
wechat-md-studio catalog [articles-dir] [--out content-index.json] [--site|--wechat|--xhs] [--json]
wechat-md-studio catalog template [--channel article|image-post|source] [--status draft|published]
wechat-md-studio themes list [--json]
wechat-md-studio themes show <theme-id> [--json]
```

例子：

```bash
wechat-md-studio recommend articles/post.md --json
wechat-md-studio preview articles/post.md --theme auto --open
wechat-md-studio format articles/post.md --theme tech-pulse --out dist/post.wechat.html
wechat-md-studio draft articles/post.md --cover cover.jpg --dry-run --json
wechat-md-studio visuals articles/post.md --out dist/post.image2-prompts.md
wechat-md-studio xhs articles/post.md --cards 6 --out dist/post.xhs.md
wechat-md-studio package articles/post.md --out-dir dist/post-package
wechat-md-studio catalog articles --out content-index.json
```

## 多渠道分发

`wechat-md-studio` 不只做公众号排版，也可以把文章拆成多渠道发布素材。

### image2 配图提示词

```bash
wechat-md-studio visuals article.md --theme auto --count 2 --out dist/article.image2-prompts.md
```

这个命令会根据文章主题和结构生成：

- 公众号封面提示词。
- 1-4 张正文结构图提示词。
- 小红书首图提示词。

默认出图工具是 `image2 / gpt-image-2`。工具只生成提示词，不自动调用付费图片 API。

### 小红书图文包

```bash
wechat-md-studio xhs article.md --cards 6 --out dist/article.xhs.md
```

它会输出：

- 小红书发布文案。
- 4-9 张图卡脚本。
- 每张图对应的 image2 提示词。
- 同名 `.json` 文件，方便后续接渲染器或自动化发布。

### 一键发布包

```bash
wechat-md-studio package article.md --out-dir dist/article-package
```

会生成一个完整目录：

```text
wechat.html
preview.html
image2-prompts.md
xhs.md
xhs.json
publish-checklist.md
```

推荐文章写完后先跑：

```bash
wechat-md-studio package article.md --out-dir dist/article-package
```

再按 `publish-checklist.md` 做排版、出图、dry-run 和草稿箱记录。

## 内容总账

如果你的目录里同时有文章号长文、贴图号内容、未来稿、废稿和资料卡，先不要直接把整个目录拿去建站或分发。用 `catalog` 生成内容总账：

```bash
wechat-md-studio catalog articles --out content-index.json
wechat-md-studio catalog articles --site
```

推荐每篇内容都补一段 frontmatter：

```markdown
---
title: 待发布内容标题
date: 2026-06-27
channel: article
status: draft
series: ai-money
site: false
wechat_draft: true
xhs: true
---
```

默认只有 `channel: article`、`status: published`、`site: true` 且日期不晚于今天的内容，才具备进入自有站的资格。没有 frontmatter 的旧稿会被列入 warning，不会默认当成可发布内容。

详细说明见 [docs/CONTENT_CATALOG.md](docs/CONTENT_CATALOG.md)。

## 智能主题推荐

第一版使用透明的规则引擎，不依赖大模型。工具会分析标题、正文、关键词和文章结构，再推荐一个适合的主题。

| 文章类型 | 推荐主题 |
| --- | --- |
| AI 赚钱、AI 工具、自动化、工作流 | `tech-pulse` |
| 代码教程、API、部署、工具说明 | `github-doc` |
| 科普、研究、原理解释、知识文章 | `science-clean` |
| 美食、菜谱、餐厅、生活方式 | `food-magazine` |
| 健康、安全提醒、老人照护、医学常识 | `health-trust` |
| 随笔、复盘、日记、个人观察 | `essay-paper` |
| 新闻、公告、政策、热点评论 | `news-brief` |
| 信号不明显的长文 | `minimal-ink` |

你也可以手动指定主题：

```bash
wechat-md-studio format article.md --theme health-trust
```

## Markdown 支持

当前支持：

- Frontmatter：`title`、`description`、`category`，以及内容总账使用的 `date`、`channel`、`status`、`series`、`site`、`wechat_draft`、`xhs`
- 标题
- 段落
- 加粗、斜体、行内代码
- 链接
- 图片
- 引用
- 有序列表和无序列表
- 代码块
- 表格
- 分割线

## Codex Skill

项目内置了一个 Codex Skill：

```text
skills/wechat-md-studio
```

在支持 Skill 的环境里，可以这样调用：

```text
Use $wechat-md-studio to format this Markdown article for WeChat.
```

它会走安全流程：先检查文章，再推荐主题，再生成预览，最后按需输出可复制的 HTML。

## 推送到草稿箱

先复制 `.env.example` 为 `.env`，填入公众号后台的 `WECHAT_APPID` 和 `WECHAT_APPSECRET`。

检查配置：

```bash
wechat-md-studio doctor
```

先 dry-run：

```bash
wechat-md-studio draft article.md --thumb-media-id TEST_THUMB_MEDIA_ID --dry-run --json
```

真正创建草稿：

```bash
wechat-md-studio draft article.md --cover cover.jpg --theme auto --json
```

也可以用文章里的第一张本地图片做封面：

```bash
wechat-md-studio draft article.md --cover first --theme auto --json
```

详细说明见 [docs/WECHAT_DRAFT.md](docs/WECHAT_DRAFT.md)。

## 路线图

详见 [docs/ROADMAP.md](docs/ROADMAP.md)。

接下来计划做：

- 更多中文公众号主题。
- 品牌风格配置。
- 主题预览画廊。
- 草稿箱更新和删除。
- 图片上传与替换。
- 健康、财经等高风险内容的发布前检查。
- 可选的大模型润色和主题判断。

## 项目状态

当前是早期 v0.4。基础转换、主题推荐、本地预览、草稿箱 dry-run、多渠道分发包和内容总账已经可用，但还需要更多真实公众号文章、小红书图文和自有站部署测试。

## 开源协议

MIT。
