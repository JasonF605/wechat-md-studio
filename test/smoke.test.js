import assert from "node:assert/strict";
import { readArticle } from "../src/markdown.js";
import { recommendTheme } from "../src/recommend.js";
import { renderArticleHtml, renderPreviewPage } from "../src/renderer.js";

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

console.log("All smoke tests passed.");
