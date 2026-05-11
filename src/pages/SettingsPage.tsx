import { useState } from 'react'
import { callClaude } from '@/lib/claude'
import { getSupabaseStatus } from '@/lib/supabase'
import { useAuth } from '@/state/auth'

interface ConnectionResult {
  ok: boolean
  provider?: string
  model?: string
  error?: string
}

export default function SettingsPage() {
  const [result, setResult] = useState<ConnectionResult | null>(null)
  const [testing, setTesting] = useState(false)
  const { user, signOut } = useAuth()
  const status = getSupabaseStatus()

  const testApiKey = async () => {
    setTesting(true)
    setResult(null)
    try {
      const res = await callClaude({
        agent: 'builder',
        userMessage: 'Reply with the single word: ready',
        maxTokens: 16,
      }) as { content: string; provider?: string; model?: string }
      setResult({ ok: true, provider: res.provider, model: res.model })
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setResult({ ok: false, error: msg })
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <h1 className="mb-6 text-2xl font-semibold">Settings</h1>

      <section className="card mb-6">
        <h2 className="mb-3 text-sm font-medium text-ink-100">Account</h2>
        <p className="text-sm text-ink-400">Signed in as: <span className="font-mono text-ink-100">{user?.email}</span></p>
        <button onClick={signOut} className="btn-secondary mt-3">Sign out</button>
      </section>

      <section className="card mb-6">
        <h2 className="mb-3 text-sm font-medium text-ink-100">Supabase connection</h2>
        <p className="text-xs text-ink-400">URL: <span className="font-mono">{status.url}</span></p>
        <p className="text-xs text-ink-400">Configured: {status.configured ? '✅' : '❌'}</p>
      </section>

      <section className="card mb-6">
        <h2 className="mb-3 text-sm font-medium text-ink-100">AI provider</h2>
        <p className="mb-3 text-xs text-ink-400">
          StoryForge uses a dual-provider Edge Function. It tries <strong>Gemini 2.5 Pro</strong>{' '}
          first (free with your student access), and falls back to <strong>Anthropic Claude Sonnet
          4.6</strong> if Gemini errors. Whichever you set as a Supabase secret gets used.
        </p>
        <div className="mb-3 grid grid-cols-2 gap-2 text-xs">
          <div className="rounded border border-ink-700 bg-ink-900 p-2">
            <div className="label">Primary</div>
            <div className="font-medium text-ink-100">Gemini 2.5 Pro</div>
            <div className="text-ink-500">Set <code>GEMINI_API_KEY</code> in Supabase Secrets</div>
          </div>
          <div className="rounded border border-ink-700 bg-ink-900 p-2">
            <div className="label">Fallback</div>
            <div className="font-medium text-ink-100">Claude Sonnet 4.6</div>
            <div className="text-ink-500">Set <code>ANTHROPIC_API_KEY</code> in Supabase Secrets</div>
          </div>
        </div>
        <button onClick={testApiKey} className="btn-primary" disabled={testing}>
          {testing ? 'Testing…' : 'Test AI connection'}
        </button>
        {result?.ok && (
          <p className="mt-2 text-sm text-green-400">
            ✅ Connected via <span className="font-mono">{result.provider}</span>
            {result.model && (
              <>
                {' '}— model <span className="font-mono">{result.model}</span>
              </>
            )}
          </p>
        )}
        {result && !result.ok && result.error && (
          <div className="mt-2 rounded-md border border-red-700 bg-red-900/20 p-3 text-xs text-red-200">
            <p className="mb-2 font-medium">Connection failed:</p>
            <p className="font-mono">{result.error}</p>
            {result.error.includes('No AI provider') && (
              <p className="mt-2">
                Open Supabase → Edge Functions → Secrets and add either{' '}
                <code>GEMINI_API_KEY</code> or <code>ANTHROPIC_API_KEY</code>.
              </p>
            )}
          </div>
        )}
      </section>

      <section className="card mb-6">
        <h2 className="mb-3 text-sm font-medium text-ink-100">Models</h2>
        <p className="text-xs text-ink-400">
          Capture, Craft, Continuity, Voice agents use the "smart" tier (Gemini 2.5 Pro or Claude
          Sonnet 4.6). Builder (version titling) uses the "fast" tier (Gemini 2.5 Flash or Claude
          Haiku 4.5). Mapping lives in the Edge Function source.
        </p>
      </section>
    </div>
  )
}
