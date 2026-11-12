import lessonData from '@/data/lessons.json'
import { N5_VOCABULARY } from '@/services/vocabularyService'
import { isLearned } from '@/services/srs'
import type { Lesson, StudyContent, VocabularyItem, WordProgress } from '@/types'

export const LESSONS = lessonData as Lesson[]

const BY_ID = new Map(N5_VOCABULARY.map((w) => [w.id, w]))
export const wordById = (id: string) => BY_ID.get(id)

export const lessonWords = (lesson: Lesson): VocabularyItem[] =>
  lesson.words.map((id) => BY_ID.get(id)).filter((w): w is VocabularyItem => !!w)

/** Các chương theo đúng thứ tự xuất hiện */
export const UNITS = [...new Set(LESSONS.map((l) => l.unit))].map((unit) => ({
  unit,
  lessons: LESSONS.filter((l) => l.unit === unit),
}))

/** Hoàn thành bài khi đã học ≥ 80% số từ */
export const LESSON_PASS = 0.8

export function lessonStats(lesson: Lesson, get: (id: string) => WordProgress, readingScore?: number) {
  const learned = lesson.words.filter((id) => isLearned(get(id))).length
  const ratio = lesson.words.length ? learned / lesson.words.length : 0
  // 3 sao: thuộc đủ từ + làm bài đọc đúng hết
  const stars = (ratio >= LESSON_PASS ? 1 : 0) + (ratio >= 1 ? 1 : 0) + ((readingScore ?? 0) >= 1 ? 1 : 0)
  return { learned, total: lesson.words.length, ratio, done: ratio >= LESSON_PASS, stars }
}

// ---------------------------------------------------------------------------
// Nội dung câu ví dụ / mẹo nhớ / bài đọc: file lớn nên chỉ tải khi cần
// ---------------------------------------------------------------------------
let contentPromise: Promise<StudyContent> | null = null
export const loadContent = () =>
  (contentPromise ??= import('@/data/content.json').then((m) => m.default as unknown as StudyContent))

// ---------------------------------------------------------------------------
// Furigana dạng {漢字|かな}
// ---------------------------------------------------------------------------
export type RubyPart = string | { base: string; rt: string }

export function parseRuby(text: string): RubyPart[] {
  const parts: RubyPart[] = []
  const re = /\{([^|{}]+)\|([^{}]+)\}/g
  let last = 0
  for (let m = re.exec(text); m; m = re.exec(text)) {
    if (m.index > last) parts.push(text.slice(last, m.index))
    parts.push({ base: m[1], rt: m[2] })
    last = m.index + m[0].length
  }
  if (last < text.length) parts.push(text.slice(last))
  return parts
}

/** Bản chỉ có kanji (bỏ furigana) */
export const rubyPlain = (text: string) => text.replace(/\{([^|{}]+)\|[^{}]+\}/g, '$1')
/** Bản toàn kana, dùng cho giọng đọc để phát âm chuẩn */
export const rubyKana = (text: string) => text.replace(/\{[^|{}]+\|([^{}]+)\}/g, '$1')
