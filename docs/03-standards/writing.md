# Writing Standard

**When to read:** before writing or reviewing a pipeline artifact, ADR, PR description, or document in this repo.

A reader should finish a document knowing what was decided, on what evidence, and what is still unknown. Filler hides all three, and it reads as finished work, so a gate can approve it without noticing.

## Language

`docs/`, skills, and templates are in English. The text of `specs/` may be in Indonesian, so a product owner can review it. What `scripts/check-docs.mjs` or a later phase reads stays exactly as in the template, and is not translated: file names, `Status:`, `Gate:`, `Tier:`, `Result:`, `Approved by:`, `Approval mode:`, `Tasks gate:` and their values; the Gate review heading, its `Round`, `Reviewer`, and `Verdict` columns, and verdict words; and ids such as `US1`, `R1`, `AC1`. The words to remove below have Indonesian twins ("komprehensif", "memastikan" with no mechanism named); the test applies in both languages.

## The test

**Would this sentence still be true of a different feature?** If yes, delete it or make it specific. Apply this to every sentence you are unsure about.

| Sent back | Accepted |
|---|---|
| Ensure robust error handling across the feature. | A paid invoice returns `conflict` with `INVOICE_ALREADY_PAID`; the form shows it as a banner. |
| The system should be fast and scalable. | NFR2: the list answers in under 300 ms at 10,000 rows, measured on staging. |
| Improve the user experience of exporting. | Finance re-keys about 40 invoices a month (source: Dina, 2026-10-12). |
| Security: authentication and authorization enforced. ✓ | `markInvoicePaid` requires the `finance` role in its middleware; test `refuses a viewer`. |
| Comprehensive tests were added. | 6 tests added; AC1 to AC3 covered; `pnpm test`: 41 passed, 0 failed. |

## Rules

1. **Answer first.** The first lines hold the conclusion, the decision, or the result. Background follows for readers who need it.
2. **A claim has a source.** Use the labels **Verified**, **Inferred**, and **Unknown** (`docs/00-principles/anti-hallucination.md`). Write **Unknown** instead of a likely-sounding answer: a visible gap gets filled, and a smooth guess does not.
3. **A number has an origin:** a measurement, a query, or a named person. Never estimate a metric, a percentage, or a time to make a section look complete.
4. **A checkbox is a claim.** Tick it only with evidence beside it, or in the linked artifact. A list of ticks that could be copied to the next feature proves nothing.
5. **Say what was not done.** Report "not run", "not tested", and "could not verify" as plainly as what passed. Do not soften them or move them to the end of a long list.
6. **One word per concept,** from `glossary.md`. Do not alternate words for variety: a reader takes a second word to mean a second thing.
7. **Name things.** Use the file, function, role, or number, not "the relevant module", "various edge cases", or "stakeholders".
8. **A filled template holds no template text.** Remove placeholders and hint paragraphs; keep the headers and the status lines. A section that does not apply says `n/a: <reason>`, so a reader can tell "does not apply" from "forgot".
9. **Link, do not restate.** An artifact refers to PRD ids and to `docs/`; it does not repeat them. A copy drifts from its source.
10. **Prose for reasoning, tables for facts that compare across the same columns.** A table with one row, or with paragraphs in its cells, is prose in the wrong shape.

## Words and shapes to remove

These add length and no information. Replace each with the fact it stands in for, or delete it.

| Kind | Examples |
|---|---|
| Praise | robust, seamless, comprehensive, powerful, elegant, world-class, battle-tested, cutting-edge, enterprise-grade |
| Vague verbs | leverage, utilize, streamline, empower, enhance, facilitate, ensure (with no mechanism named) |
| Throat-clearing | "It is important to note", "In order to", "As mentioned above", "This document aims to" |
| Hedged filler | "should generally", "where appropriate", "as needed", with no condition stated |
| Closers | A summary that repeats the section above; "In conclusion"; an offer of more help |
| Decoration | Emoji in headers, status words, or tables. A status is a word from the vocabulary (`docs/01-workflow/sdlc-pipeline.md`, section 8) |
| Prompt preambles | "You are a senior architect" in a skill or an artifact. A skill states steps, inputs, and output |

## Review

A reviewer sends text back when it fails the test above, or breaks rule 2, 3, 4, or 8; pass 9 of skill `code-review` and the Spec gate's question cover this. A repeated failure becomes a guardrail through phase 11, like any other agent mistake (`docs/templates/learnings.md`).

`scripts/check-docs.mjs` rejects a leftover `<placeholder>` in a final artifact in `specs/` (ADR 0016); put a literal like `Array<string>` in backticks. Everything else on this page stays with review.
