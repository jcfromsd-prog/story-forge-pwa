import { create } from 'zustand'
import { Projects, seedSymbiont } from '@/lib/data'
import type { ID } from '@/types'

interface AppState {
  currentProjectId: ID | null
  setCurrentProject: (id: ID | null) => void
  loadInitialProject: () => Promise<void>
  createFirstProject: () => Promise<ID>
}

export const useApp = create<AppState>((set) => ({
  currentProjectId: null,
  setCurrentProject: (id) => {
    set({ currentProjectId: id })
    if (id) localStorage.setItem('sf:currentProjectId', id)
  },
  loadInitialProject: async () => {
    const projects = await Projects.list()
    if (projects.length === 0) {
      set({ currentProjectId: null })
      return
    }
    const stored = localStorage.getItem('sf:currentProjectId')
    if (stored && projects.find((p) => p.id === stored)) {
      set({ currentProjectId: stored })
      return
    }
    set({ currentProjectId: projects[0].id })
    localStorage.setItem('sf:currentProjectId', projects[0].id)
  },
  createFirstProject: async () => {
    const proj = await Projects.create({ name: 'Symbiont', type: 'both' })
    await seedSymbiont(proj.id)
    set({ currentProjectId: proj.id })
    localStorage.setItem('sf:currentProjectId', proj.id)
    return proj.id
  },
}))
