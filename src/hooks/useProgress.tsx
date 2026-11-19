import React, { createContext, useCallback, useContext, useMemo } from 'react'
import { CloudProvider } from '@/hooks/useCloud'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import { EMPTY_PROGRESS, mergeProgress } from '@/services/progressMerge'
import { dayKey as today, isDue, nextSrs } from '@/services/srs'
import type { LessonVideo, ProgressState, VideoNote, WordProgress } from '@/types'

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
  setWritingScore: (lessonId: string, score: number) => void
  setDictationScore: (lessonId: string, score: number) => void
  /** Ghi nhận đã xem tới tỉ lệ `fraction` của video (chỉ tăng) */
  setVideoWatched: (videoId: string, fraction: number) => void
  addVideoNote: (videoId: string, note: Omit<VideoNote, 'id'>) => void
  removeVideoNote: (videoId: string, noteId: string) => void
  addMyVideo: (lessonId: string, video: LessonVideo) => void
  removeMyVideo: (lessonId: string, videoId: string) => void
  resetProgress: () => void
  /** Thay tiến độ bằng dữ liệu khác (vd. từ file sao lưu); merge = gộp với tiến độ hiện có */
  replaceProgress: (p: ProgressState, merge?: boolean) => void
}

const EMPTY = EMPTY_PROGRESS
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
      setWritingScore: (lessonId, score) =>
        setProgress((prev) => {
          const best = Math.max(prev.writing?.[lessonId] ?? 0, score)
          return { ...prev, writing: { ...prev.writing, [lessonId]: best } }
        }),
      setDictationScore: (lessonId, score) =>
        setProgress((prev) => {
          const best = Math.max(prev.dictation?.[lessonId] ?? 0, score)
          return { ...prev, dictation: { ...prev.dictation, [lessonId]: best } }
        }),
      setVideoWatched: (videoId, fraction) =>
        setProgress((prev) => {
          const f = Math.min(1, Math.round(fraction * 100) / 100)
          if ((prev.videosWatched?.[videoId] ?? 0) >= f) return prev
          return { ...prev, videosWatched: { ...prev.videosWatched, [videoId]: f } }
        }),
      addVideoNote: (videoId, note) =>
        setProgress((prev) => {
          const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
          const list = [...(prev.videoNotes?.[videoId] ?? []), { ...note, id }].sort((x, y) => x.t - y.t)
          return { ...prev, videoNotes: { ...prev.videoNotes, [videoId]: list } }
        }),
      removeVideoNote: (videoId, noteId) =>
        setProgress((prev) => ({
          ...prev,
          videoNotes: { ...prev.videoNotes, [videoId]: (prev.videoNotes?.[videoId] ?? []).filter((n) => n.id !== noteId) },
        })),
      addMyVideo: (lessonId, video) =>
        setProgress((prev) => {
          const list = prev.myVideos?.[lessonId] ?? []
          if (list.some((v) => v.id === video.id)) return prev
          return { ...prev, myVideos: { ...prev.myVideos, [lessonId]: [...list, video] } }
        }),
      removeMyVideo: (lessonId, videoId) =>
        setProgress((prev) => ({
          ...prev,
          myVideos: { ...prev.myVideos, [lessonId]: (prev.myVideos?.[lessonId] ?? []).filter((v) => v.id !== videoId) },
        })),
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
      replaceProgress: (p, merge = false) => setProgress((prev) => (merge ? mergeProgress(prev, p) : p)),
    }
  }, [progress, update, setProgress])

  return (
    <ProgressContext.Provider value={value}>
      <CloudProvider progress={progress} setProgress={setProgress}>
        {children}
      </CloudProvider>
    </ProgressContext.Provider>
  )
}

// eslint-disable-next-line react/only-export-components
export function useProgress() {
  const ctx = useContext(ProgressContext)
  if (!ctx) throw new Error('useProgress phải được dùng trong ProgressProvider')
  return ctx
}
