import path from "node:path";
import { slugify } from "./utils.js";

const IMAGE_PROVIDER = "image2 / gpt-image-2";
const DEFAULT_XHS_CARD_COUNT = 6;
const DEFAULT_VISUAL_COUNT = 2;

const STYLE_PRESETS = {
  "tech-pulse": {
    name: "深色科技媒体风",
    palette: "深蓝黑背景，蓝紫和青绿色霓虹光效，高对比，清晰 3D 控制台感",
    avoid: "不要真实平台 logo，不要伪汉字，不要廉价海报感，不要大段文字"
  },
  "science-clean": {
    name: "清爽科普图解风",
    palette: "浅色背景，青绿色和蓝色重点线条，干净解释图，专业可信",
    avoid: "不要医学诊断感，不要复杂表格，不要夸张营销风"
  },
  "food-magazine": {
    name: "温暖杂志生活风",
    palette: "暖白、橙棕、玫瑰红点缀，真实食物质感，杂志封面构图",
    avoid: "不要塑料食物感，不要过度滤镜，不要密集文字"
  },
  "health-trust": {
    name: "可信健康科普风",
    palette: "白底或浅绿底，绿色和蓝色点缀，清晰图标，温和可信",
    avoid: "不要惊悚画面，不要制造恐慌，不要医疗诊断结论"
  },
  "github-doc": {
    name: "开发者文档图解风",
    palette: "白底或浅灰底，蓝绿重点色，代码卡片、流程箭头、接口节点",
    avoid: "不要真实品牌 logo，不要过多代码细节，不要终端截图拼贴"
  },
  "essay-paper": {
    name: "纸感随笔插画风",
    palette: "米白纸张质感，墨色文字，少量墨绿或棕色点缀，温和留白",
    avoid: "不要商业海报感，不要霓虹科技感，不要杂乱拼贴"
  },
  "news-brief": {
    name: "新闻简报风",
    palette: "白底、红黑灰重点色，信息层级清楚，像新闻解释图",
    avoid: "不要标题党视觉，不要过度情绪化，不要复杂背景"
  },
  "minimal-ink": {
    name: "极简墨色信息图风",
    palette: "白底、黑字、少量翡翠绿点缀，强留白，结构清楚",
    avoid: "不要花哨渐变，不要密集排版，不要装饰性元素"
  }
};

export function buildVisualPlan(article, recommendation, options = {}) {
  const theme = recommendation.theme;
  const preset = STYLE_PRESETS[theme.id] || STYLE_PRESETS["minimal-ink"];
  const sections = extractSections(article);
  const visualCount = clampNumber(options.count, 1, 4, DEFAULT_VISUAL_COUNT);
  const candidates = pickVisualSections(sections, visualCount);
  const title = article.title || "未命名文章";

  return {
    provider: IMAGE_PROVIDER,
    theme: {
      id: theme.id,
      label: theme.label,
      style: preset.name
    },
    title,
    summary: summarizeArticle(article),
    cover: {
      role: "微信公众号封面",
      size: options.coverSize || "1536 x 656",
      prompt: buildCoverPrompt({ title, article, preset, recommendation, channel: "wechat" })
    },
    inline: candidates.map((section, index) => ({
      role: index === 0 ? "正文结构图" : "正文补充图",
      size: options.inlineSize || "1080 x 1350",
      insertAfter: section.heading || "文章中段",
      prompt: buildInlinePrompt({ section, title, preset, index })
    })),
    xhsCover: {
      role: "小红书首图",
      size: options.xhsSize || "1080 x 1440",
      prompt: buildCoverPrompt({ title, article, preset, recommendation, channel: "xhs" })
    }
  };
}

export function renderVisualPlanMarkdown(plan) {
  const lines = [];
  lines.push(`# ${plan.title}｜image2 配图提示词`);
  lines.push("");
  lines.push(`推荐主题：${plan.theme.label}（${plan.theme.id}）`);
  lines.push(`出图工具：${plan.provider}`);
  lines.push("");
  lines.push("原则：图片补结构，不复读正文；中文必须少而准；正式发稿前逐张检查文字。");
  lines.push("");
  lines.push("## 公众号封面");
  lines.push("");
  lines.push(`尺寸建议：${plan.cover.size}`);
  lines.push("");
  lines.push("```text");
  lines.push(plan.cover.prompt);
  lines.push("```");
  lines.push("");
  for (const [index, item] of plan.inline.entries()) {
    lines.push(`## 正文图 ${index + 1}：${item.insertAfter}`);
    lines.push("");
    lines.push(`用途：${item.role}，建议放在「${item.insertAfter}」之后。`);
    lines.push(`尺寸建议：${item.size}`);
    lines.push("");
    lines.push("```text");
    lines.push(item.prompt);
    lines.push("```");
    lines.push("");
  }
  lines.push("## 小红书首图");
  lines.push("");
  lines.push(`尺寸建议：${plan.xhsCover.size}`);
  lines.push("");
  lines.push("```text");
  lines.push(plan.xhsCover.prompt);
  lines.push("```");
  lines.push("");
  return lines.join("\n");
}

