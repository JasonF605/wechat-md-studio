import path from "node:path";
import { renderInline } from "./markdown.js";
import { getTheme } from "./themes/catalog.js";
import { escapeHtml } from "./utils.js";

const FONT_STACK =
  "-apple-system,BlinkMacSystemFont,'Segoe UI','PingFang SC','Hiragino Sans GB','Microsoft YaHei',Arial,sans-serif";

export function renderArticleHtml(article, options = {}) {
  const theme = typeof options.theme === "string" ? getTheme(options.theme) : options.theme || getTheme();
  const tokens = theme.tokens;
  const recommendation = options.recommendation;
  const html = [];

  html.push(
    `<section data-wmd-theme="${theme.id}" style="${style({
      boxSizing: "border-box",
      maxWidth: "100%",
      margin: "0 auto",
      padding: "8px 0 24px",
      color: tokens.text,
      background: tokens.background,
      fontFamily: FONT_STACK,
      fontSize: "16px",
      lineHeight: "1.78",
      letterSpacing: "0"
    })}">`
  );

  if (options.includeMeta === true) {
    html.push(renderMetaBar(theme, recommendation));
  }

  for (const block of article.blocks) {
    html.push(renderBlock(block, theme));
  }

  html.push("</section>");
  return html.filter(Boolean).join("\n");
}

export function renderPreviewPage(article, options = {}) {
  const theme = typeof options.theme === "string" ? getTheme(options.theme) : options.theme || getTheme();
  const articleHtml = renderArticleHtml(article, options);
  const escapedSnippet = escapeHtml(articleHtml);
  const title = escapeHtml(article.title || "WeChat MD Studio Preview");

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title} - WeChat MD Studio</title>
  <style>
    :root {
      color-scheme: light;
      --bg: #f5f7fb;
      --panel: #ffffff;
      --text: #172033;
      --muted: #667085;
      --accent: ${theme.tokens.accent};
      --border: #d9e0ec;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      background: var(--bg);
      color: var(--text);
      font-family: ${FONT_STACK};
    }
    .app {
      display: grid;
      grid-template-columns: minmax(260px, 380px) minmax(320px, 1fr);
      gap: 18px;
      width: min(1200px, calc(100vw - 32px));
      margin: 0 auto;
      padding: 18px 0 28px;
    }
    .toolbar,
    .phone {
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: 8px;
      box-shadow: 0 10px 28px rgba(16, 24, 40, 0.08);
    }
    .toolbar {
      position: sticky;
      top: 18px;
      align-self: start;
      padding: 16px;
    }
    .brand {
      margin: 0 0 6px;
      font-size: 18px;
      line-height: 1.3;
    }
    .meta {
      margin: 0 0 14px;
      color: var(--muted);
      font-size: 13px;
      line-height: 1.6;
    }
    .theme-pill {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      margin: 0 0 14px;
      padding: 8px 10px;
      border-radius: 999px;
      background: ${theme.tokens.soft};
      color: ${theme.tokens.accent};
      font-size: 13px;
      font-weight: 700;
    }
    button {
      width: 100%;
      border: 0;
      border-radius: 6px;
      padding: 11px 12px;
      background: var(--accent);
      color: white;
      font: inherit;
      font-weight: 700;
      cursor: pointer;
    }
    button:active { transform: translateY(1px); }
    textarea {
      width: 100%;
      min-height: 320px;
      margin-top: 12px;
      resize: vertical;
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 12px;
      color: #344054;
      font: 12px/1.5 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      background: #fbfdff;
    }
    .phone {
      width: min(100%, 430px);
      margin: 0 auto;
      padding: 18px 18px 24px;
      overflow: hidden;
    }
    .toast {
      min-height: 20px;
      margin-top: 10px;
      color: var(--muted);
      font-size: 13px;
    }
    @media (max-width: 820px) {
      .app {
        grid-template-columns: 1fr;
        width: min(100vw - 20px, 560px);
      }
      .toolbar { position: static; }
    }
  </style>
