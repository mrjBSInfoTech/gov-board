---
name: pragmatic-coding
description: Guardrails for writing and changing code in an existing system - keep solutions simple (no over-engineering) and trace the ripple effects of every change instead of just patching the symptom. Make sure to use this skill whenever the user asks you to build a feature, fix a bug, refactor, add an endpoint or function, change a schema, or otherwise modify code in a project, even if they don't mention simplicity, scope, or side effects.
---

# Pragmatic Coding

Two rules govern all code you write or change in this system:

1. **Build the simplest thing that fully solves the problem.** Do not over-engineer.
2. **Never just patch.** Before changing anything, find out what else the change touches, and handle it.

These pull in opposite directions on purpose. Rule 1 keeps the solution small. Rule 2 keeps it correct. A good change is small *and* complete.

---

## Rule 1: Don't over-engineer

Solve the problem that was asked, at the scale it actually exists.

**Do:**
- Prefer plain functions, plain data, and the standard library over new abstractions.
- Reuse what the codebase already has (existing helpers, patterns, libraries) before writing new code.
- Write the straightforward version first. Make it more general only when a second real use case shows up.
- Match the existing code's style and structure, even if you'd have designed it differently.
- Keep the diff as small as it can be while still being correct and complete.

**Don't:**
- Add layers (interfaces, factories, managers, base classes, config systems) for a single use.
- Build for hypothetical future requirements ("in case we need to support X later").
- Add new dependencies for something a few lines of code can do.
- Add options, flags, or parameters nobody asked for.
- Rewrite or "clean up" unrelated code while you're in the file.
- Introduce a new pattern or architecture when the existing one works.

**Quick test before adding anything:** *"If I delete this, does the requested behavior still work?"* If yes, don't add it.

**Ask before going big.** If the simple solution genuinely won't work and you think a larger design is needed, say so and explain why in a sentence or two. Let the user decide. Do not quietly build the bigger thing.

---

## Rule 2: Think beyond the patch

A fix that makes the visible problem disappear but breaks something nearby is not a fix. Before and after every change, trace its impact.

### Before you change anything

1. **Understand the root cause.** Ask *why* it's broken, not just *where*. If you're about to add a special case or workaround, stop and check whether the real problem is upstream.
2. **Find everything connected to what you're touching.** Search the codebase (don't guess) for:
   - Callers of the function, method, or endpoint you're changing
   - Other code that reads or writes the same data, table, column, field, or state
   - Places that duplicate the same logic and would now be inconsistent
   - Types, schemas, validation rules, and API contracts that describe it
   - Tests, fixtures, seed data, mocks, and docs that reference it
   - Config, environment variables, permissions, and migrations involved
3. **List what could break.** Name the specific functions or modules affected. If the list is empty, double-check by searching again.

### While you change it

- Fix the cause, and update every dependent place the change requires. Don't leave callers using an old signature, old field name, or old assumption.
- If the same bug or pattern exists in sibling code (similar functions, parallel endpoints, other roles or user types), fix those too, or flag them clearly if fixing is out of scope.
- Consider the edges: empty or null input, invalid input, existing data created before this change, concurrent use, and different user roles or permission levels.
- If you change data shape, think about existing records and whether a migration or backward-compatible handling is needed.

### After you change it

- Re-check each item on your "could break" list. Confirm it still works, by reading the code, running tests, or running the app.
- Update or add tests for the behavior you changed and for the spots you touched indirectly.
- Update docs, comments, and types that are now out of date.

---

## How to report back

End every coding task with a short summary:

- **What changed:** the fix or feature in one or two sentences.
- **Also affected:** other functions, files, or flows you checked or updated because of it.
- **Not touched but worth knowing:** related issues you noticed but deliberately left alone (so the user can decide).

Keep it brief. Do not pad it with a list of everything you looked at.

---

## Balancing the two rules

| Situation | Over-engineered | Patch-only | Right |
|---|---|---|---|
| Bug in one function used by 4 callers | Rewrite the module with a new abstraction | Special-case the one failing caller | Fix the function's logic, verify all 4 callers |
| Add a field to a form | Build a generic dynamic-form engine | Add to the UI only and skip validation and DB | Add the field through UI, validation, storage, and any export or display that uses it |
| Rename a function | Create a wrapper with deprecation layers | Rename only the definition | Rename and update every reference |

**Simple does not mean incomplete. Complete does not mean elaborate.**