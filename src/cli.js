import path from "node:path";
import { readArticle } from "./markdown.js";
import { recommendTheme } from "./recommend.js";
import { renderArticleHtml, renderPreviewPage } from "./renderer.js";
import { getTheme, listThemes } from "./themes/catalog.js";
import {
  buildPublishChecklist,
  buildVisualPlan,
  buildXhsPack,
  defaultDistributionSlug,
  renderVisualPlanMarkdown,
  renderXhsMarkdown
} from "./distribution.js";
import {
  buildContentCatalog,
  filterCatalogItems,
  renderFrontmatterTemplate
} from "./catalog.js";
import {
  exportThemeDesignTokens,
  lintAllThemeDesigns,
  lintThemeDesign,
  renderThemeDesignMarkdown
} from "./design-system.js";
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

  if (command === "visuals") {
    runVisuals(rest);
    return;
  }

  if (command === "xhs") {
    runXhs(rest);
    return;
  }

  if (command === "package" || command === "pack") {
    runPackage(rest);
    return;
  }

  if (command === "catalog") {
    runCatalog(rest);
    return;
  }

  if (["recommend", "inspect", "format", "preview"].includes(command)) {
    runArticleCommand(command, rest);
    return;
  }

  if (command === "version" || command === "--version") {
    console.log("wechat-md-studio 0.5.0");
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

  if (subcommand === "design") {
    const themeId = positional[1] || flags.theme || "minimal-ink";
    const markdown = renderThemeDesignMarkdown(themeId);
    if (flags.out) writeText(flags.out, markdown);
    if (!flags.out || flags.print) console.log(markdown);
    return;
  }

  if (subcommand === "lint") {
    const themeId = positional[1] || flags.theme;
    const result = themeId ? lintThemeDesign(themeId) : lintAllThemeDesigns();
    if (flags.strict && result.summary.error > 0) {
      printResult(result, flags);
      throw new Error(`Theme design lint failed with ${result.summary.error} error(s).`);
    }
    printResult(result, flags);
    return;
  }

  if (subcommand === "export") {
    const themeId = positional[1] || flags.theme || "minimal-ink";
    const result = exportThemeDesignTokens(themeId);
    if (flags.out) {
      writeText(flags.out, JSON.stringify(result, null, 2));
    }
    printResult({ kind: "theme-design-export", ...result }, flags);
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

function runVisuals(args) {
  const { positional, flags } = parseFlags(args);
  const input = positional[0];
  if (!input) throw new Error("visuals requires a Markdown file path.");

  const article = readArticle(input);
  const recommendation = recommendTheme(article, flags.theme || "auto");
  const plan = buildVisualPlan(article, recommendation, {
    count: flags.count,
    coverSize: flags["cover-size"],
    inlineSize: flags["inline-size"],
    xhsSize: flags["xhs-size"]
  });
  const out = flags.out || path.join("dist", `${defaultDistributionSlug(article)}.image2-prompts.md`);
  writeText(out, renderVisualPlanMarkdown(plan));

  printResult(
    {
      input: toPosixPath(path.resolve(input)),
      output: toPosixPath(path.resolve(out)),
      theme: recommendation.theme.id,
      label: recommendation.theme.label,
      provider: plan.provider,
      coverPrompt: plan.cover.prompt,
      inlinePrompts: plan.inline.length,
      plan: flags.json ? plan : undefined
    },
    flags
  );
}

function runXhs(args) {
  const { positional, flags } = parseFlags(args);
  const input = positional[0];
  if (!input) throw new Error("xhs requires a Markdown file path.");

  const article = readArticle(input);
  const recommendation = recommendTheme(article, flags.theme || "auto");
  const pack = buildXhsPack(article, recommendation, {
    cards: flags.cards,
    size: flags.size
  });
  const base = flags.out || path.join("dist", `${defaultDistributionSlug(article)}.xhs.md`);
  const jsonOut = flags["json-out"] || replaceExt(base, ".json");
  writeText(base, renderXhsMarkdown(pack));
  writeText(jsonOut, JSON.stringify(pack, null, 2));

  printResult(
    {
      input: toPosixPath(path.resolve(input)),
      output: toPosixPath(path.resolve(base)),
      jsonOutput: toPosixPath(path.resolve(jsonOut)),
      theme: recommendation.theme.id,
      label: recommendation.theme.label,
      provider: pack.provider,
      cards: pack.cards.length,
      hashtags: pack.hashtags,
      pack: flags.json ? pack : undefined
    },
    flags
  );
}

function runPackage(args) {
  const { positional, flags } = parseFlags(args);
  const input = positional[0];
  if (!input) throw new Error("package requires a Markdown file path.");

  const article = readArticle(input);
  const recommendation = recommendTheme(article, flags.theme || "auto");
  const theme = recommendation.theme;
  const slug = defaultDistributionSlug(article);
  const outDir = path.resolve(flags["out-dir"] || path.join("dist", `${slug}-publish-package`));

  const articleHtml = renderArticleHtml(article, { theme, recommendation, includeMeta: flags.meta === "true" });
  const previewHtml = renderPreviewPage(article, { theme, recommendation });
  const visualPlan = buildVisualPlan(article, recommendation, {
    count: flags.visuals,
    coverSize: flags["cover-size"],
    inlineSize: flags["inline-size"],
    xhsSize: flags["xhs-size"]
  });
  const xhsPack = buildXhsPack(article, recommendation, {
    cards: flags.cards,
    size: flags.size
  });

  const outputs = {
    wechatHtml: path.join(outDir, "wechat.html"),
    previewHtml: path.join(outDir, "preview.html"),
    image2Prompts: path.join(outDir, "image2-prompts.md"),
    xhsMarkdown: path.join(outDir, "xhs.md"),
    xhsJson: path.join(outDir, "xhs.json"),
    checklist: path.join(outDir, "publish-checklist.md")
  };

  writeText(outputs.wechatHtml, articleHtml);
  writeText(outputs.previewHtml, previewHtml);
  writeText(outputs.image2Prompts, renderVisualPlanMarkdown(visualPlan));
  writeText(outputs.xhsMarkdown, renderXhsMarkdown(xhsPack));
  writeText(outputs.xhsJson, JSON.stringify(xhsPack, null, 2));
  writeText(
    outputs.checklist,
    buildPublishChecklist(article, recommendation, mapValues(outputs, (filePath) => toPosixPath(path.resolve(filePath))))
  );

  printResult(
    {
      input: toPosixPath(path.resolve(input)),
      outDir: toPosixPath(outDir),
      theme: theme.id,
      label: theme.label,
      outputs: mapValues(outputs, (filePath) => toPosixPath(path.resolve(filePath))),
      xhsCards: xhsPack.cards.length,
      visualPrompts: visualPlan.inline.length + 2
    },
    flags
  );
}

function runCatalog(args) {
  const { positional, flags } = parseFlags(args);

  if (positional[0] === "template") {
    const template = renderFrontmatterTemplate({
      channel: flags.channel,
      status: flags.status,
      site: flags.site,
      xhs: flags.xhs,
      wechatDraft: flags["wechat-draft"] ?? flags.wechat_draft,
      series: flags.series,
      date: flags.date
    });
    if (flags.out) writeText(flags.out, template);
    if (!flags.out || flags.print) console.log(template.trimEnd());
    return;
  }

  const root = positional[0] || flags.root || "articles";
  const catalog = buildContentCatalog(root, {
    today: flags.today,
    timeZone: flags.timezone || flags["time-zone"]
  });
  const filters = {
    channel: flags.channel,
    status: flags.status,
    site: flags.site === true,
    wechat: flags.wechat === true,
    xhs: flags.xhs === true
  };
  const filteredItems = filterCatalogItems(catalog.items, filters);
  const result = {
    kind: "catalog",
    ...catalog,
    filters,
    total: filteredItems.length,
    unfilteredTotal: catalog.total,
    items: filteredItems
  };

  if (flags.out) {
    writeText(flags.out, JSON.stringify(result, null, 2));
  }

  if (flags.strict && catalog.warnings.length > 0) {
    throw new Error(`Catalog has ${catalog.warnings.length} warning(s). Run without --strict to inspect them.`);
  }

  printResult(result, flags);
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

  if (result.kind === "catalog") {
    console.log(`root: ${result.root}`);
    console.log(`today: ${result.today}`);
    console.log(`items: ${result.total}${result.unfilteredTotal !== result.total ? ` / ${result.unfilteredTotal}` : ""}`);
    console.log(`site: ${result.summary.eligible.site}, wechatDraft: ${result.summary.eligible.wechatDraft}, xhs: ${result.summary.eligible.xhs}`);
    if (result.warnings.length) {
      console.log("");
      console.log(`warnings: ${result.warnings.length}`);
      for (const warning of result.warnings.slice(0, 12)) {
        console.log(`- ${warning.code}: ${warning.file}`);
      }
      if (result.warnings.length > 12) console.log(`- ... ${result.warnings.length - 12} more`);
    }
    if (result.items.length) {
      console.log("");
      for (const item of result.items.slice(0, 20)) {
        const badges = [
          item.eligible.site ? "site" : "",
          item.eligible.wechatDraft ? "wechat" : "",
          item.eligible.xhs ? "xhs" : ""
        ].filter(Boolean).join(",");
        console.log(`${item.date} ${item.status.padEnd(9)} ${item.channel.padEnd(10)} ${item.title}${badges ? ` [${badges}]` : ""}`);
      }
    }
    return;
  }

  if (result.kind === "theme-design-lint") {
    const target = result.theme === "all" ? "all themes" : result.theme;
    console.log(`theme design lint: ${target}`);
    console.log(`errors: ${result.summary.error}, warnings: ${result.summary.warning}, info: ${result.summary.info}`);
    const findings = result.findings || [];
    for (const item of findings.filter((finding) => finding.severity !== "info").slice(0, 20)) {
      const theme = item.theme ? `${item.theme}: ` : "";
      console.log(`- ${item.severity}: ${theme}${item.path} - ${item.message}`);
    }
    return;
  }

  if (result.kind === "theme-design-export") {
    console.log(`${result.id} - ${result.name}`);
    console.log(result.description);
    console.log(`platform: ${result.platform}`);
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

function replaceExt(filePath, ext) {
  return path.join(path.dirname(filePath), `${path.basename(filePath, path.extname(filePath))}${ext}`);
}

function mapValues(input, mapper) {
  return Object.fromEntries(Object.entries(input).map(([key, value]) => [key, mapper(value)]));
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
  wechat-md-studio visuals <article.md> [--theme auto|theme-id] [--count 1-4] [--out prompts.md] [--json]
  wechat-md-studio xhs <article.md> [--theme auto|theme-id] [--cards 4-9] [--out xhs.md] [--json]
  wechat-md-studio package <article.md> [--theme auto|theme-id] [--out-dir dir] [--cards 4-9] [--visuals 1-4] [--json]
  wechat-md-studio catalog [articles-dir] [--out content-index.json] [--site|--wechat|--xhs] [--json]
  wechat-md-studio catalog template [--channel article|image-post|source] [--status draft|published]
  wechat-md-studio themes list [--json]
  wechat-md-studio themes show <theme-id> [--json]
  wechat-md-studio themes design <theme-id> [--out DESIGN.md]
  wechat-md-studio themes lint [theme-id] [--json] [--strict]
  wechat-md-studio themes export <theme-id> [--out design-tokens.json] [--json]

Examples:
  wechat-md-studio format examples/ai-money.md --out dist/article.html
  wechat-md-studio preview examples/science.md --theme science-clean
  wechat-md-studio recommend examples/food.md --json
  wechat-md-studio draft examples/ai-money.md --thumb-media-id MEDIA_ID --dry-run --json
  wechat-md-studio visuals examples/ai-money.md --out dist/ai-money.image2-prompts.md
  wechat-md-studio xhs examples/ai-money.md --cards 6 --out dist/ai-money.xhs.md
  wechat-md-studio package examples/ai-money.md --out-dir dist/ai-money-package
  wechat-md-studio catalog ../articles --out dist/content-index.json
  wechat-md-studio themes design tech-pulse --out dist/tech-pulse.DESIGN.md
`);
}
