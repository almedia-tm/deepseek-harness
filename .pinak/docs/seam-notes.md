# DSH Spike: Seam Verification Notes

Source: clone at ~/Documents/dsh-harness, pinned tag dsh-v0.2.2-rc.1 (see pin.txt). The master merge of the same release was broken (subagent-oar run.ts TS2554), which is why the pin moved to the shipped tag. Docs read locally: capability-seams.md, tool-execution-pipeline.md, cli-help.md, api-gateway.md, SAFETY.md.

## Install and build verification

- Toolchain: node 26.5.0, pnpm 11.28.5 provisioned via corepack from the repo packageManager field. Global pnpm 9.15.9 stays untouched; it must not be used in this repo (it rewrites the lockfile and drops overrides plus patchedDependencies).
- Install: CI=true corepack pnpm install, exit 0, lockfile pristine after install.
- Build: CI=true corepack pnpm run build:artifacts, 8/8 gates passed (native addon, Host Typert, host compiler, Host bundle, Desktop bundle, client compiler, Client bundle, Web build).
- CLI smoke: corepack pnpm dsh --version prints 0.2.2-rc.1.
- First model run: verified end to end. DEEPSEEK_API_KEY from the launching environment resolves; the official model listing loads ("loaded 2 model(s)"); the loop ran glob/grep tools and returned an honest not-found answer instead of fabricating. Task path correction: SAFETY.md is at the repo root, not docs/; the spike prompt pointed at docs/SAFETY.md by mistake.
- Credential contract (verified live): the web Models page stores the key in ~/.dsh/.credentials.yaml under ref DEEPSEEK_API_KEY, scoped to client-connection/browser-session. The headless profile disables the credentials store by design (packages/bundle/headless/cordis.patch.yml: credentials disabled, "One-shot jobs use launch-time credentials instead of the interactive store") and reads DEEPSEEK_API_KEY only from the launching environment. Consequence for the scheduler ticket: daily ticks need the key in the launch environment; keychain-backed wrapper recommended, never plaintext.

## Verified seam mapping (local docs, not web summaries)

| Harness piece | dsh seam | What the doc says |
|---|---|---|
| Permission policy | ctx.approval + ctx.permissionPresets + ctx.sandboxPolicy | Not an allowlist. Presets (workspace-write / danger-full-access) bundle sandbox mode + approval policy; approval is a one-shot waterfall, absence fails closed to unavailable. Sandbox policy owns workspace root |
| Rule guards | tools/pre-execute + monotonic guards + tools/post-execute | Pipeline: pre-execute (hooks, permission, sandbox) then monotonic guards (deny or abstain) then execute then post-execute (accept, block, replace, add context). Guards span tool families without coupling tools to policy. Post-execute replace covers comment strip and em-dash |
| Hook scripts | hooks-claude-code + hooks-codex packages | Experimental bridge packages consume ctx.shell and ctx.sessionPersistence: dsh can run Claude Code hook chains. Also ctx.webhookRuntime: trusted plugins register independent process-local rules |
| Context injection | ctx.systemPrompt | Collects prompt sections and model-facing tool schemas for each step |
| Skills | ctx.skills + skill-filesystem + ctx.sessionSkillCatalog | Provider registry; filesystem provider exists |
| Slash commands | ctx.commands | Plugins register direct human commands without model invocations |
| MCP servers | ctx.mcpResources + ctx.mcpManager | Settings-driven MCP server fleet; manager reconciles mcp-client instances against volatile servers config. Re-registration is config, not code |
| Subagent fan-out | ctx.subagents | Backends: spawn-in-process, fork-in-process, ACP, Codex, Claude Code, dsh-sdk. One activation manager owns both lifecycles |
| Workflow orchestration | ctx.workflowEngine | One engine per context; agent() calls fan out through ctx.subagents |
| Model gateway | ctx.llm | Adapters: llm-deepseek, llm-pi-ai, llm-replay. Real-API runs read DEEPSEEK_API_KEY, optional DEEPSEEK_BASE_URL, root .env |
| Daily scheduler | ctx.schedule + ctx.jobs | Schedule stores tasks independent of Session activation and queues due messages in each task's target Session. Jobs is the background job registry |
| Memory store | ctx.storage | KV hub; backends storage-json and storage-sqlite side by side under names |
| Credentials | ctx.credentials + ctx.deepseekAccount | Config carries references to secrets, providers own values; settings controller exposes value-free views and write-only storage |
| Ask-user | ctx.userQuestions + tool-ask-user | UI front ends provide the human answer provider |
| Plan mode | ctx.planMode | Logged plan state, registers /plan |
| Change review | ctx.workspaceChanges + experimental-forge forgePanel | Per-turn changed-file summaries; forge panel streams Git inspection per session into the web client |
| SSH | ctx.ssh | One authenticated OpenSSH connection; fs-ssh, subprocess-ssh, sandbox-ssh providers |
| Phone/web auth | ctx.connection + ctx.remoteAccess | Connection owns browser authentication; remoteAccess decides which Remote methods a non-owner peer may call via role-based policies. Web server rejects wildcard binds; --trusted-host extends the /api browser-trust fence |
| Headless runs | dsh --profile headless | One task, stdout answer, --json events, --session-id resume, --permission-mode preset, --approval-policy ask|never, --add-dir |

## Facts that change the earlier plan

1. Permissions plugin becomes preset + sandbox + guards, not a 500 entry allowlist port.
2. MCP is settings config, so all 15 servers re-register as config entries.
3. The daily ticks have two native options: ctx.schedule tasks or launchd driving dsh headless.
4. Guard scripts may run through the hooks-claude-code bridge instead of a full rewrite.
5. The dsh web client has its own Git diff panel (forge), so VS Code side-by-side is plausible without any extension.

## Open decisions (defer to design gates)

- Plugins location: decided. plugins/ folder inside this clone, tracked on branch pinak-plugins; no separate repo. Harness scripts live in .pinak/.
- Key entry: Pinak enters DEEPSEEK_API_KEY per run or via the web UI credentials store; never on disk inside the clone.
- VS Code: side-by-side default; community extension review optional, after first run.

## Safety status (SAFETY.md)

Experimental developer-preview, no security audit, not production-ready. Least privileges, review plugins before allowing. Team packaging was canceled; the setup is personal-only.
