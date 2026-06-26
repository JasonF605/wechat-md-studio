import path from "node:path";
import { readArticle } from "./markdown.js";
import { recommendTheme } from "./recommend.js";
import { renderArticleHtml, renderPreviewPage } from "./renderer.js";
import { getTheme, listThemes } from "./themes/catalog.js";
import {
  buildDraftPayload,
  createDraftFromArticle,
  doctorWechatConfig,
  getStableAccessToken,
  uploadPermanentImage
} from "./wechat.js";
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

  if (command === "doctor") {
    runDoctor(rest);
    return;
  }

  if (command === "token") {
    await runToken(rest);
    return;
  }

  if (command === "upload-cover") {
    await runUploadCover(rest);
    return;
  }

  if (command === "draft") {
    await runDraft(rest);
    return;
  }

  if (["recommend", "inspect", "format", "preview"].includes(command)) {
    runArticleCommand(command, rest);
    return;
  }

  if (command === "version" || command === "--version") {
    console.log("wechat-md-studio 0.2.0");
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

function runDoctor(args) {
  const { flags } = parseFlags(args);
  printResult(doctorWechatConfig(), flags);
}

async function runToken(args) {
  const { flags } = parseFlags(args);
  const token = await getStableAccessToken({ forceRefresh: flags["force-refresh"] === true });
  printResult(
    {
      ok: true,
      accessTokenPrefix: `${token.slice(0, 8)}...`,
      length: token.length
    },
    flags
  );
}

async function runUploadCover(args) {
  const { positional, flags } = parseFlags(args);
  const input = positional[0] || flags.image;
  if (!input) throw new Error("upload-cover requires an image path.");
  const token = await getStableAccessToken();
  const result = await uploadPermanentImage(input, token);
  printResult(
    {
      image: toPosixPath(path.resolve(input)),
      mediaId: result.media_id,
      url: result.url || "",
      raw: flags.raw ? result : undefined
    },
    flags
  );
}

async function runDraft(args) {
  const { positional, flags } = parseFlags(args);
  const input = positional[0];
  if (!input) throw new Error("draft requires a Markdown file path.");

  const article = readArticle(input);
  const recommendation = recommendTheme(article, flags.theme || "auto");
  const theme = recommendation.theme;
  const options = {
    cwd: path.dirname(path.resolve(input)),
    theme,
    recommendation,
    title: flags.title,
    truncateTitle: flags["truncate-title"] === true,
    author: flags.author,
    digest: flags.digest,
    sourceUrl: flags["source-url"],
    thumbMediaId: flags["thumb-media-id"],
    cover: flags.cover,
    openComment: flags["open-comment"] === true,
    fansComment: flags["fans-comment"] === true,
    externalImages: flags["external-images"] || "fail",
    dryRun: flags["dry-run"] === true
  };

  if (options.dryRun) {
    const { payload, warnings } = await buildDraftPayload(article, options);
    printResult(
      {
        dryRun: true,
        input: toPosixPath(path.resolve(input)),
        title: payload.articles[0].title,
        theme: theme.id,
        label: theme.label,
        contentLength: payload.articles[0].content.length,
        contentBytes: Buffer.byteLength(payload.articles[0].content, "utf8"),
        warnings,
        payload: flags.payload ? payload : undefined
      },
      flags
    );
    return;
  }

  const { result, warnings } = await createDraftFromArticle(article, options);
  printResult(
    {
      created: true,
      input: toPosixPath(path.resolve(input)),
      mediaId: result.media_id,
      theme: theme.id,
      label: theme.label,
      warnings,
      raw: flags.raw ? result : undefined
    },
    flags
  );
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
    if (value === undefined) continue;
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
  wechat-md-studio doctor [--json]
  wechat-md-studio token [--force-refresh] [--json]
  wechat-md-studio upload-cover <cover.jpg> [--json]
  wechat-md-studio draft <article.md> --cover <cover.jpg|first> [--theme auto|theme-id] [--dry-run] [--json]
  wechat-md-studio themes list [--json]
  wechat-md-studio themes show <theme-id> [--json]

Examples:
  wechat-md-studio format examples/ai-money.md --out dist/article.html
  wechat-md-studio preview examples/science.md --theme science-clean
  wechat-md-studio recommend examples/food.md --json
  wechat-md-studio draft examples/ai-money.md --thumb-media-id MEDIA_ID --dry-run --json
`);
}
