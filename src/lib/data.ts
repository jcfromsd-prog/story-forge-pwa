// Source-of-truth data layer for StoryForge.
// All persistent data (projects, bible, versions, conversations, voice profile,
// research, qa reports) goes to Supabase. Audio blobs go to Supabase Storage.
// IndexedDB is retained ONLY for offline capture buffering — once a capture is
// approved, it's flushed to Supabase and dropped from IndexedDB.

import { supabase } from './supabase'
import type {
  Project,
  BibleRecord,
  BibleCategory,
  Version,
  Conversation,
  Message,
  VoiceProfile,
  ResearchItem,
  QAReport,
  QAFinding,
  ID,
} from '@/types'

// Camelcase <-> snake_case helpers for the wire format
function mapBible(row: Record<string, unknown>): BibleRecord {
  return {
    id: row.id as string,
    projectId: row.project_id as string,
    category: row.category as BibleCategory,
    subject: row.subject as string,
    decision: row.decision as string,
    negativeConstraints: (row.negative_constraints as string[]) ?? [],
    reason: (row.reason as string) ?? undefined,
    locked: Boolean(row.locked),
    lockedAt: row.locked_at ? new Date(row.locked_at as string).getTime() : undefined,
    createdAt: new Date(row.created_at as string).getTime(),
    updatedAt: new Date((row.updated_at as string) ?? (row.created_at as string)).getTime(),
    relatedRecords: (row.related_records as string[]) ?? [],
    history: [],
  }
}

function mapVersion(row: Record<string, unknown>): Version {
  return {
    id: row.id as string,
    projectId: row.project_id as string,
    parentId: (row.parent_id as string) ?? null,
    branchName: (row.branch_name as string) ?? 'main',
    tag: (row.tag as string) ?? undefined,
    title: (row.title as string) ?? '',
    content: (row.content as string) ?? '',
    wordCount: (row.word_count as number) ?? 0,
    aiTool: (row.ai_tool as string) ?? undefined,
    changeSummary: (row.change_summary as string) ?? undefined,
    createdAt: new Date(row.created_at as string).getTime(),
  }
}

function mapProject(row: Record<string, unknown>): Project {
  return {
    id: row.id as string,
    name: row.name as string,
    type: (row.type as 'novel' | 'screenplay' | 'both') ?? 'novel',
    createdAt: new Date(row.created_at as string).getTime(),
    updatedAt: new Date((row.updated_at as string) ?? (row.created_at as string)).getTime(),
  }
}

// ===================== Projects =====================
export const Projects = {
  async list(): Promise<Project[]> {
    const { data, error } = await supabase.from('projects').select('*').order('updated_at', { ascending: false })
    if (error) throw error
    return (data ?? []).map(mapProject)
  },
  async get(id: ID): Promise<Project | null> {
    const { data, error } = await supabase.from('projects').select('*').eq('id', id).maybeSingle()
    if (error) throw error
    return data ? mapProject(data) : null
  },
  async create(p: { name: string; type: 'novel' | 'screenplay' | 'both' }): Promise<Project> {
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) throw new Error('Not signed in')
    const { data, error } = await supabase
      .from('projects')
      .insert({ name: p.name, type: p.type, user_id: userData.user.id })
      .select()
      .single()
    if (error) throw error
    return mapProject(data)
  },
  async delete(id: ID): Promise<void> {
    const { error } = await supabase.from('projects').delete().eq('id', id)
    if (error) throw error
  },
}

