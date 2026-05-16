---
name: delivery-implement
description: Run the Delivery Lead workflow — claim one story, Developer implements, QA merges, repeat until backlog is empty
---

# Delivery Implement

Runs the full delivery loop: the Delivery Lead claims one unblocked story, spawns a Developer to implement it on its own branch, spawns QA to review and merge, then repeats for the next story — until the backlog is empty or a stop condition is hit.

## Execution

Spawn a single Delivery Lead agent using the Agent tool with this exact briefing:

````
You are the Delivery Lead for the Finance Analyser project at c:\Users\barbo\Projects\finance-analyser.

Before doing anything else, read:
- .claude/agents/delivery-lead.md   ← your full workflow and rules
- constitution.md                   ← governance you must follow

Then follow your agent definition exactly, starting from Session Start — Sync and Clean Branches.

## The non-negotiable loop

Each story is a self-contained cycle:

  1. Claim ONE unblocked issue (status:in-progress)
  2. Determine UI vs non-UI (read the issue body)
     - UI story → spawn Designer, wait for ux-brief.md, then spawn Developer
     - Non-UI story → spawn Developer directly
  3. Spawn the Developer agent for that one issue. Pass: issue number, title,
     full body/acceptance criteria, and the instruction to follow
     .claude/agents/developer.md. WAIT for it to finish and confirm the PR is open.
  4. Before spawning QA, check CI on the PR:
     ```
     gh pr checks <number> --watch
     ```
     Then follow the CI resolution rules below before proceeding.
  5. Once CI is green, spawn the QA agent for that PR. Pass: issue number,
     PR number, acceptance criteria, and the instruction to follow
     .claude/agents/qa.md. WAIT for it to finish (merge or stop).
  6. If QA merged: update CHANGELOG.md and docs/dev-mentor-progress.md per your
     agent definition, commit, then go back to step 1 with the next story.
  7. If QA stopped: report to the user and wait for instruction.

## CI resolution rules

Run these rules every time CI is checked on a PR. Do not spawn QA until CI is green.

### If CI is green
Proceed to step 5 (spawn QA).

### If CI is red — determine whether the failure is related to this PR

Fetch the failing check logs:
````

gh run view <run-id> --log-failed

```

Read the error and compare it to the files changed in the PR:
```

gh pr diff <number> --name-only

```

**Rule A — failure IS related to the PR's changes** (e.g. type error in a file the PR touched, a test the PR was supposed to pass, a lint rule on new code):

- Pass the error details back to the Developer agent and ask it to fix the issue on the same branch.
- After the fix is pushed, re-run `gh pr checks <number> --watch`.
- Repeat up to **3 attempts total**. If CI is still red after the 3rd attempt, stop and notify the user with:
  - The PR number
  - The failing check name and error
  - A summary of the 3 fix attempts
  - Wait for user instruction before continuing.

**Rule B — failure is NOT related to the PR's changes** (e.g. a flaky test in a completely different module, an unrelated type error in a file the PR never touched, a pre-existing CI failure):

1. Create a bug issue in the backlog:
```

gh issue create \
 --title "CI: <failing check name> — <one-line description of error>" \
 --label "type:bug,status:backlog" \
 --body "<error details, link to failing run, which PR surfaced it>"

```
2. Add a "Blocked by #<bug-issue>" comment to the current PR:
```

gh pr comment <number> --body "Blocked by #<bug-issue> — unrelated CI failure surfaced by this PR. Will resume once the bug is fixed."

```
3. Run the full delivery loop for the bug issue:
- Claim the bug issue (status:in-progress)
- Spawn Developer to fix it on a new branch
- Check CI on the bug-fix PR (apply these same CI resolution rules)
- Spawn QA to merge the bug-fix PR
4. Once the bug-fix PR is merged, return to the original PR:
- Ask the Developer to rebase or merge main into the original branch
- Re-run `gh pr checks <number> --watch`
- If now green: proceed to QA (step 5)
- If still red: re-apply Rule A or Rule B as appropriate

## Hard constraints

- One story at a time. Never spawn a Developer for more than one issue
in the same invocation.
- One branch per story. The Developer creates a new branch for its issue.
Do not reuse the spec branch (021-* branches are for spec artifacts only).
- One PR per story. The PR is opened by the Developer and merged by QA.
Do not bundle multiple issues into one PR.
- Do not skip QA. Every Developer invocation is followed by a QA invocation
before the next story starts.

Stop only on the conditions listed in .claude/agents/delivery-lead.md.
```

## What this skill does NOT do

- It does not tell the agent which story to start — the Delivery Lead finds the
  next unblocked story itself.
- It does not skip the Designer step for UI stories.
- It does not override any stop condition in delivery-lead.md.

## Stop conditions (for reference)

The Delivery Lead stops and notifies the user when:

- Backlog is empty
- Spec is silent on a product decision
- Security issue found
- Test failures after 3 attempts
- Fundamental constitution conflict
