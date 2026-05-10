import { useState } from 'react'
import { clsx } from '@/lib/util'

interface Stage {
  number: number
  name: string
  description: string
  budget: { low: number; high: number }
  whatAICanDo: string[]
}

const STAGES: Stage[] = [
  {
    number: 1,
    name: 'Final Manuscript Prep',
    description: 'Last QA pass, beta reader feedback, final voice profile pass.',
    budget: { low: 0, high: 50 },
    whatAICanDo: ['Run all 7 QA layers', 'Continuity scan', 'Voice match pass', 'Suggest final revisions'],
  },
  {
    number: 2,
    name: 'KDP Account',
    description: 'Create Amazon KDP account, set up tax info, payment.',
    budget: { low: 0, high: 0 },
    whatAICanDo: ['Generate author bio', 'Pre-fill account fields'],
  },
  {
    number: 3,
    name: 'Cover Design',
    description: 'Commission or design ebook + paperback covers.',
    budget: { low: 50, high: 800 },
    whatAICanDo: ['Generate design brief from manuscript themes', 'Suggest cover copy'],
  },
  {
    number: 4,
    name: 'Formatting',
    description: 'Format .epub for Kindle and .docx/.pdf for paperback.',
    budget: { low: 0, high: 200 },
    whatAICanDo: ['Generate .docx with proper templates', 'Generate .epub', 'TOC + front matter'],
  },
  {
    number: 5,
    name: 'Metadata & SEO',
    description: 'Pick 3 categories, 7 keyword phrases, write description.',
    budget: { low: 0, high: 0 },
    whatAICanDo: ['Category recommender from manuscript', 'Keyword generator', 'A/B description variants'],
  },
  {
    number: 6,
    name: 'ARC Campaign',
    description: 'Recruit 100 readers, send .epub, monitor reading, schedule reminders.',
    budget: { low: 0, high: 200 },
    whatAICanDo: ['Recruitment pitch emails', 'Reminder sequence', 'Compliance check on all messages'],
  },
  {
    number: 7,
    name: 'Launch Day',
    description: 'Coordinated launch: ads on, social posts, email blast, ARC reviews land.',
    budget: { low: 0, high: 500 },
    whatAICanDo: ['Launch announcement copy', '30-day social calendar', 'Coordinated post scheduling'],
  },
  {
    number: 8,
    name: 'Book Description & A+ Content',
    description: 'KDP listing HTML description and A+ visual content.',
    budget: { low: 0, high: 100 },
    whatAICanDo: ['KDP-compatible HTML description', '3 variants for A/B test', 'A+ Content copy'],
  },
  {
    number: 9,
    name: 'Post-Launch Marketing',
    description: 'Ads, BookBub apps, Reddit AMA, ongoing social.',
    budget: { low: 50, high: 1000 },
    whatAICanDo: ['Ad copy variants', 'AMA prep', 'Email newsletter templates'],
  },
  {
    number: 10,
    name: 'KDP Select Decision',
    description: 'At day 90: stay exclusive in KDP Select or go wide.',
    budget: { low: 0, high: 0 },
    whatAICanDo: ['Auto-recommendation from KU read % + sales trend', 'Wide-distribution checklist'],
  },
  {
    number: 11,
    name: 'ISBN & Distribution',
    description: 'Buy ISBNs if going wide, set up D2D / IngramSpark / Apple Books.',
    budget: { low: 0, high: 295 },
    whatAICanDo: ['ISBN allocation tracker', 'Distribution checklist'],
  },
  {
    number: 12,
    name: 'Film/TV Rights',
    description: 'Pitch screenplay + novel to managers/production companies.',
    budget: { low: 0, high: 500 },
    whatAICanDo: ['One-sheet', 'Query letter', 'Evidence packet (auto-updating)', 'Target company list'],
  },
]

type Status = 'not_started' | 'in_progress' | 'completed' | 'blocked'

export default function PipelinePage() {
  const [statuses, setStatuses] = useState<Record<number, Status>>(() => {
    try {
      return JSON.parse(localStorage.getItem('sf:pipeline') ?? '{}')
    } catch {
      return {}
    }
  })

  const setStatus = (num: number, s: Status) => {
    const next = { ...statuses, [num]: s }
    setStatuses(next)
    localStorage.setItem('sf:pipeline', JSON.stringify(next))
  }

  const totalLow = STAGES.reduce((s, st) => s + st.budget.low, 0)
  const totalHigh = STAGES.reduce((s, st) => s + st.budget.high, 0)
  const completed = Object.values(statuses).filter((s) => s === 'completed').length

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink-100">Publishing Pipeline</h1>
          <p className="mt-1 text-sm text-ink-400">
            12 stages from finished manuscript to film/TV rights. AI handles what it can.
          </p>
        </div>
        <div className="flex gap-4 text-xs">
          <div>
            <div className="label">Progress</div>
            <div className="text-lg text-ink-100">
              {completed} / {STAGES.length}
            </div>
          </div>
          <div>
            <div className="label">Budget range</div>
            <div className="text-lg text-ink-100">
              ${totalLow} – ${totalHigh.toLocaleString()}
            </div>
          </div>
        </div>
      </header>

      <p className="mb-4 rounded-md border border-yellow-700 bg-yellow-900/20 p-3 text-xs text-yellow-200">
        Phase 5/6 of the build: marketing copy generator, ARC manager, financial dashboard, and
        film/TV pitch builder are scaffolded here. The full automation in each stage gets wired up
        next.
      </p>

      <div className="space-y-3">
        {STAGES.map((stage) => {
          const status = statuses[stage.number] ?? 'not_started'
          return (
            <div
              key={stage.number}
              className={clsx(
                'card flex flex-col gap-3 transition md:flex-row md:items-start',
                status === 'completed' && 'opacity-60',
              )}
            >
              <div className="flex items-center gap-3 md:w-12">
                <div
                  className={clsx(
                    'flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold',
                    status === 'completed' && 'bg-green-500/30 text-green-300',
                    status === 'in_progress' && 'bg-accent-500/30 text-accent-500',
                    status === 'blocked' && 'bg-red-500/30 text-red-300',
                    status === 'not_started' && 'bg-ink-800 text-ink-400',
                  )}
                >
                  {stage.number}
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-medium text-ink-100">{stage.name}</h3>
                <p className="text-sm text-ink-400">{stage.description}</p>
                <div className="mt-2 text-xs text-ink-500">
                  Budget: ${stage.budget.low}–${stage.budget.high}
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {stage.whatAICanDo.map((cap) => (
                    <span key={cap} className="chip bg-accent-500/10 text-accent-500/90">
                      ✨ {cap}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex gap-1">
                {(['not_started', 'in_progress', 'blocked', 'completed'] as Status[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatus(stage.number, s)}
                    className={clsx(
                      'btn px-2 py-1 text-[10px]',
                      status === s ? 'bg-accent-500 text-ink-950' : 'bg-ink-800 text-ink-300',
                    )}
                  >
                    {s.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
