---
name: write-prototype
description: Test one risky hypothesis on a throwaway branch and record the result (pipeline phase 3), including the flow and layout a product owner can judge for a UI. Use when research names a hypothesis it could not settle, or when asked to prototype or spike. Produces 03-prototype.md. The code is never merged.
---

# Write the prototype

Pipeline phase 3. Input: `specs/<slug>/02-research.md`, section 5. Output: `specs/<slug>/03-prototype.md` from `docs/templates/prototype.md`. No risky hypothesis: skip this phase and put the reason in the PRD's `Prototype:` line.

## Steps

1. Write one hypothesis that can turn out false, and what changes if it does. More than one: ask which is riskiest.
2. Agree a time-box with the human before building.
3. Build on `spike/<slug>`, only what tests the hypothesis. Say what is faked. Rule zero still applies: verify library calls (`verify-library-docs`).
4. Record the result with evidence: command output, a measurement, or what a named person did with it. A result that disproves the hypothesis is a good result.
5. For a UI: write the user flow and layout sketch, and show it to the product owner. Write who saw it and when; leave the line empty if nobody has.
6. List what the PRD must now say, without writing requirements. A prototype informs the PRD and does not decide it.
7. Do not merge the branch or copy it into `main`. Phase 8 rewrites what is needed.

Before handing over, check the text against `docs/03-standards/writing.md`.

## Output
The file path, the hypothesis and whether it held, the evidence, and open points for the PRD. When the result is written, stop and ask the Product Manager or Product Design Lead. `done` needs their `Decided by:`. Next is skill `write-prd`.
