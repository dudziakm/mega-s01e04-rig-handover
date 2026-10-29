# 0005 · What every issue carries

- Status: accepted · 2026-10-29 · decided by dudziakm, the lane's human: the parts at the review
  of the morning-digest split, the waiting rule after #7 closed too early
- Amends: 0002 (work is issues)

## Context

ADR 0002 names what an issue holds, and `plan-to-issues` asks the human for the rest unless it is
written down. For the morning-digest plan the human settled the rest in a session, so it lived
only in the issues themselves. The next split would have asked again, or guessed.

One issue showed a gap in the shape. #7 (the preview) said "Done when: the preview link is sent
to the reviewer". That held the moment the link left, so #7 closed before the reviewer had looked,
and #8 (take the marker off) was no longer blocked.

## Decision

Every issue split from a plan carries these parts, in this order:

| Part                    | What it says                                                          |
|-------------------------|-----------------------------------------------------------------------|
| Title                   | The unit of work, led by its part: `Digest page: GET /digest/:night`. |
| Label                   | `plan:<slug>`, e.g. `plan:morning-digest`: one filter lists the plan. |
| `Source: plan.md § <n>` | The first line of the body: the plan section it comes from.           |
| `Scope:`                | What to build, where, against which contract; tests and fixtures.     |
| `Done when:`            | A condition anyone can check: repo, link, or the other side's answer. |
| `Blocked by:`           | Issue numbers (`#1`) or a person's answer; `nothing` when it is free. |
| `Model:`                | The model and why: strongest for logic, cheaper for views and tests.  |

When a step waits on someone outside the lane (a reviewer, the human's yes), its done line names
their answer, never our message: "the reviewer has seen the preview", not "the link is sent". The
issue stays open until they answer, and the step that undoes it (the clean-up, the marker off) is
blocked by it.

Issues as files (ADR 0004) carry the same body, with the label in `labels`. The closing comment
keeps the shape in AGENTS.md.

## Consequences

- `plan-to-issues` reads `docs/adr/` first, so it asks the human only about what this file leaves
  open.
- A new part, or a changed one, is an edit to this ADR, reviewed like code, not a reply in chat.
- An issue that waits on a person stays open for a while after the work is done. That is cheaper
  than a clean-up that runs before the review.
