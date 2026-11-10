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
  example?: {
    japanese: string
    vietnamese: string
  }
}

export interface WordProgress {
  known?: boolean
  starred?: boolean
  correct?: number
  wrong?: number
}

export interface ProgressState {
  words: Record<string, WordProgress>
  /** Các ngày có học, dạng YYYY-MM-DD */
  studyDays: string[]
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
