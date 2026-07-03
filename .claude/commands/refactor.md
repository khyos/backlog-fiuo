---
description: Refactor existing code through the team flow (no PM): Architect clarifies the refactoring goal → Developer implements → TDD tester writes contract tests → Standards tester writes code-based tests → Developer fixes if tests fail (loop) → Code reviewer reviews → Developer fixes if needed → Architect reviews → Developer fixes if needed → Security expert signs off.
---

You are orchestrating the **Refactoring** flow for Backlog-FIUO.

The user has described what to refactor. Work through the agents below in order. Do not skip a step. Each agent's output gates the next step.

> This flow has no PM step — refactoring is a technical concern, not a product one.

---

## Step 1 — Architect: Understand and Design the Refactoring

Use the `architect` agent.

Provide the agent with:
- What the user wants to refactor (files, modules, patterns)
- The user's stated goal (e.g. "extract a utility", "simplify the DB layer", "rename a concept")

The architect will:
1. Ask clarifying questions if the goal is ambiguous.
2. Confirm the scope: which files are in scope and which are not.
3. Define the refactoring contract: what external behaviour must NOT change.
4. Approve the approach.

> Do not proceed to Step 2 until the architect outputs `ARCHITECTURE APPROVED`.

---

## Step 2 — Developer: Implement the Refactoring

Use the `developer` agent.

Provide the architectural design and scope. The developer will apply the refactoring. Collect the list of changed files.

> Do not proceed to Step 3 until the developer reports the implementation is complete.

---

## Step 3 — TDD Tester + Standards Tester → Developer fix loop

This step loops until both testers pass.

### 3a — TDD Tester

Use the `tdd-tester` agent.

Provide the refactoring scope and the architectural contract (what must not change). The TDD tester writes tests that validate the unchanged external behaviour.

- If the output is `TDD TESTS FAILING`, go to Step 3-Fix.
- If the output is `TDD TESTS PASSING ✓`, continue to Step 3b.

### 3b — Standards Tester

Use the `tester` agent.

Provide the same context. The standards tester reads the refactored implementation and writes tests for implementation-level paths.

- If the output is `STANDARDS TESTS FAILING`, go to Step 3-Fix.
- If the output is `STANDARDS TESTS PASSING ✓`, proceed to Step 4.

### 3-Fix — Developer Fix

Use the `developer` agent.

Provide the failing test output. The developer fixes the implementation. Then **restart Step 3** (both testers must re-run after every developer fix).

---

## Step 4 — Code Reviewer

Use the `code-reviewer` agent.

Provide the list of changed files. The code reviewer inspects the refactored code.

- If the output is `CODE REVIEW FAILED`, use the `developer` agent to apply the blocking fixes, then **restart Step 3**.
- If the output is `CODE REVIEW PASSED ✓`, proceed to Step 5.

---

## Step 5 — Architect: Architectural Review

Use the `architect` agent.

Ask the architect to verify the refactoring achieved its goal and did not introduce structural regressions.

- If the output is `ARCHITECTURE REVIEW FAILED`, use the `developer` agent to apply the requested changes, then **restart Step 3**.
- If the output is `ARCHITECTURE REVIEW PASSED ✓`, proceed to Step 6.

---

## Step 6 — Security Expert

Use the `security-expert` agent.

Provide the list of changed files. The security expert checks whether the refactoring inadvertently introduced security issues.

- If the output is `SECURITY REVIEW FAILED` with Critical or High findings, use the `developer` agent to fix them, then **restart Step 3**.
- If the output is `SECURITY REVIEW PASSED ✓` (or only Medium/Low findings that the user accepts), the refactoring is **DONE**.

---

## Flow complete

Report to the user:
```
✓ Refactoring complete
Files changed: <list>
All gates passed: TDD tests, standards tests, code review, architecture review, security review.
```
