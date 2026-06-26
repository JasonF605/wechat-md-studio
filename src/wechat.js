import fs from "node:fs";
import path from "node:path";
import { renderArticleHtml } from "./renderer.js";

const API_BASE = "https://api.weixin.qq.com";
const ENV_SEARCH_DEPTH = 6;
const WECHAT_IMAGE_HOSTS = ["mmbiz.qpic.cn", "mmbiz.qlogo.cn"];

export class WeChatApiError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = "WeChatApiError";
    this.details = details;
  }
}

export function loadDotEnv(startDir = process.cwd()) {
  let current = path.resolve(startDir);
  for (let i = 0; i < ENV_SEARCH_DEPTH; i += 1) {
    const envPath = path.join(current, ".env");
    if (fs.existsSync(envPath)) {
      const lines = fs.readFileSync(envPath, "utf8").replace(/^\uFEFF/, "").split(/\r?\n/);
      for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line || line.startsWith("#") || !line.includes("=")) continue;
        const [rawKey, ...rest] = line.split("=");
        const key = rawKey.trim();
        const value = rest.join("=").trim().replace(/^["']|["']$/g, "");
        if (key && value && !process.env[key]) process.env[key] = value;
      }
      return envPath;
    }
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return "";
}

export function readWechatConfig(options = {}) {
  loadDotEnv(options.cwd || process.cwd());
  return {
    appid: readEnv("WECHAT_APPID"),
    secret: readEnv("WECHAT_APPSECRET") || readEnv("WECHAT_SECRET"),
    author: readEnv("WECHAT_AUTHOR"),
    thumbMediaId: readEnv("WECHAT_THUMB_MEDIA_ID"),
    sourceUrl: readEnv("WECHAT_CONTENT_SOURCE_URL")
  };
}

export function doctorWechatConfig(options = {}) {
  const envPath = loadDotEnv(options.cwd || process.cwd());
  const config = readWechatConfig(options);
  const checks = [
    {
      id: "env.load",
      status: envPath ? "pass" : "warn",
      message: envPath ? `Loaded ${envPath}` : "No .env file found; environment variables only."
    },
    {
      id: "wechat.appid",
      status: config.appid ? "pass" : "fail",
      message: config.appid ? "WECHAT_APPID is set." : "WECHAT_APPID is missing."
    },
    {
      id: "wechat.secret",
      status: config.secret ? "pass" : "fail",
      message: config.secret ? "WECHAT_APPSECRET/WECHAT_SECRET is set." : "WECHAT_APPSECRET or WECHAT_SECRET is missing."
    },
    {
      id: "wechat.cover",
      status: config.thumbMediaId ? "pass" : "warn",
      message: config.thumbMediaId
        ? "WECHAT_THUMB_MEDIA_ID is set."
        : "No default cover media id. Pass --cover or --thumb-media-id when creating a draft."
    }
  ];
  return {
    overall: checks.some((check) => check.status === "fail") ? "blocked" : "ready",
    checks
  };
}

export async function getStableAccessToken(options = {}) {
  const config = readWechatConfig(options);
  if (!config.appid) throw new WeChatApiError("WECHAT_APPID is missing.");
  if (!config.secret) throw new WeChatApiError("WECHAT_APPSECRET or WECHAT_SECRET is missing.");

  const result = await postJson(`${API_BASE}/cgi-bin/stable_token`, {
    grant_type: "client_credential",
    appid: config.appid,
    secret: config.secret,
    ...(options.forceRefresh ? { force_refresh: true } : {})
  });

  if (!result.access_token) throw new WeChatApiError("WeChat did not return access_token.", result);
  return result.access_token;
}

export async function uploadPermanentImage(imagePath, accessToken) {
  const url = `${API_BASE}/cgi-bin/material/add_material?access_token=${encodeURIComponent(accessToken)}&type=image`;
  const result = await uploadMultipart(url, imagePath);
  if (!result.media_id) throw new WeChatApiError(`WeChat did not return media_id for ${imagePath}.`, result);
  return result;
}

export async function uploadArticleImage(imagePath, accessToken) {
  const url = `${API_BASE}/cgi-bin/media/uploadimg?access_token=${encodeURIComponent(accessToken)}`;
  const result = await uploadMultipart(url, imagePath);
  if (!result.url) throw new WeChatApiError(`WeChat did not return article image URL for ${imagePath}.`, result);
  return result.url;
}

export async function addDraft(payload, accessToken) {
  return postJson(`${API_BASE}/cgi-bin/draft/add?access_token=${encodeURIComponent(accessToken)}`, payload);
}

export async function buildDraftPayload(article, options = {}) {
  const warnings = [];
  const config = readWechatConfig({ cwd: options.cwd || path.dirname(article.filePath || process.cwd()) });
  const title = normalizeTitle(options.title || article.title, options);
  const author = options.author ?? config.author;
  if (author && author.length > 16) throw new WeChatApiError("Author is longer than 16 characters.");

  const digest = normalizeDigest(options.digest || firstPlainParagraph(article));
  const accessToken = options.dryRun ? "" : options.accessToken;
  const preparedArticle = await prepareArticleImages(article, accessToken, options, warnings);
  const theme = options.theme;
  const content = renderArticleHtml(preparedArticle, {
    theme,
    recommendation: options.recommendation,
    includeMeta: false,
    compact: true
  });

  validateContentSize(content);

  const thumbMediaId = await resolveThumbMediaId(article, accessToken, options, config, warnings);
  if (!thumbMediaId) {
    throw new WeChatApiError(
      "A cover thumb_media_id is required. Pass --thumb-media-id, --cover <image>, --cover first, or set WECHAT_THUMB_MEDIA_ID."
    );
  }

  const sourceUrl = options.sourceUrl ?? config.sourceUrl;
  const draftArticle = pruneEmpty({
    article_type: "news",
    title,
    author,
    digest,
    content,
    content_source_url: sourceUrl,
    thumb_media_id: thumbMediaId,
    need_open_comment: options.openComment ? 1 : 0,
    only_fans_can_comment: options.fansComment ? 1 : 0
  });

  return {
    payload: { articles: [draftArticle] },
    warnings
  };
}

export async function createDraftFromArticle(article, options = {}) {
  const accessToken = options.accessToken || (await getStableAccessToken(options));
  const { payload, warnings } = await buildDraftPayload(article, { ...options, accessToken, dryRun: false });
  const result = await addDraft(payload, accessToken);
  return { result, payload, warnings };
}

async function prepareArticleImages(article, accessToken, options, warnings) {
  const baseDir = path.dirname(article.filePath || process.cwd());
  const blocks = [];
  let localIndex = 0;

  for (const block of article.blocks) {
    if (block.type !== "image") {
      blocks.push(block);
      continue;
    }

    const src = block.src || "";
    if (isWechatImageUrl(src)) {
      blocks.push(block);
      continue;
    }

    if (/^https?:\/\//i.test(src)) {
      const behavior = options.externalImages || "fail";
      if (behavior === "fail") {
        throw new WeChatApiError(`External image must be uploaded to WeChat first: ${src}`);
      }
      if (behavior === "skip") {
        warnings.push(`Skipped external image: ${src}`);
        continue;
      }
      warnings.push(`Kept external image without WeChat upload: ${src}`);
      blocks.push(block);
      continue;
    }

    const imagePath = path.resolve(baseDir, src);
    if (!fs.existsSync(imagePath)) throw new WeChatApiError(`Image not found: ${imagePath}`);

    localIndex += 1;
    if (options.dryRun) {
      warnings.push(`Dry-run skipped article image upload: ${imagePath}`);
      blocks.push({ ...block, src: `https://example.com/dry-run-wechat-image-${localIndex}.png` });
    } else {
      const url = await uploadArticleImage(imagePath, accessToken);
      warnings.push(`Uploaded article image: ${imagePath}`);
      blocks.push({ ...block, src: url });
    }
  }

  return { ...article, blocks };
}

async function resolveThumbMediaId(article, accessToken, options, config, warnings) {
  if (options.thumbMediaId) return options.thumbMediaId;

  const cover = options.cover;
  if (!cover) return config.thumbMediaId || "";

  const coverPath = cover === "first" ? firstLocalImagePath(article) : path.resolve(cover);
  if (!coverPath) throw new WeChatApiError("No local image found for --cover first.");
  if (!fs.existsSync(coverPath)) throw new WeChatApiError(`Cover image not found: ${coverPath}`);

  if (options.dryRun) {
    warnings.push(`Dry-run skipped cover upload: ${coverPath}`);
    return "DRY_RUN_THUMB_MEDIA_ID";
  }

  const result = await uploadPermanentImage(coverPath, accessToken);
  warnings.push(`Uploaded cover image as permanent material: ${coverPath}`);
  return result.media_id;
}

function firstLocalImagePath(article) {
  const baseDir = path.dirname(article.filePath || process.cwd());
  const image = article.blocks.find((block) => block.type === "image" && !/^https?:\/\//i.test(block.src || ""));
  return image ? path.resolve(baseDir, image.src) : "";
}

async function postJson(url, payload) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const text = await response.text();
  if (!response.ok) throw new WeChatApiError(`HTTP ${response.status}: ${text}`);
  return parseWeChatJson(text);
}

async function uploadMultipart(url, filePath) {
  const resolved = path.resolve(filePath);
  if (!fs.existsSync(resolved)) throw new WeChatApiError(`File not found: ${resolved}`);

  const boundary = `----wechat-md-studio-${Date.now()}`;
  const file = fs.readFileSync(resolved);
  const filename = path.basename(resolved);
  const mime = mimeTypeForPath(resolved);
  const body = Buffer.concat([
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="media"; filename="${filename}"\r\nContent-Type: ${mime}\r\n\r\n`,
      "utf8"
    ),
    file,
    Buffer.from(`\r\n--${boundary}--\r\n`, "utf8")
  ]);

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": `multipart/form-data; boundary=${boundary}` },
    body
  });
  const text = await response.text();
  if (!response.ok) throw new WeChatApiError(`HTTP ${response.status}: ${text}`);
  return parseWeChatJson(text);
}

function parseWeChatJson(text) {
  let result;
  try {
    result = JSON.parse(text);
  } catch (error) {
    throw new WeChatApiError(`Invalid JSON from WeChat: ${text.slice(0, 500)}`, { cause: error });
  }

  if (result.errcode && result.errcode !== 0) {
    throw new WeChatApiError(`WeChat API error ${result.errcode}: ${result.errmsg || ""}`, result);
  }
  return result;
}

function normalizeTitle(title = "Untitled", options = {}) {
  const value = String(title).trim() || "Untitled";
  if (value.length <= 32) return value;
  if (options.truncateTitle) return value.slice(0, 32);
  throw new WeChatApiError("Title is longer than 32 characters. Pass --title or --truncate-title.");
}

function normalizeDigest(digest = "") {
  return String(digest || "").replace(/\s+/g, " ").trim().slice(0, 128);
}

function firstPlainParagraph(article) {
  for (const block of article.blocks || []) {
    if (block.type !== "paragraph") continue;
    const text = String(block.text || "")
      .replace(/!\[[^\]]*\]\([^)]+\)/g, "")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/[*_`>#-]/g, "")
      .replace(/\s+/g, " ")
      .trim();
    if (text) return text;
  }
  return "";
}

function validateContentSize(content) {
  if (content.length >= 20000) throw new WeChatApiError("Converted HTML content exceeds WeChat 20000 character limit.");
  if (Buffer.byteLength(content, "utf8") >= 1024 * 1024) {
    throw new WeChatApiError("Converted HTML content exceeds WeChat 1MB limit.");
  }
}

function pruneEmpty(input) {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== "" && value !== undefined && value !== null));
}

function readEnv(name) {
  return (process.env[name] || "").trim();
}

function isWechatImageUrl(src) {
  try {
    const url = new URL(src);
    return WECHAT_IMAGE_HOSTS.some((host) => url.hostname.endsWith(host));
  } catch {
    return false;
  }
}

function mimeTypeForPath(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".png") return "image/png";
  if (ext === ".gif") return "image/gif";
  if (ext === ".webp") return "image/webp";
  return "application/octet-stream";
}
