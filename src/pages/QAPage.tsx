import { useState } from 'react'
import { useApp } from '@/state/store'
import { getLatestVersion } from '@/lib/versions'
import { runAllQA, overallStatus, type QABundle } from '@/lib/qa'
import { QA } from '@/lib/data'
import { runContinuityAgent } from '@/lib/agents'
import { clsx } from '@/lib/util'
import type { QAFinding } from '@/types'

const LAYER_META: { key: keyof QABundle; label: string; description: string }[] = [
  { key: 'duplicates', label: 'Layer 1: Duplicates', description: 'Exact duplicate paragraphs' },
  { key: 'fragments', label: 'Layer 2: Fragments', description: 'Repeated 30+ char phrases nearby' },
  { key: 'wordCountSanity', label: 'Layer 3: Word Count', description: 'Chapters that are outliers' },
  { key: 'bibleConsistency', label: 'Layer 4: Bible', description: 'Manuscript vs locked Bible records' },
  { key: 'timeline', label: 'Layer 5: Timeline', description: 'Day reference monotonicity' },
  { key: 'proofread', label: 'Layer 6: Proofread', description: 'Repeated words, spacing, punctuation' },
  { key: 'llmPatterns', label: 'Layer 7: LLM Patterns', description: '"delve", tricolons, "Not X. Y."' },
]

export default function QAPage() {
  const projectId = useApp((s) => s.currentProjectId)
  const [bundle, setBundle] = useState<QABundle | null>(null)
  const [busy, setBusy] = useState(false)
  const [continuityFindings, setContinuityFindings] = useState<QAFinding[]>([])
  const [aiBusy, setAiBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleRun = async () => {
    if (!projectId) return
    setBusy(true)
    setError(null)
    try {
      const latest = await getLatestVersion(projectId)
      if (!latest) {
        setError('No manuscript versions yet. Write something in the Editor first.')
        return
      }
      const b = await runAllQA(projectId, latest.content)
      setBundle(b)
      const status = overallStatus(b)
      await QA.record({
        versionId: latest.id,
        reportType: 'full',
        status,
        findings: [
          ...b.duplicates,
          ...b.fragments,
          ...b.wordCountSanity,
          ...b.bibleConsistency,
          ...b.timeline,
          ...b.proofread,
          ...b.llmPatterns,
        ],
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const handleRunContinuity = async () => {
    if (!projectId) return
    setAiBusy(true)
    try {
      const latest = await getLatestVersion(projectId)
      if (!latest) return
      const findings = await runContinuityAgent(projectId, latest.content)
      setContinuityFindings(
        findings.map((f) => ({
          severity: f.severity,
          message: `${f.type} @ ${f.location}: ${f.description}${f.suggested_fix ? ` — fix: ${f.suggested_fix}` : ''}`,
        })),
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setAiBusy(false)
    }
  }

  const status = bundle ? overallStatus(bundle) : null

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <header className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink-100">QA Checker</h1>
          <p className="mt-1 text-sm text-ink-400">
            Seven local layers (instant) plus an AI continuity scan. Runs on your latest snapshot.
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleRun} className="btn-primary" disabled={busy}>
            {busy ? 'Scanning…' : 'Run all 7 layers'}
          </button>
          <button onClick={handleRunContinuity} className="btn-secondary" disabled={aiBusy}>
            {aiBusy ? 'AI scanning…' : 'AI continuity scan'}
          </button>
        </div>
      </header>

      {error && <div className="card mb-4 border-red-700 bg-red-900/20 text-red-200">{error}</div>}

      {status && (
        <div
          className={clsx(
            'card mb-6 flex items-center gap-4',
            status === 'green' && 'border-green-700 bg-green-900/20',
            status === 'yellow' && 'border-yellow-700 bg-yellow-900/20',
            status === 'red' && 'border-red-700 bg-red-900/20',
          )}
        >
          <div className="text-3xl">
            {status === 'green' && '✅'}
            {status === 'yellow' && '⚠️'}
            {status === 'red' && '🛑'}
          </div>
          <div>
            <div className="text-lg font-medium">
              Overall: {status === 'green' ? 'Clean' : status === 'yellow' ? 'Review' : 'Issues found'}
            </div>
          </div>
        </div>
      )}

      {bundle && (
        <div className="space-y-3">
          {LAYER_META.map(({ key, label, description }) => (
            <LayerCard key={key} label={label} description={description} findings={bundle[key]} />
          ))}
        </div>
      )}

      {continuityFindings.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-2 text-lg font-medium text-ink-100">AI Continuity Findings</h2>
          <LayerCard label="Continuity Agent" description="Deep-scan from Claude" findings={continuityFindings} forceOpen />
        </div>
      )}
    </div>
  )
}

function LayerCard({
  label,
  description,
  findings,
  forceOpen,
}: {
  label: string
  description: string
  findings: QAFinding[]
  forceOpen?: boolean
}) {
  const [open, setOpen] = useState(forceOpen ?? false)
  const status = findings.some((f) => f.severity === 'red')
    ? 'red'
    : findings.some((f) => f.severity === 'yellow')
      ? 'yellow'
      : 'green'

  return (
    <div className="card">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between text-left">
        <div className="flex items-center gap-3">
          <span className="text-xl">
            {status === 'green' && '✅'}
            {status === 'yellow' && '⚠️'}
            {status === 'red' && '🛑'}
          </span>
          <div>
            <div className="font-medium text-ink-100">{label}</div>
            <div className="text-xs text-ink-500">{description}</div>
          </div>
        </div>
        <div className="text-xs text-ink-400">
          {findings.length} finding{findings.length === 1 ? '' : 's'} · {open ? '▲' : '▼'}
        </div>
      </button>
      {open && findings.length > 0 && (
        <ul className="mt-3 space-y-2">
          {findings.map((f, i) => (
            <li
              key={i}
              className={clsx(
                'rounded-md border-l-2 p-2 text-sm',
                f.severity === 'red' && 'border-red-500 bg-red-900/10',
                f.severity === 'yellow' && 'border-yellow-500 bg-yellow-900/10',
                f.severity === 'green' && 'border-ink-500 bg-ink-900/30',
              )}
            >
              <div className="text-ink-200">{f.message}</div>
              {f.passage && <div className="mt-1 font-mono text-xs italic text-ink-400">"{f.passage}"</div>}
            </li>
          ))}
        </ul>
      )}
      {open && findings.length === 0 && (
        <div className="mt-3 text-xs text-ink-500">No issues found in this layer.</div>
      )}
    </div>
  )
}
