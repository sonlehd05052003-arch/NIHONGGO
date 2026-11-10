import React, { createContext, useCallback, useContext, useMemo } from 'react'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import type { ProgressState, WordProgress } from '@/types'

const today = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function computeStreak(days: string[]): number {
  const set = new Set(days)
  const d = new Date()
  const key = (x: Date) =>
    `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`
  // Chưa học hôm nay thì vẫn giữ chuỗi tính tới hôm qua
  if (!set.has(key(d))) d.setDate(d.getDate() - 1)
  let streak = 0
  while (set.has(key(d))) {
    streak++
    d.setDate(d.getDate() - 1)
  }
  return streak
}

interface ProgressContextValue {
  progress: ProgressState
  streak: number
  knownCount: number
  get: (id: string) => WordProgress
  setKnown: (id: string, known: boolean) => void
  toggleStar: (id: string) => void
  recordAnswer: (id: string, correct: boolean) => void
  resetProgress: () => void
}

const EMPTY: ProgressState = { words: {}, studyDays: [] }
const ProgressContext = createContext<ProgressContextValue | null>(null)

export const ProgressProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [progress, setProgress] = useLocalStorage<ProgressState>('nihongo_progress_v1', EMPTY)

  const update = useCallback(
    (id: string, fn: (p: WordProgress) => WordProgress, markStudy = true) => {
      setProgress((prev) => {
        const t = today()
        return {
          words: { ...prev.words, [id]: fn(prev.words[id] ?? {}) },
          studyDays:
            markStudy && !prev.studyDays.includes(t) ? [...prev.studyDays, t].slice(-400) : prev.studyDays,
        }
      })
    },
    [setProgress],
  )

  const value = useMemo<ProgressContextValue>(() => {
    const words = progress.words ?? {}
    return {
      progress,
      streak: computeStreak(progress.studyDays ?? []),
      knownCount: Object.values(words).filter((w) => w.known).length,
      get: (id) => words[id] ?? {},
      setKnown: (id, known) => update(id, (p) => ({ ...p, known })),
      toggleStar: (id) => update(id, (p) => ({ ...p, starred: !p.starred }), false),
      recordAnswer: (id, correct) =>
        update(id, (p) =>
          correct ? { ...p, correct: (p.correct ?? 0) + 1 } : { ...p, wrong: (p.wrong ?? 0) + 1 },
        ),
      resetProgress: () => setProgress(EMPTY),
    }
  }, [progress, update, setProgress])

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>
}

// eslint-disable-next-line react/only-export-components
export function useProgress() {
  const ctx = useContext(ProgressContext)
  if (!ctx) throw new Error('useProgress phải được dùng trong ProgressProvider')
  return ctx
}