</head>
<body>
  <main class="app">
    <aside class="toolbar">
      <h1 class="brand">WeChat MD Studio</h1>
      <p class="meta">${title}</p>
      <div class="theme-pill">${escapeHtml(theme.label)} / ${escapeHtml(theme.id)}</div>
      <button type="button" id="copy">Copy WeChat HTML</button>
      <p class="toast" id="toast"></p>
      <textarea id="snippet" spellcheck="false">${escapedSnippet}</textarea>
    </aside>
    <article class="phone">${articleHtml}</article>
  </main>
  <script>
    const button = document.querySelector("#copy");
    const textarea = document.querySelector("#snippet");
    const toast = document.querySelector("#toast");
    button.addEventListener("click", async () => {
      textarea.select();
      try {
        await navigator.clipboard.writeText(textarea.value);
        toast.textContent = "Copied. Paste it into the WeChat editor.";
      } catch {
        document.execCommand("copy");
        toast.textContent = "Copied with fallback clipboard command.";
      }
    });
  </script>
</body>
</html>`;
}

function renderBlock(block, theme) {
  switch (block.type) {
    case "heading":
      return renderHeading(block, theme);
    case "paragraph":
      return tag("p", paragraphStyle(theme), renderInline(block.text));
    case "quote":
      return renderQuote(block, theme);
    case "list":
      return renderList(block, theme);
    case "code":
      return renderCode(block, theme);
    case "table":
      return renderTable(block, theme);
    case "image":
      return renderImage(block, theme);
    case "hr":
      return `<section style="${style({
        margin: "28px 0",
        height: "1px",
        background: theme.tokens.border,
        lineHeight: "1px",
        fontSize: "0"
      })}"></section>`;
    default:
      return "";
  }
}

function renderHeading(block, theme) {
  const tokens = theme.tokens;
  const text = renderInline(block.text);

  if (block.level === 1) {
    return `<section style="${style({
      margin: "12px 0 24px",
      padding: "18px 18px 16px",
      borderRadius: "8px",
      background: `linear-gradient(135deg, ${tokens.soft}, ${tokens.soft2})`,
      border: `1px solid ${tokens.border}`
    })}">
  <h1 style="${style({
    margin: "0",
    color: tokens.text,
    fontSize: "24px",
    lineHeight: "1.35",
    fontWeight: "800",
    letterSpacing: "0"
  })}">${text}</h1>
</section>`;
  }

  if (block.level === 2) {
    return `<h2 style="${style({
      margin: "30px 0 14px",
      padding: `0 0 0 12px`,
      borderLeft: `4px solid ${tokens.accent}`,
      color: tokens.text,
      fontSize: "20px",
      lineHeight: "1.42",
      fontWeight: "800",
      letterSpacing: "0"
    })}">${text}</h2>`;
  }

  if (block.level === 3) {
    return `<h3 style="${style({
      margin: "24px 0 10px",
      color: tokens.accent,
      fontSize: "17px",
      lineHeight: "1.48",
      fontWeight: "800",
      letterSpacing: "0"
    })}">${text}</h3>`;
  }

  return `<h${Math.min(block.level, 6)} style="${style({
    margin: "18px 0 8px",
    color: tokens.text,
    fontSize: "16px",
    lineHeight: "1.5",
    fontWeight: "700",
    letterSpacing: "0"
  })}">${text}</h${Math.min(block.level, 6)}>`;
}

function renderQuote(block, theme) {
  const body = block.children
    .map((child) => tag("p", { ...paragraphStyle(theme), margin: "0 0 10px" }, renderInline(child.text)))
    .join("\n");

  return `<blockquote style="${style({
    margin: "18px 0",
    padding: "14px 15px",
    borderLeft: `4px solid ${theme.tokens.accent2}`,
    borderRadius: "0 8px 8px 0",
    background: theme.tokens.quoteBg,
    color: theme.tokens.text
  })}">${body}</blockquote>`;
}

