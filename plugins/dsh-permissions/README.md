# dsh-permissions

English | [中文](README.zh.md)

Pinak's permission policy as a dsh plugin: monotonic deny guards plus approval asks, ported from the Claude Code permission policy.

## Deny classes (guards, never prompt)

- `secret-read`: reader commands on secret material (pem, key, p12, pfx, id_rsa, credentials, secrets, tokens, .pat, .env)
- `env-dump`: `env` and `printenv`
- `git-commit`: `git commit`
- `gcloud-secrets`: `gcloud secrets`
- `railway-variables`: `railway variables` and `railway secrets`
- `env-file-write`: writes to .env files (redirect, tee, sed -i)
- `artifact`: the Artifact tool by name

## Ask classes (approval waterfall)

- `deploy`: gcloud/firebase/wrangler/serverless deploy, npm/pnpm/yarn publish, git push, railway up, gh release
- `git-state`: git switch, checkout, merge, rebase, tag, stash, reset
- `rm`, `docker`, `kubectl`, `terraform apply/destroy/plan`
- `mcp-write`: MCP tools whose names carry a write verb

## Behavior

- Guards are monotonic: a denial cannot be turned back into permission, even under danger-full-access.
- Ask decisions go through the approval service: interactive profiles prompt, headless profiles with approval never reject deterministically.
- Scheduled-task sessions are trusted: their approval policy is set to never before the first turn, and the ask tier abstains for them, so ticks run without prompts while the deny guards stay active.
- sudo and doas prefixes are stripped before matching.
- An unknown class name in config fails loud at load; two empty class lists refuse to boot.
- Sandbox mode and approval policy stay harness presets; this plugin contributes the guard list and the ask routing.

## Config

```yaml
config:
  denyClasses: [secret-read, env-dump, git-commit, gcloud-secrets, railway-variables, env-file-write, artifact]
  askClasses: [deploy, git-state, rm, docker, kubectl, terraform, mcp-write]
  trustScheduledTicks: true
```

## Install

```sh
dsh plugin --profile web add --workspace-root <path to this folder>
```

The types in src/types.ts mirror the tool contracts in packages/core/tools at the pinned tag; the plugin carries no dependency on the drifted @deepseek-ai/dsh-tools npm package.
