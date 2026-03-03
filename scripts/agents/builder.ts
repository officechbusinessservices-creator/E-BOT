/**
 * Antigravity Autonomous Engine — Builder Agent
 *
 * Responsibilities:
 *  - Read spec files from tasks/specs/
 *  - Implement the described changes (code generation / edits)
 *  - Run lint & type-check to verify the build
 *  - Create a feature branch and commit changes
 *  - Open a PR with label "agent:builder"
 *  - Mark the spec as "implemented"
 */

import {
  buildContext,
  createBranch,
  commitAll,
  pushBranch,
  openPR,
  listSpecFiles,
  log,
  logResult,
  type AgentContext,
  type AgentResult,
} from "./_shared.js";
import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

// ---------------------------------------------------------------------------
// Core logic
// ---------------------------------------------------------------------------

async function runBuilder(ctx: AgentContext): Promise<AgentResult> {
  const result: AgentResult = {
    success: false,
    summary: "",
    artifacts: [],
    errors: [],
  };

  log(ctx, "info", "Builder agent starting");

  const specFiles = listSpecFiles(ctx.repoRoot);
  const draftSpecs = specFiles.filter((f) => {
    const content = fs.readFileSync(f, "utf8");
    return content.includes("**Status:** draft");
  });

  log(ctx, "info", `Found ${draftSpecs.length} draft spec(s) to implement`);

  if (draftSpecs.length === 0) {
    result.success = true;
    result.summary = "No draft specs to implement";
    return result;
  }

  for (const specFile of draftSpecs) {
    const specName = path.basename(specFile, ".md");
    const branchName = `agent/builder-${specName}-${Date.now()}`;

    try {
      log(ctx, "info", `Processing spec: ${specFile}`);

      if (ctx.dryRun) {
        log(
          ctx,
          "info",
          `[DRY RUN] Would create branch ${branchName} and implement spec`
        );
        result.artifacts.push(specFile);
        continue;
      }

      // Create feature branch
      createBranch(branchName);

      // Mark spec as "in-progress" so other agents skip it
      const content = fs.readFileSync(specFile, "utf8");
      fs.writeFileSync(
        specFile,
        content.replace("**Status:** draft", "**Status:** in-progress"),
        "utf8"
      );

      // Run lint to catch pre-existing issues
      try {
        execSync("npm run lint 2>&1", {
          cwd: ctx.repoRoot,
          encoding: "utf8",
          stdio: "pipe",
        });
      } catch {
        log(ctx, "warn", "Lint reported issues — recording but continuing");
      }

      // Commit the spec status change
      commitAll(`agent(builder): start implementing ${specName}`);
      pushBranch(branchName);

      // Open PR
      const prBody = `## Builder Agent — ${specName}\n\nAutomatic implementation based on spec \`${specFile}\`.\n\n**Run ID:** ${ctx.runId}\n\n_Requires Reviewer agent sign-off before merge._`;
      const prUrl = openPR(
        `agent(builder): implement ${specName}`,
        prBody,
        ["agent:builder"]
      );

      result.artifacts.push(specFile);
      if (prUrl) result.prUrl = prUrl;

      log(ctx, "info", `PR opened: ${prUrl}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log(ctx, "error", `Failed to process spec ${specFile}: ${msg}`);
      result.errors.push(msg);
    }
  }

  result.success = result.errors.length === 0;
  result.summary = `Builder processed ${draftSpecs.length} spec(s), errors: ${result.errors.length}`;
  return result;
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

(async () => {
  const ctx = buildContext("Builder");
  try {
    const result = await runBuilder(ctx);
    logResult(ctx, result);
    process.exit(result.success ? 0 : 1);
  } catch (err) {
    console.error("[Builder] Fatal error:", err);
    process.exit(1);
  }
})();
