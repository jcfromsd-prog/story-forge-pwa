import { useState, useRef, useEffect } from 'react'
import { useApp } from '@/state/store'
import { runCraftAgent } from '@/lib/agents'
import { Chat } from '@/lib/data'
import { VoiceCapture, isSpeechRecognitionSupported } from '@/lib/voice'
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
  const [recording, setRecording] = useState(false)
  const [interimTranscript, setInterimTranscript] = useState('')
  const [voiceError, setVoiceError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const captureRef = useRef<VoiceCapture | null>(null)
  const recordingBaseRef = useRef<string>('') // input value when recording started

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

  // Stop voice capture on unmount
  useEffect(() => {
    return () => {
      if (captureRef.current) void captureRef.current.stop()
    }
  }, [])

  const reloadMessages = async (cid: string) => {
    setMessages(await Chat.listMessages(cid))
  }

  const startVoice = async () => {
    if (recording) return
    setVoiceError(null)
    recordingBaseRef.current = input ? input.trimEnd() + ' ' : ''
    const cap = new VoiceCapture(
      {
        onPartialTranscript: (interim, finalSoFar) => {
          setInterimTranscript(interim)
          setInput(recordingBaseRef.current + finalSoFar + (interim ? ' ' + interim : ''))
        },
        onAutoSave: () => {},
        onError: (err) => setVoiceError(err.message),
        onEnd: () => {},
      },
      30000, // we don't need cloud autosave for chat input
    )
    captureRef.current = cap
    try {
      await cap.start()
      setRecording(true)
    } catch (e) {
      setVoiceError(e instanceof Error ? e.message : String(e))
    }
  }

  const stopVoice = async () => {
    if (!captureRef.current) return
    const { transcript } = await captureRef.current.stop()
    captureRef.current = null
    setRecording(false)
    setInterimTranscript('')
    // Replace interim text in the input with the finalized transcript
    setInput(recordingBaseRef.current + transcript)
  }

  // Internal send that doesn't re-record the user message — used by retry
  const sendRaw = async (text: string, passage?: string, recordUserMessage = true) => {
    if (!projectId || !conversationId || !text.trim() || busy) return
    if (recording) await stopVoice()
    setBusy(true)
    if (recordUserMessage) {
      setInput('')
      await Chat.addMessage({
        conversationId,
        role: 'user',
        content: passage ? `${text}\n\n[Selected passage attached]` : text,
      })
      await reloadMessages(conversationId)
    }
    try {
      const { raw, parsed } = await runCraftAgent(projectId, text, passage)
      const display = parsed && (parsed as { options?: unknown }).options ? formatCraftResponse(parsed) : raw
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

  const send = (text: string) => sendRaw(text, selectedPassage, true)

  /**
   * Re-run the most recent user prompt. Strips the "[Selected passage attached]" footer
   * if it was originally added, and re-extracts the passage when present.
   */
  const retryLastPrompt = async () => {
    if (busy) return
    // Find the last user message
    let lastUser: Message | undefined
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        lastUser = messages[i]
        break
      }
    }
    if (!lastUser) return
    // Strip the passage footer if present (user message may include it)
    const content = lastUser.content.replace(/\n+\[Selected passage attached\]\s*$/, '')
    await sendRaw(content, undefined, false)
  }

  const speechSupported = isSpeechRecognitionSupported()

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
            <p className="mb-3">Ask anything by typing or 🎤 voice. The AI sees your Bible and always returns 2-3 options.</p>
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
        {messages.map((m, idx) => {
          const isError = m.role === 'assistant' && m.content.startsWith('⚠️')
          // Show retry button on the most recent error
          const showRetry =
            isError &&
            idx === messages.length - 1 &&
            messages.some((mm) => mm.role === 'user')
          return (
            <div
              key={m.id}
              className={clsx(
                'rounded-lg px-3 py-2 text-sm',
                m.role === 'user'
                  ? 'ml-6 bg-ink-800 text-ink-100'
                  : isError
                    ? 'mr-6 border border-red-700/60 bg-red-900/20 text-red-100'
                    : 'mr-6 border border-ink-800 bg-ink-900/40 text-ink-200',
              )}
            >
              <div className="mb-1 text-[10px] uppercase tracking-wider text-ink-500">
                {m.role === 'user' ? 'You' : 'Craft Agent'}
              </div>
              <div className="whitespace-pre-wrap leading-relaxed">{m.content}</div>
              {showRetry && (
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={retryLastPrompt}
                    disabled={busy}
                    className="rounded-md border border-accent-500 bg-accent-500/20 px-3 py-1 text-xs font-medium text-accent-500 hover:bg-accent-500 hover:text-ink-950 disabled:opacity-50"
                  >
                    ↻ Retry same prompt
                  </button>
                  <p className="self-center text-[10px] text-red-300/60">
                    (Often a transient Gemini overload — usually works on retry.)
                  </p>
                </div>
              )}
            </div>
          )
        })}
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
        <div className="relative">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                send(input)
              }
            }}
            placeholder={
              recording
                ? '🔴 Recording — speak naturally. Click the mic again to stop.'
                : 'Type or tap the mic to speak... (Cmd/Ctrl+Enter to send)'
            }
            rows={3}
            className="input resize-none pr-12"
            readOnly={recording}
          />
          {speechSupported && (
            <button
              type="button"
              onClick={recording ? stopVoice : startVoice}
              className={clsx(
                'absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full border transition',
                recording
                  ? 'border-red-500 bg-red-500/20 text-red-400 recording-pulse'
                  : 'border-ink-700 bg-ink-900 text-ink-300 hover:border-accent-500 hover:text-accent-500',
              )}
              title={recording ? 'Stop recording' : 'Tap to dictate'}
              aria-label={recording ? 'Stop recording' : 'Start voice dictation'}
            >
              {recording ? '■' : '🎤'}
            </button>
          )}
        </div>
        {voiceError && (
          <p className="mt-1 text-[10px] text-red-400">⚠ {voiceError}</p>
        )}
        {!speechSupported && (
          <p className="mt-1 text-[10px] text-ink-500">
            Voice input needs Chrome/Edge — Safari/Firefox can still type.
          </p>
        )}
        <div className="mt-2 flex items-center justify-between">
          <p className="text-[10px] text-ink-500">
            {recording && interimTranscript ? `…${interimTranscript.slice(-40)}` : '⌘/Ctrl + Enter to send'}
          </p>
          <button onClick={() => send(input)} className="btn-primary" disabled={!input.trim() || busy}>
            Send
          </button>
        </div>
      </div>
    </div>
  )
}

function formatCraftResponse(parsed: {
  analysis?: string
  options?: { label: string; text: string; tradeoff: string }[]
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
