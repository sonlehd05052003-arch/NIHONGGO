import type { ProgressState, SrsState, WordProgress } from '@/types'

export const EMPTY_PROGRESS: ProgressState = { words: {}, studyDays: [] }

/**
 * Gộp tiến độ của hai thiết bị (máy này + cloud) khi đăng nhập.
 * Nguyên tắc: không bao giờ làm mất công học — lấy phần "tiến xa hơn" của mỗi bên.
 * Hàm có tính giao hoán và gộp lại nhiều lần vẫn cho cùng kết quả.
 */
export function mergeProgress(a: ProgressState, b: ProgressState): ProgressState {
  const words: Record<string, WordProgress> = { ...a.words }
  for (const [id, w] of Object.entries(b.words ?? {})) words[id] = id in words ? mergeWord(words[id], w) : w

  const readings: Record<string, number> = { ...a.readings }
  for (const [id, s] of Object.entries(b.readings ?? {})) readings[id] = Math.max(readings[id] ?? 0, s)

  const out: ProgressState = {
    words,
    studyDays: [...new Set([...(a.studyDays ?? []), ...(b.studyDays ?? [])])].sort().slice(-400),
    xp: Math.max(a.xp ?? 0, b.xp ?? 0),
    readings,
  }
  const daily = mergeDaily(a.daily, b.daily)
  if (daily) out.daily = daily
  return out
}

function mergeWord(a: WordProgress, b: WordProgress): WordProgress {
  const w: WordProgress = {}
  if (a.known || b.known) w.known = true
  if (a.starred || b.starred) w.starred = true
  const correct = Math.max(a.correct ?? 0, b.correct ?? 0)
  const wrong = Math.max(a.wrong ?? 0, b.wrong ?? 0)
  if (correct) w.correct = correct
  if (wrong) w.wrong = wrong
  const srs = mergeSrs(a.srs, b.srs)
  if (srs) w.srs = srs
  return w
}

/** Lấy lịch ôn ở hộp cao hơn; cùng hộp thì lấy ngày đến hạn muộn hơn */
function mergeSrs(a?: SrsState, b?: SrsState): SrsState | undefined {
  if (!a || !b) return a ?? b
  if (a.box !== b.box) return a.box > b.box ? a : b
  return a.due >= b.due ? a : b
}

function mergeDaily(a?: ProgressState['daily'], b?: ProgressState['daily']) {
  if (!a || !b) return a ?? b
  if (a.date !== b.date) return a.date > b.date ? a : b
  return { date: a.date, count: Math.max(a.count, b.count) }
}
