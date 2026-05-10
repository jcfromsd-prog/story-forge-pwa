import { useEffect, useRef, useState } from 'react'
import { useApp } from '@/state/store'
import { autoSnapshot, getLatestVersion } from '@/lib/versions'
import { parseChapters, wordCount, readingMinutes, screenplayPages, relativeTime } from '@/lib/util'
import ChatPanel from '@/components/ChatPanel'

const PASS_TYPES = [
  'Prose Tic Cleanup',
  'Rhythm Variation',
  'Interiority Pass',
  'Tonal Continuity',
  'V12 Deep-Tissue Polish',
  'Dialogue Authenticity',
  'Sensory Grounding',
  'Foreshadowing Audit',
] as const

export default function EditorPage() {
  const projectId = useApp((s) => s.currentProjectId)
  const createFirstProject = useApp((s) => s.createFirstProject)
  const [content, setContent] = useState('')
  const [lastSaved, setLastSaved] = useState<number | null>(null)
  const [selectedText, setSelectedText] = useState<string>('')
  const [dirty, setDirty] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const autosaveTimer = useRef<number | null>(null)

  useEffect(() => {
    if (!projectId) {
      setContent('# Chapter 1\n\n')
      return
    }
    getLatestVersion(projectId).then((v) => {
      if (v) {
        setContent(v.content)
        setLastSaved(v.createdAt)
      } else {
        setContent('# Chapter 1\n\n')
      }
      setDirty(false)
    })
  }, [projectId])

  useEffect(() => {
    if (!projectId || !dirty) return
    if (autosaveTimer.current) window.clearTimeout(autosaveTimer.current)
    autosaveTimer.current = window.setTimeout(async () => {
      const v = await autoSnapshot(projectId, content)
      if (v) setLastSaved(v.createdAt)
      setDirty(false)
    }, 30000)
    return () => {
      if (autosaveTimer.current) window.clearTimeout(autosaveTimer.current)
    }
  }, [content, projectId, dirty])

  const handleManualSave = async () => {
    let pid = projectId
    if (!pid) {
      try {
        pid = await createFirstProject()
      } catch (e) {
        alert(`Couldn't create initial project: ${e instanceof Error ? e.message : String(e)}`)
        return
      }
    }
    const v = await autoSnapshot(pid, content)
    if (v) setLastSaved(v.createdAt)
    setDirty(false)
  }

  const handleSelect = () => {
    const ta = textareaRef.current
    if (!ta) return
    const text = ta.value.substring(ta.selectionStart, ta.selectionEnd)
    if (text.trim().length > 0) setSelectedText(text)
  }

  const handleRunPass = (pass: string) => {
    setSelectedText(`Run a "${pass}" revision pass on the selected text. Return 2-3 alternative versions.`)
  }

  const chapters = parseChapters(content)
  const totalWords = wordCount(content)

  return (
    <div className="flex h-full">
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ink-800 bg-ink-900/40 px-4 py-2 text-xs">
          <div className="flex items-center gap-4">
            <span className="font-medium text-ink-200">{totalWords.toLocaleString()} words</span>
            <span className="text-ink-500">·</span>
            <span className="text-ink-400">{readingMinutes(content)} min read</span>
            <span className="text-ink-500">·</span>
            <span className="text-ink-400">~{screenplayPages(content)} screenplay pages</span>
            <span className="text-ink-500">·</span>
            <span className="text-ink-400">{chapters.length} chapters</span>
          </div>
          <div className="flex items-center gap-2">
            <select
              onChange={(e) => e.target.value && handleRunPass(e.target.value)}
              defaultValue=""
              className="rounded border border-ink-700 bg-ink-900 px-2 py-1 text-xs"
            >
              <option value="">Run Revision Pass…</option>
              {PASS_TYPES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            <button onClick={() => setSelectedText(selectedText || '')} className="btn-secondary">
              Get options for selection
            </button>
            <button onClick={handleManualSave} className="btn-primary" disabled={!dirty}>
              {dirty ? 'Save snapshot' : 'Saved'}
            </button>
          </div>
        </div>

        {chapters.length > 0 && (
          <div className="flex items-end gap-px overflow-x-auto border-b border-ink-800 bg-ink-900/20 px-4 py-2">
            {chapters.map((ch) => {
              const w = wordCount(ch.body)
              const max = Math.max(...chapters.map((c) => wordCount(c.body)), 1)
              const h = Math.max(4, Math.round((w / max) * 28))
              return (
                <div key={ch.index} className="group relative flex flex-col items-center">
                  <div
                    style={{ height: `${h}px` }}
                    className="w-3 rounded-t bg-accent-500/40 group-hover:bg-accent-500 transition"
                  />
                  <div className="absolute -bottom-6 hidden whitespace-nowrap rounded bg-ink-800 px-1.5 py-0.5 text-[10px] text-ink-200 group-hover:block">
                    Ch {ch.index} · {w} w
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => {
            setContent(e.target.value)
            setDirty(true)
          }}
          onSelect={handleSelect}
          spellCheck
          className="min-h-0 flex-1 resize-none bg-ink-950 px-12 py-8 font-serif text-base leading-relaxed text-ink-100 focus:outline-none"
          placeholder="# Chapter 1&#10;&#10;Start writing..."
        />

        <div className="flex items-center justify-between border-t border-ink-800 bg-ink-900/40 px-4 py-1.5 text-xs text-ink-500">
          <span>
            {dirty ? '● Unsaved changes' : '✓ All changes saved to cloud'}
            {lastSaved && ` · last snapshot ${relativeTime(lastSaved)}`}
          </span>
          <span className="font-mono">
            {selectedText ? `${wordCount(selectedText)} words selected` : 'no selection'}
          </span>
        </div>
      </div>

      <div className="w-96 flex-shrink-0 border-l border-ink-800 bg-ink-900/30">
        <ChatPanel selectedPassage={selectedText} onClearSelection={() => setSelectedText('')} />
      </div>
    </div>
  )
}
