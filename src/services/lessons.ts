import lessonData from '@/data/lessons.json'
import { N5_VOCABULARY } from '@/services/vocabularyService'
import { isLearned } from '@/services/srs'
import type { Lesson, StudyContent, VocabularyItem, WordProgress } from '@/types'

export const LESSONS = lessonData as Lesson[]

const BY_ID = new Map(N5_VOCABULARY.map((w) => [w.id, w]))
export const wordById = (id: string) => BY_ID.get(id)

export const lessonWords = (lesson: Lesson): VocabularyItem[] =>
  lesson.words.map((id) => BY_ID.get(id)).filter((w): w is VocabularyItem => !!w)

/** Từ (kanji hoặc kana) → số thứ tự bài có từ đó (bắt đầu từ 1) */
const LESSON_OF_FORM = new Map<string, number>()
LESSONS.forEach((l, i) =>
  l.words.forEach((id) => {
    const w = BY_ID.get(id)
    if (!w) return
    for (const f of [w.kanji, ...w.kana.split('、')]) if (f && !LESSON_OF_FORM.has(f)) LESSON_OF_FORM.set(f, i + 1)
  }),
)
export const lessonOfWord = (form: string) => LESSON_OF_FORM.get(form)

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
/** Bản toàn kana (dùng để chấm / so sánh) */
export const rubyKana = (text: string) => text.replace(/\{[^|{}]+\|([^{}]+)\}/g, '$1')

/** Chữ Hán có nhiều cách đọc mà giọng máy hay đọc nhầm → đưa kana theo furigana */
const SPEAK_AS_KANA = new Set(['何', '一日', '方', '私|わたくし'])

/**
 * Câu đưa cho giọng đọc. Giữ chữ Hán (để máy tách từ đúng: trợ từ は đọc "wa", へ đọc "e";
 * nếu đưa toàn kana thì "先週は働き…" thành "せんしゅうははたらき…" và は bị đọc "ha"),
 * chỉ đổi sang kana ở vài chữ Hán dễ đọc nhầm.
 */
export const rubySpeech = (text: string) =>
  text.replace(/\{([^|{}]+)\|([^{}]+)\}/g, (_, base: string, kana: string) =>
    SPEAK_AS_KANA.has(base) || SPEAK_AS_KANA.has(`${base}|${kana}`) ? kana : base,
  )
