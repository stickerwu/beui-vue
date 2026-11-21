/** English defaults. Override per instance with `labels`. */
export const agentActivityMessages = {
  thinking: 'Thinking…',
  searching: 'Searching the web…',
  runningTools: 'Running tools…',
  workingTrace: 'Working through the run…',
  workingMixed: 'Working through it…',
  thoughtFor: 'Thought for {duration}',
  seconds: '{seconds}s',
  minutes: '{minutes}m',
  minutesSeconds: '{minutes}m {seconds}s',
  searched: 'Searched the web',
  ranToolsOne: 'Ran {count} tool',
  ranToolsOther: 'Ran {count} tools',
  traceSummary: '{toolCalls}, {messages}',
  toolCallsOne: '{count} tool call',
  toolCallsOther: '{count} tool calls',
  messagesOne: '{count} message',
  messagesOther: '{count} messages',
  completedStepsOne: 'Completed {count} step',
  completedStepsOther: 'Completed {count} steps',
  moreResults: '+{count} more',
  read: 'Read',
  edit: 'Edit',
  write: 'Write',
  run: 'Run',
}
export type AgentActivityMessages = typeof agentActivityMessages
export type AgentActivityTranslate = (key: keyof AgentActivityMessages, values?: Record<string, string | number>) => string

export type AgentStepStatus = 'pending' | 'active' | 'complete'
export type AgentSearchResult = { id: string, title: string, domain?: string, url?: string }
export type AgentTraceKind = 'thinking' | 'message' | 'write' | 'run' | 'read' | (string & {})
export type ActivityItem =
  | { id: string, type: 'step', label: string, status?: AgentStepStatus, meta?: string }
  | { id: string, type: 'text', content: string }
  | { id: string, type: 'search', query: string, results?: AgentSearchResult[], moreCount?: number }
  | { id: string, type: 'tool', action: 'read' | 'edit' | 'run' | (string & {}), target: string, additions?: number, deletions?: number }
  | { id: string, type: 'trace', kind: AgentTraceKind, label: string, detail?: string }
export type ActivityContentType = ActivityItem['type'] | 'mixed'
