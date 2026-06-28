import fs from "node:fs";
import path from "node:path";
import { readArticle } from "./markdown.js";
import { readText, toPosixPath } from "./utils.js";

const ALLOWED_CHANNELS = ["article", "image-post", "source", "note"];
const ALLOWED_STATUSES = ["idea", "draft", "review", "scheduled", "published", "archived", "deleted"];
const BLOCKED_STATUSES = new Set(["archived", "deleted"]);

export function buildContentCatalog(rootDir = "articles", options = {}) {
  const root = path.resolve(rootDir);
  const today = options.today || formatDateInZone(new Date(), options.timeZone || "Asia/Shanghai");
  const files = discoverMarkdownEntries(root);
  const warnings = [];
  const items = [];

  for (const filePath of files) {
    try {
      const article = readArticle(filePath);
      const source = readText(filePath);
      const hasFrontmatter = source.trimStart().startsWith("---");
      const item = normalizeCatalogItem(article, filePath, root, { today, hasFrontmatter });
      items.push(item);
      warnings.push(...item.warnings);
    } catch (error) {
      warnings.push({
        level: "error",
        code: "read_failed",
        file: toPosixPath(path.resolve(filePath)),
        message: error?.message || String(error)
      });
    }
  }

  items.sort((a, b) => {
    const dateCompare = b.date.localeCompare(a.date);
    return dateCompare || a.slug.localeCompare(b.slug);
  });

  return {
    root: toPosixPath(root),
    today,
    total: items.length,
    summary: summarize(items),
    warnings,
    items
  };
}

export function filterCatalogItems(items, filters = {}) {
  return items.filter((item) => {
    if (filters.channel && item.channel !== filters.channel) return false;
    if (filters.status && item.status !== filters.status) return false;
    if (filters.site && !item.eligible.site) return false;
    if (filters.wechat && !item.eligible.wechatDraft) return false;
    if (filters.xhs && !item.eligible.xhs) return false;
    return true;
  });
}

export function renderFrontmatterTemplate(options = {}) {
  const channel = normalizeEnum(options.channel, ALLOWED_CHANNELS, "article");
  const status = normalizeEnum(options.status, ALLOWED_STATUSES, "draft");
  const site = parseBool(options.site, channel === "article" && status === "published");
  const xhs = parseBool(options.xhs, channel === "article");
  const wechatDraft = parseBool(options.wechatDraft ?? options.wechat_draft, channel === "article");

  if (channel === "source") {
    return `---
title: 待整理素材标题
date: ${options.date || "2026-06-27"}
channel: source
status: draft
source_type: article
source_url:
tags:
---
`;
  }

  return `---
title: 待发布内容标题
date: ${options.date || "2026-06-27"}
channel: ${channel}
status: ${status}
series: ${options.series || ""}
site: ${site}
wechat_draft: ${wechatDraft}
xhs: ${xhs}
---
`;
}

function discoverMarkdownEntries(root) {
  if (!fs.existsSync(root)) return [];
  const stat = fs.statSync(root);
  if (stat.isFile()) return root.endsWith(".md") ? [root] : [];

  const entries = fs.readdirSync(root, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;
    const abs = path.join(root, entry.name);
    if (entry.isDirectory()) {
      const post = path.join(abs, "post.md");
      if (fs.existsSync(post)) {
        files.push(post);
      } else {
        files.push(...discoverMarkdownEntries(abs));
      }
      continue;
    }
    if (entry.isFile() && entry.name.endsWith(".md")) files.push(abs);
  }

  return files;
}

