import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import { ASK_CLASSES, DENY_CLASSES, classifyAsk, classifyDeny, tickSessionIds, validateClasses } from './guards.js'
import type {
  AgentMirror,
  ApprovalService,
  PreToolDecision,
  ScheduleService,
  SessionMirror,
  ToolExecution,
  ToolsService,
} from './types.js'

export const name = 'dsh-permissions'

export const inject = ['tools', 'approval', 'schedule']

export interface Config {
  denyClasses?: string[]
  askClasses?: string[]
  trustScheduledTicks?: boolean
}

export const Config: z<Config> = z.object({
  denyClasses: z.array(z.string()).default([...DENY_CLASSES]),
  askClasses: z.array(z.string()).default([...ASK_CLASSES]),
  trustScheduledTicks: z.boolean().default(true),
})

type PreExecListener = (exec: ToolExecution, next: () => Promise<PreToolDecision>) => Promise<PreToolDecision>
type PreStepListener = (payload: { agent: AgentMirror }, next: () => Promise<unknown>) => Promise<unknown>
type SessionCreatedListener = (session: SessionMirror) => void | Promise<void>

type PluginContext = Context & {
  tools: ToolsService
  approval: ApprovalService
  schedule: ScheduleService
  on(event: 'tools/pre-execute', listener: PreExecListener): () => boolean
  on(event: 'agent/pre-step', listener: PreStepListener): () => boolean
  on(event: 'session/created', listener: SessionCreatedListener): () => boolean
  logger: { warn: (...args: unknown[]) => void }
}

function bashCommand(execution: Readonly<ToolExecution>): string {
  if (execution.name !== 'bash') return ''
  const args = execution.arguments as { command?: unknown } | null
  return typeof args?.command === 'string' ? args.command : ''
}

export function apply(ctx: PluginContext, config: Config): void {
  const denyClasses = config.denyClasses as string[]
  const askClasses = config.askClasses as string[]
  const trustScheduledTicks = config.trustScheduledTicks as boolean
  validateClasses(denyClasses, askClasses)
  const denySet = new Set(denyClasses)
  const askSet = new Set(askClasses)

  const tickSessions = new Set<string>()
  const refreshTickSessions = async (): Promise<void> => {
    if (!trustScheduledTicks) return
    try {
      const entries = await ctx.schedule.catalog()
      tickSessions.clear()
      for (const id of tickSessionIds(entries)) tickSessions.add(id)
    } catch (error) {
      ctx.logger.warn('dsh-permissions: schedule catalog unavailable, tick sessions stay untrusted', error)
    }
  }

  const isTickSession = (execution: Readonly<ToolExecution>): boolean => {
    if (!trustScheduledTicks) return false
    const sessionId = execution.agent?.session.id
    return sessionId !== undefined && tickSessions.has(sessionId)
  }

  void refreshTickSessions()

  ctx.on('session/created', async (session) => {
    await refreshTickSessions()
    if (tickSessions.has(session.id)) {
      ctx.approval.setApprovalPolicy(session, 'never')
    }
  })

  ctx.on('agent/pre-step', async ({ agent }, next) => {
    if (tickSessions.has(agent.session.id)) {
      ctx.approval.setApprovalPolicy(agent.session, 'never')
    }
    return await next()
  })

  const disposeGuard = ctx.tools.guard((execution) => {
    const hit = classifyDeny(execution.name, bashCommand(execution))
    return hit !== undefined && denySet.has(hit.class) ? hit.reason : undefined
  })
  ctx.effect(() => disposeGuard, 'dsh-permissions guard')

  ctx.on('tools/pre-execute', async (execution, next) => {
    if (isTickSession(execution)) return await next()
    const hit = classifyAsk(execution.name, bashCommand(execution))
    if (hit === undefined || !askSet.has(hit.class)) return await next()
    return { kind: 'ask', reason: hit.reason, displayReason: hit.displayReason }
  })
}
