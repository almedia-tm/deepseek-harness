# 插件

[English](README.md) | 中文

一个文件夹对应一个插件，全部在此构建，并跟踪在 pinak-plugins 分支上。

每个插件文件夹都有自己的 package.json。setup 会把这里的每个插件安装到 web 配置中：

```sh
dsh plugin --profile web add <path to plugin folder>
```

第一个插件：permissions，把 Claude Code 的权限策略移植到 ctx.approval 和单调守卫上。
