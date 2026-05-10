// Thin wrapper around the Supabase /claude Edge Function.
// In production, this is the only path. The Edge Function handles
// Bible injection and voice profile injection server-side.

import { supabase } from './supabase'

export type AgentName = 'capture' | 'craft' | 'continuity' | 'voice' | 'builder'

export interface ClaudeRequest {
  agent: AgentName
  projectId?: string
  userMessage: string
  context?: Record<string, unknown>
  enforceChoiceMode?: boolean
  model?: string
  maxTokens?: number
  temperature?: number
}

export interface ClaudeResponse {
  content: string
  parsed?: unknown
  model?: string
  usage?: { input_tokens: number; output_tokens: number }
}

export async function callClaude(req: ClaudeRequest): Promise<ClaudeResponse> {
  const { data, error } = await supabase.functions.invoke('claude', { body: req })
  if (error) {
    // Surface the inner error message from the function body if we have it
    const inner =
      typeof error === 'object' && 'context' in error
        ? (error as { context?: { error?: string } }).context?.error
        : undefined
    throw new Error(inner ?? error.message ?? 'Claude function failed')
  }
  if (data && typeof data === 'object' && 'error' in data) {
    throw new Error(String((data as { error: string }).error))
  }
  return data as ClaudeResponse
}

export function extractJSON<T = unknown>(text: string): T | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const raw = fenced ? fenced[1] : text
  const objMatch = raw.match(/[{[][\s\S]*[}\]]/)
  if (!objMatch) return null
  try {
    return JSON.parse(objMatch[0]) as T
  } catch {
    return null
  }
}
