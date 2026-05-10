import { useEffect, useMemo, useState } from 'react'
import { Bible } from '@/lib/data'
import { useApp } from '@/state/store'
import { lockRecord } from '@/lib/bible'
import { clsx, formatTimestamp } from '@/lib/util'
import type { BibleCategory, BibleRecord } from '@/types'

const CATEGORIES: { value: BibleCategory; label: string; icon: string }[] = [
  { value: 'character', label: 'Characters', icon: '👤' },
  { value: 'location', label: 'Locations', icon: '📍' },
  { value: 'technology', label: 'Technology', icon: '⚙️' },
  { value: 'plot', label: 'Plot Points', icon: '📍' },
  { value: 'timeline', label: 'Timeline', icon: '🕐' },
  { value: 'rule', label: 'Rules', icon: '📏' },
  { value: 'theme', label: 'Themes', icon: '✨' },
]

export default function BiblePage() {
  const projectId = useApp((s) => s.currentProjectId)
  const [category, setCategory] = useState<BibleCategory>('character')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [records, setRecords] = useState<BibleRecord[]>([])
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    if (!projectId) {
      setRecords([])
      return
    }
    Bible.list(projectId, category).then(setRecords).catch(console.error)
  }, [projectId, category, reloadKey])

  const filtered = useMemo(() => {
    if (!search.trim()) return records
    const q = search.toLowerCase()
    return records.filter(
      (r) =>
        r.subject.toLowerCase().includes(q) ||
        r.decision.toLowerCase().includes(q) ||
        r.negativeConstraints.some((n) => n.toLowerCase().includes(q)),
    )
  }, [records, search])

  const selected = filtered.find((r) => r.id === selectedId) ?? null

  const handleCreate = async () => {
    if (!projectId) return
    const created = await Bible.create({
      projectId,
      category,
      subject: 'New record',
      decision: '',
    })
    setSelectedId(created.id)
    setReloadKey((k) => k + 1)
  }

  return (
    <div className="flex h-full">
      <div className="w-44 flex-shrink-0 border-r border-ink-800 bg-ink-900/40 p-3">
        <div className="label mb-2">Categories</div>
        {CATEGORIES.map((c) => (
          <button
            key={c.value}
            onClick={() => {
              setCategory(c.value)
              setSelectedId(null)
            }}
            className={clsx(
              'mb-1 flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-sm transition',
              category === c.value
                ? 'bg-ink-800 text-ink-100'
                : 'text-ink-400 hover:bg-ink-800/50 hover:text-ink-100',
            )}
          >
            <span>{c.icon}</span>
            <span>{c.label}</span>
          </button>
        ))}
      </div>

      <div className="flex w-72 flex-shrink-0 flex-col border-r border-ink-800 bg-ink-900/20">
        <div className="border-b border-ink-800 p-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Search ${CATEGORIES.find((c) => c.value === category)?.label.toLowerCase()}...`}
            className="input"
          />
          <button onClick={handleCreate} className="btn-secondary mt-2 w-full">
            + New {category}
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {filtered.length === 0 && (
            <div className="px-2 py-6 text-center text-xs text-ink-500">
              No {category} records yet.
            </div>
          )}
          {filtered.map((r) => (
            <button
              key={r.id}
              onClick={() => setSelectedId(r.id)}
              className={clsx(
                'mb-1 block w-full rounded-md p-2.5 text-left transition',
                selectedId === r.id ? 'bg-ink-800' : 'hover:bg-ink-800/50',
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-medium text-ink-100">{r.subject}</span>
                {r.locked && (
                  <span className="chip flex-shrink-0 bg-accent-500/20 text-accent-500">🔒</span>
                )}
              </div>
              <p className="mt-1 line-clamp-2 text-xs text-ink-400">{r.decision || '(no decision yet)'}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="min-w-0 flex-1 overflow-y-auto p-6">
        {!selected ? (
          <div className="flex h-full items-center justify-center text-ink-500">
            <div className="text-center">
              <div className="mb-2 text-4xl">📖</div>
              <p>Select a record to view or edit</p>
              <p className="mt-1 text-xs">
                Locked records get injected into every AI prompt server-side.
              </p>
            </div>
          </div>
        ) : (
          <BibleRecordEditor
            record={selected}
            onSaved={() => setReloadKey((k) => k + 1)}
            onDeleted={() => {
              setSelectedId(null)
              setReloadKey((k) => k + 1)
            }}
          />
        )}
      </div>
    </div>
  )
}

function BibleRecordEditor({
  record,
  onSaved,
  onDeleted,
}: {
  record: BibleRecord
  onSaved: () => void
  onDeleted: () => void
}) {
  const [subject, setSubject] = useState(record.subject)
  const [decision, setDecision] = useState(record.decision)
  const [reason, setReason] = useState(record.reason ?? '')
  const [negativeRaw, setNegativeRaw] = useState(record.negativeConstraints.join('\n'))
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    setSubject(record.subject)
    setDecision(record.decision)
    setReason(record.reason ?? '')
    setNegativeRaw(record.negativeConstraints.join('\n'))
    setDirty(false)
  }, [record.id])

  const save = async () => {
    const negativeConstraints = negativeRaw
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean)
    await Bible.update(record.id, {
      subject,
      decision,
      reason,
      negativeConstraints,
    })
    setDirty(false)
    onSaved()
  }

  const remove = async () => {
    if (confirm(`Delete "${record.subject}"?`)) {
      await Bible.delete(record.id)
      onDeleted()
    }
  }

  const handleLock = async () => {
    await lockRecord(record.id, !record.locked)
    onSaved()
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 flex items-center justify-between gap-3">
        <input
          value={subject}
          onChange={(e) => {
            setSubject(e.target.value)
            setDirty(true)
          }}
          className="flex-1 border-0 bg-transparent text-2xl font-semibold text-ink-100 focus:outline-none"
        />
        <button
          onClick={handleLock}
          className={clsx('btn', record.locked ? 'bg-accent-500 text-ink-950' : 'bg-ink-800 text-ink-200')}
        >
          {record.locked ? '🔒 Locked' : '🔓 Unlocked'}
        </button>
      </div>

      <div className="mb-4">
        <label className="label">Decision</label>
        <textarea
          value={decision}
          onChange={(e) => {
            setDecision(e.target.value)
            setDirty(true)
          }}
          rows={4}
          className="input"
        />
      </div>

      <div className="mb-4">
        <label className="label">Negative constraints (one per line)</label>
        <textarea
          value={negativeRaw}
          onChange={(e) => {
            setNegativeRaw(e.target.value)
            setDirty(true)
          }}
          rows={3}
          className="input font-mono text-xs"
          placeholder="Does NOT survive&#10;NOT Spokane"
        />
      </div>

      <div className="mb-4">
        <label className="label">Reason / source</label>
        <input
          value={reason}
          onChange={(e) => {
            setReason(e.target.value)
            setDirty(true)
          }}
          className="input"
        />
      </div>

      <div className="mt-6 flex items-center justify-between">
        <div className="text-xs text-ink-500">
          {record.lockedAt && <span>Locked {formatTimestamp(record.lockedAt)} · </span>}
          Updated {formatTimestamp(record.updatedAt)}
        </div>
        <div className="flex gap-2">
          <button onClick={remove} className="btn-danger">
            Delete
          </button>
          <button onClick={save} className="btn-primary" disabled={!dirty}>
            {dirty ? 'Save' : 'Saved'}
          </button>
        </div>
      </div>
    </div>
  )
}
