import { getTheme, themeCatalog } from "./themes/catalog.js";

const REQUIRED_TOKENS = [
  "background",
  "text",
  "muted",
  "accent",
  "accent2",
  "soft",
  "soft2",
  "border",
  "codeBg",
  "codeText",
  "quoteBg",
  "tableHead"
];

const PURPOSE_BY_THEME = {
  "tech-pulse": {
    voice: "Sharp, energetic, and commercial. Use for AI monetization, tools, automation, and workflow essays.",
    avoid: "Avoid generic blue-purple gradients, oversized hero cards, and decorative SaaS landing-page styling.",
    h1: "A compact editorial title panel with a pale technical background and a decisive ink headline.",
    h2: "Left-accented section headers that feel like workflow checkpoints.",
    quote: "Use quotes as decision notes or key warnings, not as decorative pull quotes.",
    emphasis: "Use bold text for action thresholds, numbers, and practical criteria."
  },
  "science-clean": {
    voice: "Calm, explanatory, and trustworthy. Use for mechanisms, research summaries, and knowledge articles.",
    avoid: "Avoid sensational colors and dense visual ornament.",
    h1: "A clean title block with a quiet laboratory-note feeling.",
    h2: "Use headers as steps in an explanation chain.",
    quote: "Use quotes for definitions, caveats, or source-sensitive notes.",
    emphasis: "Highlight concepts and causal links."
  },
  "food-magazine": {
    voice: "Warm, appetizing, and editorial. Use for recipes, restaurant notes, and lifestyle food writing.",
    avoid: "Avoid heavy brown/orange dominance; keep enough contrast and white space.",
    h1: "A soft magazine-style opening with warm contrast.",
    h2: "Use section headers like recipe stages or tasting notes.",
    quote: "Use quotes for tips, substitutions, or sensory observations.",
    emphasis: "Highlight timing, texture, and failure points."
  },
  "health-trust": {
    voice: "Clear, cautious, and reliable. Use for elder care, safety reminders, and health literacy.",
    avoid: "Avoid alarmist red-heavy styling unless the content is explicitly urgent.",
    h1: "A reassuring title panel that reads like a family safety note.",
    h2: "Use headers as safety steps or symptoms to notice.",
    quote: "Use quotes for warnings, seek-help conditions, and do-not-do notes.",
    emphasis: "Highlight conditions, time windows, and what to do next."
  },
  "github-doc": {
    voice: "Practical, structured, and developer-friendly. Use for tutorials, APIs, deployment notes, and tooling walkthroughs.",
    avoid: "Avoid marketing hero layouts and vague inspirational styling.",
    h1: "A documentation-style title block with strong hierarchy.",
    h2: "Use headers as command stages or implementation sections.",
    quote: "Use quotes for compatibility notes and gotchas.",
    emphasis: "Highlight commands, file names, and irreversible steps."
  },
  "essay-paper": {
    voice: "Quiet, reflective, and essay-like. Use for personal notes, field observations, and story-driven posts.",
    avoid: "Avoid loud accents and dashboard-like blocks.",
    h1: "A paper-like title block with restrained warmth.",
    h2: "Use headers as narrative turns.",
    quote: "Use quotes for reflection and memory fragments.",
    emphasis: "Highlight emotional pivots and thesis sentences."
  },
  "news-brief": {
    voice: "Crisp, timely, and high-signal. Use for announcements, policy notes, and current commentary.",
    avoid: "Avoid heavy newspaper cosplay and excessive red.",
    h1: "A direct news-style title block with strong contrast.",
    h2: "Use headers as facts, implications, and next steps.",
    quote: "Use quotes for official statements and disputed points.",
    emphasis: "Highlight dates, actors, and consequences."
  },
  "minimal-ink": {
    voice: "Low-noise, evergreen, and reading-first. Use when topic signals are weak or the author wants restraint.",
    avoid: "Avoid unnecessary color blocks and complex decoration.",
    h1: "A simple ink-on-paper title block.",
    h2: "Use headers as gentle reading anchors.",
    quote: "Use quotes sparingly.",
    emphasis: "Highlight only the strongest takeaway in each section."
  }
};

