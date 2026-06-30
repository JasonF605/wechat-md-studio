# 文章号工作流

`workflow` 是 WeChat MD Studio 的流程外壳。它模仿成熟内容 Skill 的“总控台”形式，但不把所有能力塞进核心排版器。

## 设计原则

- `wechat-md-studio` 只做内容发布工作台：排版、预览、主题、配图提示词、小红书包、内容总账、草稿箱 API。
- `wechat-content-workflow` 做文章号 SOP：读知识库、跑检查、生成工作流报告、提醒人工确认。
- 选题、写作、热点、长期知识库、数据复盘可以是上游 Skill，不放进排版核心。
- WordPress、小红书、知识星球等平台可以做适配器，不把平台逻辑写死在渲染器里。

## 命令

```bash
wechat-md-studio workflow article.md --theme auto --out-dir dist/article-workflow
```

它会生成：

```text
workflow-report.md
workflow-report.json
wechat.html
preview.html
image2-prompts.md
xhs.md
xhs.json
publish-checklist.md
```

## 什么时候用 workflow

- 文章写完后，要走完整发布前自检。
- 想同时准备公众号和小红书素材。
- 想让 Codex 像运营助手一样给出下一步。
- 要把文章接入知识库、草稿箱或未来自动化任务。

如果你只想要 HTML 和预览，用 `preview` 或 `format`。

如果你只想要普通发布素材包，用 `package`。

## Codex 用法

安装 skill 后，可以这样对 Codex 说：

```text
Use $wechat-content-workflow to run the article account SOP for articles/today.md.
```

Codex 应该：

1. 先确认文章路径。
2. 如有知识库、旧稿、废稿或多渠道目录，先跑 `catalog`。
3. 跑 `workflow`。
4. 汇报主题、输出目录、风险提醒和下一步。
5. 只有用户明确要求时，才跑 `draft --dry-run` 或 live draft。

## 安全边界

- 缺少 frontmatter 的内容不进入批量发布队列。
- `archived`、`deleted` 内容不自动复活。
- 草稿箱创建前先 dry-run。
- 公众号最终群发/发布需要人工扫码或点击确认。
- 不打印 AppSecret、access token、完整 `.env`。
