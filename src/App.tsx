import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import CapturePage from './pages/CapturePage'
import BiblePage from './pages/BiblePage'
import EditorPage from './pages/EditorPage'
import VersionsPage from './pages/VersionsPage'
import QAPage from './pages/QAPage'
import ResearchPage from './pages/ResearchPage'
import VoiceProfilePage from './pages/VoiceProfilePage'
import PipelinePage from './pages/PipelinePage'
import SettingsPage from './pages/SettingsPage'
import ProjectsPage from './pages/ProjectsPage'
import AuthPage from './pages/AuthPage'
import { useApp } from './state/store'
import { useAuth } from './state/auth'
import { getSupabaseStatus } from './lib/supabase'

export default function App() {
  const { session, loading, init } = useAuth()
  const loadInitialProject = useApp((s) => s.loadInitialProject)

  useEffect(() => {
    init()
  }, [init])

  useEffect(() => {
    if (session) loadInitialProject()
  }, [session, loadInitialProject])

  const status = getSupabaseStatus()

  if (!status.configured) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-ink-950 text-ink-200 p-6">
        <div className="card max-w-lg">
          <h1 className="text-xl font-semibold text-ink-100">Configuration needed</h1>
          <p className="mt-2 text-sm text-ink-300">
            Supabase environment variables are missing. The build is wired up but the client doesn't
            know where to talk to. Create <code className="rounded bg-ink-800 px-1">.env.local</code> with:
          </p>
          <pre className="mt-3 rounded bg-ink-900 p-3 text-xs">
{`VITE_SUPABASE_URL=https://fpnlcwxmyodpvmmpxksg.supabase.co
VITE_SUPABASE_ANON_KEY=<your anon key>`}
          </pre>
          <p className="mt-3 text-xs text-ink-500">
            These are also set as Vercel project environment variables when deploying.
          </p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-ink-950 text-ink-300">
        <span>Loading…</span>
      </div>
    )
  }

  if (!session) {
    return <AuthPage />
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Navigate to="/capture" replace />} />
        <Route path="/capture" element={<CapturePage />} />
        <Route path="/bible" element={<BiblePage />} />
        <Route path="/editor" element={<EditorPage />} />
        <Route path="/versions" element={<VersionsPage />} />
        <Route path="/qa" element={<QAPage />} />
        <Route path="/research" element={<ResearchPage />} />
        <Route path="/voice" element={<VoiceProfilePage />} />
        <Route path="/pipeline" element={<PipelinePage />} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/capture" replace />} />
      </Route>
    </Routes>
  )
}
