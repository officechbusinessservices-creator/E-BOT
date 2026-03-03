/**
 * Antigravity Autonomous Engine — Shared Utilities
 * Common helpers used by all agents.
 */

import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AgentContext {
  agentName: string;
  runId: string;
  branch: string;
  repoRoot: string;
  dryRun: boolean;
}

export interface AgentResult {
  success: boolean;
  summary: string;
  artifacts: string[];
  prUrl?: string;
  errors: string[];
}

export interface Lesson {
  date: string;
  agent: string;
  context: string;
  lesson: string;
}

// ---------------------------------------------------------------------------
// Environment helpers
// ---------------------------------------------------------------------------

export function getRepoRoot(): string {
  return execSync("git rev-parse --show-toplevel", { encoding: "utf8" }).trim();
}

export function currentBranch(): string {
  return execSync("git branch --show-current", { encoding: "utf8" }).trim();
}

export function buildContext(agentName: string): AgentContext {
  const repoRoot = getRepoRoot();
  return {
    agentName,
    runId: process.env.GITHUB_RUN_ID ?? `local-${Date.now()}`,
    branch: currentBranch(),
    repoRoot,
    dryRun: process.env.DRY_RUN === "true",
  };
}

// ---------------------------------------------------------------------------
// Git helpers
// ---------------------------------------------------------------------------

export function gitStatus(): string {
  return execSync("git status --short", { encoding: "utf8" });
}

export function gitDiff(base = "HEAD"): string {
  return execSync(`git diff ${base}`, { encoding: "utf8" });
}

export function createBranch(name: string): void {
  execSync(`git checkout -b ${name}`, { stdio: "inherit" });
}

export function commitAll(message: string): void {
  execSync("git add -A", { stdio: "inherit" });
  execSync("git commit -m " + JSON.stringify(message), {
    stdio: "inherit",
  });
}

export function pushBranch(branch: string): void {
  execSync(`git push --set-upstream origin ${branch}`, { stdio: "inherit" });
}

// ---------------------------------------------------------------------------
// GitHub CLI helpers
// ---------------------------------------------------------------------------

export function openPR(
  title: string,
  body: string,
  labels: string[] = []
): string {
  const labelFlags =
    labels.length > 0 ? ["--label", labels.join(",")] : [];
  const result = execSync(
    [
      "gh",
      "pr",
      "create",
      "--title",
      title,
      "--body",
      body,
      ...labelFlags,
      "--head",
      execSync("git branch --show-current", { encoding: "utf8" }).trim(),
    ].join(" "),
    { encoding: "utf8" }
  );
  return result.trim();
}

export function mergePR(prNumber: string | number, method = "squash"): void {
  execSync(`gh pr merge ${prNumber} --${method} --auto`, { stdio: "inherit" });
}

export function sendSlackMessage(
  webhookUrl: string,
  text: string
): void {
  if (!webhookUrl) {
    console.warn("SLACK_WEBHOOK_URL not set — skipping Slack notification");
    return;
  }
  // Validate that webhookUrl is a proper HTTPS URL before using it in a command
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(webhookUrl);
  } catch {
    console.warn("SLACK_WEBHOOK_URL is not a valid URL — skipping");
    return;
  }
  if (parsedUrl.protocol !== "https:") {
    console.warn("SLACK_WEBHOOK_URL must use HTTPS — skipping");
    return;
  }

  // Use node's https module to avoid shell injection
  const https = require("https") as typeof import("https");
  const payload = JSON.stringify({ text });
  const options = {
    hostname: parsedUrl.hostname,
    path: parsedUrl.pathname + parsedUrl.search,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(payload),
    },
  };
  const req = https.request(options, (res) => {
    console.log(`Slack response status: ${res.statusCode}`);
  });
  req.on("error", (err: Error) => {
    console.warn("Slack notification failed:", err.message);
  });
  req.write(payload);
  req.end();
}

// ---------------------------------------------------------------------------
// Safety helpers
// ---------------------------------------------------------------------------

