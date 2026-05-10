import { useEffect, useRef, useState } from 'react'
import { useApp } from '@/state/store'
import { VoiceCapture, isSpeechRecognitionSupported } from '@/lib/voice'
import { runCaptureAgent, type CaptureSummary } from '@/lib/agents'
import { Bible, Audio } from '@/lib/data'
import { supabase } from '@/lib/supabase'
import { uuid, clsx, relativeTime } from '@/lib/util'
import type { BibleCategory } from '@/types'

type Phase = 'idle' | 'recording' | 'summarizing' | 'awaiting_approval' | 'error'

interface EditableBullet {
  id: string
  text: string
  subject: string
  approved: boolean
  scope: 'character' | 'location' | 'scene' | 'plot' | 'world' | 'theme' | 'research' | 'note'
}

export default function CapturePage() {
  const projectId = useApp((s) => s.currentProjectId)
  const createFirstProject = useApp((s) => s.createFirstProject)
  const [phase, setPhase] = useState<Phase>('idle')
  const [transcript, setTranscript] = useState('')
  const [interim, setInterim] = useState('')
  const [summary, setSummary] = useState<CaptureSummary | null>(null)
  const [bullets, setBullets] = useState<EditableBullet[]>([])
  const [error, setError] = useState<string | null>(null)
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null)
  const captureRef = useRef<VoiceCapture | null>(null)

  const ensureProject = async (): Promise<string | null> => {
    if (projectId) return projectId
    try {
      return await createFirstProject()
    } catch (e) {
      setError(`Couldn't create initial project: ${e instanceof Error ? e.message : String(e)}`)
      return null
    }
  }

  const handleStart = async () => {
    const pid = await ensureProject()
    if (!pid) return
    setError(null)
    setTranscript('')
    setInterim('')
    setSummary(null)
    setBullets([])

    const cap = new VoiceCapture({
      onPartialTranscript: (i, finalSoFar) => {
        setInterim(i)
        setTranscript(finalSoFar)
      },
      onAutoSave: async (transcriptSoFar, blob) => {
        if (blob && transcriptSoFar) {
          // Best-effort cloud auto-save every 10s
          try {
            await Audio.upload(pid, blob, `captures/${Date.now()}-partial.webm`)
            setLastSavedAt(Date.now())
          } catch {
            // Offline — fine, we still have the in-memory transcript
          }
        }
      },
      onError: (err) => setError(err.message),
      onEnd: () => {},
    })
    captureRef.current = cap
    await cap.start()
    setPhase('recording')
  }

  const handleStop = async () => {
    if (!captureRef.current || !projectId) return
    const { transcript: finalT, blob } = await captureRef.current.stop()
    setTranscript(finalT)
    setInterim('')
    captureRef.current = null

    if (!finalT && !blob) {
      setPhase('idle')
      return
    }

    if (blob) {
      try {
        await Audio.upload(projectId, blob, `captures/${Date.now()}-final.webm`)
      } catch {
        // ok
      }
    }

    if (!finalT.trim()) {
      setError(
        "No transcript captured. If your browser doesn't support Web Speech (Firefox/Safari), paste a transcript below and click \"Summarize text\".",
      )
      setPhase('idle')
      return
    }

    setPhase('summarizing')
    try {
      const s = await runCaptureAgent(projectId, finalT)
      summarizeIntoBullets(s)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setPhase('error')
    }
  }

  const summarizeIntoBullets = (s: CaptureSummary) => {
    setSummary(s)
    const flat: EditableBullet[] = []
    for (const b of s.bullets ?? []) {
      flat.push({
        id: uuid(),
        text: b.text,
        subject: b.subject || '',
        approved: false,
        scope: (b.category as EditableBullet['scope']) ?? 'note',
      })
    }
    for (const cand of s.bible_candidates ?? []) {
      flat.push({
        id: uuid(),
        text: `${cand.subject}: ${cand.decision}`,
        subject: cand.subject,
        approved: false,
        scope: (cand.category as EditableBullet['scope']) ?? 'note',
      })
    }
    for (const q of s.open_questions ?? []) {
      flat.push({
        id: uuid(),
        text: `? ${q}`,
        subject: '',
        approved: false,
        scope: 'note',
      })
    }
    setBullets(flat)
    setPhase('awaiting_approval')
  }

  const handleSummarizeText = async () => {
    if (!projectId || !transcript.trim()) return
    setPhase('summarizing')
    setError(null)
    try {
      const s = await runCaptureAgent(projectId, transcript)
      summarizeIntoBullets(s)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setPhase('error')
    }
  }

  const toggleBullet = (id: string) =>
    setBullets((bs) => bs.map((b) => (b.id === id ? { ...b, approved: !b.approved } : b)))
  const editBullet = (id: string, text: string) =>
    setBullets((bs) => bs.map((b) => (b.id === id ? { ...b, text } : b)))
  const removeBullet = (id: string) => setBullets((bs) => bs.filter((b) => b.id !== id))

  const handleApproveAll = async () => {
    if (!projectId) return
    const toFile = bullets.filter((b) => b.approved)
    for (const b of toFile) {
      const category: BibleCategory =
        b.scope === 'character'
          ? 'character'
          : b.scope === 'location'
            ? 'location'
            : b.scope === 'theme'
              ? 'theme'
              : b.scope === 'world'
                ? 'rule'
                : 'plot'
      const subject = b.subject || b.text.split(/[—:]/)[0].slice(0, 60)
      try {
        await Bible.create({
          projectId,
          category,
          subject,
          decision: b.text,
        })
      } catch (e) {
        console.warn('Failed to create bible record', e)
      }
    }
    setPhase('idle')
    setTranscript('')
    setSummary(null)
    setBullets([])
  }

  const handleDiscard = () => {
    setPhase('idle')
    setTranscript('')
    setSummary(null)
    setBullets([])
  }

  useEffect(() => () => void captureRef.current?.stop(), [])

  const speechSupported = isSpeechRecognitionSupported()

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-ink-100">Capture</h1>
        <p className="mt-1 text-sm text-ink-400">
          Talk freely. The app transcribes live, auto-saves to the cloud every 10 seconds, and returns
          a bulleted summary you can approve in one tap.
        </p>
      </header>

      <div className="card mb-6 flex flex-col items-center gap-4 py-8">
        {phase === 'idle' && (
          <>
            <button
              onClick={handleStart}
              className="flex h-24 w-24 items-center justify-center rounded-full bg-accent-500 text-4xl text-ink-950 shadow-lg hover:bg-accent-600 transition"
              aria-label="Start recording"
            >
              🎙️
            </button>
            <p className="text-sm text-ink-400">Tap to start talking</p>
            {!speechSupported && (
              <p className="text-xs text-yellow-400">
                Live transcription works best in Chrome/Edge. Firefox/Safari will record audio only.
              </p>
            )}
          </>
        )}
        {phase === 'recording' && (
          <>
            <button
              onClick={handleStop}
              className="flex h-24 w-24 items-center justify-center rounded-full bg-red-500 text-4xl text-ink-950 shadow-lg hover:bg-red-600 transition recording-pulse"
              aria-label="Stop recording"
            >
              ⏸
            </button>
            <p className="text-sm text-red-400">Recording — tap to stop</p>
            {lastSavedAt && (
              <p className="text-[10px] uppercase tracking-wider text-ink-500">
                last cloud save {relativeTime(lastSavedAt)}
              </p>
            )}
          </>
        )}
        {phase === 'summarizing' && (
          <>
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-ink-800 text-4xl">⏳</div>
            <p className="text-sm text-ink-300">Summarizing…</p>
          </>
        )}
        {phase === 'error' && (
          <>
            <div className="text-4xl">⚠️</div>
            <p className="text-sm text-red-400">{error}</p>
            <button className="btn-secondary" onClick={() => setPhase('idle')}>
              Try again
            </button>
          </>
        )}
      </div>

      {(phase === 'recording' || transcript) && phase !== 'awaiting_approval' && (
        <div className="card mb-6">
          <div className="label">Transcript</div>
          <textarea
            className="input min-h-32 resize-y font-serif text-base leading-relaxed"
            value={transcript + (interim ? ' ' + interim : '')}
            onChange={(e) => setTranscript(e.target.value)}
            placeholder="Speak or paste your raw idea here..."
            readOnly={phase === 'recording'}
          />
          {phase === 'idle' && transcript.trim() && (
            <button onClick={handleSummarizeText} className="btn-primary mt-3">
              Summarize text →
            </button>
          )}
        </div>
      )}

      {phase === 'awaiting_approval' && summary && (
        <div className="card mb-6">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-medium text-ink-100">Approve the capture</h2>
              <p className="text-xs text-ink-400">
                Tap a bullet to toggle approval. Edit text inline. Tap the X to drop.
              </p>
            </div>
            <div className="text-[10px] uppercase tracking-wider text-ink-500">
              {bullets.filter((b) => b.approved).length} / {bullets.length} approved
            </div>
          </div>

          {summary.summary && (
            <div className="mb-3 rounded-md border border-accent-500/30 bg-accent-500/5 p-3">
              <div className="label text-accent-500">Summary</div>
              <p className="text-sm text-ink-100">{summary.summary}</p>
            </div>
          )}

          <ul className="space-y-2">
            {bullets.map((b) => (
              <li
                key={b.id}
                className={clsx(
                  'flex items-start gap-3 rounded-md border p-3',
                  b.approved ? 'border-green-700/50 bg-green-900/10' : 'border-ink-700 bg-ink-900/40',
                )}
              >
                <button
                  onClick={() => toggleBullet(b.id)}
                  className={clsx(
                    'mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border',
                    b.approved ? 'border-green-500 bg-green-500 text-ink-950' : 'border-ink-600',
                  )}
                  aria-label="Toggle approval"
                >
                  {b.approved && '✓'}
                </button>
                <select
                  value={b.scope}
                  onChange={(e) =>
                    setBullets((bs) =>
                      bs.map((x) =>
                        x.id === b.id ? { ...x, scope: e.target.value as EditableBullet['scope'] } : x,
                      ),
                    )
                  }
                  className="rounded border border-ink-700 bg-ink-900 px-2 py-0.5 text-xs"
                >
                  <option value="character">Character</option>
                  <option value="location">Location</option>
                  <option value="scene">Scene</option>
                  <option value="plot">Plot</option>
                  <option value="world">World rule</option>
                  <option value="theme">Theme</option>
                  <option value="research">Research</option>
                  <option value="note">Note</option>
                </select>
                <textarea
                  value={b.text}
                  onChange={(e) => editBullet(b.id, e.target.value)}
                  className="flex-1 resize-none bg-transparent text-sm text-ink-100 focus:outline-none"
                  rows={Math.max(1, Math.ceil(b.text.length / 70))}
                />
                <button onClick={() => removeBullet(b.id)} className="text-ink-500 hover:text-red-400">
                  ✕
                </button>
              </li>
            ))}
          </ul>

          <div className="mt-4 flex gap-2">
            <button onClick={handleApproveAll} className="btn-primary">
              ✓ Approve and file
            </button>
            <button onClick={handleStart} className="btn-secondary">
              🎤 Add more
            </button>
            <button onClick={handleDiscard} className="btn-ghost ml-auto text-red-400">
              Discard
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// Keep this module aware of supabase to avoid tree-shaking dropping the import
void supabase
