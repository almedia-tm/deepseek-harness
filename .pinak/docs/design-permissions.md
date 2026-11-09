# Design proposal: permissions plugin for dsh

Restate in one line: port Pinak's 637-entry Claude Code permission policy (496 allow / 31 deny / 110 ask, counted live from ~/.claude/settings.json this session) onto dsh as one Cordis plugin built from presets, monotonic guards, and approval defaults, with no per-command list.

## Evidence

- Live counts: allow 496, deny 31 (~20 classes), ask 110 (~16 classes).
- Verified seams (spike): ctx.approval one-shot waterfall that fails closed; monotonic guards in the tool pipeline, identity-protected, deny or abstain; ctx.sandboxPolicy owning mode and workspace root; ctx.permissionPresets bundling sandbox mode and approval policy into one knob; headless flags --permission-mode, --approval-policy ask|never, --add-dir.
- The repo rule that misconfiguration fails loud at load.

## The mapping

| Claude Code concept | dsh home | Plugin behavior |
|---|---|---|
| Allow list (496 entries, mostly Bash prefixes) | Sandbox mode workspace-write plus tool defaults | No entries. Allowed workspace operations are the sandbox default, so the prefix list simply disappears |
| Deny list (31 entries, ~20 classes) | Monotonic guards | One guard rule per class: secret file reads (pem, key, credentials, tokens, pat), secret echo commands (cat/head/tail on token files), printenv/env, git commit, gcloud secrets, railway variables, .env edits, Artifact. Deny before execution, identity protected, no prompt |
| Ask list (110 entries, ~16 classes: publishes, deploys, git state changers, rm, docker writes, kubectl, terraform, MCP writes) | ctx.approval waterfall | Approval policy ask in interactive profiles: one-shot UI prompt per command. Headless runs use --approval-policy never, so ticks never block and the refusal lands in the run output |
| additionalDirectories (8 dirs) | Session workspace root plus --add-dir | See question 1 |
| Style guards (ticket-id, comment strip, em-dash, repeat) | Out of scope | Belongs to the guards plugin ticket |
| Slack post block | Out of scope | Belongs to the guards plugin ticket |
| Key sourcing for ticks | Out of scope | Scheduler ticket |

## Every conditional flag and what it flips

| Flag | Values | What it flips |
|---|---|---|
| sandbox mode | workspace-write (default) / danger-full-access | Whether writes outside the session workspace root are fenced |
| approval policy | ask / never | Whether ask-tier commands prompt (interactive) or auto-deny (headless) |
| profile | web/tui (interactive) vs headless | Interactive = guards plus approval asks. Headless = guards only, approval never, so the guard list is the entire policy for ticks |
| preset switch in UI | one knob | Per dsh design, one switch writes both sandbox mode and approval policy together |

## Worked examples (real commands from the live policy)

1. gcloud run deploy (ask tier today): interactive dsh prompts once through the approval waterfall, guards abstain, run goes. Headless tick: approval never, denied, the refusal is recorded and the tick reports instead of hanging.
2. cat on a token file (deny tier today): monotonic guard matches the secret-echo class, denies before execution, even under danger-full-access, even on repeat attempts. The model cannot see which guard denied (identity protected).
3. git status (allow tier today): workspace-write sandbox allows it; no entry anywhere in the plugin.
4. rm -rf: interactive asks, headless denies, same as today's ask tier.

## Failure cases handled

- Guard throws: the pipeline normalizes a thrown guard into a refusal, fail closed (verified pipeline semantics).
- Approval unanswerable: unavailable resolves to deny (verified seam semantics).
- Unknown command: abstain, falls to the approval waterfall, denies when no answerer.
- Two sessions in parallel: guards are stateless per call, so concurrent sessions stay independent.
- Misconfigured guard list: plugin fails loud at load, never boots without policy.

## Cases deliberately skipped

- Content and style guards, slack post block: guards plugin ticket.
- Credential sourcing and tick environment: scheduler ticket.
- Team-facing preset variants: deferred; the team packaging ticket was canceled, personal-only setup.
- Hooks-claude-code bridge evaluation: guards plugin ticket.

## Files after approval

- plugins/dsh-permissions inside this clone (~/Documents/dsh-harness), tracked on branch pinak-plugins: src/index.ts (apply, inject, Config), src/config.ts (sandbox mode default, approval policy default, guard list), src/guards.ts (class rules), package.json, cordis.yml, README.
- Install into the interactive profile with dsh plugin --profile web add <local path> (local file install verified during build).
- Harness scripts (setup, start, stop) live in .pinak/; one command after install serves the web UI on port 3080.

## Questions for Pinak (design forks)

1. Session workspace strategy: per-project sessions (session root = the repo you work in) vs one home root (~/Documents) plus --add-dir per repo. Recommendation: per-project, matching dsh's model and their per-repo workflow.
2. Interactive approvals: prompt for the same classes as today's ask tier (recommended) vs only for danger-full-access.
3. Naming: dsh-permissions (id permissions-pinak) vs your pick.
4. Plugins location: answered. plugins/ folder inside the clone on branch pinak-plugins.