export function loadSafetyConfig(repoRoot: string): Record<string, unknown> {
  const safetyPath = path.join(repoRoot, ".agent-safety.yml");
  if (!fs.existsSync(safetyPath)) return {};
  // Minimal inline YAML parsing for the paths arrays (avoids adding a dep).
  const raw = fs.readFileSync(safetyPath, "utf8");
  // Return raw text; agents can inspect it as needed.
  return { raw };
}

export function assertPathAllowed(
  filePath: string,
  allowedPatterns: string[]
): void {
  const normalised = filePath.replace(/\\/g, "/");
  const allowed = allowedPatterns.some((pattern) => {
    // Escape all regex metacharacters EXCEPT the glob wildcards we handle below
    const escaped = pattern
      .replace(/[.+^${}()|[\]\\]/g, "\\$&") // escape regex specials (includes backslash)
      .replace(/\\\*\\\*/g, ".*")            // un-escape ** → .*
      .replace(/\\\*/g, "[^/]*");            // un-escape * → [^/]*
    const regex = new RegExp("^" + escaped);
    return regex.test(normalised);
  });
  if (!allowed) {
    throw new Error(
      `Safety violation: path "${filePath}" is not in the allowed list`
    );
  }
}

// ---------------------------------------------------------------------------
// Lessons (self-improvement loop)
// ---------------------------------------------------------------------------

export function loadLessons(repoRoot: string): string {
  const lessonsPath = path.join(repoRoot, "notes", "lessons.md");
  if (!fs.existsSync(lessonsPath)) return "";
  return fs.readFileSync(lessonsPath, "utf8");
}

export function appendLesson(lesson: Lesson, repoRoot: string): void {
  const lessonsPath = path.join(repoRoot, "notes", "lessons.md");
  const entry = `\n## ${lesson.date} — ${lesson.agent}\n\n**Context:** ${lesson.context}\n\n**Lesson:** ${lesson.lesson}\n`;
  fs.appendFileSync(lessonsPath, entry, "utf8");
  console.log(`Lesson appended to ${lessonsPath}`);
}

// ---------------------------------------------------------------------------
// Task / spec helpers
// ---------------------------------------------------------------------------

export function listOpenTasks(repoRoot: string): string[] {
  const todoPath = path.join(repoRoot, "todo.md");
  if (!fs.existsSync(todoPath)) return [];
  const content = fs.readFileSync(todoPath, "utf8");
  const lines = content.split("\n");
  return lines
    .filter((line) => line.match(/^- \[ \]/))
    .map((line) => line.replace(/^- \[ \]\s*/, "").trim());
}

export function listSpecFiles(repoRoot: string): string[] {
  const specsDir = path.join(repoRoot, "tasks", "specs");
  if (!fs.existsSync(specsDir)) return [];
  return fs
    .readdirSync(specsDir)
    .filter((f) => f.endsWith(".md") || f.endsWith(".yaml"))
    .map((f) => path.join(specsDir, f));
}

// ---------------------------------------------------------------------------
// Logging
// ---------------------------------------------------------------------------

export function log(
  ctx: AgentContext,
  level: "info" | "warn" | "error",
  message: string
): void {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${ctx.agentName}] [${level.toUpperCase()}]`;
  console[level === "error" ? "error" : "log"](`${prefix} ${message}`);
}

export function logResult(ctx: AgentContext, result: AgentResult): void {
  log(ctx, result.success ? "info" : "error", `Run complete: ${result.summary}`);
  if (result.errors.length > 0) {
    result.errors.forEach((e) => log(ctx, "error", e));
  }
  if (result.prUrl) {
    log(ctx, "info", `PR opened: ${result.prUrl}`);
  }
}

// ---------------------------------------------------------------------------
// CLI entry point (used by .claude/settings.json hooks)
// ---------------------------------------------------------------------------

const [, , command, ...args] = process.argv;

if (command === "appendLesson") {
  const repoRoot = getRepoRoot();
  appendLesson(
    {
      date: new Date().toISOString().split("T")[0],
      agent: args[0] ?? "unknown",
      context: args[1] ?? "automated hook",
      lesson: args[2] ?? "Agent run failed — investigate logs.",
    },
    repoRoot
  );
}
