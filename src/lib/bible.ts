import { Bible } from './data'
import type { BibleRecord, ID } from '@/types'

export async function lockRecord(id: ID, locked: boolean): Promise<void> {
  await Bible.update(id, { locked })
}

export async function scanForBibleViolations(
  projectId: ID,
  text: string,
): Promise<{ record: BibleRecord; violation: string }[]> {
  const records = await Bible.list(projectId)
  const locked = records.filter((r) => r.locked)
  const violations: { record: BibleRecord; violation: string }[] = []
  const lower = text.toLowerCase()
  for (const r of locked) {
    for (const neg of r.negativeConstraints) {
      const stripped = neg.replace(/^(does\s+)?not\s+/i, '').trim()
      if (stripped.length < 3) continue
      if (lower.includes(stripped.toLowerCase())) {
        violations.push({ record: r, violation: stripped })
      }
    }
  }
  return violations
}
