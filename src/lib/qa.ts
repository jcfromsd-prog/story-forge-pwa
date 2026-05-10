// 7-layer QA Checker — runs locally on the manuscript.
// Layer 4 (Bible consistency) calls into bible.ts; the rest are pure string ops.

import type { QAFinding, ID } from '@/types'
import { Bible } from './data'
import { splitIntoParagraphs, splitIntoSentences, wordCount } from './util'

// ------------------------------------------------------------
// Layer 1: Duplicate Scanner — exact duplicate paragraphs
// ------------------------------------------------------------
export function scanDuplicates(text: string): QAFinding[] {
  const paragraphs = splitIntoParagraphs(text)
  const seen = new Map<string, number>()
  const findings: QAFinding[] = []
  paragraphs.forEach((p, i) => {
    const key = p.trim().toLowerCase().slice(0, 80).replace(/\s+/g, ' ')
    if (key.length < 30) return
    const prev = seen.get(key)
    if (prev !== undefined) {
      findings.push({
        severity: 'red',
        message: `Duplicate paragraph: also appears at position ${prev + 1}`,
        passage: p.slice(0, 200),
        location: { paragraph: i + 1 },
      })
    } else {
      seen.set(key, i)
    }
  })
  return findings
}

// ------------------------------------------------------------
// Layer 2: Fragment Scanner — repeated 30+ char phrases nearby
// ------------------------------------------------------------
export function scanFragments(text: string): QAFinding[] {
  const paragraphs = splitIntoParagraphs(text)
  const findings: QAFinding[] = []
  for (let i = 0; i < paragraphs.length; i++) {
    const p = paragraphs[i].toLowerCase()
    for (let j = i + 1; j < Math.min(i + 6, paragraphs.length); j++) {
      const q = paragraphs[j].toLowerCase()
      // Slide a 30-char window across p, see if q contains it
      for (let k = 0; k <= p.length - 30; k += 5) {
        const window = p.slice(k, k + 30)
        if (q.includes(window)) {
          findings.push({
            severity: 'yellow',
            message: `Repeated phrase (~30 chars) between paragraphs ${i + 1} and ${j + 1}`,
            passage: window,
            location: { paragraph: i + 1 },
          })
          break
        }
      }
    }
  }
  // Dedupe by message
  const seen = new Set<string>()
  return findings.filter((f) => {
    const k = f.message + (f.passage ?? '')
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
}

// ------------------------------------------------------------
// Layer 3: Word Count Sanity — flag chapters that are extreme outliers
// ------------------------------------------------------------
export function scanWordCountSanity(text: string): QAFinding[] {
  const chapters = text.split(/^#\s+/m).filter((c) => c.trim().length > 0)
  if (chapters.length < 3) return []
  const counts = chapters.map((c) => wordCount(c))
  const median = [...counts].sort((a, b) => a - b)[Math.floor(counts.length / 2)]
  if (median === 0) return []
  const findings: QAFinding[] = []
  counts.forEach((c, i) => {
    const ratio = c / median
    if (ratio < 0.3 && c > 50) {
      findings.push({
        severity: 'yellow',
        message: `Chapter ${i + 1} is much shorter (${c} words) than the median (${median}). Intentional?`,
        location: { chapter: i + 1 },
      })
    } else if (ratio > 2.5) {
      findings.push({
        severity: 'yellow',
        message: `Chapter ${i + 1} is much longer (${c} words) than the median (${median}). Consider splitting?`,
        location: { chapter: i + 1 },
      })
    }
  })
  return findings
}

// ------------------------------------------------------------
// Layer 4: Bible Consistency — compares manuscript against locked Bible records
// ------------------------------------------------------------
export async function scanBibleConsistency(
  projectId: ID,
  text: string,
): Promise<QAFinding[]> {
  const records = await Bible.list(projectId)
  const locked = records.filter((r) => r.locked)
  if (locked.length === 0) return []

  const findings: QAFinding[] = []
  const lower = text.toLowerCase()
  for (const r of locked) {
    for (const neg of r.negativeConstraints) {
      const stripped = neg.replace(/^(does\s+)?not\s+/i, '').trim()
      if (stripped.length < 3) continue
      if (lower.includes(stripped.toLowerCase())) {
        findings.push({
          severity: 'red',
          message: `Bible violation — "${r.subject}" is locked: NOT "${stripped}"`,
          passage: stripped,
        })
      }
    }
  }
  return findings
}

// ------------------------------------------------------------
// Layer 5: Timeline Validator — extract time references, flag obvious conflicts
// ------------------------------------------------------------
export function scanTimeline(text: string): QAFinding[] {
  const findings: QAFinding[] = []
  // Find explicit day references like "Day 1", "Day 2", "Day 14"
  const dayRefs: { day: number; index: number }[] = []
  const dayRegex = /\bDay\s+(\d+)\b/gi
  let m: RegExpExecArray | null
  while ((m = dayRegex.exec(text)) !== null) {
    dayRefs.push({ day: parseInt(m[1], 10), index: m.index })
  }
  // Look for monotonicity violations
  for (let i = 1; i < dayRefs.length; i++) {
    if (dayRefs[i].day < dayRefs[i - 1].day) {
      findings.push({
        severity: 'yellow',
        message: `Timeline: Day ${dayRefs[i].day} mentioned after Day ${dayRefs[i - 1].day}. Flashback or error?`,
        location: { offset: dayRefs[i].index },
      })
    }
  }
  return findings
}

// ------------------------------------------------------------
// Layer 6: Proofread — common typos and obvious errors
// ------------------------------------------------------------
const PROOFREAD_PATTERNS: { pattern: RegExp; message: string; severity: 'yellow' | 'red' }[] = [
  { pattern: /\b(the the|a a|an an|and and|of of|to to|in in|is is)\b/gi, message: 'Repeated word', severity: 'red' },
  { pattern: /\s{2,}/g, message: 'Double space', severity: 'yellow' },
  { pattern: /\s+([.,;:!?])/g, message: 'Space before punctuation', severity: 'yellow' },
  { pattern: /\b(its|it's)\b/g, message: 'Check its/it\'s usage', severity: 'yellow' },
  { pattern: /\b(your|you're)\b/g, message: 'Check your/you\'re usage', severity: 'yellow' },
  { pattern: /\.{4,}/g, message: 'More than three periods', severity: 'yellow' },
]

export function scanProofread(text: string): QAFinding[] {
  const findings: QAFinding[] = []
  const counts = new Map<string, number>()
  for (const { pattern, message, severity } of PROOFREAD_PATTERNS) {
    pattern.lastIndex = 0
    let m: RegExpExecArray | null
    while ((m = pattern.exec(text)) !== null) {
      const n = (counts.get(message) ?? 0) + 1
      counts.set(message, n)
      if (n <= 5) {
        findings.push({
          severity,
          message,
          passage: text.slice(Math.max(0, m.index - 20), m.index + m[0].length + 20),
          location: { offset: m.index },
        })
      }
    }
  }
  // Surface counts > 5 as a summary line
  counts.forEach((n, msg) => {
    if (n > 5) {
      findings.push({
        severity: 'yellow',
        message: `${msg}: ${n} instances total (only first 5 shown above)`,
      })
    }
  })
  return findings
}

// ------------------------------------------------------------
// Layer 7: LLM Pattern Detector — the anti-AI tells
// ------------------------------------------------------------
const LLM_TELLS = [
  { pattern: /\bdelve\b/gi, message: '"delve" — classic LLM tell' },
  { pattern: /\btapestry\b/gi, message: '"tapestry" — classic LLM tell' },
  { pattern: /\bnavigate the complexit/gi, message: '"navigate the complexities" — LLM tell' },
  { pattern: /\bit'?s worth noting\b/gi, message: '"it\'s worth noting" — LLM tell' },
  { pattern: /\bin conclusion\b/gi, message: '"in conclusion" — LLM tell' },
  { pattern: /\bmoreover\b/gi, message: '"moreover" — formal transition (LLM tendency)' },
  { pattern: /\bfurthermore\b/gi, message: '"furthermore" — formal transition (LLM tendency)' },
  { pattern: /\bcrucial\b/gi, message: '"crucial" — vague intensifier (LLM tendency)' },
  { pattern: /\bvital\b/gi, message: '"vital" — vague intensifier (LLM tendency)' },
]

export function scanLLMPatterns(text: string): QAFinding[] {
  const findings: QAFinding[] = []

  // Direct vocabulary tells
  for (const { pattern, message } of LLM_TELLS) {
    pattern.lastIndex = 0
    let m: RegExpExecArray | null
    let count = 0
    while ((m = pattern.exec(text)) !== null && count < 3) {
      findings.push({
        severity: 'yellow',
        message,
        passage: text.slice(Math.max(0, m.index - 25), m.index + m[0].length + 25),
        location: { offset: m.index },
      })
      count++
    }
  }

  // "Not X. Y." constructions — fragment then short sentence
  const notXY = /\bNot\s+[\w'-]+\.\s+[A-Z][\w'-]+\./g
  let m: RegExpExecArray | null
  let nxyCount = 0
  while ((m = notXY.exec(text)) !== null && nxyCount < 3) {
    findings.push({
      severity: 'yellow',
      message: '"Not X. Y." construction — LLM rhythm tell',
      passage: m[0],
      location: { offset: m.index },
    })
    nxyCount++
  }

  // Tricolons: three short clauses separated by commas, each ≤4 words
  const sentences = splitIntoSentences(text)
  let tricolonCount = 0
  for (let i = 0; i < sentences.length && tricolonCount < 3; i++) {
    const parts = sentences[i].split(',').map((s) => s.trim())
    if (parts.length === 3 && parts.every((p) => p.split(/\s+/).length <= 4)) {
      findings.push({
        severity: 'yellow',
        message: 'Tricolon — three short parallel clauses (LLM rhythm tell)',
        passage: sentences[i],
      })
      tricolonCount++
    }
  }

  // Identical sentence lengths in sequence (4+ sentences within ±1 word)
  let runStart = 0
  for (let i = 1; i < sentences.length; i++) {
    const prev = sentences[i - 1].split(/\s+/).length
    const cur = sentences[i].split(/\s+/).length
    if (Math.abs(prev - cur) > 1) {
      if (i - runStart >= 4) {
        findings.push({
          severity: 'green',
          message: `Sentence rhythm: ${i - runStart} consecutive sentences of similar length`,
          passage: sentences.slice(runStart, i).join(' ').slice(0, 200),
        })
      }
      runStart = i
    }
  }

  return findings
}

// ------------------------------------------------------------
// Master runner
// ------------------------------------------------------------
export interface QABundle {
  duplicates: QAFinding[]
  fragments: QAFinding[]
  wordCountSanity: QAFinding[]
  bibleConsistency: QAFinding[]
  timeline: QAFinding[]
  proofread: QAFinding[]
  llmPatterns: QAFinding[]
}

export async function runAllQA(projectId: ID, text: string): Promise<QABundle> {
  const [duplicates, fragments, wordCountSanity, bibleConsistency, timeline, proofread, llmPatterns] =
    await Promise.all([
      Promise.resolve(scanDuplicates(text)),
      Promise.resolve(scanFragments(text)),
      Promise.resolve(scanWordCountSanity(text)),
      scanBibleConsistency(projectId, text),
      Promise.resolve(scanTimeline(text)),
      Promise.resolve(scanProofread(text)),
      Promise.resolve(scanLLMPatterns(text)),
    ])
  return { duplicates, fragments, wordCountSanity, bibleConsistency, timeline, proofread, llmPatterns }
}

export function overallStatus(bundle: QABundle): 'green' | 'yellow' | 'red' {
  const all = [
    ...bundle.duplicates,
    ...bundle.fragments,
    ...bundle.wordCountSanity,
    ...bundle.bibleConsistency,
    ...bundle.timeline,
    ...bundle.proofread,
    ...bundle.llmPatterns,
  ]
  if (all.some((f) => f.severity === 'red')) return 'red'
  if (all.some((f) => f.severity === 'yellow')) return 'yellow'
  return 'green'
}
