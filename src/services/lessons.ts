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

/**
 * Từ thuộc các bài đã học tới: tới bài "Học tiếp" (bài đầu tiên chưa xong),
 * hoặc tới bài xa nhất đã xong nếu học vượt. Ôn tập chỉ lấy các từ này,
 * để từ của bài chưa học (vd. lỡ gặp ở trang Luyện tập tự do) không lọt vào lượt ôn.
 */
export function reachedWordIds(get: (id: string) => WordProgress): Set<string> {
  let last = 0
  let firstOpen = -1
  LESSONS.forEach((l, i) => {
    if (lessonStats(l, get).done) last = i
    else if (firstOpen < 0) firstOpen = i
  })
  const upto = Math.max(last, firstOpen < 0 ? LESSONS.length - 1 : firstOpen)
  return new Set(LESSONS.slice(0, upto + 1).flatMap((l) => l.words))
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

/**
 * Câu đưa cho giọng đọc: đọc đúng theo furigana thay vì để máy tự đoán âm chữ Hán
 * (máy hay đọc sai: 何時 → "itsu", 七時 → "nanaji", 家を → "kao", 町 → "chou"…).
 * - は/へ nằm trong cách đọc của từ (はし, はなします, へや) → viết katakana ハ/ヘ để luôn đọc "ha"/"he".
 * - Trợ từ は/へ đứng sát chữ Hán → viết わ/え (không thì "せんしゅうははたらき" bị đọc "ha").
 * Đã kiểm bằng giọng Microsoft Haruka trên toàn bộ ~1800 câu có furigana.
 */
export function rubySpeech(text: string): string {
  const parts = parseRuby(text)
  return parts
    .map((p, i) => {
      if (typeof p !== 'string') return p.rt.replace(/は/g, 'ハ').replace(/へ/g, 'ヘ')
      let s = p
      if (i > 0) s = s.replace(/^[はへ]/, (c) => (c === 'は' ? 'わ' : 'え'))
      if (i < parts.length - 1) s = s.replace(/[はへ](?=\s*$)/, (c) => (c === 'は' ? 'わ' : 'え'))
      return s
    })
    .join('')
}