export function buildXhsPack(article, recommendation, options = {}) {
  const theme = recommendation.theme;
  const preset = STYLE_PRESETS[theme.id] || STYLE_PRESETS["minimal-ink"];
  const cardCount = clampNumber(options.cards, 4, 9, DEFAULT_XHS_CARD_COUNT);
  const title = article.title || "未命名文章";
  const sections = extractSections(article);
  const cards = buildXhsCards({ article, sections, cardCount, preset, recommendation });
  const hashtags = buildHashtags(recommendation, article);

  return {
    platform: "xiaohongshu",
    provider: IMAGE_PROVIDER,
    size: options.size || "1080 x 1440",
    title: titleForXhs(title),
    caption: buildXhsCaption(article, cards, hashtags),
    hashtags,
    theme: {
      id: theme.id,
      label: theme.label,
      style: preset.name
    },
    cards
  };
}

export function renderXhsMarkdown(pack) {
  const lines = [];
  lines.push(`# ${pack.title}｜小红书图文分发包`);
  lines.push("");
  lines.push(`出图工具：${pack.provider}`);
  lines.push(`统一尺寸：${pack.size}`);
  lines.push(`视觉风格：${pack.theme.style}`);
  lines.push("");
  lines.push("## 发布文案");
  lines.push("");
  lines.push(pack.caption);
  lines.push("");
  lines.push("## 图卡脚本");
  lines.push("");
  for (const card of pack.cards) {
    lines.push(`### ${String(card.no).padStart(2, "0")}｜${card.title}`);
    lines.push("");
    if (card.subtitle) lines.push(`副标题：${card.subtitle}`);
    if (card.copy?.length) {
      lines.push("");
      lines.push("卡面文字：");
      for (const item of card.copy) lines.push(`- ${item}`);
    }
    lines.push("");
    lines.push("image2 提示词：");
    lines.push("");
    lines.push("```text");
    lines.push(card.prompt);
    lines.push("```");
    lines.push("");
  }
  return lines.join("\n");
}

export function buildPublishChecklist(article, recommendation, outputs) {
  const title = article.title || "未命名文章";
  const theme = recommendation.theme;
  const lines = [];
  lines.push(`# ${title}｜多渠道发布检查表`);
  lines.push("");
  lines.push(`推荐主题：${theme.label}（${theme.id}）`);
  lines.push("");
  lines.push("## 公众号");
  lines.push("");
  lines.push("- [ ] 检查标题是否具体，开头 150 字是否说清误区和带走物。");
  lines.push("- [ ] 打开 preview HTML，确认手机宽度下无文字重叠、图片过宽、段落过密。");
  lines.push("- [ ] 用 image2 生成封面和正文图，逐张检查中文是否正确。");
  lines.push("- [ ] live draft 前先跑 `draft --dry-run --json`。");
  lines.push("- [ ] 创建草稿后记录 `media_id`、封面路径、预览路径。");
  lines.push("");
  lines.push("## 小红书");
  lines.push("");
  lines.push("- [ ] 首图 3 秒内能看懂主题。");
  lines.push("- [ ] 每张图只讲一个点，文字不超过手机阅读负担。");
  lines.push("- [ ] 正文文案不要照搬公众号全文，只保留问题、清单、行动建议。");
  lines.push("- [ ] 图片顺序能独立成一个闭环。");
  lines.push("");
  lines.push("## 本次产物");
  lines.push("");
  for (const [label, filePath] of Object.entries(outputs)) {
    lines.push(`- ${label}: ${filePath}`);
  }
  lines.push("");
  return lines.join("\n");
}

function extractSections(article) {
  const sections = [];
  let current = {
    heading: article.title || "开头",
    level: 1,
    paragraphs: [],
    lists: []
  };

  for (const block of article.blocks || []) {
    if (block.type === "heading" && block.level <= 2) {
      if (current.paragraphs.length || current.lists.length || current.heading !== article.title) {
        sections.push(current);
      }
      current = {
        heading: cleanHeading(block.text),
        level: block.level,
        paragraphs: [],
        lists: []
      };
      continue;
    }
    if (block.type === "paragraph" && block.text) current.paragraphs.push(block.text);
    if (block.type === "list") current.lists.push(...(block.items || []));
  }

  if (current.paragraphs.length || current.lists.length) sections.push(current);
  return sections.length ? sections : [{ heading: article.title || "正文", level: 1, paragraphs: [article.text || ""], lists: [] }];
}

