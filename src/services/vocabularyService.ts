import type { DeckFilter, ProgressState, VocabularyItem, WordCategory } from '@/types'
import n5Data from '@/data/n5.json'

export const N5_VOCABULARY = n5Data as VocabularyItem[]

export const CATEGORIES: WordCategory[] = ['Danh từ', 'Động từ', 'Tính từ い', 'Tính từ な', 'Từ khác']

/** Chữ hiển thị chính: Kanji nếu có, ngược lại là kana */
export const displayText = (w: VocabularyItem) => w.kanji || w.kana

export function shuffle<T>(arr: readonly T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function buildDeck(
  categories: WordCategory[],
  filter: DeckFilter,
  progress: ProgressState,
): VocabularyItem[] {
  const cats = new Set(categories.length ? categories : CATEGORIES)
  return N5_VOCABULARY.filter((w) => {
    if (!cats.has(w.category)) return false
    const p = progress.words[w.id]
    switch (filter) {
      case 'unknown':
        return !p?.known
      case 'starred':
        return !!p?.starred
      case 'hard':
        return (p?.wrong ?? 0) > (p?.correct ?? 0) / 2 && (p?.wrong ?? 0) > 0
      default:
        return true
    }
  })
}

/** Chọn n phương án nhiễu, ưu tiên cùng loại từ, không trùng giá trị hiển thị */
export function pickDistractors(
  word: VocabularyItem,
  n: number,
  valueOf: (w: VocabularyItem) => string,
): VocabularyItem[] {
  const used = new Set([valueOf(word)])
  const result: VocabularyItem[] = []
  const pools = [
    shuffle(N5_VOCABULARY.filter((w) => w.category === word.category && w.id !== word.id)),
    shuffle(N5_VOCABULARY.filter((w) => w.category !== word.category)),
  ]
  for (const pool of pools) {
    for (const w of pool) {
      if (result.length >= n) return result
      const v = valueOf(w)
      if (!v || used.has(v)) continue
      used.add(v)
      result.push(w)
    }
  }
  return result
}

const toHiragana = (s: string) =>
  s.replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60))

/** Chuẩn hoá để so khớp lỏng: bỏ khoảng trắng/dấu, kana -> hiragana, gộp nguyên âm dài romaji */
function normalize(s: string) {
  let t = toHiragana(s.toLowerCase().normalize('NFKC')).replace(/[\s'’\-・.~〜()（）]/g, '')
  if (/^[a-z]+$/.test(t)) t = t.replace(/ou/g, 'o').replace(/([aiueo])\1/g, '$1').replace(/m(?=[bmp])/g, 'n')
  return t
}

export function checkTypedAnswer(input: string, w: VocabularyItem): boolean {
  const n = normalize(input)
  if (!n) return false
  const accepted = [
    ...w.kana.split('、'),
    ...w.romaji.split(','),
    ...(w.kanji ? [w.kanji] : []),
  ].map(normalize)
  return accepted.includes(n)
}

/** Bỏ dấu tiếng Việt, chữ thường */
export const foldVi = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd')

const cleanVi = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFC')
    .replace(/[.!?…"“”]/g, '')
    .replace(/\s+/g, ' ')
    .trim()

/** Các nghĩa chấp nhận được: cả câu, từng ý ngăn bởi , ; /, có và không có phần trong ngoặc */
export function meaningAlternatives(meaning: string): string[] {
  const withoutParens = meaning.replace(/\([^)]*\)/g, ' ')
  const parts = [meaning, withoutParens, ...withoutParens.split(/[,;/]/)]
  return [...new Set(parts.map(cleanVi).filter(Boolean))]
}

/** So nghĩa tiếng Việt: đúng một ý là được; gõ không dấu cũng chấp nhận */
export function checkMeaningAnswer(input: string, w: VocabularyItem): boolean {
  const n = cleanVi(input.replace(/\([^)]*\)/g, ' '))
  if (!n) return false
  const alts = meaningAlternatives(w.meaningVi)
  if (alts.includes(n)) return true
  const folded = foldVi(n)
  return alts.some((a) => foldVi(a) === folded)
}

export function speak(text: string) {
  if (!('speechSynthesis' in window)) return
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text.split('、')[0])
  u.lang = 'ja-JP'
  u.rate = 0.9
  window.speechSynthesis.speak(u)
}
