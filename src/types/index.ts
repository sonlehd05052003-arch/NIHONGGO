export type ThemeMode = 'light' | 'dark'

export type JlptLevel = 'N5' | 'N4' | 'N3' | 'N2' | 'N1'

export type WordCategory = 'Danh từ' | 'Động từ' | 'Tính từ い' | 'Tính từ な' | 'Từ khác'

export interface VocabularyItem {
  id: string
  /** Có thể rỗng nếu từ thường viết bằng kana */
  kanji: string
  /** Nhiều cách đọc được ngăn bởi "、" */
  kana: string
  romaji: string
  meaningVi: string
  level: JlptLevel
  category: WordCategory
  image?: WordImage
  example?: {
    japanese: string
    vietnamese: string
  }
}

export interface WordImage {
  src: string
  /** Trang mô tả ảnh trên Wikimedia Commons */
  page: string
  credit: string
  license: string
}

export interface WordProgress {
  known?: boolean
  starred?: boolean
  correct?: number
  wrong?: number
  /** Lịch ôn ngắt quãng (Leitner): hộp càng cao thì càng lâu mới phải ôn lại */
  srs?: SrsState
}

export interface SrsState {
  box: number
  /** Ngày đến hạn ôn, dạng YYYY-MM-DD */
  due: string
}

export interface ProgressState {
  words: Record<string, WordProgress>
  /** Các ngày có học, dạng YYYY-MM-DD */
  studyDays: string[]
  xp?: number
  /** Số lượt ôn trong ngày, để tính mục tiêu hằng ngày */
  daily?: { date: string; count: number }
  /** Điểm cao nhất phần đọc hiểu của từng bài (0..1) */
  readings?: Record<string, number>
}

export interface Lesson {
  id: string
  unit: string
  title: string
  words: string[]
}

export interface WordExample {
  /** Câu ví dụ, kanji có furigana dạng {漢字|かな} */
  jp: string
  vi: string
  tip: string
}

export interface ReadingQuestion {
  q: string
  options: string[]
  answer: number
}

export interface Reading {
  title: string
  titleVi: string
  lines: { jp: string; vi: string }[]
  questions: ReadingQuestion[]
}

export interface StudyContent {
  examples: Record<string, WordExample>
  readings: Record<string, Reading>
}

export type StudyMode = 'flashcard' | 'quiz' | 'typing' | 'match'
export type DeckFilter = 'all' | 'unknown' | 'starred' | 'hard'
export type QuizDirection = 'jp-vi' | 'vi-jp' | 'mixed'

export interface StudySettings {
  categories: WordCategory[]
  filter: DeckFilter
  count: number // 0 = tất cả
  direction: QuizDirection
}
