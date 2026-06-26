import { themeCatalog } from "./themes/catalog.js";

const CATEGORY_RULES = [
  {
    category: "ai-money",
    theme: "tech-pulse",
    label: "AI monetization and tool workflow",
    keywords: [
      "ai赚钱",
      "副业",
      "变现",
      "自动化",
      "工作流",
      "youtube",
      "prompt",
      "提示词",
      "模型",
      "codex",
      "chatgpt",
      "agent",
      "工具",
      "效率",
      "流量",
      "起号"
    ],
    weight: 4
  },
  {
    category: "tutorial",
    theme: "github-doc",
    label: "tutorial or developer documentation",
    keywords: [
      "教程",
      "步骤",
      "配置",
      "安装",
      "代码",
      "命令",
      "脚本",
      "api",
      "github",
      "终端",
      "报错",
      "部署",
      "开源"
    ],
    weight: 3
  },
  {
    category: "science",
    theme: "science-clean",
    label: "science or knowledge explanation",
    keywords: [
      "科普",
      "原理",
      "机制",
      "研究",
      "实验",
      "数据",
      "为什么",
      "证据",
      "自然",
      "认知",
      "解释"
    ],
    weight: 3
  },
  {
    category: "food",
    theme: "food-magazine",
    label: "food, recipe, and lifestyle",
    keywords: [
      "美食",
      "食谱",
      "做法",
      "厨房",
      "早餐",
      "晚餐",
      "食材",
      "口味",
      "烘焙",
      "餐厅",
      "下饭",
      "家常"
    ],
    weight: 4
  },
  {
    category: "health",
    theme: "health-trust",
    label: "health and safety literacy",
    keywords: [
      "健康",
      "疾病",
      "医院",
      "医生",
      "症状",
      "中风",
      "血压",
      "用药",
      "老人",
      "急救",
      "体检",
      "风险",
      "安全"
    ],
    weight: 4
  },
  {
    category: "essay",
    theme: "essay-paper",
    label: "personal essay or field note",
    keywords: [
      "随笔",
      "复盘",
      "日记",
      "生活",
      "感受",
      "故事",
      "记录",
      "我发现",
      "这一天",
      "亲身",
      "经历"
    ],
    weight: 2
  },
  {
    category: "news",
    theme: "news-brief",
    label: "news or current commentary",
    keywords: [
      "最新",
      "发布",
      "官方",
      "公告",
      "政策",
      "通知",
      "趋势",
      "回应",
      "宣布"
    ],
    weight: 3
  }
];

export function analyzeArticle(article) {
  const text = [
    article.title || "",
    article.metadata?.description || "",
    article.metadata?.category || "",
    article.text || ""
  ]
    .join("\n")
    .toLowerCase();

  const scores = new Map();
  const evidence = new Map();

  for (const rule of CATEGORY_RULES) {
    let score = 0;
    const hits = [];
    for (const keyword of rule.keywords) {
      const normalized = keyword.toLowerCase();
      const count = countOccurrences(text, normalized);
      if (count > 0) {
        score += count * rule.weight;
        hits.push(keyword);
      }
    }
    if (score > 0) {
      scores.set(rule.category, score);
      evidence.set(rule.category, hits.slice(0, 6));
    }
  }

  const headings = article.blocks?.filter((block) => block.type === "heading").length || 0;
  const codeBlocks = article.blocks?.filter((block) => block.type === "code").length || 0;
  const tables = article.blocks?.filter((block) => block.type === "table").length || 0;
  const images = article.blocks?.filter((block) => block.type === "image").length || 0;

  if (codeBlocks > 0) bump(scores, evidence, "tutorial", codeBlocks * 4, ["code block"]);
  if (tables > 0) bump(scores, evidence, "science", tables * 2, ["table"]);
  if (images >= 3) bump(scores, evidence, "lifestyle", 2, ["image-heavy"]);
  if (headings >= 5) bump(scores, evidence, "tutorial", 1, ["structured headings"]);

  return {
    scores: Object.fromEntries([...scores.entries()].sort((a, b) => b[1] - a[1])),
    evidence: Object.fromEntries(evidence.entries()),
    signals: {
      headings,
      codeBlocks,
      tables,
      images,
      characters: article.text?.length || 0
    }
  };
}

export function recommendTheme(article, preferredTheme = "auto") {
  if (preferredTheme && preferredTheme !== "auto") {
    const theme = themeCatalog.find((item) => item.id === preferredTheme);
    if (!theme) throw new Error(`Unknown theme "${preferredTheme}".`);
    return {
      theme,
      confidence: 1,
      category: "manual",
      reason: `Manual theme selected: ${theme.id}`,
      analysis: analyzeArticle(article)
    };
  }

  const analysis = analyzeArticle(article);
  const entries = Object.entries(analysis.scores);
  if (entries.length === 0) {
    const theme = themeCatalog.find((item) => item.id === "minimal-ink");
    return {
      theme,
      confidence: 0.35,
      category: "minimal",
      reason: "No strong topic signal found; using a quiet evergreen reading theme.",
      analysis
    };
  }

  const [topCategory, topScore] = entries[0];
  const matchedRule = CATEGORY_RULES.find((rule) => rule.category === topCategory);
  const theme = themeCatalog.find((item) => item.id === matchedRule?.theme) || themeCatalog[0];
  const secondScore = entries[1]?.[1] || 0;
  const confidence = clamp((topScore - secondScore + 4) / (topScore + 8), 0.45, 0.96);
  const hits = analysis.evidence[topCategory]?.join(", ") || "structural signals";

  return {
    theme,
    confidence: Number(confidence.toFixed(2)),
    category: topCategory,
    reason: `Matched ${matchedRule?.label || topCategory} signals: ${hits}.`,
    analysis
  };
}

function countOccurrences(text, keyword) {
  if (!keyword) return 0;
  let count = 0;
  let index = text.indexOf(keyword);
  while (index !== -1) {
    count += 1;
    index = text.indexOf(keyword, index + keyword.length);
  }
  return count;
}

function bump(scores, evidence, category, amount, hits) {
  scores.set(category, (scores.get(category) || 0) + amount);
  evidence.set(category, [...(evidence.get(category) || []), ...hits]);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
