import React, { useMemo, useState } from 'react'
import { Layers, ListChecks, Keyboard, Puzzle, Play } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import { useProgress } from '@/hooks/useProgress'
import { CATEGORIES, buildDeck, shuffle } from '@/services/vocabularyService'
import type { DeckFilter, QuizDirection, StudyMode, StudySettings, VocabularyItem } from '@/types'
import { FlashcardMode } from './FlashcardMode'
import { QuizMode } from './QuizMode'
import { TypingMode } from './TypingMode'
import { MatchMode } from './MatchMode'
import type { ModeProps } from './shared'
import './StudyPage.css'

const MODES: { id: StudyMode; label: string; desc: string; icon: React.ReactNode }[] = [
  { id: 'flashcard', label: 'Thẻ ghi nhớ', desc: 'Lật thẻ, tự đánh giá thuộc / chưa thuộc', icon: <Layers size={22} /> },
  { id: 'quiz', label: 'Trắc nghiệm', desc: 'Chọn 1 trong 4 đáp án', icon: <ListChecks size={22} /> },
  { id: 'typing', label: 'Gõ đáp án', desc: 'Gõ nghĩa tiếng Việt hoặc gõ kana / romaji', icon: <Keyboard size={22} /> },
  { id: 'match', label: 'Ghép thẻ', desc: 'Ghép từ với nghĩa nhanh nhất có thể', icon: <Puzzle size={22} /> },
]

const FILTERS: { id: DeckFilter; label: string }[] = [
  { id: 'all', label: 'Tất cả' },
  { id: 'unknown', label: 'Chưa thuộc' },
  { id: 'starred', label: 'Đã gắn sao' },
  { id: 'hard', label: 'Hay sai' },
]

const COUNTS = [10, 20, 50, 0]

const DIRECTIONS: { id: QuizDirection; label: string }[] = [
  { id: 'jp-vi', label: 'Nhật → Việt' },
  { id: 'vi-jp', label: 'Việt → Nhật' },
  { id: 'mixed', label: 'Trộn lẫn' },
]

const DEFAULT_SETTINGS: StudySettings = { categories: [], filter: 'all', count: 20, direction: 'jp-vi' }

interface Session {
  mode: StudyMode
  deck: VocabularyItem[]
  key: number
}

export const StudyPage: React.FC = () => {
  const { progress } = useProgress()
  const [settings, setSettings] = useLocalStorage<StudySettings>('nihongo_study_settings', DEFAULT_SETTINGS)
  const [mode, setMode] = useLocalStorage<StudyMode>('nihongo_study_mode', 'flashcard')
  const [session, setSession] = useState<Session | null>(null)

  const pool = useMemo(
    () => buildDeck(settings.categories, settings.filter, progress),
    [settings.categories, settings.filter, progress],
  )

  const patch = (p: Partial<StudySettings>) => setSettings((s) => ({ ...s, ...p }))

  const toggleCategory = (c: (typeof CATEGORIES)[number]) => {
    const cur = settings.categories
    patch({ categories: cur.includes(c) ? cur.filter((x) => x !== c) : [...cur, c] })
  }

  const start = (deck?: VocabularyItem[]) => {
    const d = deck ?? shuffle(pool).slice(0, settings.count || undefined)
    if (d.length === 0) return
    setSession({ mode, deck: d, key: Date.now() })
  }

  if (session) {
    const common: ModeProps = {
      deck: session.deck,
      onExit: () => setSession(null),
      onRestart: (deck: VocabularyItem[]) => start(shuffle(deck)),
    }
    const k = session.key
    return (
      <div className="study-container">
        {session.mode === 'flashcard' && <FlashcardMode key={k} {...common} />}
        {session.mode === 'quiz' && <QuizMode key={k} {...common} direction={settings.direction} />}
        {session.mode === 'typing' && <TypingMode key={k} {...common} direction={settings.direction} />}
        {session.mode === 'match' && <MatchMode key={k} {...common} />}
      </div>
    )
  }

  const total = settings.count ? Math.min(settings.count, pool.length) : pool.length
  const minNeeded = mode === 'match' ? 2 : 1

  return (
    <div className="study-container">
      <div className="study-header">
        <h1 className="study-title">Luyện tập từ vựng N5</h1>
        <p className="study-sub">Chọn chế độ học và bộ từ, tiến độ được lưu tự động trên trình duyệt này.</p>
      </div>

      <section className="setup-block">
        <h2 className="setup-label">1. Chế độ học</h2>
        <div className="mode-grid">
          {MODES.map((m) => (
            <button
              key={m.id}
              className={`mode-card ${mode === m.id ? 'active' : ''}`}
              onClick={() => setMode(m.id)}
            >
              <span className="mode-icon">{m.icon}</span>
              <span className="mode-name">{m.label}</span>
              <span className="mode-desc">{m.desc}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="setup-block">
        <h2 className="setup-label">2. Bộ từ</h2>
        <div className="setup-row">
          <span className="setup-row-label">Loại từ</span>
          <div className="chip-group">
            <button
              className={`chip ${settings.categories.length === 0 ? 'active' : ''}`}
              onClick={() => patch({ categories: [] })}
            >
              Tất cả
            </button>
            {CATEGORIES.map((c) => (
              <button
                key={c}
                className={`chip ${settings.categories.includes(c) ? 'active' : ''}`}
                onClick={() => toggleCategory(c)}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
        <div className="setup-row">
          <span className="setup-row-label">Lọc</span>
          <div className="chip-group">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                className={`chip ${settings.filter === f.id ? 'active' : ''}`}
                onClick={() => patch({ filter: f.id })}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
        <div className="setup-row">
          <span className="setup-row-label">Số từ</span>
          <div className="chip-group">
            {COUNTS.map((n) => (
              <button
                key={n}
                className={`chip ${settings.count === n ? 'active' : ''}`}
                onClick={() => patch({ count: n })}
              >
                {n === 0 ? 'Tất cả' : n}
              </button>
            ))}
          </div>
        </div>
        {(mode === 'quiz' || mode === 'typing') && (
          <div className="setup-row">
            <span className="setup-row-label">Chiều hỏi</span>
            <div className="chip-group">
              {DIRECTIONS.map((d) => (
                <button
                  key={d.id}
                  className={`chip ${settings.direction === d.id ? 'active' : ''}`}
                  onClick={() => patch({ direction: d.id })}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      <div className="start-bar">
        <span className="start-info">
          {pool.length === 0
            ? 'Không có từ nào khớp bộ lọc'
            : `${total} / ${pool.length} từ phù hợp sẽ được trộn ngẫu nhiên`}
        </span>
        <Button size="lg" icon={<Play size={18} />} onClick={() => start()} disabled={total < minNeeded}>
          Bắt đầu
        </Button>
      </div>
    </div>
  )
}
