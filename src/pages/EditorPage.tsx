import { useEffect, useRef, useState, useCallback } from 'react'
import { useApp } from '@/state/store'
import { autoSnapshot, getLatestVersion } from '@/lib/versions'
import { importManuscript } from '@/lib/import'
import { parseChapters, wordCount, readingMinutes, screenplayPages, relativeTime } from '@/lib/util'
import ChatPanel from '@/components/ChatPanel'

const CHAT_WIDTH_KEY = 'sf:chatPanelWidth'
const DEFAULT_CHAT_WIDTH = 384
const MIN_CHAT_WIDTH = 280
const MAX_CHAT_WIDTH = 900

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
  const [importBusy, setImportBusy] = useState(false)
  const [importMsg, setImportMsg] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const autosaveTimer = useRef<number | null>(null)

  // Resizable chat panel
  const [chatWidth, setChatWidth] = useState<number>(() => {
    const stored = Number(localStorage.getItem(CHAT_WIDTH_KEY))
    return stored && stored >= MIN_CHAT_WIDTH && stored <= MAX_CHAT_WIDTH ? stored : DEFAULT_CHAT_WIDTH
  })
  const [dragging, setDragging] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const startResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setDragging(true)
  }, [])

  useEffect(() => {
    if (!dragging) return
    const onMove = (e: MouseEvent) => {
      if (!containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const newWidth = rect.right - e.clientX
      const clamped = Math.max(MIN_CHAT_WIDTH, Math.min(MAX_CHAT_WIDTH, newWidth))
      setChatWidth(clamped)
    }
    const onUp = () => {
      setDragging(false)
      localStorage.setItem(CHAT_WIDTH_KEY, String(chatWidth))
    }
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [dragging, chatWidth])

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

  const handleImportClick = () => fileInputRef.current?.click()

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImportBusy(true)
    setImportMsg(null)
    try {
      const result = await importManuscript(file)
      const replace = !content.trim() || content.trim() === '# Chapter 1' || confirm(
        `This will replace the current manuscript with "${file.name}" (${result.words.toLocaleString()} words, ${result.chapters} chapter${result.chapters === 1 ? '' : 's'} detected). Continue?`,
      )
      if (!replace) {
        setImportBusy(false)
        return
      }
      setContent(result.content)
      setDirty(true)
      const warnings = result.warnings.length ? ' · ' + result.warnings.join(' ') : ''
      setImportMsg(
        `✓ Imported ${file.name} — ${result.words.toLocaleString()} words, ${result.chapters} chapter${result.chapters === 1 ? '' : 's'}.${warnings} Click "Save snapshot" to commit.`,
      )
    } catch (err) {
      setImportMsg(`Import failed: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setImportBusy(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const chapters = parseChapters(content)
  const totalWords = wordCount(content)

  return (
    <div ref={containerRef} className="flex h-full">
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
            <input
              ref={fileInputRef}
              type="file"
              accept=".docx,.txt,.md,.markdown,.fountain,.fdx"
              onChange={handleImportFile}
              className="hidden"
            />
            <button
              onClick={handleImportClick}
              className="btn-secondary"
              disabled={importBusy}
              title="Import a .docx, .txt, .md, or .fountain manuscript file"
            >
              {importBusy ? 'Importing…' : '＋ Import file'}
            </button>
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

        {importMsg && (
          <div
            className={`border-b px-4 py-2 text-xs ${
              importMsg.startsWith('✓')
                ? 'border-green-700 bg-green-900/20 text-green-200'
                : 'border-red-700 bg-red-900/20 text-red-200'
            }`}
          >
            {importMsg}
            <button
              onClick={() => setImportMsg(null)}
              className="float-right text-ink-500 hover:text-ink-200"
            >
              ✕
            </button>
          </div>
        )}

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

      {/* Drag handle */}
      <div
        onMouseDown={startResize}
        onDoubleClick={() => {
          setChatWidth(DEFAULT_CHAT_WIDTH)
          localStorage.setItem(CHAT_WIDTH_KEY, String(DEFAULT_CHAT_WIDTH))
        }}
        className={`group relative flex-shrink-0 cursor-col-resize border-l border-r border-ink-800 transition-colors ${
          dragging ? 'border-accent-500 bg-accent-500/20' : 'hover:bg-accent-500/10'
        }`}
        style={{ width: 6 }}
        title="Drag to resize · double-click to reset"
      >
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded bg-ink-700 px-0.5 py-3 text-[8px] text-ink-400 opacity-0 group-hover:opacity-100">
          ⇔
        </div>
      </div>

      <div
        className="flex-shrink-0 bg-ink-900/30"
        style={{ width: chatWidth }}
      >
        <ChatPanel selectedPassage={selectedText} onClearSelection={() => setSelectedText('')} />
      </div>
    </div>
  )
}
