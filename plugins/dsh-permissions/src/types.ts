export interface ToolExecution {
  readonly name: string
  readonly arguments: unknown
  readonly callId: string
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
