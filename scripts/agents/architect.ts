/**
 * Antigravity Autonomous Engine — Architect Agent
 *
 * Responsibilities:
 *  - Read task specs from tasks/specs/
 *  - Read open items in todo.md
 *  - Design technical approach and break work into implementable tasks
 *  - Write spec files back to tasks/specs/ for Builder to consume
 *  - Update todo.md with refined tasks
 *  - Append architectural decisions to notes/lessons.md
 */

import {
  buildContext,
  loadLessons,
  listOpenTasks,
  listSpecFiles,
  log,
  logResult,
  type AgentContext,
  type AgentResult,
} from "./_shared.js";
import * as fs from "fs";
import * as path from "path";

// ---------------------------------------------------------------------------
// Core logic
// ---------------------------------------------------------------------------

async function runArchitect(ctx: AgentContext): Promise<AgentResult> {
  const result: AgentResult = {
    success: false,
    summary: "",
    artifacts: [],
    errors: [],
  };

  log(ctx, "info", "Architect agent starting");

  // 1. Load lessons for self-improvement context
  const lessons = loadLessons(ctx.repoRoot);
  if (lessons) {
    log(ctx, "info", `Loaded ${lessons.split("\n").length} lines of lessons`);
  }

  // 2. Read open tasks
  const openTasks = listOpenTasks(ctx.repoRoot);
  log(ctx, "info", `Found ${openTasks.length} open task(s) in todo.md`);

  // 3. Read existing spec files
  const specFiles = listSpecFiles(ctx.repoRoot);
  log(ctx, "info", `Found ${specFiles.length} spec file(s) in tasks/specs/`);

  // 4. For each open task that doesn't already have a spec, generate a spec
  const specsDir = path.join(ctx.repoRoot, "tasks", "specs");
  const generated: string[] = [];

  for (const task of openTasks) {
    const slug = task
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .slice(0, 60);
    const specPath = path.join(specsDir, `${slug}.md`);

    if (fs.existsSync(specPath)) {
      log(ctx, "info", `Spec already exists for "${task}", skipping`);
      continue;
    }

    if (ctx.dryRun) {
      log(ctx, "info", `[DRY RUN] Would generate spec: ${specPath}`);
      generated.push(specPath);
      continue;
    }

    const specContent = generateSpec(task, ctx);
    fs.writeFileSync(specPath, specContent, "utf8");
    log(ctx, "info", `Generated spec: ${specPath}`);
    generated.push(specPath);
  }

  result.artifacts = generated;
  result.success = true;
  result.summary = `Architect processed ${openTasks.length} task(s), generated ${generated.length} spec(s)`;
  return result;
}

function generateSpec(task: string, ctx: AgentContext): string {
  const date = new Date().toISOString().split("T")[0];
  return `# Spec: ${task}

**Created by:** Architect Agent  
**Date:** ${date}  
**Run ID:** ${ctx.runId}  
**Status:** draft

## Overview

${task}

## Acceptance Criteria

- [ ] Implementation passes all existing tests
- [ ] No TypeScript errors (\`npx tsc --noEmit\`)
- [ ] ESLint passes (\`npm run lint\`)
- [ ] PR opened with label \`agent:architect\`

## Technical Notes

_To be refined by the Architect agent on subsequent runs._

## Dependencies

_List any prerequisite tasks or specs here._

## Estimated Complexity

- [ ] Small (< 1 hour)
- [ ] Medium (1–4 hours)
- [ ] Large (> 4 hours)
`;
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

(async () => {
  const ctx = buildContext("Architect");
  try {
    const result = await runArchitect(ctx);
    logResult(ctx, result);
    process.exit(result.success ? 0 : 1);
  } catch (err) {
    console.error("[Architect] Fatal error:", err);
    process.exit(1);
  }
})();
