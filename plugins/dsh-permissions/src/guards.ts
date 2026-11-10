
export const DENY_CLASSES = [
  'secret-read',
  'env-dump',
  'git-commit',
  'gcloud-secrets',
  'railway-variables',
  'env-file-write',
  'artifact',
] as const

export const ASK_CLASSES = [
  'deploy',
  'git-state',
  'rm',
  'docker',
  'kubectl',
  'terraform',
  'mcp-write',
] as const

export type DenyClass = (typeof DENY_CLASSES)[number]
export type AskClass = (typeof ASK_CLASSES)[number]

export interface DenyHit {
  class: DenyClass
  reason: string
}

export interface AskHit {
  class: AskClass
  reason: string
  displayReason: { en: string }
}

const SECRET_PATH = /(\.pem|\.key|\.p12|\.pfx|id_rsa|credentials|secret|token|\.pat|\.env)\b/i
const READERS = /^(cat|head|tail|grep|rg|sed|awk|less|more|strings|xxd|od|jq|cp|mv|diff|bat)\b/
const WRITE_REDIRECT = /(>>|>|tee\b|sed\s+(-i|--in-place)\b)/
const WRITE_VERBS = [
  'save', 'update', 'create', 'delete', 'set', 'upsert', 'post', 'deploy', 'apply',
  'remove', 'add', 'insert', 'upload', 'write', 'patch', 'cancel', 'close', 'move',
  'rename', 'replace', 'restore', 'enable', 'disable', 'publish', 'merge', 'archive',
  'install', 'uninstall', 'send', 'approve', 'reject', 'schedule', 'migrate', 'grant',
  'revoke', 'push', 'accept',
]

function stripSudo(command: string): string {
  const tokens = command.trim().split(/\s+/)
  let index = 0
  while (index < tokens.length && (tokens[index] === 'sudo' || tokens[index] === 'doas')) {
    index += 1
    for (;;) {
      const token = tokens[index]
      if (token === undefined || !token.startsWith('-')) break
      index += 1
      if (token === '-u' || token === '--user') index += 1
    }
  }
  return tokens.slice(index).join(' ')
}

export function classifyDeny(toolName: string, rawCommand: string): DenyHit | undefined {
  if (toolName === 'Artifact') {
    return { class: 'artifact', reason: 'denied by dsh-permissions: Artifact writes are not allowed' }
  }
  if (toolName !== 'bash') return undefined
  const command = stripSudo(rawCommand.trim())
  if (command === '') return undefined
  if (/^(env|printenv)(\s|$)/.test(command)) {
    return { class: 'env-dump', reason: 'denied by dsh-permissions: dumping environment variables' }
  }
  if (/^git\s+commit(\s|$)/.test(command)) {
    return { class: 'git-commit', reason: 'denied by dsh-permissions: git commit is a user action' }
  }
  if (/^gcloud\s+secrets(\s|$)/.test(command)) {
    return { class: 'gcloud-secrets', reason: 'denied by dsh-permissions: gcloud secrets access' }
  }
  if (/^railway\s+(variables|secrets)(\s|$)/.test(command)) {
    return { class: 'railway-variables', reason: 'denied by dsh-permissions: railway variables access' }
  }
  if (/\.env(\s|$)/.test(command) && WRITE_REDIRECT.test(command)) {
    return { class: 'env-file-write', reason: 'denied by dsh-permissions: writing to .env files' }
  }
  if (READERS.test(command) && SECRET_PATH.test(command)) {
    return { class: 'secret-read', reason: 'denied by dsh-permissions: reading secret material' }
  }
  return undefined
}

export function classifyAsk(toolName: string, rawCommand: string): AskHit | undefined {
  if (toolName.startsWith('mcp__') && /_(save|update|create|delete|set|upsert|post|deploy|apply|remove|add|insert|upload|write|patch|cancel|close|move|rename|replace|restore|enable|disable|publish|merge|archive|install|uninstall|send|approve|reject|schedule|migrate|grant|revoke|push|accept)(_|$)/.test(toolName)) {
    return { class: 'mcp-write', reason: 'approval required for a write tool call', displayReason: { en: 'This tool call writes. Approve it to run once.' } }
  }
  if (toolName !== 'bash') return undefined
  const command = stripSudo(rawCommand.trim())
  if (command === '') return undefined
  if (/^(gcloud|firebase|wrangler|sls|serverless)(\s+\S+)*\s+deploy\b/.test(command)
    || /^(npm|pnpm|yarn)\s+publish\b/.test(command)
    || /^git\s+push\b/.test(command)
    || /^railway\s+up\b/.test(command)
    || /^gh\s+release\s+(create|delete|edit)\b/.test(command)) {
    return { class: 'deploy', reason: 'approval required for a deploy or publish', displayReason: { en: 'This command deploys or publishes. Approve it to run once.' } }
  }
  if (/^git\s+(switch|checkout|merge|rebase|tag|stash|reset)\b/.test(command)) {
    return { class: 'git-state', reason: 'approval required for a git state change', displayReason: { en: 'This command changes git state. Approve it to run once.' } }
  }
  if (/^rm(\s|$)/.test(command)) {
    return { class: 'rm', reason: 'approval required for rm', displayReason: { en: 'This command removes files. Approve it to run once.' } }
  }
  if (/^docker\b/.test(command)) {
    return { class: 'docker', reason: 'approval required for docker', displayReason: { en: 'This docker command writes. Approve it to run once.' } }
  }
  if (/^kubectl\b/.test(command)) {
    return { class: 'kubectl', reason: 'approval required for kubectl', displayReason: { en: 'This kubectl command writes. Approve it to run once.' } }
  }
  if (/^terraform\s+(apply|destroy|plan)\b/.test(command)) {
    return { class: 'terraform', reason: 'approval required for terraform', displayReason: { en: 'This terraform command changes state. Approve it to run once.' } }
  }
  return undefined
}

export function validateClasses(denyClasses: readonly string[], askClasses: readonly string[]): void {
  const known = new Set<string>([...DENY_CLASSES, ...ASK_CLASSES])
  for (const klass of [...denyClasses, ...askClasses]) {
    if (!known.has(klass)) {
      throw new Error(`dsh-permissions: unknown class "${klass}"`)
    }
  }
  if (denyClasses.length === 0 && askClasses.length === 0) {
    throw new Error('dsh-permissions: both class lists are empty, refusing to boot without policy')
  }
}

export function tickSessionIds(entries: readonly { involvedSessionIds: readonly string[] }[]): Set<string> {
  const ids = new Set<string>()
  for (const entry of entries) {
    for (const id of entry.involvedSessionIds) ids.add(id)
  }
  return ids
}