// ===================== Bible =====================
export const Bible = {
  async list(projectId: ID, category?: BibleCategory): Promise<BibleRecord[]> {
    let q = supabase.from('bible_records').select('*').eq('project_id', projectId)
    if (category) q = q.eq('category', category)
    const { data, error } = await q.order('updated_at', { ascending: false })
    if (error) throw error
    return (data ?? []).map(mapBible)
  },
  async create(r: {
    projectId: ID
    category: BibleCategory
    subject: string
    decision: string
    negativeConstraints?: string[]
    reason?: string
    locked?: boolean
  }): Promise<BibleRecord> {
    const { data, error } = await supabase
      .from('bible_records')
      .insert({
        project_id: r.projectId,
        category: r.category,
        subject: r.subject,
        decision: r.decision,
        negative_constraints: r.negativeConstraints ?? [],
        reason: r.reason ?? null,
        locked: r.locked ?? false,
        locked_at: r.locked ? new Date().toISOString() : null,
      })
      .select()
      .single()
    if (error) throw error
    return mapBible(data)
  },
  async update(id: ID, patch: Partial<BibleRecord>): Promise<void> {
    const payload: Record<string, unknown> = {}
    if (patch.subject !== undefined) payload.subject = patch.subject
    if (patch.decision !== undefined) payload.decision = patch.decision
    if (patch.negativeConstraints !== undefined) payload.negative_constraints = patch.negativeConstraints
    if (patch.reason !== undefined) payload.reason = patch.reason
    if (patch.locked !== undefined) {
      payload.locked = patch.locked
      payload.locked_at = patch.locked ? new Date().toISOString() : null
    }
    const { error } = await supabase.from('bible_records').update(payload).eq('id', id)
    if (error) throw error
  },
  async delete(id: ID): Promise<void> {
    const { error } = await supabase.from('bible_records').delete().eq('id', id)
    if (error) throw error
  },
}

// ===================== Versions =====================
export const Versions = {
  async list(projectId: ID): Promise<Version[]> {
    const { data, error } = await supabase
      .from('versions')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data ?? []).map(mapVersion)
  },
  async create(v: Omit<Version, 'createdAt'> & { createdAt?: number }): Promise<Version> {
    const { data, error } = await supabase
      .from('versions')
      .insert({
        id: v.id,
        project_id: v.projectId,
        parent_id: v.parentId,
        branch_name: v.branchName,
        tag: v.tag ?? null,
        title: v.title,
        content: v.content,
        word_count: v.wordCount,
        ai_tool: v.aiTool ?? null,
        change_summary: v.changeSummary ?? null,
      })
      .select()
      .single()
    if (error) throw error
    return mapVersion(data)
  },
  async getLatest(projectId: ID, branchName = 'main'): Promise<Version | null> {
    const { data, error } = await supabase
      .from('versions')
      .select('*')
      .eq('project_id', projectId)
      .eq('branch_name', branchName)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (error) throw error
    return data ? mapVersion(data) : null
  },
  async tag(id: ID, tag: string | null): Promise<void> {
    const { error } = await supabase.from('versions').update({ tag }).eq('id', id)
    if (error) throw error
  },
}

