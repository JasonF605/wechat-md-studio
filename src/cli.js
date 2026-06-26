import path from "node:path";
import { readArticle } from "./markdown.js";
import { recommendTheme } from "./recommend.js";
import { renderArticleHtml, renderPreviewPage } from "./renderer.js";
import { getTheme, listThemes } from "./themes/catalog.js";
import {
  copyToClipboard,
  openInBrowser,
  parseFlags,
  slugify,
  toPosixPath,
  writeText
} from "./utils.js";

export async function runCli(argv) {
  const [command, ...rest] = argv;

  if (!command || command === "-h" || command === "--help") {
    printHelp();
    return;
  }

  if (command === "themes") {
    runThemes(rest);
    return;
  }

  if (["recommend", "inspect", "format", "preview"].includes(command)) {
    runArticleCommand(command, rest);
    return;
  }

  if (command === "version" || command === "--version") {
    console.log("wechat-md-studio 0.1.0");
    return;
  }

  throw new Error(`Unknown command "${command}". Run "wechat-md-studio --help".`);
}

function runArticleCommand(command, args) {
  const { positional, flags } = parseFlags(args);
  const input = positional[0];
  if (!input) throw new Error(`${command} requires a Markdown file path.`);

  const article = readArticle(input);
  const recommendation = recommendTheme(article, flags.theme || "auto");
  const theme = recommendation.theme;

  if (command === "recommend") {
    const result = {
      input: toPosixPath(path.resolve(input)),
      title: article.title,
      theme: theme.id,
      label: theme.label,
      confidence: recommendation.confidence,
      category: recommendation.category,
      reason: recommendation.reason,
      analysis: recommendation.analysis
    };
    printResult(result, flags);
    return;
  }

  if (command === "inspect") {
    const counts = countBlocks(article.blocks);
    const result = {
      input: toPosixPath(path.resolve(input)),
      title: article.title,
      metadata: article.metadata,
      blocks: counts,
      recommendedTheme: {
        id: theme.id,
        label: theme.label,
        confidence: recommendation.confidence,
        reason: recommendation.reason
      }
    };
    printResult(result, flags);
    return;
  }

  const html =
    command === "preview"
      ? renderPreviewPage(article, { theme, recommendation })
      : renderArticleHtml(article, { theme, recommendation, includeMeta: flags.meta === "true" });

  const out = flags.out || defaultOutPath(input, article.title, command);
  writeText(out, html);

  if (flags.copy) copyToClipboard(command === "preview" ? renderArticleHtml(article, { theme, recommendation }) : html);
  if (flags.open) openInBrowser(out);

  const result = {
    input: toPosixPath(path.resolve(input)),
    output: toPosixPath(path.resolve(out)),
    theme: theme.id,
    label: theme.label,
    command
  };
  printResult(result, flags);
}

function runThemes(args) {
  const { positional, flags } = parseFlags(args);
  const subcommand = positional[0] || "list";

  if (subcommand === "list") {
    printResult({ themes: listThemes() }, flags);
    return;
  }

  if (subcommand === "show") {
    const themeId = positional[1];
    if (!themeId) throw new Error("themes show requires a theme id.");
    printResult(getTheme(themeId), flags);
    return;
  }

  throw new Error(`Unknown themes subcommand "${subcommand}".`);
}

function printResult(result, flags = {}) {
  if (flags.json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (result.themes) {
    for (const theme of result.themes) {
      console.log(`${theme.id.padEnd(15)} ${theme.label} - ${theme.description}`);
    }
    return;
  }

  if (result.tokens) {
    console.log(`${result.id} - ${result.label}`);
    console.log(result.description);
    console.log(`Categories: ${result.categories.join(", ")}`);
    return;
  }

  for (const [key, value] of Object.entries(result)) {
    if (typeof value === "object") {
      console.log(`${key}: ${JSON.stringify(value, null, 2)}`);
    } else {
      console.log(`${key}: ${value}`);
    }
  }
}

function defaultOutPath(input, title, command) {
  const slug = slugify(title || path.basename(input, path.extname(input)));
  const suffix = command === "preview" ? "preview.html" : "wechat.html";
  return path.join("dist", `${slug}.${suffix}`);
}

function countBlocks(blocks) {
  return blocks.reduce((acc, block) => {
    acc.total += 1;
    acc[block.type] = (acc[block.type] || 0) + 1;
    return acc;
  }, { total: 0 });
}

function printHelp() {
  console.log(`WeChat MD Studio

Usage:
  wechat-md-studio recommend <article.md> [--json]
  wechat-md-studio inspect <article.md> [--json]
  wechat-md-studio format <article.md> [--theme auto|theme-id] [--out file.html] [--copy] [--json]
  wechat-md-studio preview <article.md> [--theme auto|theme-id] [--out file.html] [--open] [--json]
  wechat-md-studio themes list [--json]
  wechat-md-studio themes show <theme-id> [--json]

Examples:
  wechat-md-studio format examples/ai-money.md --out dist/article.html
  wechat-md-studio preview examples/science.md --theme science-clean
  wechat-md-studio recommend examples/food.md --json
`);
}
