import { useEffect, useState } from 'react'
import { useApp } from '@/state/store'
import { VoiceProfileApi } from '@/lib/data'
import { wordCount } from '@/lib/util'
import type { VoiceProfile } from '@/types'

export default function VoiceProfilePage() {
  const projectId = useApp((s) => s.currentProjectId)
  const [profile, setProfile] = useState<VoiceProfile | null>(null)
  const [newSample, setNewSample] = useState('')

  const refresh = async () => {
    if (!projectId) return
    setProfile(await VoiceProfileApi.get(projectId))
  }

  useEffect(() => {
    refresh()
  }, [projectId])

  const saveSample = async () => {
    if (!projectId || !newSample.trim()) return
    await VoiceProfileApi.addSample(projectId, newSample.trim())
    setNewSample('')
    await refresh()
  }

  const removeSample = async (i: number) => {
    if (!projectId) return
    await VoiceProfileApi.removeSample(projectId, i)
    await refresh()
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-ink-100">Voice Profile</h1>
        <p className="mt-1 text-sm text-ink-400">
          Drop in 5-10 samples of your own writing. The Voice Agent uses these (server-side) to
          de-AI all AI output so the prose sounds like you.
        </p>
        <p className="mt-2 text-xs text-accent-500">
          Pre-loaded with SYMBIONT calibration: avg sentence 22.4 words, variance 18.7, anti-patterns
          {' '}'delve', 'tapestry', 'realm', 'moreover', 'furthermore', etc.
        </p>
      </header>

      <div className="card mb-6">
        <label className="label">Add a sample</label>
        <textarea
          value={newSample}
          onChange={(e) => setNewSample(e.target.value)}
          rows={6}
          className="input font-serif"
          placeholder="Paste 200-1000 words of your own writing. Best results from prose you're proud of."
        />
        <div className="mt-2 flex items-center justify-between">
          <span className="text-xs text-ink-500">{wordCount(newSample)} words</span>
          <button onClick={saveSample} className="btn-primary" disabled={!newSample.trim()}>
            Add to profile
          </button>
        </div>
      </div>

      {profile && (
        <>
          <div className="card mb-6">
            <h2 className="mb-2 text-sm font-medium text-ink-100">Fingerprint</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="label">Avg sentence length</div>
                <div className="text-xl font-medium text-ink-100">
                  {profile.avgSentenceLength.toFixed(1)}
                  <span className="text-xs text-ink-500"> words</span>
                </div>
              </div>
              <div>
                <div className="label">Length variance</div>
                <div className="text-xl font-medium text-ink-100">
                  {Math.sqrt(profile.sentenceLengthVariance).toFixed(1)}
                  <span className="text-xs text-ink-500"> σ</span>
                </div>
              </div>
            </div>
            <div className="mt-4">
              <div className="label">Top vocabulary</div>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(profile.vocabularyFingerprint).map(([word, count]) => (
                  <span key={word} className="chip bg-ink-800 text-ink-300">
                    {word} <span className="text-ink-500">·{count}</span>
                  </span>
                ))}
              </div>
            </div>
            <div className="mt-4">
              <div className="label">Anti-patterns (auto-flagged)</div>
              <div className="flex flex-wrap gap-1.5">
                {profile.antiPatterns.map((p) => (
                  <span key={p} className="chip bg-red-900/30 text-red-300">
                    {p}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <h2 className="mb-2 text-sm font-medium text-ink-100">
            Samples ({profile.sampleTexts.length})
          </h2>
          <ul className="space-y-2">
            {profile.sampleTexts.map((s, i) => (
              <li key={i} className="card flex items-start gap-3">
                <div className="flex-1">
                  <p className="line-clamp-4 font-serif text-sm text-ink-200">{s}</p>
                  <p className="mt-1 text-[10px] text-ink-500">{wordCount(s)} words</p>
                </div>
                <button onClick={() => removeSample(i)} className="text-ink-500 hover:text-red-400">
                  ✕
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
