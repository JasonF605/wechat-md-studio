const DEFAULT_WORKFLOW_NAME = "wechat-article-sop";

export function buildWorkflowReport(article, recommendation, outputs = {}, options = {}) {
  const title = article.title || "未命名文章";
  const theme = recommendation.theme;
  const inspection = inspectArticle(article);
  const draftMode = options.draftMode || "manual";
  const channels = buildChannelPlan(article, outputs);
  const gates = buildGates({ inspection, draftMode, outputs });

  return {
    kind: "workflow-report",
    workflow: options.workflowName || DEFAULT_WORKFLOW_NAME,
    title,
    theme: {
      id: theme.id,
      label: theme.label,
      confidence: recommendation.confidence,
      category: recommendation.category,
      reason: recommendation.reason
    },
    inspection,
    channels,
    gates,
    outputs,
    nextActions: buildNextActions({ gates, draftMode, outputs }),
    policy: {
      sourceMarkdown: "read-only unless the user explicitly asks to edit it",
      wechatDraft: "dry-run before live draft creation",
      finalPublish: "WeChat mass-send / final publish needs human confirmation",
      secrets: "never print AppSecret, access tokens, or full .env contents"
    }
  };
}

export function renderWorkflowMarkdown(report) {
  const lines = [];
  lines.push(`# ${report.title}｜文章号工作流报告`);
  lines.push("");
  lines.push(`流程：${report.workflow}`);
  lines.push(`推荐主题：${report.theme.label}（${report.theme.id}，置信度 ${report.theme.confidence}）`);
  lines.push(`推荐原因：${report.theme.reason}`);
  lines.push("");
  lines.push("## 内容体检");
  lines.push("");
  lines.push(`- 标题：${report.inspection.titleStatus}`);
  lines.push(`- 正文字数：${report.inspection.wordCount}`);
  lines.push(`- 段落：${report.inspection.paragraphs}`);
  lines.push(`- 标题层级：${report.inspection.headings}`);
  lines.push(`- 图片：${report.inspection.images}`);
  lines.push(`- 表格：${report.inspection.tables}`);
  lines.push(`- 代码块：${report.inspection.codeBlocks}`);
  lines.push(`- Frontmatter：${report.inspection.hasFrontmatter ? "有" : "缺失"}`);
  if (report.inspection.warnings.length) {
    lines.push("");
    lines.push("风险提醒：");
    for (const warning of report.inspection.warnings) lines.push(`- ${warning}`);
  }
  lines.push("");
  lines.push("## 渠道计划");
  lines.push("");
  for (const channel of report.channels) {
    lines.push(`- ${channel.name}：${channel.status}`);
  }
  lines.push("");
  lines.push("## 发布闸门");
  lines.push("");
  for (const gate of report.gates) {
    lines.push(`- [${gate.ok ? "x" : " "}] ${gate.name}：${gate.message}`);
  }
  lines.push("");
  lines.push("## 本次产物");
  lines.push("");
  for (const [label, filePath] of Object.entries(report.outputs)) {
    if (!filePath) continue;
    lines.push(`- ${label}: ${filePath}`);
  }
  lines.push("");
  lines.push("## 下一步");
  lines.push("");
  for (const action of report.nextActions) lines.push(`- ${action}`);
  lines.push("");
  lines.push("## 安全边界");
  lines.push("");
  lines.push("- 源 Markdown 默认只读，除非明确要求修改。");
  lines.push("- 草稿箱 live 创建前先跑 dry-run。");
  lines.push("- 公众号最终群发/发布必须人工确认。");
  lines.push("- 不打印 AppSecret、access token 或完整 `.env`。");
  lines.push("");
  return lines.join("\n");
}

function inspectArticle(article) {
  const blocks = article.blocks || [];
  const counts = blocks.reduce(
    (acc, block) => {
      acc.total += 1;
      acc[block.type] = (acc[block.type] || 0) + 1;
      return acc;
    },
    { total: 0 }
  );
  const warnings = [];
  const wordCount = countWords(article.text || "");
  const title = article.title || "";
  const hasFrontmatter = Object.keys(article.metadata || {}).length > 0;

  if (!title || title === "未命名文章") warnings.push("标题为空或不够明确，建议发布前补一个具体标题。");
  if (title.length > 64) warnings.push("标题偏长，公众号后台和小红书首图可能需要单独改短。");
  if (wordCount < 500) warnings.push("正文偏短，适合图文快讯；如果是深度文章，建议补充案例或步骤。");
  if ((counts.heading || 0) < 2) warnings.push("二级标题较少，手机阅读时可能不够好扫读。");
  if (!hasFrontmatter) warnings.push("缺少 frontmatter，进入知识库或批量发布前需要补齐 channel/status/date。");

  return {
    titleStatus: title ? "已识别" : "缺失",
    wordCount,
    paragraphs: counts.paragraph || 0,
    headings: counts.heading || 0,
    images: counts.image || 0,
    tables: counts.table || 0,
    codeBlocks: counts.code || 0,
    hasFrontmatter,
    warnings
  };
}

