// Shared type definitions for StoryForge.
// Mirrors the data model in the project brief, scoped down to what
// the local-first (IndexedDB) build actually uses today.

export type ID = string

export interface Project {
  id: ID
  name: string
  type: 'novel' | 'screenplay' | 'both'
  createdAt: number
  updatedAt: number
}

export type BibleCategory =
  | 'character'
  | 'location'
  | 'technology'
  | 'plot'
  | 'timeline'
  | 'rule'
  | 'theme'

export interface BibleRecord {
  id: ID
  projectId: ID
  category: BibleCategory
  subject: string
  decision: string
  negativeConstraints: string[]
  reason?: string
  locked: boolean
  lockedAt?: number
  createdAt: number
  updatedAt: number
  sourceMessageId?: ID
  relatedRecords: ID[]
  history: BibleHistoryEntry[]
}

export interface BibleHistoryEntry {
  oldValue: string
  newValue: string
  reason?: string
  changedAt: number
}

export interface Version {
  id: ID
  projectId: ID
  parentId: ID | null
  branchName: string
  tag?: string
  title: string // AI-generated or manual
  content: string // full manuscript text (markdown-flavored)
  wordCount: number
  aiTool?: string
  changeSummary?: string
  createdAt: number
}

export interface Conversation {
  id: ID
  projectId: ID
  title?: string
  createdAt: number
  updatedAt: number
}

export interface Message {
  id: ID
  conversationId: ID
  role: 'user' | 'assistant' | 'system'
  content: string
  audioBlobId?: ID
  aiModel?: string
  createdAt: number
}

export interface AudioClip {
  id: ID
  projectId: ID
  blob: Blob
  transcript: string
  durationMs: number
  createdAt: number
}

export interface CaptureBullet {
  id: ID
  text: string
  scope?: { kind: 'character' | 'location' | 'scene' | 'note'; subject?: string }
  approved: boolean
}

export interface CaptureSession {
  id: ID
  projectId: ID
  rawTranscript: string
  audioClipId?: ID
  bullets: CaptureBullet[]
  status: 'recording' | 'summarizing' | 'awaiting_approval' | 'approved' | 'discarded'
  createdAt: number
  updatedAt: number
}

export interface VoiceProfile {
  id: ID
  projectId: ID
  sampleTexts: string[]
  avgSentenceLength: number
  sentenceLengthVariance: number
  vocabularyFingerprint: Record<string, number>
  antiPatterns: string[]
  updatedAt: number
}

export interface ResearchItem {
  id: ID
  projectId: ID
  type: 'pdf' | 'article' | 'image' | 'url' | 'note'
  title: string
  content: string
  sourceUrl?: string
  tags: string[]
  createdAt: number
}

export type QAStatus = 'green' | 'yellow' | 'red'

export interface QAReport {
  id: ID
  versionId: ID
  reportType: string
  status: QAStatus
  findings: QAFinding[]
  createdAt: number
}

export interface QAFinding {
  severity: QAStatus
  message: string
  passage?: string
  location?: { chapter?: number; paragraph?: number; offset?: number }
}

export interface Settings {
  id: 'singleton'
  preferredModel: 'claude-opus-4-6' | 'claude-sonnet-4-6' | 'claude-haiku-4-5-20251001'
  craftModel: 'claude-opus-4-6' | 'claude-sonnet-4-6'
  captureModel: 'claude-sonnet-4-6' | 'claude-haiku-4-5-20251001'
  theme: 'dark' | 'light'
  autoSaveSeconds: number
  choiceModeEnforced: boolean
}

// Re-exports needed by data.ts
export type QAFindingExport = QAFinding
