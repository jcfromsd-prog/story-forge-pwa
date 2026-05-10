import { NavLink } from 'react-router-dom'
import { clsx } from '@/lib/util'

const NAV = [
  { to: '/capture', label: 'Capture', icon: '🎙️', kbd: '1' },
  { to: '/bible', label: 'Bible', icon: '📖', kbd: '2' },
  { to: '/editor', label: 'Editor', icon: '✍️', kbd: '3' },
  { to: '/versions', label: 'Versions', icon: '🌳', kbd: '4' },
  { to: '/qa', label: 'QA Checker', icon: '✅', kbd: '5' },
  { to: '/research', label: 'Research', icon: '📚', kbd: '6' },
  { to: '/voice', label: 'Voice Profile', icon: '🗣️', kbd: '7' },
  { to: '/pipeline', label: 'Pipeline', icon: '🚀', kbd: '8' },
]

export default function Sidebar() {
  return (
    <aside className="flex h-full w-56 flex-col border-r border-ink-800 bg-ink-900/50">
      <div className="flex items-center gap-2 border-b border-ink-800 px-4 py-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-accent-500/20 text-accent-500">
          <span className="text-lg font-bold">S</span>
        </div>
        <div>
          <div className="text-sm font-semibold text-ink-100">StoryForge</div>
          <div className="text-[10px] uppercase tracking-wider text-ink-500">Voice-first writing</div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto p-2">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              clsx(
                'group mb-1 flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                isActive ? 'bg-ink-800 text-ink-100' : 'text-ink-400 hover:bg-ink-800/50 hover:text-ink-100',
              )
            }
          >
            <span className="text-base">{item.icon}</span>
            <span className="flex-1">{item.label}</span>
            <span className="rounded bg-ink-800 px-1.5 py-0.5 text-[10px] text-ink-500 group-hover:bg-ink-700">
              {item.kbd}
            </span>
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-ink-800 p-2">
        <NavLink
          to="/projects"
          className={({ isActive }) =>
            clsx(
              'mb-1 flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
              isActive ? 'bg-ink-800 text-ink-100' : 'text-ink-400 hover:bg-ink-800/50 hover:text-ink-100',
            )
          }
        >
          <span className="text-base">📁</span>
          <span>Projects</span>
        </NavLink>
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            clsx(
              'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
              isActive ? 'bg-ink-800 text-ink-100' : 'text-ink-400 hover:bg-ink-800/50 hover:text-ink-100',
            )
          }
        >
          <span className="text-base">⚙️</span>
          <span>Settings</span>
        </NavLink>
      </div>
    </aside>
  )
}
