# Plugins

English | [中文](README.zh.md)

One folder per plugin, all built here, tracked on the pinak-plugins branch.

Each plugin folder has its own package.json. Setup installs every plugin here into the web profile:

```sh
dsh plugin --profile web add <path to plugin folder>
```

First plugin: permissions, porting the Claude Code permission policy onto ctx.approval plus monotonic guards.
