import { Versions } from './data'
import { generateVersionTitle } from './agents'
import { wordCount } from './util'
import type { ID, Version } from '@/types'

export async function snapshotVersion(opts: {
  projectId: ID
  parentId: ID | null
  content: string
  branchName?: string
  tag?: string
  changeSummary?: string
  aiTool?: string
}): Promise<Version> {
  let title: string
  try {
    title = await generateVersionTitle(opts.content)
  } catch {
    title = `Snapshot ${new Date().toLocaleString()}`
  }
  return Versions.create({
    id: crypto.randomUUID(),
    projectId: opts.projectId,
    parentId: opts.parentId,
    branchName: opts.branchName ?? 'main',
    tag: opts.tag,
    title,
    content: opts.content,
    wordCount: wordCount(opts.content),
    aiTool: opts.aiTool,
    changeSummary: opts.changeSummary,
  })
}

export async function autoSnapshot(projectId: ID, content: string, branchName = 'main'): Promise<Version | null> {
  const latest = await Versions.getLatest(projectId, branchName)
  if (latest && latest.content === content) return null
  return snapshotVersion({
    projectId,
    parentId: latest?.id ?? null,
    content,
    branchName,
    changeSummary: latest
      ? `Auto-saved (${wordCount(content) - latest.wordCount} word delta)`
      : 'Initial',
  })
}

export async function listVersions(projectId: ID): Promise<Version[]> {
  return Versions.list(projectId)
}

export async function getLatestVersion(projectId: ID, branchName = 'main'): Promise<Version | undefined> {
  const v = await Versions.getLatest(projectId, branchName)
  return v ?? undefined
}
