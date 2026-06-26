import path from "node:path";
import { escapeHtml, readText } from "./utils.js";

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

export function readArticle(filePath) {
  const source = readText(filePath);
  const parsed = parseMarkdown(source);
  parsed.filePath = path.resolve(filePath);
  return parsed;
}

export function parseMarkdown(source) {
  const { body, metadata } = extractFrontmatter(source);
  const lines = body.replace(/\r\n/g, "\n").split("\n");
  const blocks = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      i += 1;
      continue;
    }

    const fence = trimmed.match(/^```([A-Za-z0-9_-]+)?\s*$/);
    if (fence) {
      const lang = fence[1] || "";
      const code = [];
      i += 1;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        code.push(lines[i]);
        i += 1;
      }
      if (i < lines.length) i += 1;
      blocks.push({ type: "code", lang, text: code.join("\n") });
      continue;
    }

    const heading = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      blocks.push({
        type: "heading",
        level: heading[1].length,
        text: heading[2].trim()
      });
      i += 1;
      continue;
    }

    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      blocks.push({ type: "hr" });
      i += 1;
      continue;
    }

    const image = trimmed.match(/^!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]+)")?\)$/);
    if (image) {
      blocks.push({
        type: "image",
        alt: image[1] || "",
        src: image[2],
        title: image[3] || ""
      });
      i += 1;
      continue;
    }

    if (trimmed.startsWith(">")) {
      const quote = [];
      while (i < lines.length && lines[i].trim().startsWith(">")) {
        quote.push(lines[i].trim().replace(/^>\s?/, ""));
        i += 1;
      }
      blocks.push({ type: "quote", children: parseInlineBlocks(quote.join("\n")) });
      continue;
    }

    if (isTableStart(lines, i)) {
      const tableLines = [lines[i], lines[i + 1]];
      i += 2;
      while (i < lines.length && lines[i].trim().includes("|") && lines[i].trim()) {
        tableLines.push(lines[i]);
        i += 1;
      }
      blocks.push(parseTable(tableLines));
      continue;
    }

    if (/^(\s*)([-*+])\s+/.test(line) || /^(\s*)\d+[.)]\s+/.test(line)) {
      const items = [];
      const ordered = /^(\s*)\d+[.)]\s+/.test(line);
      while (i < lines.length) {
        const current = lines[i];
        const itemMatch = ordered
          ? current.match(/^\s*\d+[.)]\s+(.+)$/)
          : current.match(/^\s*[-*+]\s+(.+)$/);
        if (!itemMatch) break;
        items.push(itemMatch[1]);
        i += 1;
      }
      blocks.push({ type: "list", ordered, items });
      continue;
    }

    const para = [line.trim()];
    i += 1;
    while (i < lines.length && lines[i].trim() && !startsSpecialBlock(lines, i)) {
      para.push(lines[i].trim());
      i += 1;
    }
    if (shouldSplitCjkLines(para)) {
      for (const text of para) {
        blocks.push({ type: "paragraph", text });
      }
    } else {
      blocks.push({ type: "paragraph", text: para.join(" ") });
    }
  }

  return {
    metadata,
    blocks,
    text: body.trim(),
    title: metadata.title || findTitle(blocks) || "Untitled Article"
  };
}

function extractFrontmatter(source) {
  const match = source.match(FRONTMATTER_RE);
  if (!match) return { body: source, metadata: {} };

  const metadata = {};
  for (const line of match[1].split(/\r?\n/)) {
    const item = line.match(/^([A-Za-z0-9_-]+)\s*:\s*(.*)$/);
    if (!item) continue;
    const raw = item[2].trim();
    metadata[item[1]] = raw.replace(/^["']|["']$/g, "");
  }
  return { body: source.slice(match[0].length), metadata };
}

function findTitle(blocks) {
  const h1 = blocks.find((block) => block.type === "heading" && block.level === 1);
  if (h1) return stripInline(h1.text);
  const firstHeading = blocks.find((block) => block.type === "heading");
  return firstHeading ? stripInline(firstHeading.text) : "";
}

function startsSpecialBlock(lines, i) {
  const trimmed = lines[i].trim();
  return (
    /^```/.test(trimmed) ||
    /^(#{1,6})\s+/.test(trimmed) ||
    /^!\[[^\]]*\]\(/.test(trimmed) ||
    trimmed.startsWith(">") ||
    /^(\s*)([-*+])\s+/.test(lines[i]) ||
    /^(\s*)\d+[.)]\s+/.test(lines[i]) ||
    /^(-{3,}|\*{3,}|_{3,})$/.test(trimmed) ||
    isTableStart(lines, i)
  );
}

function isTableStart(lines, i) {
  if (i + 1 >= lines.length) return false;
  const head = lines[i].trim();
  const sep = lines[i + 1].trim();
  return head.includes("|") && /^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?$/.test(sep);
}

function parseTable(lines) {
  const rows = lines.map(splitTableLine);
  return {
    type: "table",
    header: rows[0] || [],
    rows: rows.slice(2)
  };
}

function splitTableLine(line) {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

function parseInlineBlocks(value) {
  return value
    .split(/\n{2,}/)
    .map((text) => text.trim())
    .filter(Boolean)
    .map((text) => ({ type: "paragraph", text }));
}

export function renderInline(value = "") {
  let html = escapeHtml(value);

  const code = [];
  html = html.replace(/`([^`]+)`/g, (_, content) => {
    code.push(content);
    return `@@CODE_${code.length - 1}@@`;
  });

  html = html.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+&quot;([^&]*)&quot;)?\)/g, (_, alt, src) => {
    return `<img src="${src}" alt="${alt}" style="max-width:100%;display:block;margin:18px auto;border-radius:8px;" />`;
  });
  html = html.replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+&quot;([^&]*)&quot;)?\)/g, (_, text, href) => {
    return `<a href="${href}" style="color:inherit;text-decoration:none;border-bottom:1px solid currentColor;">${text}</a>`;
  });
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/__([^_]+)__/g, "<strong>$1</strong>");
  html = html.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, "<em>$1</em>");

  for (let i = 0; i < code.length; i += 1) {
    html = html.replace(
      `@@CODE_${i}@@`,
      `<code style="font-size:0.92em;padding:2px 5px;border-radius:4px;background:#F2F4F7;color:#334155;">${code[i]}</code>`
    );
  }
  return html;
}

function stripInline(value = "") {
  return value
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[*_`#>]/g, "")
    .trim();
}

function shouldSplitCjkLines(lines) {
  if (lines.length < 2) return false;
  const joined = lines.join("");
  const cjkCount = (joined.match(/[\u3400-\u9fff]/g) || []).length;
  const avgLength = joined.length / lines.length;
  const sentenceLike = lines.filter((line) => /[。！？：；!?]$/.test(line)).length;
  return cjkCount / Math.max(joined.length, 1) > 0.35 && avgLength <= 56 && sentenceLike >= 1;
}
