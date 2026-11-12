import type { SrsState, WordProgress } from '@/types'

/** Số ngày chờ trước lần ôn tiếp theo theo từng hộp (hộp 0 = phải ôn ngay) */
export const SRS_INTERVALS = [0, 1, 3, 7, 14, 30, 60]
export const SRS_MAX_BOX = SRS_INTERVALS.length - 1

export const dayKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

export const addDays = (days: number, from = new Date()) => {
  const d = new Date(from)
  d.setDate(d.getDate() + days)
  return dayKey(d)
}

/**
 * Cập nhật lịch ôn sau một câu trả lời.
 * - Đúng khi từ đã đến hạn (hoặc từ mới) → lên một hộp, giãn lịch ôn.
 * - Đúng khi chưa đến hạn (ôn sớm) → giữ nguyên, tránh "nhảy hộp" nhiều lần trong một ngày.
 * - Sai → về hộp 0, phải ôn lại ngay hôm nay.
 */
export function nextSrs(prev: SrsState | undefined, correct: boolean): SrsState {
  const today = dayKey()
  if (!correct) return { box: 0, due: today }
  if (prev && prev.due > today) return prev
  const box = Math.min((prev?.box ?? 0) + 1, SRS_MAX_BOX)
  return { box, due: addDays(SRS_INTERVALS[box]) }
}

export const isDue = (p: WordProgress, today = dayKey()) => !!p.srs && p.srs.due <= today

/** Một từ được coi là "đã học" khi đã đánh dấu thuộc hoặc đã trả lời đúng ít nhất một lần theo lịch */
export const isLearned = (p: WordProgress) => !!p.known || (p.srs?.box ?? 0) >= 1

export const SRS_LABELS = ['Mới sai', 'Mới học', 'Đang nhớ', 'Khá nhớ', 'Nhớ tốt', 'Rất chắc', 'Thành thạo']