export function renderThemeDesignMarkdown(themeOrId = "minimal-ink", options = {}) {
  const theme = resolveTheme(themeOrId);
  const purpose = PURPOSE_BY_THEME[theme.id] || PURPOSE_BY_THEME["minimal-ink"];
  const tokens = theme.tokens;
  const includeFrontmatter = options.frontmatter !== false;
  const lines = [];

  if (includeFrontmatter) {
    lines.push("---");
    lines.push(`name: ${quote(theme.label)}`);
    lines.push(`id: ${theme.id}`);
    lines.push("platform: wechat-official-account");
    lines.push("renderer: inline-html");
    lines.push("colors:");
    lines.push(`  background: "${tokens.background}"`);
    lines.push(`  text: "${tokens.text}"`);
    lines.push(`  muted: "${tokens.muted}"`);
    lines.push(`  accent: "${tokens.accent}"`);
    lines.push(`  accent2: "${tokens.accent2}"`);
    lines.push(`  soft: "${tokens.soft}"`);
    lines.push(`  soft2: "${tokens.soft2}"`);
    lines.push(`  border: "${tokens.border}"`);
    lines.push(`  quoteBg: "${tokens.quoteBg}"`);
    lines.push(`  codeBg: "${tokens.codeBg}"`);
    lines.push(`  codeText: "${tokens.codeText}"`);
    lines.push(`  tableHead: "${tokens.tableHead}"`);
    lines.push("typography:");
    lines.push("  body:");
    lines.push("    fontSize: 16px");
    lines.push("    lineHeight: 1.8");
    lines.push("  h1:");
    lines.push("    fontSize: 24px");
    lines.push("    lineHeight: 1.35");
    lines.push("    fontWeight: 800");
    lines.push("  h2:");
    lines.push("    fontSize: 20px");
    lines.push("    lineHeight: 1.42");
    lines.push("    fontWeight: 800");
    lines.push("spacing:");
    lines.push("  paragraphBottom: 15px");
    lines.push("  sectionTop: 30px");
    lines.push("  cardPadding: 18px");
    lines.push("radius:");
    lines.push("  sm: 6px");
    lines.push("  md: 8px");
    lines.push("wechatCompatibility:");
    lines.push("  cssMode: inline-style");
    lines.push("  avoidExternalFonts: true");
    lines.push("  avoidComplexSelectors: true");
    lines.push("---");
    lines.push("");
  }

  lines.push(`# ${theme.label} DESIGN.md`);
  lines.push("");
  lines.push("## Overview");
  lines.push("");
  lines.push(theme.description);
  lines.push("");
  lines.push(purpose.voice);
  lines.push("");
  lines.push("## Visual Intent");
  lines.push("");
  lines.push(`- H1: ${purpose.h1}`);
  lines.push(`- H2: ${purpose.h2}`);
  lines.push(`- Quote: ${purpose.quote}`);
  lines.push(`- Emphasis: ${purpose.emphasis}`);
  lines.push(`- Avoid: ${purpose.avoid}`);
  lines.push("");
  lines.push("## WeChat Rendering Rules");
  lines.push("");
  lines.push("- Use inline styles because WeChat editor strips or rewrites many class-based styles.");
  lines.push("- Keep border radius at 8px or lower for article blocks and images.");
  lines.push("- Keep body text at 16px with 1.8 line height for phone reading.");
  lines.push("- Use one main accent and one secondary accent; do not turn the article into a one-hue gradient page.");
  lines.push("- Use title panels, section headers, quotes, tables, and image captions as reusable components.");
  lines.push("");
  lines.push("## Component Rules");
  lines.push("");
  lines.push("- Title block: soft background, 1px border, compact padding, clear headline.");
  lines.push("- Section header: left accent line, no oversized type, no decorative icons by default.");
  lines.push("- Paragraph: short bottom margin and strong word wrapping for mobile.");
  lines.push("- Quote block: secondary accent border with a quiet background.");
  lines.push("- Code block: high-contrast dark surface, wrapped lines, no horizontal layout dependency.");
  lines.push("- Table: visible borders, compact cell padding, readable header background.");
  lines.push("- Image: full width, small radius, optional caption in muted color.");

  return lines.join("\n");
}

export function exportThemeDesignTokens(themeOrId = "minimal-ink") {
  const theme = resolveTheme(themeOrId);
  return {
    id: theme.id,
    name: theme.label,
    description: theme.description,
    categories: theme.categories,
    platform: "wechat-official-account",
    renderer: "inline-html",
    tokens: {
      colors: { ...theme.tokens },
      typography: {
        body: { fontSize: "16px", lineHeight: "1.8" },
        h1: { fontSize: "24px", lineHeight: "1.35", fontWeight: "800" },
        h2: { fontSize: "20px", lineHeight: "1.42", fontWeight: "800" },
        h3: { fontSize: "17px", lineHeight: "1.48", fontWeight: "800" }
      },
      spacing: {
        paragraphBottom: "15px",
        listBottom: "18px",
        sectionTop: "30px",
        cardPadding: "18px"
      },
      radius: {
        sm: "6px",
        md: "8px"
      }
    },
    guidance: PURPOSE_BY_THEME[theme.id] || PURPOSE_BY_THEME["minimal-ink"],
    compatibility: {
      cssMode: "inline-style",
      avoidExternalFonts: true,
      avoidComplexSelectors: true,
      target: "WeChat Official Account editor"
    }
  };
}

