import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

export function ensureDirForFile(filePath) {
  const dir = path.dirname(path.resolve(filePath));
  fs.mkdirSync(dir, { recursive: true });
}

export function readText(filePath) {
  return fs.readFileSync(path.resolve(filePath), "utf8").replace(/^\uFEFF/, "");
}

export function writeText(filePath, content) {
  ensureDirForFile(filePath);
  fs.writeFileSync(path.resolve(filePath), content, "utf8");
}

export function toPosixPath(filePath) {
  return filePath.split(path.sep).join("/");
}

export function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function slugify(value = "article") {
  const ascii = String(value)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return ascii || "article";
}

export function parseFlags(args) {
  const positional = [];
  const flags = {};

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (!arg.startsWith("--")) {
      positional.push(arg);
      continue;
    }

    const eqIndex = arg.indexOf("=");
    if (eqIndex !== -1) {
      flags[arg.slice(2, eqIndex)] = arg.slice(eqIndex + 1);
      continue;
    }

    const key = arg.slice(2);
    const next = args[i + 1];
    if (next && !next.startsWith("--")) {
      flags[key] = next;
      i += 1;
    } else {
      flags[key] = true;
    }
  }

  return { positional, flags };
}

export function copyToClipboard(content) {
  const platform = process.platform;
  let result;

  if (platform === "win32") {
    result = spawnSync("cmd.exe", ["/c", "clip"], {
      input: content,
      encoding: "utf8",
      windowsHide: true
    });
  } else if (platform === "darwin") {
    result = spawnSync("pbcopy", [], { input: content, encoding: "utf8" });
  } else {
    result = spawnSync("xclip", ["-selection", "clipboard"], {
      input: content,
      encoding: "utf8"
    });
  }

  if (result.error || result.status !== 0) {
    throw new Error("Clipboard copy failed. Write to --out and copy manually instead.");
  }
}

export function openInBrowser(filePath) {
  const resolved = path.resolve(filePath);
  if (process.platform === "win32") {
    spawnSync("cmd.exe", ["/c", "start", "", resolved], {
      windowsHide: true,
      shell: false
    });
    return;
  }
  if (process.platform === "darwin") {
    spawnSync("open", [resolved]);
    return;
  }
  spawnSync("xdg-open", [resolved]);
}
