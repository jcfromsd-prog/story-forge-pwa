import { useState } from 'react'
import { callClaude } from '@/lib/claude'
import { getSupabaseStatus } from '@/lib/supabase'
import { useAuth } from '@/state/auth'

export default function SettingsPage() {
  const [keyOk, setKeyOk] = useState<'unknown' | 'ok' | 'missing'>('unknown')
  const [testing, setTesting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { user, signOut } = useAuth()
  const status = getSupabaseStatus()

  const testApiKey = async () => {
    setTesting(true)
    setError(null)
    try {
      const res = await callClaude({
        agent: 'builder',
        userMessage: 'Reply with the single word: ready',
        maxTokens: 16,
      })
      if (res.content.toLowerCase().includes('ready') || res.content.toLowerCase().includes('connected')) {
        setKeyOk('ok')
      } else {
        setKeyOk('ok')
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setError(msg)
      setKeyOk('missing')
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
        <h2 className="mb-3 text-sm font-medium text-ink-100">Claude / Anthropic API</h2>
        <p className="mb-3 text-xs text-ink-400">
          The ANTHROPIC_API_KEY is stored as a secret on this Supabase project's Edge Function.
          Browser never sees it. Test the connection:
        </p>
        <button onClick={testApiKey} className="btn-primary" disabled={testing}>
          {testing ? 'Testing…' : 'Test connection'}
        </button>
        {keyOk === 'ok' && <p className="mt-2 text-sm text-green-400">✅ Connected.</p>}
        {keyOk === 'missing' && error && (
          <div className="mt-2 rounded-md border border-red-700 bg-red-900/20 p-3 text-xs text-red-200">
            <p className="mb-2 font-medium">Connection failed:</p>
            <p className="font-mono">{error}</p>
            {error.includes('ANTHROPIC_API_KEY') && (
              <p className="mt-2">
                Open the Supabase dashboard → Edge Functions → Secrets → add{' '}
                <code>ANTHROPIC_API_KEY</code>.
              </p>
            )}
          </div>
        )}
      </section>

      <section className="card mb-6">
        <h2 className="mb-3 text-sm font-medium text-ink-100">Models</h2>
        <p className="text-xs text-ink-400">
          Capture, Craft, Continuity, Voice agents default to <code>claude-sonnet-4-6</code>. Builder
          (version titling) uses <code>claude-haiku-4-5</code> for speed/cost. Adjust in
          <code> src/lib/agents.ts</code> if needed.
        </p>
      </section>
    </div>
  )
}