function pickVisualSections(sections, count) {
  const scored = sections
    .filter((section) => cleanHeading(section.heading).length > 0)
    .map((section, index) => ({
      section,
      score:
        (section.lists.length ? 5 : 0) +
        (section.heading.match(/步骤|清单|标准|对比|流程|方法|问题|建议|风险|误区|为什么/) ? 4 : 0) +
        Math.min(section.paragraphs.join("").length / 120, 4) -
        index * 0.15
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, count)
    .map((item) => item.section);
  return scored.length ? scored : sections.slice(0, count);
}

function buildXhsCards({ article, sections, cardCount, preset, recommendation }) {
  const title = article.title || "未命名文章";
  const cards = [];
  const summary = summarizeArticle(article);
  cards.push({
    no: 1,
    role: "cover",
    title: titleForXhs(title),
    subtitle: summary,
    copy: ["别先追工具", "先把流程跑顺", "一套能复用的判断清单"],
    prompt: buildXhsCardPrompt({
      title: titleForXhs(title),
      subtitle: summary,
      copy: ["别先追工具", "先把流程跑顺", "输入 / 步骤 / 标准 / 输出 / 复盘"],
      role: "首图封面",
      preset,
      recommendation
    })
  });

  const bodySections = sections.filter((section) => cleanHeading(section.heading) !== title).slice(0, cardCount - 2);
  for (const section of bodySections) {
    const copy = bulletsForSection(section, 3);
    cards.push({
      no: cards.length + 1,
      role: "body",
      title: titleForXhs(cleanHeading(section.heading), 18),
      subtitle: copy[0] || "",
      copy,
      prompt: buildXhsCardPrompt({
        title: titleForXhs(cleanHeading(section.heading), 18),
        subtitle: copy[0] || "",
        copy,
        role: "正文图卡",
        preset,
        recommendation
      })
    });
  }

  while (cards.length < cardCount - 1) {
    const idx = cards.length;
    const fallback = ["固定输入", "清晰步骤", "判断标准", "可交付输出", "持续复盘"][idx % 5];
    cards.push({
      no: cards.length + 1,
      role: "checklist",
      title: fallback,
      subtitle: "把它写清楚，流程才有复用价值。",
      copy: ["能不能写成清单？", "别人照着能不能少踩坑？", "下一次能不能更稳？"],
      prompt: buildXhsCardPrompt({
        title: fallback,
        subtitle: "工作流判断卡",
        copy: ["能不能写成清单", "能不能稳定交付", "能不能复盘迭代"],
        role: "清单图卡",
        preset,
        recommendation
      })
    });
  }

  cards.push({
    no: cards.length + 1,
    role: "ending",
    title: "最后问自己 5 个问题",
    subtitle: "这张适合收藏。",
    copy: ["输入是什么？", "步骤清楚吗？", "标准明确吗？", "输出能直接用吗？", "跑完会复盘吗？"],
    prompt: buildXhsCardPrompt({
      title: "最后问自己 5 个问题",
      subtitle: "收藏版工作流检查表",
      copy: ["输入", "步骤", "标准", "输出", "复盘"],
      role: "结尾收藏卡",
      preset,
      recommendation
    })
  });

  return cards.map((card, index) => ({ ...card, no: index + 1 }));
}

function buildCoverPrompt({ title, article, preset, recommendation, channel }) {
  const isXhs = channel === "xhs";
  const displayTitle = isXhs ? titleForXhs(title) : shortTitle(title, 32);
  const subtitle = summarizeArticle(article);
  const sizeText = isXhs ? "竖版小红书首图，1080 x 1440" : "微信公众号封面，1536 x 656 或 900 x 383";
  return [
    `生成一张${sizeText}。`,
    `主题：${displayTitle}`,
    subtitle ? `副标题方向：${subtitle}` : "",
    `视觉风格：${preset.name}。${preset.palette}。`,
    `构图：标题必须清晰完整，主体视觉围绕「${recommendation.category || "内容主题"}」展开，画面要有明确的信息层级。`,
    isXhs
      ? "小红书要求：首图 3 秒内能看懂，标题大、字少、对比强，适合收藏和转发。"
      : "公众号要求：远看能读清标题，留出安全边距，适合文章列表封面裁切。",
    `中文文字：${displayTitle}`,
    "文字要求：所有中文必须真实可读，不要伪汉字，不要乱码。",
    `负面约束：${preset.avoid}。`
  ]
    .filter(Boolean)
    .join("\n");
}

function buildInlinePrompt({ section, title, preset, index }) {
  const heading = cleanHeading(section.heading) || `结构图 ${index + 1}`;
  const bullets = bulletsForSection(section, 4);
  return [
    `生成一张微信公众号正文信息图，主题是「${heading}」。`,
    `所属文章：${title}`,
    `风格：${preset.name}。${preset.palette}。`,
    "画面目标：补充结构，不复读正文；让读者一眼看懂这一节的核心逻辑。",
    bullets.length ? `图中保留这些短标签：${bullets.map((item) => `「${shortTitle(item, 14)}」`).join("、")}` : "",
    "构图建议：中心放一个清晰主概念，两侧用 3-5 个短标签或流程节点连接。",
    "中文必须清晰完整，文字数量少，手机阅读不拥挤。",
    `负面约束：${preset.avoid}。`
  ]
    .filter(Boolean)
    .join("\n");
}

function buildXhsCardPrompt({ title, subtitle, copy, role, preset, recommendation }) {
  return [
    `生成一张小红书图文卡，尺寸 1080 x 1440，角色：${role}。`,
    `主题：${title}`,
    subtitle ? `副标题：${shortTitle(subtitle, 24)}` : "",
    `视觉风格：${preset.name}。${preset.palette}。`,
    `内容类型：${recommendation.category || "通用内容"}。`,
    copy?.length ? `卡面短文案：${copy.map((item) => `「${shortTitle(item, 24)}」`).join("、")}` : "",
    "排版要求：标题大，正文少，留白充足，适合手机保存；每张只表达一个核心点。",
    "中文必须清晰完整，不要伪汉字、乱码、英文水印或真实平台 logo。",
    `负面约束：${preset.avoid}。`
  ]
    .filter(Boolean)
    .join("\n");
}

function buildXhsCaption(article, cards, hashtags) {
  const summary = summarizeArticle(article);
  const takeaways = cards
    .slice(1, Math.min(cards.length, 5))
    .map((card) => `- ${card.title}`)
    .join("\n");
  return [
    summary || "别只收藏工具，先把自己能重复跑的流程搭起来。",
    "",
    "这篇我把判断标准拆成几张图：",
    takeaways,
    "",
    "你可以先拿一件每周都重复做的事跑 3 次：第一次做完，第二次写步骤，第三次补标准。",
    "",
    hashtags.join(" ")
  ]
    .filter(Boolean)
    .join("\n");
}

function buildHashtags(recommendation, article) {
  const base = ["#AI工具", "#工作流", "#副业思路"];
  const category = recommendation.category;
  if (category === "health") return ["#健康科普", "#实用知识", "#生活安全"];
  if (category === "food") return ["#美食日常", "#生活方式", "#实用分享"];
  if (category === "science") return ["#科普", "#知识分享", "#学习笔记"];
  if (category === "tutorial") return ["#效率工具", "#教程", "#工具分享"];
  if ((article.text || "").toLowerCase().includes("youtube")) base.push("#YouTube");
  return base;
}

function bulletsForSection(section, limit) {
  const listItems = section.lists || [];
  const paragraphItems = (section.paragraphs || [])
    .map((text) => text.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  const raw = [...listItems, ...paragraphItems]
    .map((item) => shortTitle(stripMarkdown(item), 28))
    .filter((item) => item.length >= 2);
  return unique(raw).slice(0, limit);
}

function summarizeArticle(article) {
  const description = article.metadata?.description;
  if (description) return shortTitle(description, 46);
  const firstPara = (article.blocks || []).find((block) => block.type === "paragraph" && block.text)?.text || "";
  return shortTitle(stripMarkdown(firstPara), 46);
}

function cleanHeading(value = "") {
  return stripMarkdown(value)
    .replace(/^\d{1,2}\s*[｜|、.)-]\s*/, "")
    .replace(/^第\s*\d+\s*[章节篇]\s*/, "")
    .trim();
}

function stripMarkdown(value = "") {
  return String(value)
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[*_`#>]/g, "")
    .trim();
}

function shortTitle(value = "", max = 30) {
  const cleaned = String(value).replace(/\s+/g, " ").trim();
  if (cleaned.length <= max) return cleaned;
  const prefix = cleaned.slice(0, max + 6);
  const delimiter = prefix.search(/[，,。；;：:、｜|]/);
  if (delimiter >= 6) return prefix.slice(0, delimiter).trim();
  return cleaned.slice(0, max).trim();
}

function titleForXhs(value = "", max = 20) {
  return shortTitle(cleanHeading(value), max);
}

function unique(items) {
  const seen = new Set();
  const result = [];
  for (const item of items) {
    if (seen.has(item)) continue;
    seen.add(item);
    result.push(item);
  }
  return result;
}

function clampNumber(value, min, max, fallback) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

export function defaultDistributionSlug(article) {
  return slugify(article.title || "article");
}
