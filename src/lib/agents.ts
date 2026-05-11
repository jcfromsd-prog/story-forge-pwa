// Agent wrappers. The heavy lifting (Bible + voice injection, system prompts)
// happens server-side in the Supabase Edge Function. The client just specifies
// which agent and passes the user's message.

import { callClaude, extractJSON } from './claude'
import type { ID } from '@/types'

export interface CaptureSummary {
  summary: string
  bullets: { text: string; category: string; subject: string }[]
  open_questions: string[]
  bible_candidates: {
    category: string
    subject: string
    decision: string
    negative_constraints: string[]
  }[]
  bible_violations: string[]
}

export async function runCaptureAgent(projectId: ID, transcript: string): Promise<CaptureSummary> {
  const res = await callClaude({
    agent: 'capture',
    projectId,
    userMessage: `Transcript:\n"""\n${transcript}\n"""\n\nReturn ONLY the JSON object — no prose, no markdown fences.`,
    maxTokens: 1500,
    temperature: 0.3,
  })
  const parsed = (res.parsed as CaptureSummary) ?? extractJSON<CaptureSummary>(res.content)
  if (!parsed) {
    return {
      summary: '',
      bullets: [{ text: transcript.slice(0, 280), category: 'note', subject: '' }],
      open_questions: [],
      bible_candidates: [],
      bible_violations: [],
    }
  }
  return parsed
}

export interface CraftResponse {
  analysis: string
  options: { label: string; text: string; tradeoff: string }[]
  literary_techniques_in_play?: string[]
  bible_violations?: string[]
}

export async function runCraftAgent(
  projectId: ID,
  request: string,
  passage?: string,
  manuscriptContent?: string,
): Promise<{ raw: string; parsed: CraftResponse | null }> {
  const parts: string[] = []
  if (manuscriptContent && manuscriptContent.trim().length > 0) {
    // Trim to ~60K chars (~10-15K tokens) to keep prompts reasonable
    const excerpt = manuscriptContent.length > 60000
      ? manuscriptContent.slice(0, 60000) +
        `\n\n[... manuscript continues — ${(manuscriptContent.length - 60000).toLocaleString()} more characters omitted to fit token limits ...]`
      : manuscriptContent
    parts.push(`CURRENT MANUSCRIPT (the work the author wants you to analyze):\n"""\n${excerpt}\n"""\n`)
  }
  if (passage && passage.trim().length > 0) {
    parts.push(`SELECTED PASSAGE (specifically what the author wants you to focus on):\n"""\n${passage}\n"""\n`)
  }
  parts.push(`AUTHOR'S REQUEST:\n${request}`)
  const userMessage = parts.join('\n\n')

  const res = await callClaude({
    agent: 'craft',
    projectId,
    userMessage,
    enforceChoiceMode: true,
    maxTokens: 2500,
    temperature: 0.7,
  })
  const parsed = (res.parsed as CraftResponse) ?? extractJSON<CraftResponse>(res.content)
  return { raw: res.content, parsed: parsed ?? null }
}

export interface ContinuityFinding {
  severity: 'red' | 'yellow' | 'green'
  type: string
  location: string
  description: string
  suggested_fix?: string
}

export async function runContinuityAgent(
  projectId: ID,
  manuscript: string,
): Promise<ContinuityFinding[]> {
  const res = await callClaude({
    agent: 'continuity',
    projectId,
    userMessage: `Manuscript:\n"""\n${manuscript.slice(0, 30000)}\n"""\n\nReturn ONLY the JSON object.`,
    maxTokens: 3000,
    temperature: 0.2,
  })
  const parsed =
    (res.parsed as { flags: ContinuityFinding[] } | null) ??
    extractJSON<{ flags: ContinuityFinding[] }>(res.content)
  return parsed?.flags ?? []
}

export async function runVoiceAgent(projectId: ID, passage: string): Promise<string> {
  const res = await callClaude({
    agent: 'voice',
    projectId,
    userMessage: `Rewrite the following passage in the author's voice. Output ONLY the rewritten passage — no commentary.\n\n"""\n${passage}\n"""`,
    maxTokens: 2000,
    temperature: 0.7,
  })
  return res.content
}

export async function generateVersionTitle(
  content: string,
  parentTitle?: string,
): Promise<string> {
  const res = await callClaude({
    agent: 'builder',
    userMessage: `Generate a 4-7 word title that captures the MAIN PREMISE or CHANGE in this manuscript snapshot. Style: descriptive, specific, like a git commit message but evocative. Example: "Rumi's betrayal — softer reveal" or "Act 2 midpoint w/ memory motif".${
      parentTitle ? `\n\nPrevious version title: "${parentTitle}"` : ''
    }\n\nManuscript excerpt:\n"""\n${content.slice(0, 4000)}\n"""\n\nReturn ONLY the title — no quotes, no prose.`,
    maxTokens: 60,
    temperature: 0.5,
  })
  return res.content.trim().replace(/^["']|["']$/g, '').slice(0, 80)
}