function renderList(block, theme) {
  const tagName = block.ordered ? "ol" : "ul";
  const items = block.items
    .map((item) =>
      tag(
        "li",
        {
          margin: "0 0 8px",
          paddingLeft: "2px",
          lineHeight: "1.75",
          color: theme.tokens.text
        },
        renderInline(item)
      )
    )
    .join("\n");

  return `<${tagName} style="${style({
    margin: "14px 0 18px",
    paddingLeft: block.ordered ? "22px" : "20px"
  })}">${items}</${tagName}>`;
}

function renderCode(block, theme) {
  return `<pre style="${style({
    margin: "16px 0",
    padding: "14px",
    overflowX: "auto",
    borderRadius: "8px",
    background: theme.tokens.codeBg,
    color: theme.tokens.codeText,
    fontSize: "13px",
    lineHeight: "1.62",
    whiteSpace: "pre-wrap",
    wordBreak: "break-word"
  })}"><code>${escapeHtml(block.text)}</code></pre>`;
}

function renderTable(block, theme) {
  const header = block.header
    .map((cell) =>
      tag(
        "th",
        {
          padding: "10px 8px",
          border: `1px solid ${theme.tokens.border}`,
          background: theme.tokens.tableHead,
          color: theme.tokens.text,
          fontWeight: "800",
          textAlign: "left"
        },
        renderInline(cell)
      )
    )
    .join("");

  const rows = block.rows
    .map((row) => {
      const cells = row
        .map((cell) =>
          tag(
            "td",
            {
              padding: "10px 8px",
              border: `1px solid ${theme.tokens.border}`,
              color: theme.tokens.text,
              verticalAlign: "top"
            },
            renderInline(cell)
          )
        )
        .join("");
      return `<tr>${cells}</tr>`;
    })
    .join("\n");

  return `<section style="${style({ margin: "18px 0", overflowX: "auto" })}">
  <table style="${style({
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "14px",
    lineHeight: "1.6"
  })}">
    <thead><tr>${header}</tr></thead>
    <tbody>${rows}</tbody>
  </table>
</section>`;
}

function renderImage(block, theme) {
  const caption = block.title || block.alt;
  return `<figure style="${style({
    margin: "20px 0",
    padding: "0",
    textAlign: "center"
  })}">
  <img src="${escapeHtml(block.src)}" alt="${escapeHtml(block.alt)}" style="${style({
    display: "block",
    width: "100%",
    maxWidth: "100%",
    height: "auto",
    margin: "0 auto",
    borderRadius: "8px",
    border: `1px solid ${theme.tokens.border}`
  })}" />
  ${
    caption
      ? `<figcaption style="${style({
          marginTop: "8px",
          color: theme.tokens.muted,
          fontSize: "13px",
          lineHeight: "1.5"
        })}">${escapeHtml(caption)}</figcaption>`
      : ""
  }
</figure>`;
}

function renderMetaBar(theme, recommendation) {
  const reason = recommendation?.reason
    ? `Smart theme: ${theme.label}. ${recommendation.reason}`
    : `Theme: ${theme.label}.`;

  return `<section style="${style({
    margin: "0 0 14px",
    padding: "8px 10px",
    borderRadius: "999px",
    background: theme.tokens.soft,
    color: theme.tokens.muted,
    fontSize: "12px",
    lineHeight: "1.5",
    textAlign: "center"
  })}">${escapeHtml(reason)}</section>`;
}

function paragraphStyle(theme) {
  return {
    margin: "0 0 15px",
    color: theme.tokens.text,
    fontSize: "16px",
    lineHeight: "1.8",
    letterSpacing: "0",
    wordBreak: "break-word"
  };
}

function tag(name, styles, body) {
  return `<${name} style="${style(styles)}">${body}</${name}>`;
}

function style(input) {
  return Object.entries(input)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .map(([key, value]) => `${toKebab(key)}:${value}`)
    .join(";");
}

function toKebab(value) {
  return value.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}
