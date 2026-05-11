// Manuscript import — parses .docx / .txt / .md / .fountain into plain text
// and auto-marks Part / Chapter headings so the Editor's chapter parser picks
// them up (lines starting with "# ").

const ROMAN = '[IVXLCDM]+'
const NUM = '\\d+'
const WORDS = '(?:One|Two|Three|Four|Five|Six|Seven|Eight|Nine|Ten|Eleven|Twelve|Thirteen|Fourteen|Fifteen|Sixteen|Seventeen|Eighteen|Nineteen|Twenty(?:[\\s-]?\\w+)?)'

const HEADER_REGEXES = [
  // Parts
  new RegExp(`^(Part|PART)\\s+(${NUM}|${ROMAN}|${WORDS})\\b.*$`, 'i'),
  // Chapters
  new RegExp(`^(Chapter|CHAPTER)\\s+(${NUM}|${ROMAN}|${WORDS})\\b.*$`, 'i'),
  // Prologue / Epilogue
  /^(Prologue|PROLOGUE|Epilogue|EPILOGUE|Foreword|FOREWORD|Afterword|AFTERWORD)\b.*$/,
]

/** Detect whether a line looks like a part/chapter heading. */
function isHeader(line: string): boolean {
  const t = line.trim()
  if (!t) return false
  if (t.length > 120) return false // headings are short
  return HEADER_REGEXES.some((r) => r.test(t))
}

/** Convert detected headings to `# Heading` lines. Leave everything else alone. */
function markHeaders(text: string): string {
  return text
    .split('\n')
    .map((line) => (isHeader(line) ? `# ${line.trim()}` : line))
    .join('\n')
    // collapse 3+ blank lines down to 2
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/**
 * Extract text from a File. Handles .docx via mammoth (dynamically imported
 * so the bundle stays small until the user actually imports). Falls back to
 * plain-text reading for everything else.
 */
export async function extractTextFromFile(file: File): Promise<string> {
  const name = file.name.toLowerCase()
  if (name.endsWith('.docx')) {
    const mammoth = await import('mammoth/mammoth.browser')
    const arrayBuffer = await file.arrayBuffer()
    const result = await mammoth.extractRawText({ arrayBuffer })
    return result.value
  }
  if (
    name.endsWith('.txt') ||
    name.endsWith('.md') ||
    name.endsWith('.markdown') ||
    name.endsWith('.fountain') ||
    name.endsWith('.fdx') ||
    name.endsWith('')
  ) {
    return await file.text()
  }
  throw new Error(
    `Unsupported file type: ${file.name}. Try .docx, .txt, .md, or .fountain. If you have a different format, save as .docx or .txt first.`,
  )
}

/** Full pipeline: file → text → auto-marked-headers manuscript. */
export async function importManuscript(file: File): Promise<{
  content: string
  chapters: number
  words: number
  warnings: string[]
}> {
  const warnings: string[] = []
  let raw = await extractTextFromFile(file)
  if (!raw.trim()) {
    throw new Error('File appears to be empty.')
  }

  // Some .docx exports include weird whitespace; normalize
  raw = raw.replace(/\r\n/g, '\n').replace(/ /g, ' ')

  const marked = markHeaders(raw)
  const chapters = (marked.match(/^#\s+/gm) ?? []).length
  const words = marked.trim().split(/\s+/).filter(Boolean).length

  if (chapters === 0) {
    warnings.push(
      'No "Part" or "Chapter" lines detected. The manuscript imported as one big chapter — you can add `# Chapter 1`, `# Chapter 2`, etc. manually to split it.',
    )
  }
  if (words < 100) {
    warnings.push(`Only ${words} words detected — make sure the file actually contained your manuscript.`)
  }

  return { content: marked, chapters, words, warnings }
}
