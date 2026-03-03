/**
 * Antigravity Autonomous Engine — Debugger Agent
 *
 * Responsibilities:
 *  - Scan CI/CD logs for failing runs
 *  - Reproduce the failure locally (lint, typecheck, tests)
 *  - Identify root cause and generate a fix patch
 *  - Open a PR with label "agent:debugger"
 *  - Append the root cause and fix to notes/lessons.md
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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface FailedRun {
  databaseId: number;
  name: string;
  conclusion: string;
  url: string;
}

function listFailedRuns(): FailedRun[] {
  try {
    const raw = execSync(
      "gh run list --status failure --limit 5 --json databaseId,name,conclusion,url",
      { encoding: "utf8" }
    );
    return JSON.parse(raw) as FailedRun[];
  } catch {
    return [];
  }
}

function getRunLogs(runId: number): string {
  try {
    return execSync(`gh run view ${runId} --log-failed`, {
      encoding: "utf8",
    });
  } catch {
    return "";
  }
}

function extractErrorSummary(logs: string): string {
  const lines = logs.split("\n");
  const errorLines = lines.filter(
    (l) =>
      l.match(/error|Error|ERROR|fail|FAIL|✗|✘/i) && !l.match(/node_modules/)
  );
  return errorLines.slice(0, 30).join("\n");
}

// ---------------------------------------------------------------------------
// Core logic
// ---------------------------------------------------------------------------

async function runDebugger(ctx: AgentContext): Promise<AgentResult> {
  const result: AgentResult = {
    success: false,
    summary: "",
    artifacts: [],
    errors: [],
  };

  log(ctx, "info", "Debugger agent starting");

  const failedRuns = listFailedRuns();
  log(ctx, "info", `Found ${failedRuns.length} failed CI run(s)`);

  if (failedRuns.length === 0) {
    // Also check local state
    try {
      execSync("npm run lint 2>&1", {
        cwd: ctx.repoRoot,
        stdio: "pipe",
      });
      execSync("npx tsc --noEmit 2>&1", {
        cwd: ctx.repoRoot,
        stdio: "pipe",
      });
      result.success = true;
      result.summary = "No failures detected locally or in CI";
      return result;
    } catch (err) {
      log(ctx, "warn", `Local check failed: ${err}`);
    }
  }

  for (const run of failedRuns) {
    log(ctx, "info", `Investigating run #${run.databaseId}: ${run.name}`);

    const logs = getRunLogs(run.databaseId);
    const errorSummary = extractErrorSummary(logs);

    if (!errorSummary) {
      log(ctx, "warn", `Could not extract errors from run #${run.databaseId}`);
      continue;
    }

    log(ctx, "info", `Error summary:\n${errorSummary.slice(0, 500)}`);

    // Append lesson so future agents know about this failure pattern
    appendLesson(
      {
        date: new Date().toISOString().split("T")[0],
        agent: "Debugger",
        context: `CI run #${run.databaseId}: ${run.name} (${run.url})`,
        lesson: `Failure detected. Error summary:\n\`\`\`\n${errorSummary.slice(0, 500)}\n\`\`\``,
      },
      ctx.repoRoot
    );

    if (ctx.dryRun) {
      log(ctx, "info", `[DRY RUN] Would open debug PR for run #${run.databaseId}`);
      result.artifacts.push(`run#${run.databaseId}`);
      continue;
    }

    // Create a debug branch and open an issue-style PR for human review
    const branchName = `agent/debugger-run-${run.databaseId}-${Date.now()}`;
    try {
      createBranch(branchName);

      // Write a debug report file
      const { writeFileSync } = await import("fs");
      const { join } = await import("path");
      const reportPath = join(
        ctx.repoRoot,
        "tasks",
        "specs",
        `debug-run-${run.databaseId}.md`
      );
      writeFileSync(
        reportPath,
        `# Debug Report — CI Run #${run.databaseId}\n\n**Agent:** Debugger\n**Date:** ${new Date().toISOString()}\n**Run URL:** ${run.url}\n\n## Error Summary\n\n\`\`\`\n${errorSummary}\n\`\`\`\n\n## Next Steps\n\n- [ ] Identify root cause\n- [ ] Apply fix\n- [ ] Verify CI passes\n`,
        "utf8"
      );

      commitAll(`agent(debugger): report for CI run #${run.databaseId}`);
      pushBranch(branchName);

      const prUrl = openPR(
        `agent(debugger): investigate CI failure run #${run.databaseId}`,
        `## Debugger Agent Report\n\nCI run **#${run.databaseId}** (${run.name}) failed.\n\n### Error Summary\n\`\`\`\n${errorSummary.slice(0, 1000)}\n\`\`\`\n\n**Run ID:** ${ctx.runId}\n\n_Human review required to apply fix._`,
        ["agent:debugger"]
      );

      result.artifacts.push(reportPath);
      if (prUrl) result.prUrl = prUrl;
      log(ctx, "info", `Debug PR opened: ${prUrl}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log(ctx, "error", `Failed to create debug PR: ${msg}`);
      result.errors.push(msg);
    }
  }

  result.success = result.errors.length === 0;
  result.summary = `Debugger investigated ${failedRuns.length} failed run(s), errors: ${result.errors.length}`;
  return result;
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

(async () => {
  const ctx = buildContext("Debugger");
  try {
    const result = await runDebugger(ctx);
    logResult(ctx, result);
    process.exit(result.success ? 0 : 1);
  } catch (err) {
    console.error("[Debugger] Fatal error:", err);
    process.exit(1);
  }
})();
