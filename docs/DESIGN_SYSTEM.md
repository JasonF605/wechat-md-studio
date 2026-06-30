# 公众号 DESIGN.md 设计系统

`wechat-md-studio` 从 v0.5 开始支持公众号版 `DESIGN.md`。

它借鉴 Google Labs `design.md` 的思路：用机器可读的设计 token 加上人类可读的设计意图，让 AI Agent 不只是“换个颜色”，而是稳定理解一套公众号视觉规范。

## 为什么不直接照搬网页 DESIGN.md

微信公众号编辑器和网页应用不同：

- 公众号正文主要依赖 inline HTML。
- 外部字体、复杂选择器、复杂布局不稳定。
- 手机阅读优先，正文 16px / 1.8 行高比大屏网页更重要。
- 文章排版需要 H1、H2、引用、列表、表格、图片说明这些内容组件，而不是导航栏、按钮、仪表盘。

所以本项目的 `DESIGN.md` 面向微信公众号文章，而不是 Web App UI。

## 生成主题 DESIGN.md

```bash
wechat-md-studio themes design tech-pulse --out dist/tech-pulse.DESIGN.md
```

输出内容包含：

- YAML frontmatter：颜色、字号、间距、圆角、微信兼容规则
- Markdown 正文：主题气质、适用文章、组件规则、不要做什么

## 校验主题设计

```bash
wechat-md-studio themes lint
wechat-md-studio themes lint tech-pulse --json
wechat-md-studio themes lint --strict
```

当前 lint 会检查：

- 必需颜色 token 是否完整
- token 是否为十六进制颜色
- 正文、浅底、代码块对比度是否达标
- 主题描述是否足够
- 是否有对应的人类设计说明

这一步是给自动化和开源贡献者用的：主题不是看起来能跑就行，还要能被 Agent 稳定理解。

## 导出设计 token

```bash
wechat-md-studio themes export health-trust --out dist/health-trust.tokens.json
```

导出的 JSON 可以给其他渲染器、预览站、自有站或未来的主题编辑器使用。

## 和现有主题的关系

`src/themes/catalog.js` 仍然是运行时主题来源。

`DESIGN.md` 是面向 Agent 和贡献者的设计说明层：

- 让新主题更容易被理解
- 让已有主题更容易被校验
- 让不同文章类型的视觉风格更稳定
- 避免生成“AI 模板味”的蓝紫渐变页面

## 推荐贡献流程

1. 在 `src/themes/catalog.js` 添加主题 token。
2. 给主题补充清晰的描述和 categories。
3. 如需更强风格说明，在 `src/design-system.js` 添加 guidance。
4. 运行：

```bash
npm test
npm run smoke
wechat-md-studio themes lint --strict
```

5. 生成样张：

```bash
wechat-md-studio themes design <theme-id> --out dist/<theme-id>.DESIGN.md
wechat-md-studio preview examples/ai-money.md --theme <theme-id> --out dist/<theme-id>.preview.html
```

## 当前限制

- v0.5 先支持从内置主题生成 DESIGN.md。
- 暂不支持从任意外部 DESIGN.md 导入为主题。
- 暂不做 Tailwind 导出，因为本项目核心目标是微信公众号 inline HTML。

后续可以继续做：

- 外部 DESIGN.md 导入
- 主题预览画廊
- 每个账号的品牌 profile
- 更细的组件级设计 token
