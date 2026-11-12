import React, { createContext, useCallback, useContext, useMemo } from 'react'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import { dayKey as today, isDue, nextSrs } from '@/services/srs'
import type { ProgressState, WordProgress } from '@/types'

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
  xp: number
  todayCount: number
  addXp: (amount: number) => void
  get: (id: string) => WordProgress
  setKnown: (id: string, known: boolean) => void
  toggleStar: (id: string) => void
  recordAnswer: (id: string, correct: boolean) => void
  /** Các từ đến hạn ôn hôm nay theo lịch ôn ngắt quãng */
  dueIds: string[]
  setReadingScore: (lessonId: string, score: number) => void
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
          ...prev,
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
    const t = today()
    const dueIds = Object.keys(words).filter((id) => isDue(words[id], t))
    return {
      progress,
      streak: computeStreak(progress.studyDays ?? []),
      knownCount: Object.values(words).filter((w) => w.known).length,
      xp: progress.xp ?? 0,
      todayCount: progress.daily?.date === today() ? progress.daily.count : 0,
      addXp: (amount) => setProgress((prev) => ({ ...prev, xp: (prev.xp ?? 0) + amount })),
      get: (id) => words[id] ?? {},
      setKnown: (id, known) => update(id, (p) => ({ ...p, known })),
      toggleStar: (id) => update(id, (p) => ({ ...p, starred: !p.starred }), false),
      dueIds,
      setReadingScore: (lessonId, score) =>
        setProgress((prev) => {
          const best = Math.max(prev.readings?.[lessonId] ?? 0, score)
          return { ...prev, readings: { ...prev.readings, [lessonId]: best } }
        }),
      recordAnswer: (id, correct) => {
        update(id, (p) => ({
          ...p,
          ...(correct ? { correct: (p.correct ?? 0) + 1 } : { wrong: (p.wrong ?? 0) + 1 }),
          srs: nextSrs(p.srs, correct),
        }))
        setProgress((prev) => {
          const t = today()
          const count = prev.daily?.date === t ? prev.daily.count : 0
          return { ...prev, daily: { date: t, count: count + 1 } }
        })
      },
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
