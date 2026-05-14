---
description: Capture non-obvious codebase learnings in scoped AGENTS.md files
---

Analyze this session and extract only non-obvious learnings worth preserving for future agents.

AGENTS.md files can exist at any directory level. Place each learning as close to the relevant code as possible:

- Project-wide learnings: root `AGENTS.md`.
- Feature/module learnings: `src/effect/modules/<feature>/AGENTS.md`.
- Platform learnings: `src/effect/platform/<area>/AGENTS.md`.
- Shared type workflow learnings: `packages/types/AGENTS.md` when working from the workspace root.

What counts as a learning:

- Hidden relationships between modules or files.
- Execution paths that differ from how code first appears.
- Non-obvious env vars, flags, migrations, or generated files.
- Debugging breakthroughs where the error message was misleading.
- Architectural constraints that are not obvious from local code.
- Files that must change together.

What not to include:

- Obvious facts from filenames, imports, or package scripts.
- Standard TypeScript, Effect, Bun, Drizzle, or Better Auth behavior.
- Things already captured in an AGENTS.md.
- Session-specific status or temporary plans.
- Long explanations.

Process:

1. Review the session for durable discoveries.
2. Read existing AGENTS.md files at the relevant scopes.
3. Add or update the closest AGENTS.md with 1-3 lines per learning.
4. Keep root `AGENTS.md` short; do not duplicate guidance that belongs deeper.
5. If the learning is general Effect or architecture knowledge rather than project-specific workflow, offer to file it in the Obsidian wiki instead of adding it to AGENTS.md.

Summarize which AGENTS.md files changed and how many learnings were added.

$ARGUMENTS
