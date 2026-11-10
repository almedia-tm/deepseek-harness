# dsh-permissions

[English](README.md) | 中文

把 Pinak 的权限策略做成 dsh 插件：单调拒绝守卫加审批询问，从 Claude Code 权限策略移植而来。

## 拒绝类（守卫，永不询问）

- `secret-read`：用读取命令接触敏感材料（pem、key、p12、pfx、id_rsa、credentials、secrets、tokens、.pat、.env）
- `env-dump`：`env` 和 `printenv`
- `git-commit`：`git commit`
- `gcloud-secrets`：`gcloud secrets`
- `railway-variables`：`railway variables` 和 `railway secrets`
- `env-file-write`：写入 .env 文件（重定向、tee、sed -i）
- `artifact`：按名称匹配 Artifact 工具

## 询问类（审批瀑布）

- `deploy`：gcloud/firebase/wrangler/serverless deploy、npm/pnpm/yarn publish、git push、railway up、gh release
- `git-state`：git switch、checkout、merge、rebase、tag、stash、reset
- `rm`、`docker`、`kubectl`、`terraform apply/destroy/plan`
- `mcp-write`：名称带写动词的 MCP 工具

## 行为

- 守卫是单调的：拒绝不能被改回允许，即使处于 danger-full-access。
- 询问决策走审批服务：交互式配置会提示，审批为 never 的无头配置会确定性拒绝。
- 计划任务会话受信任：首次回合前审批策略被设为 never，询问层对其放行，因此定时任务无需提示即可运行，拒绝守卫仍然生效。
- 匹配前会剥掉 sudo 和 doas 前缀。
- 配置里出现未知类名会在加载时大声失败；两个类列表都为空时拒绝启动。
- 沙箱模式和审批策略仍是 harness 预设；本插件贡献守卫列表和询问路由。

## 配置

```yaml
config:
  denyClasses: [secret-read, env-dump, git-commit, gcloud-secrets, railway-variables, env-file-write, artifact]
  askClasses: [deploy, git-state, rm, docker, kubectl, terraform, mcp-write]
  trustScheduledTicks: true
```

## 安装

```sh
dsh plugin --profile web add --workspace-root <path to this folder>
```

src/types.ts 里的类型按固定 tag 对应 packages/core/tools 的工具契约；插件不依赖过期的 @deepseek-ai/dsh-tools npm 包。
