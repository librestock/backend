---
description: Spellcheck changed markdown lines
---

Review changed `.md` and `.mdx` lines in the current diff for spelling, grammar, and awkward wording.

Scope:

- Check unstaged and staged markdown changes.
- Focus on changed lines and their immediate context.
- Preserve technical names, message keys, paths, CLI flags, and intentional shorthand.
- Do not rewrite style unless wording is clearly confusing or incorrect.

Report the file, line, issue, and suggested fix. If the fix is obvious and low-risk, apply it.

$ARGUMENTS
