export interface SessionMirror {
  id: string
}

export interface AgentMirror {
  session: SessionMirror
}

export interface ToolExecution {
  readonly name: string
  readonly arguments: unknown
  readonly callId: string
  readonly agent?: AgentMirror
}

export type ToolGuard = (execution: Readonly<ToolExecution>) => string | undefined

export type PreToolDecision =
  | { kind: 'allow' }
  | { kind: 'deny'; reason: string }
  | { kind: 'cancel' }
  | { kind: 'ask'; reason?: string; displayReason?: { readonly en: string; readonly [locale: string]: string } }

export interface ToolsService {
  guard(guard: ToolGuard): () => void
}

export interface ApprovalService {
  setApprovalPolicy(session: SessionMirror, policy: 'ask' | 'never'): void
}

export interface ScheduleCatalogEntryMirror {
  involvedSessionIds: readonly string[]
}

export interface ScheduleService {
  catalog(): Promise<readonly ScheduleCatalogEntryMirror[]>
}
