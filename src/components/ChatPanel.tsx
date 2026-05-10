import { useState, useRef, useEffect } from 'react'
import { useApp } from '@/state/store'
import { runCraftAgent } from '@/lib/agents'
import { Chat } from '@/lib/data'
import { clsx } from '@/lib/util'
import type { Message } from '@/types'

interface ChatPanelProps {
  selectedPassage?: string
  onClearSelection?: () => void
}

const PRESET_PROMPTS = [
  'Get me 3 options for the next line',
  'Critique this passage in 2-3 paragraphs',
  'Foreshadowing opportunities in this scene',
  'Where could I strengthen the sensory detail?',
  'Suggest a stronger opening for this chapter',
]

export default function ChatPanel({ selectedPassage, onClearSelection }: ChatPanelProps) {
  const projectId = useApp((s) => s.currentProjectId)
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!projectId) return
    Chat.getOrCreateConversation(projectId).then(async (c) => {
      setConversationId(c.id)
      setMessages(await Chat.listMessages(c.id))
    })
  }, [projectId])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages.length, busy])

  const reloadMessages = async (cid: string) => {
    setMessages(await Chat.listMessages(cid))
  }

  const send = async (text: string) => {
    if (!projectId || !conversationId || !text.trim() || busy) return
    setBusy(true)
    setInput('')
    await Chat.addMessage({
      conversationId,
      role: 'user',
      content: selectedPassage ? `${text}\n\n[Selected passage attached]` : text,
    })
    await reloadMessages(conversationId)
    try {
      const { raw, parsed } = await runCraftAgent(projectId, text, selectedPassage)
      const display = parsed ? formatCraftResponse(parsed) : raw
      await Chat.addMessage({
        conversationId,
        role: 'assistant',
        content: display,
        aiModel: 'craft',
      })
    } catch (e) {
      await Chat.addMessage({
        conversationId,
        role: 'assistant',
        content: `⚠️ ${e instanceof Error ? e.message : String(e)}`,
      })
    } finally {
      await reloadMessages(conversationId)
      setBusy(false)
      onClearSelection?.()
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-ink-800 p-3">
        <div>
          <h3 className="text-sm font-medium text-ink-100">Craft Chat</h3>
          <p className="text-[10px] text-ink-500">Bible-aware · Choice Mode enforced · Voice-matched</p>
        </div>
      </div>

      {selectedPassage && (
        <div className="border-b border-accent-500/30 bg-accent-500/10 px-3 py-2 text-xs">
          <div className="mb-1 flex items-center justify-between">
            <span className="font-medium text-accent-500">📌 Passage attached</span>
            <button onClick={onClearSelection} className="text-ink-500 hover:text-ink-200">
              ✕
            </button>
          </div>
          <p className="line-clamp-3 text-ink-300">{selectedPassage}</p>
        </div>
      )}

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 && !busy && (
          <div className="text-xs text-ink-500">
            <p className="mb-3">Ask anything. The AI sees your Bible and always returns 2-3 options.</p>
            <div className="space-y-1">
              {PRESET_PROMPTS.map((p) => (
                <button
                  key={p}
                  onClick={() => send(p)}
                  className="block w-full rounded-md border border-ink-800 bg-ink-900/40 px-3 py-2 text-left text-xs text-ink-300 hover:bg-ink-800"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={clsx(
              'rounded-lg px-3 py-2 text-sm',
              m.role === 'user'
                ? 'ml-6 bg-ink-800 text-ink-100'
                : 'mr-6 border border-ink-800 bg-ink-900/40 text-ink-200',
            )}
          >
            <div className="mb-1 text-[10px] uppercase tracking-wider text-ink-500">
              {m.role === 'user' ? 'You' : 'Craft Agent'}
            </div>
            <div className="whitespace-pre-wrap leading-relaxed">{m.content}</div>
          </div>
        ))}
        {busy && (
          <div className="mr-6 rounded-lg border border-ink-800 bg-ink-900/40 px-3 py-2 text-sm text-ink-400">
            <span className="inline-flex gap-1">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-ink-500" />
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-ink-500 [animation-delay:120ms]" />
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-ink-500 [animation-delay:240ms]" />
            </span>
          </div>
        )}
      </div>

      <div className="border-t border-ink-800 p-3">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault()
              send(input)
            }
          }}
          placeholder="Ask the Craft Agent... (Cmd/Ctrl+Enter to send)"
          rows={3}
          className="input resize-none"
        />
        <div className="mt-2 flex items-center justify-between">
          <p className="text-[10px] text-ink-500">⌘/Ctrl + Enter to send</p>
          <button onClick={() => send(input)} className="btn-primary" disabled={!input.trim() || busy}>
            Send
          </button>
        </div>
      </div>
    </div>
  )
}

function formatCraftResponse(parsed: {
  analysis: string
  options: { label: string; text: string; tradeoff: string }[]
  literary_techniques_in_play?: string[]
  bible_violations?: string[]
}): string {
  const lines: string[] = []
  if (parsed.bible_violations?.length) {
    lines.push('⚠️ BIBLE VIOLATIONS')
    parsed.bible_violations.forEach((v) => lines.push(`  • ${v}`))
    lines.push('')
  }
  if (parsed.analysis) {
    lines.push(parsed.analysis)
    lines.push('')
  }
  if (parsed.options?.length) {
    parsed.options.forEach((o) => {
      lines.push(`━━ ${o.label} ━━`)
      lines.push(o.text)
      if (o.tradeoff) lines.push(`  ↪ tradeoff: ${o.tradeoff}`)
      lines.push('')
    })
  }
  if (parsed.literary_techniques_in_play?.length) {
    lines.push(`techniques: ${parsed.literary_techniques_in_play.join(', ')}`)
  }
  return lines.join('\n').trim()
}
