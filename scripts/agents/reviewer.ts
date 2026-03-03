/**
 * Antigravity Autonomous Engine — Reviewer Agent
 *
 * Responsibilities:
 *  - List open PRs with label "agent:builder"
 *  - Run lint, type-check, and tests on each PR branch
 *  - Post a review comment with the results
 *  - Approve and auto-merge if all checks pass
 *  - Request changes and add a note to notes/lessons.md if checks fail
 */

import {
  buildContext,
  appendLesson,
  log,
  logResult,
  type AgentContext,
  type AgentResult,
} from "./_shared.js";
import { execSync } from "child_process";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function listBuilderPRs(): Array<{ number: number; headRef: string; title: string }> {
  try {
    const raw = execSync(
      'gh pr list --label "agent:builder" --state open --json number,headRefName,title',
      { encoding: "utf8" }
    );
    return JSON.parse(raw) as Array<{ number: number; headRefName: string; title: string }>;
  } catch {
    return [];
  }
}

interface CheckResult {
  passed: boolean;
  lint: string;
  typecheck: string;
  tests: string;
}

function runChecks(ctx: AgentContext, branch: string): CheckResult {
  const result: CheckResult = {
    passed: false,
    lint: "",
    typecheck: "",
    tests: "",
  };

  try {
    execSync(`git fetch origin ${branch} && git checkout ${branch}`, {
      cwd: ctx.repoRoot,
      stdio: "pipe",
    });
  } catch (err) {
    result.lint = `Checkout failed: ${err}`;
    return result;
  }

  try {
    result.lint = execSync("npm run lint 2>&1", {
      cwd: ctx.repoRoot,
      encoding: "utf8",
    });
  } catch (err) {
    result.lint = `FAILED: ${err instanceof Error ? err.message : String(err)}`;
    return result;
  }

  try {
    result.typecheck = execSync("npx tsc --noEmit 2>&1", {
      cwd: ctx.repoRoot,
      encoding: "utf8",
    });
  } catch (err) {
    result.typecheck = `FAILED: ${err instanceof Error ? err.message : String(err)}`;
    return result;
  }

  try {
    result.tests = execSync("npm test -- --run 2>&1", {
      cwd: ctx.repoRoot,
      encoding: "utf8",
    });
  } catch (err) {
    result.tests = `FAILED: ${err instanceof Error ? err.message : String(err)}`;
    return result;
  }

  result.passed = true;
  return result;
}

// ---------------------------------------------------------------------------
// Core logic
// ---------------------------------------------------------------------------

async function runReviewer(ctx: AgentContext): Promise<AgentResult> {
  const result: AgentResult = {
    success: false,
    summary: "",
    artifacts: [],
    errors: [],
  };

  log(ctx, "info", "Reviewer agent starting");

  const prs = listBuilderPRs();
  log(ctx, "info", `Found ${prs.length} builder PR(s) to review`);

  if (prs.length === 0) {
    result.success = true;
    result.summary = "No builder PRs to review";
    return result;
  }

  for (const pr of prs) {
    const { number, title } = pr;
    const headRef = (pr as unknown as { headRefName: string }).headRefName;
    log(ctx, "info", `Reviewing PR #${number}: ${title}`);

    if (ctx.dryRun) {
      log(ctx, "info", `[DRY RUN] Would review PR #${number}`);
      continue;
    }

    const checks = runChecks(ctx, headRef);

    const body = [
      "## Reviewer Agent — Automated Code Review",
      "",
      `**PR:** #${number} — ${title}`,
      `**Branch:** \`${headRef}\``,
      `**Run ID:** ${ctx.runId}`,
      "",
      `### Lint\n\`\`\`\n${checks.lint || "✓ passed"}\n\`\`\``,
      `### Type Check\n\`\`\`\n${checks.typecheck || "✓ passed"}\n\`\`\``,
      `### Tests\n\`\`\`\n${checks.tests || "✓ passed"}\n\`\`\``,
      "",
      checks.passed ? "**✅ All checks passed — approving PR.**" : "**❌ Checks failed — requesting changes.**",
    ].join("\n");

    try {
      if (checks.passed) {
        execSync(
          `gh pr review ${number} --approve --body-file -`,
          { input: body, stdio: ["pipe", "inherit", "inherit"] }
        );
        execSync(`gh pr merge ${number} --squash --auto`, { stdio: "inherit" });
        log(ctx, "info", `PR #${number} approved and queued for auto-merge`);
      } else {
        execSync(
          `gh pr review ${number} --request-changes --body-file -`,
          { input: body, stdio: ["pipe", "inherit", "inherit"] }
        );
        appendLesson(
          {
            date: new Date().toISOString().split("T")[0],
            agent: "Reviewer",
            context: `PR #${number}: ${title}`,
            lesson: `Checks failed on branch ${headRef}. Lint: ${checks.lint.slice(0, 200)}`,
          },
          ctx.repoRoot
        );
        result.errors.push(`PR #${number} failed checks`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log(ctx, "error", `Error reviewing PR #${number}: ${msg}`);
      result.errors.push(msg);
    }

    result.artifacts.push(`PR#${number}`);
  }

  result.success = result.errors.length === 0;
  result.summary = `Reviewer processed ${prs.length} PR(s), errors: ${result.errors.length}`;
  return result;
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

(async () => {
  const ctx = buildContext("Reviewer");
  try {
    const result = await runReviewer(ctx);
    logResult(ctx, result);
    process.exit(result.success ? 0 : 1);
  } catch (err) {
    console.error("[Reviewer] Fatal error:", err);
    process.exit(1);
  }
})();
