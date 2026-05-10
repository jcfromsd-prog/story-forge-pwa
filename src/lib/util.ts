export function uuid(): string {
  return crypto.randomUUID()
}

export function wordCount(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0
}

// 250 wpm reading speed approximation
export function readingMinutes(text: string): number {
  return Math.max(1, Math.round(wordCount(text) / 250))
}

// Industry rule: roughly one screenplay page per minute, ~250 words/page.
export function screenplayPages(text: string): number {
  return Math.max(1, Math.round(wordCount(text) / 250))
}

export function formatTimestamp(ms: number): string {
  const d = new Date(ms)
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

export function relativeTime(ms: number): string {
  const diff = Date.now() - ms
  const s = Math.floor(diff / 1000)
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return `${d}d ago`
}

export function splitIntoSentences(text: string): string[] {
  // Rough but useful: split on sentence-ending punctuation followed by whitespace + capital letter
  return text.replace(/\s+/g, ' ').split(/(?<=[.!?])\s+(?=[A-Z"'])/g).filter(Boolean)
}

export function splitIntoParagraphs(text: string): string[] {
  return text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean)
}

export function parseChapters(content: string): { title: string; body: string; index: number }[] {
  // Split on lines starting with `# ` (chapter headers).
  const lines = content.split('\n')
  const chapters: { title: string; body: string; index: number }[] = []
  let current: { title: string; body: string[]; index: number } | null = null
  for (const line of lines) {
    if (/^#\s+/.test(line)) {
      if (current) chapters.push({ ...current, body: current.body.join('\n') })
      current = { title: line.replace(/^#\s+/, '').trim(), body: [], index: chapters.length + 1 }
    } else if (current) {
      current.body.push(line)
    } else {
      // Content before the first chapter — synthesize a Prologue
      current = { title: 'Prologue', body: [line], index: 1 }
    }
  }
  if (current) chapters.push({ ...current, body: current.body.join('\n') })
  return chapters
}

export function clsx(...parts: (string | undefined | null | false)[]): string {
  return parts.filter(Boolean).join(' ')
}

export async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}
