import { useEffect, useState } from 'react'
import { useApp } from '@/state/store'
import { useAuth } from '@/state/auth'
import { Projects } from '@/lib/data'
import type { Project } from '@/types'

export default function TopBar() {
  const projectId = useApp((s) => s.currentProjectId)
  const setCurrentProject = useApp((s) => s.setCurrentProject)
  const { user, signOut } = useAuth()
  const [projects, setProjects] = useState<Project[]>([])

  useEffect(() => {
    Projects.list().then(setProjects).catch(() => {})
  }, [projectId])

  const current = projects.find((p) => p.id === projectId)

  return (
    <header className="flex items-center justify-between border-b border-ink-800 bg-ink-900/40 px-6 py-2.5">
      <div className="flex items-center gap-3">
        {projects.length > 0 ? (
          <select
            className="rounded-md border border-ink-700 bg-ink-900 px-3 py-1.5 text-sm font-medium text-ink-100 focus:border-accent-500 focus:outline-none"
            value={projectId ?? ''}
            onChange={(e) => setCurrentProject(e.target.value || null)}
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        ) : (
          <span className="text-sm text-ink-400">No projects yet</span>
        )}
        {current && (
          <span className="text-xs uppercase tracking-wider text-ink-500">{current.type}</span>
        )}
      </div>
      <div className="flex items-center gap-4 text-xs text-ink-400">
        <span className="rounded bg-ink-800 px-2 py-0.5">Cloud · Supabase</span>
        <span className="text-ink-500">{user?.email}</span>
        <button onClick={signOut} className="btn-ghost px-2 py-1 text-xs">
          Sign out
        </button>
      </div>
    </header>
  )
}
