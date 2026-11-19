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
  /** Điểm cao nhất phần viết câu của từng bài (0..1) */
  writing?: Record<string, number>
  /** Điểm cao nhất phần nghe chép chính tả của từng bài (0..1) */
  dictation?: Record<string, number>
  /** Tỉ lệ đã xem của từng video YouTube (0..1), theo mã video */
  videosWatched?: Record<string, number>
  /** Ghi chú trong video, theo mã video */
  videoNotes?: Record<string, VideoNote[]>
  /** Video YouTube người học tự thêm vào từng bài */
  myVideos?: Record<string, LessonVideo[]>
}

export interface VideoNote {
  /** Mã duy nhất (để gộp khi đồng bộ) */
  id: string
  /** Thời điểm trong video (giây) */
  t: number
  text: string
  /** note = ghi chú, dictation = đoạn nghe chép */
  kind?: 'note' | 'dictation'
}

export interface LessonVideo {
  /** Mã video YouTube (11 ký tự) */
  id: string
  title: string
  channel?: string
  /** Vì sao hợp với bài */
  why?: string
  level?: string
  /** Bắt đầu từ giây thứ… */
  start?: number
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

export interface GrammarPoint {
  /** Mẫu ngữ pháp, vd. "N1 は N2 です" */
  pattern: string
  meaning: string
  structure?: string
  explain: string
  note?: string
  examples: { jp: string; vi: string }[]
}

export interface WritingExercise {
  /** jv = Nhật → Việt, vj = Việt → Nhật */
  dir: 'jv' | 'vj'
  /** Câu tiếng Nhật (có furigana dạng {漢字|かな}) — đề bài (jv) hoặc đáp án (vj) */
  jp: string
  /** Câu tiếng Việt — đáp án (jv) hoặc đề bài (vj) */
  vi: string
  /** Các cách dịch tiếng Việt khác cũng đúng */
  acceptVi?: string[]
  /** Các đáp án tiếng Nhật khác cũng đúng (không furigana) */
  acceptJp?: string[]
  hint?: string
}

export interface LessonGrammar {
  points: GrammarPoint[]
  exercises: WritingExercise[]
}

export interface StudyContent {
  examples: Record<string, WordExample>
  readings: Record<string, Reading>
  grammar?: Record<string, LessonGrammar>
  /** Video YouTube gợi ý theo bài */
  videos?: Record<string, LessonVideo[]>
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