// ===================== Voice Profile =====================
export const VoiceProfileApi = {
  async get(projectId: ID): Promise<VoiceProfile | null> {
    const { data, error } = await supabase
      .from('voice_profiles')
      .select('*')
      .eq('project_id', projectId)
      .maybeSingle()
    if (error) throw error
    if (!data) return null
    return {
      id: data.id,
      projectId: data.project_id,
      sampleTexts: data.sample_texts ?? [],
      avgSentenceLength: data.avg_sentence_length ?? 22.4,
      sentenceLengthVariance: data.sentence_length_variance ?? 18.7,
      vocabularyFingerprint: data.vocabulary_fingerprint ?? {},
      antiPatterns: data.anti_patterns ?? [],
      updatedAt: new Date(data.updated_at ?? Date.now()).getTime(),
    }
  },
  async addSample(projectId: ID, sample: string): Promise<void> {
    const profile = await VoiceProfileApi.get(projectId)
    const samples = [...(profile?.sampleTexts ?? []), sample]
    await VoiceProfileApi.persist(projectId, samples)
  },
  async removeSample(projectId: ID, index: number): Promise<void> {
    const profile = await VoiceProfileApi.get(projectId)
    if (!profile) return
    const samples = profile.sampleTexts.filter((_, i) => i !== index)
    await VoiceProfileApi.persist(projectId, samples)
  },
  async persist(projectId: ID, samples: string[]): Promise<void> {
    const allText = samples.join(' ')
    const sentences = allText.replace(/\s+/g, ' ').split(/(?<=[.!?])\s+(?=[A-Z"'])/g).filter(Boolean)
    const lengths = sentences.map((s) => s.split(/\s+/).length)
    const avg = lengths.reduce((a, b) => a + b, 0) / Math.max(1, lengths.length)
    const variance = lengths.reduce((s, l) => s + (l - avg) ** 2, 0) / Math.max(1, lengths.length)
    const words = (allText.toLowerCase().match(/\b[\w']+\b/g) ?? [])
    const counts: Record<string, number> = {}
    for (const w of words) counts[w] = (counts[w] ?? 0) + 1
    const fingerprint = Object.fromEntries(
      Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 20),
    )
    const { error } = await supabase
      .from('voice_profiles')
      .upsert(
        {
          project_id: projectId,
          sample_texts: samples,
          avg_sentence_length: avg || 22.4,
          sentence_length_variance: variance || 18.7,
          vocabulary_fingerprint: fingerprint,
        },
        { onConflict: 'project_id' },
      )
    if (error) throw error
  },
}

// ===================== Conversations + Messages =====================
export const Chat = {
  async getOrCreateConversation(projectId: ID): Promise<Conversation> {
    const { data } = await supabase
      .from('conversations')
      .select('*')
      .eq('project_id', projectId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (data) {
      return {
        id: data.id,
        projectId: data.project_id,
        title: data.title,
        createdAt: new Date(data.created_at).getTime(),
        updatedAt: new Date(data.updated_at ?? data.created_at).getTime(),
      }
    }
    const { data: created, error } = await supabase
      .from('conversations')
      .insert({ project_id: projectId })
      .select()
      .single()
    if (error) throw error
    return {
      id: created.id,
      projectId: created.project_id,
      title: created.title,
      createdAt: new Date(created.created_at).getTime(),
      updatedAt: new Date(created.updated_at ?? created.created_at).getTime(),
    }
  },
  async listMessages(conversationId: ID): Promise<Message[]> {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
    if (error) throw error
    return (data ?? []).map((m) => ({
      id: m.id,
      conversationId: m.conversation_id,
      role: m.role,
      content: m.content,
      aiModel: m.ai_model ?? undefined,
      createdAt: new Date(m.created_at).getTime(),
    }))
  },
  async addMessage(m: {
    conversationId: ID
    role: 'user' | 'assistant'
    content: string
    aiModel?: string
  }): Promise<void> {
    const { error } = await supabase.from('messages').insert({
      conversation_id: m.conversationId,
      role: m.role,
      content: m.content,
      ai_model: m.aiModel ?? null,
    })
    if (error) throw error
    await supabase
      .from('conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', m.conversationId)
  },
}

// ===================== Research =====================
export const Research = {
  async list(projectId: ID): Promise<ResearchItem[]> {
    const { data, error } = await supabase
      .from('research_items')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data ?? []).map((r) => ({
      id: r.id,
      projectId: r.project_id,
      type: r.type,
      title: r.title ?? '',
      content: r.content ?? '',
      sourceUrl: r.source_url ?? undefined,
      tags: r.tags ?? [],
      createdAt: new Date(r.created_at).getTime(),
    }))
  },
  async create(item: Omit<ResearchItem, 'id' | 'createdAt'>): Promise<void> {
    const { error } = await supabase.from('research_items').insert({
      project_id: item.projectId,
      type: item.type,
      title: item.title,
      content: item.content,
      source_url: item.sourceUrl ?? null,
      tags: item.tags,
    })
    if (error) throw error
  },
  async delete(id: ID): Promise<void> {
    const { error } = await supabase.from('research_items').delete().eq('id', id)
    if (error) throw error
  },
}

// ===================== QA reports =====================
export const QA = {
  async record(report: { versionId: ID; reportType: string; status: 'green' | 'yellow' | 'red'; findings: QAFinding[] }): Promise<void> {
    const { error } = await supabase.from('qa_reports').insert({
      version_id: report.versionId,
      report_type: report.reportType,
      status: report.status,
      findings: report.findings,
    })
    if (error) throw error
  },
  async listRecent(versionId: ID): Promise<QAReport[]> {
    const { data, error } = await supabase
      .from('qa_reports')
      .select('*')
      .eq('version_id', versionId)
      .order('created_at', { ascending: false })
      .limit(20)
    if (error) throw error
    return (data ?? []).map((r) => ({
      id: r.id,
      versionId: r.version_id,
      reportType: r.report_type,
      status: r.status,
      findings: r.findings ?? [],
      createdAt: new Date(r.created_at).getTime(),
    }))
  },
}

// ===================== Audio (Storage) =====================
export const Audio = {
  async upload(projectId: ID, blob: Blob, filename: string): Promise<string> {
    const path = `${projectId}/${filename}`
    const { error } = await supabase.storage.from('audio').upload(path, blob, {
      contentType: blob.type || 'audio/webm',
      upsert: true,
    })
    if (error) throw error
    return path
  },
}

// ===================== SYMBIONT seed =====================
// Drops the calibrated voice profile + 5 locked Bible records into a new project.
export async function seedSymbiont(projectId: ID): Promise<void> {
  // Voice profile auto-seeds via DB trigger. We update with full preserve patterns.
  await supabase
    .from('voice_profiles')
    .update({
      anti_patterns: [
        'delve',
        'tapestry',
        'realm',
        'landscape',
        'testament',
        "it's worth noting",
        'in the realm of',
        'moreover',
        'furthermore',
        'additionally',
        'navigate the',
        'journey of',
        'navigate the complexities',
      ],
    })
    .eq('project_id', projectId)

  const records = [
    {
      project_id: projectId,
      category: 'character',
      subject: 'James Hale',
      decision:
        "Neuroscientist at the Calder Science Building, drives his late father's 1969 Ford F-250 four-by-four with a 360 FE-series V8 bored thirty-thousandths over. Studied the neural bandwidth problem for 15 years before finding the frequency.",
      negative_constraints: ['Not deceased before climax'],
      locked: true,
      locked_at: new Date().toISOString(),
    },
    {
      project_id: projectId,
      category: 'location',
      subject: 'Calder Science Building',
      decision:
        'University neuroscience wing where James works late, third floor lab with west-facing window.',
      negative_constraints: [],
      locked: true,
      locked_at: new Date().toISOString(),
    },
    {
      project_id: projectId,
      category: 'technology',
      subject: 'Neural Signal Interference',
      decision:
        'Method to clear cognitive noise — the gap between knowing and articulating. Uses piezoelectric conversion model with acoustic amplification. Built from first principles by James over 15 years.',
      negative_constraints: ['Not magic', 'One generation past current research'],
      locked: true,
      locked_at: new Date().toISOString(),
    },
    {
      project_id: projectId,
      category: 'theme',
      subject: 'Cognitive Liberty',
      decision:
        'The right to mental self-determination as foundation of every other freedom. Cited via fictional R. Hale, Cognitive Liberty: A Framework for the Enhanced World (2027).',
      negative_constraints: [],
      locked: true,
      locked_at: new Date().toISOString(),
    },
    {
      project_id: projectId,
      category: 'rule',
      subject: 'Science Plausibility',
      decision:
        'All technology must be extrapolated from real research: olfactory drug delivery, focused ultrasound neuromodulation, piezoelectric nanoparticles, BrainNet experiments, sonogenetics. No magic, no hand-waving.',
      negative_constraints: [],
      locked: true,
      locked_at: new Date().toISOString(),
    },
  ]
  const { error } = await supabase.from('bible_records').insert(records)
  if (error) console.warn('Symbiont seed bible insert failed:', error.message)
}
