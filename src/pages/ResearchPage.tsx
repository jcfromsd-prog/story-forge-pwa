import { useEffect, useState } from 'react'
import { Research } from '@/lib/data'
import { useApp } from '@/state/store'
import { formatTimestamp } from '@/lib/util'
import type { ResearchItem } from '@/types'

export default function ResearchPage() {
  const projectId = useApp((s) => s.currentProjectId)
  const [items, setItems] = useState<ResearchItem[]>([])
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [tagsRaw, setTagsRaw] = useState('')
  const [sourceUrl, setSourceUrl] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    if (!projectId) {
      setItems([])
      return
    }
    Research.list(projectId).then(setItems).catch(console.error)
  }, [projectId, reloadKey])

  const addNote = async () => {
    if (!projectId || !content.trim()) return
    await Research.create({
      projectId,
      type: sourceUrl ? 'url' : 'note',
      title: title.trim() || content.slice(0, 60),
      content: content.trim(),
      sourceUrl: sourceUrl.trim() || undefined,
      tags: tagsRaw.split(',').map((t) => t.trim()).filter(Boolean),
    })
    setTitle('')
    setContent('')
    setTagsRaw('')
    setSourceUrl('')
    setReloadKey((k) => k + 1)
  }

  const handleFile = async (file: File) => {
    if (!projectId) return
    const text = await file.text().catch(() => '')
    await Research.create({
      projectId,
      type: file.type === 'application/pdf' ? 'pdf' : 'article',
      title: file.name,
      content: text || `(binary file — ${file.size} bytes)`,
      tags: [],
    })
    setReloadKey((k) => k + 1)
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-ink-100">Research Library</h1>
        <p className="mt-1 text-sm text-ink-400">
          Drop in articles, notes, links. Synced to Supabase.
        </p>
      </header>

      <div
        className="card mb-6 border-dashed"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault()
          for (const f of Array.from(e.dataTransfer.files)) handleFile(f)
        }}
      >
        <p className="mb-2 text-xs text-ink-400">Drop files here, or:</p>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title (optional)" className="input mb-2" />
        <input value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} placeholder="Source URL (optional)" className="input mb-2" />
        <input value={tagsRaw} onChange={(e) => setTagsRaw(e.target.value)} placeholder="Tags (comma-separated)" className="input mb-2" />
        <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Paste your note, article excerpt, or quote..." rows={5} className="input" />
        <button onClick={addNote} disabled={!content.trim()} className="btn-primary mt-2">
          Add to library
        </button>
      </div>

      {items.length > 0 ? (
        <ul className="space-y-2">
          {items.map((it) => (
            <li key={it.id} className="card">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="chip bg-ink-800 text-ink-300">{it.type}</span>
                    <h3 className="font-medium text-ink-100">{it.title}</h3>
                  </div>
                  {it.sourceUrl && (
                    <a href={it.sourceUrl} target="_blank" rel="noreferrer" className="text-xs text-accent-500 hover:underline">
                      {it.sourceUrl}
                    </a>
                  )}
                  <p className="mt-2 line-clamp-3 text-sm text-ink-300">{it.content}</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {it.tags.map((t) => (
                      <span key={t} className="chip bg-ink-800 text-ink-400">
                        #{t}
                      </span>
                    ))}
                  </div>
                </div>
                <button
                  onClick={async () => {
                    await Research.delete(it.id)
                    setReloadKey((k) => k + 1)
                  }}
                  className="text-ink-500 hover:text-red-400"
                >
                  ✕
                </button>
              </div>
              <p className="mt-2 text-[10px] text-ink-500">{formatTimestamp(it.createdAt)}</p>
            </li>
          ))}
        </ul>
      ) : (
        <div className="card text-center text-sm text-ink-500">No research items yet.</div>
      )}
    </div>
  )
}
