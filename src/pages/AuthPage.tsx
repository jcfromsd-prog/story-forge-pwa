import { useState } from 'react'
import { useAuth } from '@/state/auth'

type Mode = 'sign_in' | 'sign_up' | 'magic_link'

export default function AuthPage() {
  const [mode, setMode] = useState<Mode>('sign_in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { signInWithEmail, signUpWithEmail, signInWithMagicLink } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setMessage(null)
    setError(null)
    try {
      if (mode === 'sign_in') {
        const { error } = await signInWithEmail(email, password)
        if (error) setError(error)
      } else if (mode === 'sign_up') {
        const { error } = await signUpWithEmail(email, password)
        if (error) setError(error)
        else setMessage('Account created. Check your email to confirm if required.')
      } else {
        const { error } = await signInWithMagicLink(email)
        if (error) setError(error)
        else setMessage(`Magic link sent to ${email}. Check your inbox.`)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex h-full w-full items-center justify-center bg-ink-950 px-6">
      <div className="card w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-accent-500/20 text-accent-500">
            <span className="text-xl font-bold">S</span>
          </div>
          <h1 className="text-xl font-semibold text-ink-100">StoryForge</h1>
          <p className="mt-1 text-xs text-ink-400">Voice-first writing partner</p>
        </div>

        <div className="mb-4 flex rounded-md bg-ink-900 p-1 text-xs">
          <button
            type="button"
            onClick={() => setMode('sign_in')}
            className={`flex-1 rounded px-2 py-1 ${mode === 'sign_in' ? 'bg-ink-700 text-ink-100' : 'text-ink-400'}`}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => setMode('sign_up')}
            className={`flex-1 rounded px-2 py-1 ${mode === 'sign_up' ? 'bg-ink-700 text-ink-100' : 'text-ink-400'}`}
          >
            Create account
          </button>
          <button
            type="button"
            onClick={() => setMode('magic_link')}
            className={`flex-1 rounded px-2 py-1 ${mode === 'magic_link' ? 'bg-ink-700 text-ink-100' : 'text-ink-400'}`}
          >
            Magic link
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="label">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="input"
              placeholder="you@example.com"
            />
          </div>
          {mode !== 'magic_link' && (
            <div>
              <label className="label">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="input"
                placeholder="At least 6 characters"
              />
            </div>
          )}

          {error && (
            <div className="rounded-md border border-red-700 bg-red-900/30 p-2 text-xs text-red-200">
              {error}
            </div>
          )}
          {message && (
            <div className="rounded-md border border-green-700 bg-green-900/30 p-2 text-xs text-green-200">
              {message}
            </div>
          )}

          <button type="submit" className="btn-primary w-full" disabled={busy}>
            {busy
              ? 'Working…'
              : mode === 'sign_in'
                ? 'Sign in'
                : mode === 'sign_up'
                  ? 'Create account'
                  : 'Send magic link'}
          </button>
        </form>

        <p className="mt-4 text-center text-[10px] text-ink-500">
          Your data lives in your own Supabase project. Nothing is shared.
        </p>
      </div>
    </div>
  )
}