function buildChannelPlan(article, outputs) {
  const metadata = article.metadata || {};
  const xhsEnabled = metadata.xhs !== false;
  const wechatEnabled = metadata.wechat_draft !== false && metadata.wechatDraft !== false;
  const siteEnabled = metadata.site === true;
  return [
    {
      id: "wechat",
      name: "微信公众号",
      status: wechatEnabled ? `生成预览、HTML 和草稿箱检查：${outputs.previewHtml || "pending"}` : "metadata 已关闭"
    },
    {
      id: "xhs",
      name: "小红书",
      status: xhsEnabled ? `生成图文卡脚本和 JSON：${outputs.xhsMarkdown || "pending"}` : "metadata 已关闭"
    },
    {
      id: "site",
      name: "自有站/知识库",
      status: siteEnabled ? "metadata 标记可进入站点队列" : "默认不进入站点队列"
    }
  ];
}

function buildGates({ inspection, draftMode, outputs }) {
  return [
    {
      id: "theme",
      name: "主题推荐",
      ok: true,
      message: "已完成自动主题推荐。"
    },
    {
      id: "preview",
      name: "本地预览",
      ok: Boolean(outputs.previewHtml),
      message: outputs.previewHtml ? "已生成 preview.html。" : "还没有生成 preview.html。"
    },
    {
      id: "visuals",
      name: "配图准备",
      ok: Boolean(outputs.image2Prompts),
      message: outputs.image2Prompts ? "已生成 image2 提示词。" : "还没有生成配图提示词。"
    },
    {
      id: "xhs",
      name: "小红书分发包",
      ok: Boolean(outputs.xhsMarkdown && outputs.xhsJson),
      message: outputs.xhsMarkdown ? "已生成小红书 Markdown/JSON。" : "还没有生成小红书包。"
    },
    {
      id: "metadata",
      name: "知识库元数据",
      ok: inspection.hasFrontmatter,
      message: inspection.hasFrontmatter ? "已包含 frontmatter。" : "缺少 frontmatter，不建议进入批量队列。"
    },
    {
      id: "draft",
      name: "草稿箱",
      ok: draftMode === "dry-run" || draftMode === "created" || draftMode === "manual",
      message: draftMessage(draftMode)
    }
  ];
}

function buildNextActions({ gates, draftMode, outputs }) {
  const actions = [];
  if (outputs.previewHtml) actions.push("打开 preview.html，先用手机宽度检查标题、段落、表格和图片。");
  if (outputs.image2Prompts) actions.push("用 image2 / gpt-image-2 出封面和正文图，逐张检查中文文字。");
  if (outputs.xhsMarkdown) actions.push("查看 xhs.md，把图卡提示词交给出图流程后再排小红书。");
  if (draftMode === "none") actions.push("如果要进公众号草稿箱，先补封面或 thumb_media_id，再跑 draft --dry-run。");
  if (draftMode === "dry-run") actions.push("dry-run 通过后，再明确要求 live draft，工具才会创建公众号草稿。");
  if (!gates.find((gate) => gate.id === "metadata")?.ok) actions.push("补齐 frontmatter：date、channel、status、series、wechat_draft、xhs。");
  actions.push("最终群发前人工检查后台预览，公众号发布环节需要你扫码/点击确认。");
  return unique(actions);
}

function draftMessage(mode) {
  if (mode === "dry-run") return "本次执行了 dry-run 或准备执行 dry-run。";
  if (mode === "created") return "已创建草稿，最终发布仍需人工确认。";
  if (mode === "none") return "本次未处理草稿箱。";
  return "保持人工确认模式。";
}

function countWords(text = "") {
  const cjk = (text.match(/[\u3400-\u9fff]/g) || []).length;
  const latin = (text.replace(/[\u3400-\u9fff]/g, " ").match(/[A-Za-z0-9]+/g) || []).length;
  return cjk + latin;
}

function unique(items) {
  return [...new Set(items)];
}