function normalizeCatalogItem(article, filePath, root, context) {
  const metadata = article.metadata || {};
  const slug = getSlug(filePath, metadata);
  const date = String(metadata.date || inferDate(slug, filePath));
  const channel = normalizeEnum(metadata.channel, ALLOWED_CHANNELS, inferChannel(slug, filePath));
  const status = normalizeEnum(metadata.status, ALLOWED_STATUSES, context.hasFrontmatter ? "draft" : "unknown");
  const siteFlag = parseBool(metadata.site, false);
  const xhsFlag = parseBool(metadata.xhs, channel === "article" || channel === "image-post");
  const wechatDraftFlag = parseBool(metadata.wechat_draft ?? metadata.wechatDraft, channel === "article");
  const series = metadata.series || metadata.category || "";
  const warnings = [];
  const reasons = [];
  const hasRoutingMetadata = Boolean(context.hasFrontmatter && metadata.channel && metadata.status);

  if (!context.hasFrontmatter) {
    warnings.push(makeWarning("missing_frontmatter", filePath, "Missing frontmatter; this item is treated as not publishable by default."));
  }

  if (!metadata.channel) {
    warnings.push(makeWarning("missing_channel", filePath, "Missing channel. Use article, image-post, source, or note."));
  }

  if (!metadata.status) {
    warnings.push(makeWarning("missing_status", filePath, "Missing status. Use draft, review, scheduled, published, archived, or deleted."));
  }

  if (metadata.channel && !ALLOWED_CHANNELS.includes(String(metadata.channel))) {
    warnings.push(makeWarning("invalid_channel", filePath, `Unknown channel "${metadata.channel}".`));
  }

  if (metadata.status && !ALLOWED_STATUSES.includes(String(metadata.status))) {
    warnings.push(makeWarning("invalid_status", filePath, `Unknown status "${metadata.status}".`));
  }

  if (date > context.today && status === "published") {
    warnings.push(makeWarning("future_published", filePath, "Published item has a future date."));
  }

  const blocked = BLOCKED_STATUSES.has(status);
  const siteEligible = hasRoutingMetadata && channel === "article" && status === "published" && siteFlag === true && date <= context.today;
  if (!hasRoutingMetadata) reasons.push("site requires explicit channel and status");
  if (channel !== "article") reasons.push("site requires channel=article");
  if (status !== "published") reasons.push("site requires status=published");
  if (!siteFlag) reasons.push("site requires site=true");
  if (date > context.today) reasons.push("site skips future dates");

  const wechatDraftEligible = hasRoutingMetadata && channel === "article" && !blocked && wechatDraftFlag;
  const xhsEligible = hasRoutingMetadata && (channel === "article" || channel === "image-post") && !blocked && xhsFlag;

  return {
    title: article.title,
    slug,
    date,
    channel,
    status,
    series,
    site: siteFlag,
    wechatDraft: wechatDraftFlag,
    xhs: xhsFlag,
    sourceType: metadata.source_type || metadata.sourceType || "",
    sourceUrl: metadata.source_url || metadata.sourceUrl || "",
    file: toPosixPath(path.resolve(filePath)),
    relativeFile: toPosixPath(path.relative(root, filePath)),
    wordCount: countWords(article.text),
    hasFrontmatter: context.hasFrontmatter,
    eligible: {
      site: siteEligible,
      wechatDraft: wechatDraftEligible,
      xhs: xhsEligible
    },
    blockedReasons: siteEligible ? [] : reasons,
    metadata,
    warnings
  };
}

function summarize(items) {
  const summary = {
    channels: {},
    statuses: {},
    eligible: {
      site: 0,
      wechatDraft: 0,
      xhs: 0
    }
  };

  for (const item of items) {
    summary.channels[item.channel] = (summary.channels[item.channel] || 0) + 1;
    summary.statuses[item.status] = (summary.statuses[item.status] || 0) + 1;
    if (item.eligible.site) summary.eligible.site += 1;
    if (item.eligible.wechatDraft) summary.eligible.wechatDraft += 1;
    if (item.eligible.xhs) summary.eligible.xhs += 1;
  }

  return summary;
}

function getSlug(filePath, metadata) {
  if (metadata.slug) return String(metadata.slug);
  const base = path.basename(filePath, ".md");
  if (base !== "post") return base;
  return path.basename(path.dirname(filePath));
}

function inferDate(slug, filePath) {
  const match = slug.match(/^(\d{4}-\d{2}-\d{2})/);
  if (match) return match[1];
  return fs.statSync(filePath).mtime.toISOString().slice(0, 10);
}

function inferChannel(slug, filePath) {
  const normalized = `${slug} ${filePath}`.toLowerCase();
  if (normalized.includes("source") || normalized.includes("research")) return "source";
  if (normalized.includes("cards") || normalized.includes("image-post")) return "image-post";
  return "article";
}

function normalizeEnum(value, allowed, fallback) {
  if (!value) return fallback;
  const normalized = String(value).trim();
  return allowed.includes(normalized) ? normalized : fallback;
}

function parseBool(value, fallback = false) {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "boolean") return value;
  const normalized = String(value).trim().toLowerCase();
  if (["true", "1", "yes", "y", "on"].includes(normalized)) return true;
  if (["false", "0", "no", "n", "off"].includes(normalized)) return false;
  return fallback;
}

function countWords(text = "") {
  const cjk = (text.match(/[\u3400-\u9fff]/g) || []).length;
  const latin = (text.replace(/[\u3400-\u9fff]/g, " ").match(/[A-Za-z0-9]+/g) || []).length;
  return cjk + latin;
}

function makeWarning(code, filePath, message) {
  return {
    level: "warning",
    code,
    file: toPosixPath(path.resolve(filePath)),
    message
  };
}

function formatDateInZone(date, timeZone) {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  const get = (type) => parts.find((part) => part.type === type)?.value || "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}