export function lintThemeDesign(themeOrId = "minimal-ink") {
  const theme = resolveTheme(themeOrId);
  const findings = [];

  for (const token of REQUIRED_TOKENS) {
    if (!theme.tokens[token]) {
      findings.push(finding("error", `tokens.${token}`, `Missing required token "${token}".`));
    } else if (!isHexColor(theme.tokens[token])) {
      findings.push(finding("error", `tokens.${token}`, `Token "${token}" must be a hex color.`));
    }
  }

  checkContrast(findings, theme, "text", "background", 7);
  checkContrast(findings, theme, "text", "soft", 4.5);
  checkContrast(findings, theme, "codeText", "codeBg", 4.5);

  if (!theme.description || theme.description.length < 40) {
    findings.push(finding("warning", "description", "Theme description is too short to guide an AI agent."));
  }

  if (!PURPOSE_BY_THEME[theme.id]) {
    findings.push(finding("warning", "guidance", "Theme has no human-readable design guidance."));
  }

  if (theme.tokens.accent === theme.tokens.accent2) {
    findings.push(finding("warning", "tokens.accent2", "Secondary accent should differ from the main accent."));
  }

  return {
    kind: "theme-design-lint",
    theme: theme.id,
    label: theme.label,
    findings,
    summary: summarizeFindings(findings)
  };
}

export function lintAllThemeDesigns() {
  const results = themeCatalog.map((theme) => lintThemeDesign(theme));
  const findings = results.flatMap((result) =>
    result.findings.map((item) => ({
      ...item,
      theme: result.theme
    }))
  );
  return {
    kind: "theme-design-lint",
    theme: "all",
    results,
    findings,
    summary: summarizeFindings(findings)
  };
}

function resolveTheme(themeOrId) {
  if (typeof themeOrId === "string") return getTheme(themeOrId);
  return themeOrId || getTheme();
}

function quote(value) {
  return `"${String(value).replaceAll('"', '\\"')}"`;
}

function finding(severity, path, message, extra = {}) {
  return { severity, path, message, ...extra };
}

function summarizeFindings(findings) {
  return findings.reduce(
    (acc, item) => {
      acc[item.severity] = (acc[item.severity] || 0) + 1;
      return acc;
    },
    { error: 0, warning: 0, info: 0 }
  );
}

function checkContrast(findings, theme, foreground, background, minRatio) {
  const fg = theme.tokens[foreground];
  const bg = theme.tokens[background];
  if (!isHexColor(fg) || !isHexColor(bg)) return;

  const ratio = contrastRatio(fg, bg);
  const path = `contrast.${foreground}On${capitalize(background)}`;
  if (ratio < minRatio) {
    findings.push(
      finding(
        "error",
        path,
        `${foreground} (${fg}) on ${background} (${bg}) has contrast ratio ${ratio.toFixed(2)}:1, below ${minRatio}:1.`,
        { ratio: Number(ratio.toFixed(2)), minimum: minRatio }
      )
    );
  } else {
    findings.push(
      finding(
        "info",
        path,
        `${foreground} (${fg}) on ${background} (${bg}) has contrast ratio ${ratio.toFixed(2)}:1.`,
        { ratio: Number(ratio.toFixed(2)), minimum: minRatio }
      )
    );
  }
}

function isHexColor(value) {
  return /^#[0-9a-fA-F]{6}$/.test(String(value || ""));
}

function contrastRatio(foreground, background) {
  const l1 = relativeLuminance(hexToRgb(foreground));
  const l2 = relativeLuminance(hexToRgb(background));
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function hexToRgb(hex) {
  const value = hex.replace("#", "");
  return {
    r: parseInt(value.slice(0, 2), 16),
    g: parseInt(value.slice(2, 4), 16),
    b: parseInt(value.slice(4, 6), 16)
  };
}

function relativeLuminance({ r, g, b }) {
  const [rs, gs, bs] = [r, g, b].map((channel) => {
    const value = channel / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
