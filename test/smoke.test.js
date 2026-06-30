import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { readArticle } from "../src/markdown.js";
import { recommendTheme } from "../src/recommend.js";
import { renderArticleHtml, renderPreviewPage } from "../src/renderer.js";
import { buildDraftPayload } from "../src/wechat.js";
import {
  buildContentCatalog,
  filterCatalogItems,
  renderFrontmatterTemplate
} from "../src/catalog.js";
import {
  buildVisualPlan,
  buildXhsPack,
  renderVisualPlanMarkdown,
  renderXhsMarkdown
} from "../src/distribution.js";
import {
  exportThemeDesignTokens,
  lintAllThemeDesigns,
  lintThemeDesign,
  renderThemeDesignMarkdown
} from "../src/design-system.js";

const cases = [
  ["examples/ai-money.md", "tech-pulse"],
  ["examples/science.md", "science-clean"],
  ["examples/food.md", "food-magazine"]
];

for (const [file, expectedTheme] of cases) {
  const article = readArticle(file);
  const recommendation = recommendTheme(article);
  assert.equal(
    recommendation.theme.id,
    expectedTheme,
    `${file} should recommend ${expectedTheme}, got ${recommendation.theme.id}`
  );
}

const article = readArticle("examples/ai-money.md");
const recommendation = recommendTheme(article);
const html = renderArticleHtml(article, {
  theme: recommendation.theme,
  recommendation
});

assert.match(html, /data-wmd-theme="tech-pulse"/);
assert.match(html, /style="/);
assert.match(html, /<h1/);
assert.match(html, /<table/);

const preview = renderPreviewPage(article, {
  theme: recommendation.theme,
  recommendation
});

assert.match(preview, /Copy WeChat HTML/);
assert.match(preview, /<textarea/);

const { payload, warnings } = await buildDraftPayload(article, {
  theme: recommendation.theme,
  recommendation,
  thumbMediaId: "TEST_THUMB_MEDIA_ID",
  dryRun: true
});

assert.equal(payload.articles.length, 1);
assert.equal(payload.articles[0].thumb_media_id, "TEST_THUMB_MEDIA_ID");
assert.equal(payload.articles[0].article_type, "news");
assert.match(payload.articles[0].content, /data-wmd-theme="tech-pulse"/);
assert.deepEqual(warnings, []);

const visualPlan = buildVisualPlan(article, recommendation, { count: 2 });
assert.equal(visualPlan.provider, "image2 / gpt-image-2");
assert.equal(visualPlan.inline.length, 2);
assert.match(visualPlan.cover.prompt, /微信公众号封面/);
assert.match(renderVisualPlanMarkdown(visualPlan), /image2 配图提示词/);

const xhsPack = buildXhsPack(article, recommendation, { cards: 6 });
assert.equal(xhsPack.platform, "xiaohongshu");
assert.equal(xhsPack.cards.length, 6);
assert.match(xhsPack.cards[0].prompt, /小红书图文卡/);
assert.match(renderXhsMarkdown(xhsPack), /小红书图文分发包/);

const catalogRoot = fs.mkdtempSync(path.join(os.tmpdir(), "wmd-catalog-"));
fs.mkdirSync(path.join(catalogRoot, "2026-06-27-published-article"), { recursive: true });
fs.writeFileSync(
  path.join(catalogRoot, "2026-06-27-published-article", "post.md"),
  `---
title: 已发布文章
date: 2026-06-27
channel: article
status: published
series: test
site: true
wechat_draft: true
xhs: true
---

# 已发布文章

这篇应该进入自有站、公众号草稿链路和小红书分发包。
`,
  "utf8"
);
fs.mkdirSync(path.join(catalogRoot, "2026-06-27-image-post"), { recursive: true });
fs.writeFileSync(
  path.join(catalogRoot, "2026-06-27-image-post", "post.md"),
  `---
title: 贴图内容
date: 2026-06-27
channel: image-post
status: published
site: true
xhs: true
---

# 贴图内容

这篇可以做小红书，但不能进入文章号自有站。
`,
  "utf8"
);
fs.mkdirSync(path.join(catalogRoot, "2026-06-27-legacy"), { recursive: true });
fs.writeFileSync(
  path.join(catalogRoot, "2026-06-27-legacy", "post.md"),
  "# 旧稿\n\n没有 frontmatter，不能默认发布。\n",
  "utf8"
);

const catalog = buildContentCatalog(catalogRoot, { today: "2026-06-27" });
assert.equal(catalog.total, 3);
assert.equal(catalog.summary.eligible.site, 1);
assert.equal(catalog.summary.eligible.wechatDraft, 1);
assert.equal(catalog.summary.eligible.xhs, 2);
assert.equal(filterCatalogItems(catalog.items, { site: true }).length, 1);
assert.equal(filterCatalogItems(catalog.items, { xhs: true }).length, 2);
assert.ok(catalog.warnings.some((warning) => warning.code === "missing_frontmatter"));
assert.match(renderFrontmatterTemplate({ channel: "article", status: "published", site: true }), /site: true/);

const designMd = renderThemeDesignMarkdown("tech-pulse");
assert.match(designMd, /platform: wechat-official-account/);
assert.match(designMd, /WeChat Rendering Rules/);
assert.match(designMd, /AI Side Hustle Tech DESIGN\.md/);

const designTokens = exportThemeDesignTokens("health-trust");
assert.equal(designTokens.platform, "wechat-official-account");
assert.equal(designTokens.renderer, "inline-html");
assert.equal(designTokens.tokens.typography.body.fontSize, "16px");

const singleThemeLint = lintThemeDesign("tech-pulse");
assert.equal(singleThemeLint.summary.error, 0);
assert.ok(singleThemeLint.findings.some((finding) => finding.path.startsWith("contrast.")));

const allThemeLint = lintAllThemeDesigns();
assert.equal(allThemeLint.summary.error, 0);
assert.ok(allThemeLint.results.length >= 8);

console.log("All smoke tests passed.");
