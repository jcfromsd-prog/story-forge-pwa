import { useEffect, useState } from 'react'
import { Projects, seedSymbiont } from '@/lib/data'
import { useApp } from '@/state/store'
import { formatTimestamp, clsx } from '@/lib/util'
import type { Project } from '@/types'

export default function ProjectsPage() {
  const currentId = useApp((s) => s.currentProjectId)
  const setCurrentProject = useApp((s) => s.setCurrentProject)
  const [projects, setProjects] = useState<Project[]>([])
  const [name, setName] = useState('')
  const [type, setType] = useState<'novel' | 'screenplay' | 'both'>('novel')
  const [seedFlag, setSeedFlag] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    Projects.list().then(setProjects).catch(console.error)
  }, [reloadKey])

  const create = async () => {
    if (!name.trim()) return
    const proj = await Projects.create({ name: name.trim(), type })
    if (seedFlag) {
      await seedSymbiont(proj.id)
    }
    setCurrentProject(proj.id)
    setName('')
    setSeedFlag(false)
    setReloadKey((k) => k + 1)
  }

  const remove = async (id: string) => {
    if (!confirm('Delete this project and ALL its data (cloud included)?')) return
    await Projects.delete(id)
    if (currentId === id) {
      const list = await Projects.list()
      setCurrentProject(list[0]?.id ?? null)
    }
    setReloadKey((k) => k + 1)
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <h1 className="mb-6 text-2xl font-semibold">Projects</h1>

      <div className="card mb-6">
        <label className="label">New project</label>
        <div className="flex gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Project name" className="input flex-1" />
          <select value={type} onChange={(e) => setType(e.target.value as 'novel' | 'screenplay' | 'both')} className="input w-40">
            <option value="novel">Novel</option>
            <option value="screenplay">Screenplay</option>
            <option value="both">Both</option>
          </select>
          <button onClick={create} className="btn-primary" disabled={!name.trim()}>
            Create
          </button>
        </div>
        <label className="mt-3 flex items-center gap-2 text-xs text-ink-400">
          <input type="checkbox" checked={seedFlag} onChange={(e) => setSeedFlag(e.target.checked)} />
          Seed with SYMBIONT bible records (James Hale, Calder Science Building, etc.)
        </label>
      </div>

      <ul className="space-y-2">
        {projects.map((p) => (
          <li key={p.id} className={clsx('card flex items-center justify-between', currentId === p.id && 'border-accent-500')}>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-medium text-ink-100">{p.name}</h3>
                <span className="chip bg-ink-800 text-ink-400">{p.type}</span>
                {currentId === p.id && <span className="chip bg-accent-500/20 text-accent-500">active</span>}
              </div>
              <p className="text-xs text-ink-500">Updated {formatTimestamp(p.updatedAt)}</p>
            </div>
            <div className="flex gap-2">
              {currentId !== p.id && (
                <button onClick={() => setCurrentProject(p.id)} className="btn-secondary">
                  Open
                </button>
              )}
              <button onClick={() => remove(p.id)} className="btn-danger">
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>

      {projects.length === 0 && (
        <div className="card text-center text-sm text-ink-500">
          No projects yet. Create your first one above. Check the SYMBIONT seed checkbox to start with
          James Hale, the Calder Science Building, Neural Signal Interference tech, and the
          Cognitive Liberty theme already locked in your Bible.
        </div>
      )}
    </div>
  )
}
