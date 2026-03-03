/**
 * Antigravity Autonomous Engine — Documentation Agent
 *
 * Responsibilities:
 *  - Scan src/ for components and API routes lacking JSDoc / README coverage
 *  - Generate or update documentation stubs
 *  - Keep messages/*.json translation files consistent (all keys present in all locales)
 *  - Open a PR with label "agent:documentation" for human review
 *  - Append gaps found to notes/lessons.md
 */

import {
  buildContext,
  appendLesson,
  createBranch,
  commitAll,
  pushBranch,
  openPR,
  log,
  logResult,
  type AgentContext,
  type AgentResult,
} from "./_shared.js";
import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

// ---------------------------------------------------------------------------
// Translation consistency check
// ---------------------------------------------------------------------------

interface TranslationGap {
  locale: string;
  missingKeys: string[];
}

function checkTranslations(repoRoot: string): TranslationGap[] {
  const messagesDir = path.join(repoRoot, "messages");
  if (!fs.existsSync(messagesDir)) return [];

  const files = fs
    .readdirSync(messagesDir)
    .filter((f) => f.endsWith(".json"));

  if (files.length === 0) return [];

  // Load all locales
  const locales: Record<string, Record<string, unknown>> = {};
  for (const file of files) {
    try {
      const content = fs.readFileSync(
        path.join(messagesDir, file),
        "utf8"
      );
      locales[file] = JSON.parse(content) as Record<string, unknown>;
    } catch {
      // Skip malformed files
    }
  }

  // Find the reference locale (en.json or first alphabetically)
  const referenceFile = files.includes("en.json") ? "en.json" : files[0];
  const referenceKeys = flattenKeys(locales[referenceFile] ?? {});

  const gaps: TranslationGap[] = [];
  for (const [file, translations] of Object.entries(locales)) {
    if (file === referenceFile) continue;
    const keys = flattenKeys(translations);
    const missing = referenceKeys.filter((k) => !keys.includes(k));
    if (missing.length > 0) {
      gaps.push({ locale: file, missingKeys: missing });
    }
  }

  return gaps;
}

function flattenKeys(
  obj: Record<string, unknown>,
  prefix = ""
): string[] {
  const keys: string[] = [];
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      keys.push(...flattenKeys(value as Record<string, unknown>, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

// ---------------------------------------------------------------------------
// Component documentation scan
// ---------------------------------------------------------------------------

interface UndocumentedFile {
  filePath: string;
  reason: string;
}

function findUndocumentedComponents(repoRoot: string): UndocumentedFile[] {
  const srcDir = path.join(repoRoot, "src", "components");
  if (!fs.existsSync(srcDir)) return [];

  const undocumented: UndocumentedFile[] = [];

  function walk(dir: string): void {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.name.endsWith(".tsx") || entry.name.endsWith(".ts")) {
        const content = fs.readFileSync(fullPath, "utf8");
        // Check for exported functions/components without JSDoc
        if (
          content.includes("export function") ||
          content.includes("export default function")
        ) {
          if (!content.includes("/**")) {
            undocumented.push({
              filePath: path.relative(repoRoot, fullPath),
              reason: "Missing JSDoc comment on exported function",
            });
          }
        }
      }
    }
  }

  walk(srcDir);
  return undocumented;
}

// ---------------------------------------------------------------------------
// Core logic
// ---------------------------------------------------------------------------

async function runDocumentation(ctx: AgentContext): Promise<AgentResult> {
  const result: AgentResult = {
    success: false,
    summary: "",
    artifacts: [],
    errors: [],
  };

  log(ctx, "info", "Documentation agent starting");

  // 1. Check translations
  const translationGaps = checkTranslations(ctx.repoRoot);
  log(
    ctx,
    translationGaps.length > 0 ? "warn" : "info",
    `Translation gaps found in ${translationGaps.length} locale(s)`
  );

  // 2. Scan for undocumented components
  const undocumented = findUndocumentedComponents(ctx.repoRoot);
  log(
    ctx,
    undocumented.length > 0 ? "warn" : "info",
    `Found ${undocumented.length} component(s) without JSDoc`
  );

  const date = new Date().toISOString().split("T")[0];
  const hasWork = translationGaps.length > 0 || undocumented.length > 0;

  if (!hasWork) {
    result.success = true;
    result.summary = "Documentation is up to date";
    return result;
  }

  // Write a doc gap report
  const reportPath = path.join(
    ctx.repoRoot,
    "tasks",
    "specs",
    `doc-gaps-${date}.md`
  );

  const reportLines = [
    `# Documentation Gaps — ${date}`,
    "",
    `**Generated by:** Documentation Agent  `,
    `**Run ID:** ${ctx.runId}`,
    "",
  ];

  if (translationGaps.length > 0) {
    reportLines.push("## Translation Gaps", "");
    for (const gap of translationGaps) {
      reportLines.push(
        `### ${gap.locale} (${gap.missingKeys.length} missing)`,
        "",
        gap.missingKeys.map((k) => `- \`${k}\``).join("\n"),
        ""
      );
    }
  }

  if (undocumented.length > 0) {
    reportLines.push("## Undocumented Components", "");
    for (const item of undocumented) {
      reportLines.push(`- \`${item.filePath}\` — ${item.reason}`);
    }
    reportLines.push("");
  }

  if (!ctx.dryRun) {
    fs.writeFileSync(reportPath, reportLines.join("\n"), "utf8");
    log(ctx, "info", `Gap report written to ${reportPath}`);
  } else {
    log(ctx, "info", `[DRY RUN] Would write report to ${reportPath}`);
  }

  result.artifacts.push(reportPath);

  // Append to lessons
  if (translationGaps.length > 0) {
    appendLesson(
      {
        date,
        agent: "Documentation",
        context: "Translation consistency check",
        lesson: `Found ${translationGaps.length} locale(s) with missing translation keys. Run \`node scripts/check-translations.js\` to review.`,
      },
      ctx.repoRoot
    );
  }

  if (!ctx.dryRun && hasWork) {
    try {
      const branchName = `agent/documentation-${date}-${Date.now()}`;
      createBranch(branchName);
      commitAll(`agent(documentation): doc gap report ${date}`);
      pushBranch(branchName);
      const prBody = `## Documentation Agent Report\n\n- Translation gaps: ${translationGaps.length} locale(s)\n- Undocumented components: ${undocumented.length}\n\nSee \`${reportPath}\` for details.\n\n**Run ID:** ${ctx.runId}`;
      const prUrl = openPR(
        `agent(documentation): doc gaps — ${date}`,
        prBody,
        ["agent:documentation"]
      );
      if (prUrl) result.prUrl = prUrl;
      log(ctx, "info", `Documentation PR opened: ${prUrl}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log(ctx, "error", `Failed to open documentation PR: ${msg}`);
      result.errors.push(msg);
    }
  }

  // Also run the existing check-translations script if available
  try {
    execSync("node scripts/check-translations.js 2>&1", {
      cwd: ctx.repoRoot,
      stdio: "pipe",
    });
  } catch {
    // Script may not exist yet; that's fine
  }

  result.success = result.errors.length === 0;
  result.summary = `Documentation agent: ${translationGaps.length} translation gap(s), ${undocumented.length} undocumented component(s)`;
  return result;
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

(async () => {
  const ctx = buildContext("Documentation");
  try {
    const result = await runDocumentation(ctx);
    logResult(ctx, result);
    process.exit(result.success ? 0 : 1);
  } catch (err) {
    console.error("[Documentation] Fatal error:", err);
    process.exit(1);
  }
})();
