import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import { ASK_CLASSES, DENY_CLASSES, classifyAsk, classifyDeny, validateClasses } from './guards.js'
import type { PreToolDecision, ToolExecution, ToolsService } from './types.js'

export const name = 'dsh-permissions'

export const inject = ['tools']

export interface Config {
  denyClasses?: string[]
  askClasses?: string[]
}

export const Config: z<Config> = z.object({
  denyClasses: z.array(z.string()).default([...DENY_CLASSES]),
  askClasses: z.array(z.string()).default([...ASK_CLASSES]),
})

type PreExecListener = (exec: ToolExecution, next: () => Promise<PreToolDecision>) => Promise<PreToolDecision>

type PluginContext = Context & {
  tools: ToolsService
  on(event: 'tools/pre-execute', listener: PreExecListener): () => boolean
}

function bashCommand(execution: Readonly<ToolExecution>): string {
  if (execution.name !== 'bash') return ''
  const args = execution.arguments as { command?: unknown } | null
  return typeof args?.command === 'string' ? args.command : ''
}

export function apply(ctx: PluginContext, config: Config): void {
  const denyClasses = config.denyClasses as string[]
  const askClasses = config.askClasses as string[]
  validateClasses(denyClasses, askClasses)
  const denySet = new Set(denyClasses)
  const askSet = new Set(askClasses)

  const disposeGuard = ctx.tools.guard((execution) => {
    const hit = classifyDeny(execution.name, bashCommand(execution))
    return hit !== undefined && denySet.has(hit.class) ? hit.reason : undefined
  })
  ctx.effect(() => disposeGuard, 'dsh-permissions guard')

  ctx.on('tools/pre-execute', async (execution, next) => {
    const hit = classifyAsk(execution.name, bashCommand(execution))
    if (hit === undefined || !askSet.has(hit.class)) return await next()
    return { kind: 'ask', reason: hit.reason, displayReason: hit.displayReason }
  })
}
