---
description: Add a new feature through the full team flow: PM clarifies requirements → Architect designs the solution → Developer implements → TDD tester writes contract tests → Standards tester writes code-based tests → Developer fixes if tests fail (loop) → Code reviewer reviews → Developer fixes if needed → Architect reviews → Developer fixes if needed → Security expert signs off. Each testing phase re-runs after developer fixes until all tests pass.
---

You are orchestrating the **Add New Feature** flow for Backlog-FIUO.

The user has described a feature to add. Work through the agents below in order. Do not skip a step. Each agent's output gates the next step.

---

## Step 1 — PM: Clarify Requirements

Use the `pm` agent.

Provide the agent with the feature description from the user. The PM will ask clarifying questions. Relay those questions to the user and feed the answers back. Continue until the PM produces a **Feature Specification**.

> Do not proceed to Step 2 until the PM has produced the Feature Specification.

---

## Step 2 — Architect: Design the Solution

Use the `architect` agent.

Provide the agent with the Feature Specification from Step 1. The architect may ask clarifying questions — relay them to the user if needed. Continue until the architect produces an approved design.

> Do not proceed to Step 3 until the architect outputs `ARCHITECTURE APPROVED`.

---

## Step 3 — Developer: Implement

Use the `developer` agent.

Provide the agent with the Feature Specification and the architectural design. The developer will implement the feature. Collect the list of changed files.

> Do not proceed to Step 4 until the developer reports the implementation is complete.

---

## Step 4 — TDD Tester + Standards Tester → Developer fix loop

This step loops until both testers pass.

### 4a — TDD Tester

Use the `tdd-tester` agent.

Provide the Feature Specification, architectural design, and the list of changed files. The TDD tester will write and run tests based on the contract.

- If the output is `TDD TESTS FAILING`, go to Step 4-Fix.
- If the output is `TDD TESTS PASSING ✓`, continue to Step 4b.

### 4b — Standards Tester

Use the `tester` agent.

Provide the same context. The standards tester will read the implementation and write additional tests.

- If the output is `STANDARDS TESTS FAILING`, go to Step 4-Fix.
- If the output is `STANDARDS TESTS PASSING ✓`, proceed to Step 5.

### 4-Fix — Developer Fix

Use the `developer` agent.

Provide the failing test output. The developer fixes the implementation. Then **restart Step 4** (go back to 4a — both testers must re-run after every developer fix).

---

## Step 5 — Code Reviewer

Use the `code-reviewer` agent.

Provide the list of changed files. The code reviewer inspects the implementation.

- If the output is `CODE REVIEW FAILED`, use the `developer` agent to apply the blocking fixes, then **restart Step 4** (tests must re-run after every code change).
- If the output is `CODE REVIEW PASSED ✓`, proceed to Step 6.

---

## Step 6 — Architect: Architectural Review

Use the `architect` agent.

Ask the architect to review the completed implementation against the approved design.

- If the output is `ARCHITECTURE REVIEW FAILED`, use the `developer` agent to apply the requested changes, then **restart Step 4**.
- If the output is `ARCHITECTURE REVIEW PASSED ✓`, proceed to Step 7.

---

## Step 7 — Security Expert

Use the `security-expert` agent.

Provide the list of changed files. The security expert performs the final review.

- If the output is `SECURITY REVIEW FAILED` with Critical or High findings, use the `developer` agent to fix them, then **restart Step 4**.
- If the output is `SECURITY REVIEW PASSED ✓` (or only Medium/Low findings that the user accepts), the feature is **DONE**.

---

## Flow complete

Report to the user:
```
✓ Feature complete
Files changed: <list>
All gates passed: TDD tests, standards tests, code review, architecture review, security review.
```
