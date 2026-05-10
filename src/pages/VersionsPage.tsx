import { useEffect, useMemo, useState } from 'react'
import * as Diff from 'diff'
import { Versions } from '@/lib/data'
import { snapshotVersion } from '@/lib/versions'
import { useApp } from '@/state/store'
import { clsx, formatTimestamp, relativeTime } from '@/lib/util'
import type { Version } from '@/types'

export default function VersionsPage() {
  const projectId = useApp((s) => s.currentProjectId)
  const [versions, setVersions] = useState<Version[]>([])
  const [leftId, setLeftId] = useState<string | null>(null)
  const [rightId, setRightId] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    if (!projectId) {
      setVersions([])
      return
    }
    Versions.list(projectId).then(setVersions).catch(console.error)
  }, [projectId, reloadKey])

  const left = versions.find((v) => v.id === leftId) ?? null
  const right = versions.find((v) => v.id === rightId) ?? null

  const diff = useMemo(() => {
    if (!left || !right) return null
    return Diff.diffWords(left.content, right.content)
  }, [left, right])

  const handleBranch = async (v: Version) => {
    if (!projectId) return
    if (!confirm(`Branch a new version from "${v.title}"?`)) return
    await snapshotVersion({
      projectId,
      parentId: v.id,
      content: v.content,
      branchName: `branch-from-${v.id.slice(0, 6)}`,
      changeSummary: `Branched from "${v.title}"`,
    })
    setReloadKey((k) => k + 1)
  }

  const handleTag = async (v: Version) => {
    const tag = prompt('Tag for this version', v.tag ?? '')
    if (tag === null) return
    await Versions.tag(v.id, tag.trim() || null)
    setReloadKey((k) => k + 1)
  }

  const branchColors: Record<string, string> = {}
  versions.forEach((v) => {
    if (!(v.branchName in branchColors)) {
      const palette = ['#f59e0b', '#3b82f6', '#10b981', '#a855f7', '#ec4899', '#f97316']
      branchColors[v.branchName] = palette[Object.keys(branchColors).length % palette.length]
    }
  })

  return (
    <div className="flex h-full">
      <div className="flex w-80 flex-shrink-0 flex-col border-r border-ink-800">
        <div className="border-b border-ink-800 p-3">
          <h2 className="text-sm font-medium text-ink-100">Versions</h2>
          <p className="text-[10px] text-ink-500">Pick two to diff.</p>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {versions.length === 0 && (
            <div className="px-2 py-6 text-center text-xs text-ink-500">
              No versions yet. Write something and save a snapshot.
            </div>
          )}
          {versions.map((v) => (
            <div
              key={v.id}
              className={clsx(
                'mb-2 rounded-md border bg-ink-900/40 p-3 transition',
                leftId === v.id || rightId === v.id ? 'border-accent-500' : 'border-ink-800 hover:border-ink-700',
              )}
            >
              <div className="mb-1 flex items-center justify-between gap-2">
                <span
                  className="chip"
                  style={{
                    backgroundColor: branchColors[v.branchName] + '33',
                    color: branchColors[v.branchName],
                  }}
                >
                  {v.branchName}
                </span>
                {v.tag && <span className="chip bg-accent-500/20 text-accent-500">🏷 {v.tag}</span>}
              </div>
              <h3 className="text-sm font-medium text-ink-100">{v.title}</h3>
              <p className="mt-1 text-[10px] text-ink-500">
                {v.wordCount.toLocaleString()} words · {relativeTime(v.createdAt)}
              </p>
              {v.changeSummary && <p className="mt-1 text-[10px] italic text-ink-400">{v.changeSummary}</p>}
              <div className="mt-2 flex flex-wrap gap-1">
                <button
                  onClick={() => setLeftId(leftId === v.id ? null : v.id)}
                  className={clsx(
                    'btn px-2 py-0.5 text-[10px]',
                    leftId === v.id ? 'bg-accent-500 text-ink-950' : 'bg-ink-800',
                  )}
                >
                  A
                </button>
                <button
                  onClick={() => setRightId(rightId === v.id ? null : v.id)}
                  className={clsx(
                    'btn px-2 py-0.5 text-[10px]',
                    rightId === v.id ? 'bg-accent-500 text-ink-950' : 'bg-ink-800',
                  )}
                >
                  B
                </button>
                <button onClick={() => handleTag(v)} className="btn-ghost px-2 py-0.5 text-[10px]">
                  Tag
                </button>
                <button onClick={() => handleBranch(v)} className="btn-ghost px-2 py-0.5 text-[10px]">
                  Branch
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="min-w-0 flex-1 overflow-y-auto p-6">
        {!left && !right && (
          <div className="flex h-full items-center justify-center text-ink-500">
            <div className="text-center">
              <div className="mb-2 text-4xl">🌳</div>
              <p>Select up to two versions to compare</p>
            </div>
          </div>
        )}
        {left && !right && <SingleVersionView v={left} />}
        {!left && right && <SingleVersionView v={right} />}
        {left && right && diff && (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-medium">Diff: {left.title} → {right.title}</h2>
                <p className="text-xs text-ink-500">
                  {formatTimestamp(left.createdAt)} vs {formatTimestamp(right.createdAt)}
                </p>
              </div>
            </div>
            <div className="font-serif text-base leading-relaxed">
              {diff.map((part, i) => (
                <span
                  key={i}
                  className={clsx(part.added && 'diff-added', part.removed && 'diff-removed')}
                >
                  {part.value}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function SingleVersionView({ v }: { v: Version }) {
  return (
    <div>
      <h2 className="mb-1 text-lg font-medium">{v.title}</h2>
      <p className="mb-4 text-xs text-ink-500">
        {v.wordCount.toLocaleString()} words · {formatTimestamp(v.createdAt)} ·{' '}
        <span className="font-mono">{v.branchName}</span>
        {v.tag && (
          <>
            {' · '}
            <span className="chip bg-accent-500/20 text-accent-500">🏷 {v.tag}</span>
          </>
        )}
      </p>
      <pre className="whitespace-pre-wrap font-serif text-base leading-relaxed text-ink-200">{v.content}</pre>
    </div>
  )
}
