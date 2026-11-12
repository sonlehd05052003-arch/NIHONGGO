import React, { useState } from 'react'
import { ArrowLeft, ArrowRight, BookOpen, Dumbbell, FileText, Volume2, Star, Lightbulb, Check, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Ruby } from '@/components/ui/Ruby'
import { WordImage } from '@/components/ui/WordImage'
import { useContent } from '@/hooks/useContent'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import { useProgress } from '@/hooks/useProgress'
import { lessonStats, lessonWords, rubyKana } from '@/services/lessons'
import { isLearned } from '@/services/srs'
import { speak, speakSentence } from '@/services/vocabularyService'
import type { Lesson, QuizDirection, StudyMode } from '@/types'
import { ReadingView } from './ReadingView'

export type Step = 'learn' | 'practice' | 'read'

const PRACTICE: { mode: StudyMode; label: string; desc: string }[] = [
  { mode: 'flashcard', label: '① Thẻ ghi nhớ', desc: 'Làm quen: lật thẻ, tự đánh giá' },
  { mode: 'quiz', label: '② Trắc nghiệm', desc: 'Nhận diện: chọn nghĩa đúng' },
  { mode: 'match', label: '③ Ghép thẻ', desc: 'Phản xạ: ghép từ với nghĩa' },
  { mode: 'typing', label: '④ Gõ đáp án', desc: 'Nhớ sâu: tự gõ ra đáp án' },
]

export const LessonDetail: React.FC<{
  lesson: Lesson
  index: number
  onBack: () => void
  initialStep?: Step
  /** Mở bài kế tiếp, ở bước được chỉ định */
  onNext?: (step: Step) => void
  onPractice: (mode: StudyMode, direction: QuizDirection) => void
}> = ({ lesson, index, initialStep = 'learn', onBack, onNext, onPractice }) => {
  const { get, toggleStar, progress } = useProgress()
  const content = useContent()
  const [step, setStep] = useState<Step>(initialStep)
  const [furigana, setFurigana] = useLocalStorage('nihongo_furigana', true)
  const [direction, setDirection] = useLocalStorage<QuizDirection>('nihongo_lesson_direction', 'jp-vi')
  const words = lessonWords(lesson)
  const stats = lessonStats(lesson, get, progress.readings?.[lesson.id])
  const reading = content?.readings[lesson.id]

  const steps: { id: Step; label: string; icon: React.ReactNode; done: boolean }[] = [
    { id: 'learn', label: 'Học từ', icon: <BookOpen size={16} />, done: stats.learned > 0 },
    { id: 'practice', label: 'Luyện tập', icon: <Dumbbell size={16} />, done: stats.done },
    { id: 'read', label: 'Bài đọc', icon: <FileText size={16} />, done: (progress.readings?.[lesson.id] ?? 0) > 0 },
  ]

  const go = (s: Step) => {
    setStep(s)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className={`lesson-detail ${furigana ? '' : 'no-furigana'}`}>
      <div className="ld-top">
        <button className="icon-btn" onClick={onBack} title="Về danh sách bài">
          <ArrowLeft size={20} />
        </button>
        <div className="ld-heading">
          <span className="ld-unit">
            Bài {index + 1} · {lesson.unit}
          </span>
          <h1 className="ld-title">{lesson.title}</h1>
        </div>
        <button
          className={`chip ${furigana ? 'active' : ''}`}
          onClick={() => setFurigana(!furigana)}
          title="Bật/tắt furigana"
        >
          {furigana ? <Eye size={14} /> : <EyeOff size={14} />} Furigana
        </button>
      </div>

      <div className="ld-progress">
        <div className="ld-progress-bar">
          <span style={{ width: `${stats.ratio * 100}%` }} />
        </div>
        <span>
          Đã học {stats.learned}/{stats.total} từ
        </span>
      </div>

      <div className="ld-steps" role="tablist">
        {steps.map((s, i) => (
          <button
            key={s.id}
            role="tab"
            aria-selected={step === s.id}
            className={`ld-step ${step === s.id ? 'active' : ''} ${s.done ? 'done' : ''}`}
            onClick={() => go(s.id)}
          >
            <span className="ld-step-num">{s.done ? <Check size={14} /> : i + 1}</span>
            {s.icon}
            <span>{s.label}</span>
          </button>
        ))}
      </div>

      {step === 'learn' && (
        <>
          <p className="ld-hint">
            Đọc to từng từ, xem ảnh và câu ví dụ. Khi thấy đã quen mặt hết thì sang bước <b>Luyện tập</b>.
          </p>
          <div className="word-cards">
            {words.map((w) => {
              const ex = content?.examples[w.id]
              const p = get(w.id)
              return (
                <article key={w.id} className={`word-card ${isLearned(p) ? 'learned' : ''}`}>
                  <div className="wc-img">
                    <WordImage word={w} size="tile" credit />
                  </div>
                  <div className="wc-body">
                    <div className="wc-head">
                      <div className="wc-jp" lang="ja">
                        <span className="wc-word">{w.kanji || w.kana}</span>
                        {w.kanji && <span className="wc-kana">{w.kana}</span>}
                        <span className="wc-romaji">{w.romaji}</span>
                      </div>
                      <div className="wc-actions">
                        <button className="icon-btn sm" onClick={() => speak(w.kana)} title="Nghe phát âm">
                          <Volume2 size={16} />
                        </button>
                        <button
                          className={`icon-btn sm ${p.starred ? 'starred' : ''}`}
                          onClick={() => toggleStar(w.id)}
                          title="Gắn sao"
                        >
                          <Star size={16} fill={p.starred ? 'currentColor' : 'none'} />
                        </button>
                      </div>
                    </div>
                    <p className="wc-meaning">{w.meaningVi}</p>
                    {ex ? (
                      <>
                        <button className="wc-example" onClick={() => speakSentence(rubyKana(ex.jp), 0.85)} title="Nghe câu ví dụ">
                          <Ruby text={ex.jp} />
                          <Volume2 size={14} className="wc-ex-icon" />
                        </button>
                        <p className="wc-example-vi">{ex.vi}</p>
                        <p className="wc-tip">
                          <Lightbulb size={14} /> {ex.tip}
                        </p>
                      </>
                    ) : (
                      !content && <p className="wc-loading">Đang tải câu ví dụ…</p>
                    )}
                  </div>
                </article>
              )
            })}
          </div>
          <div className="ld-footer">
            <Button size="lg" icon={<ArrowRight size={18} />} onClick={() => go('practice')}>
              Sang luyện tập
            </Button>
          </div>
        </>
      )}

      {step === 'practice' && (
        <>
          <p className="ld-hint">
            Làm lần lượt từ ① đến ④ — mỗi chế độ khó hơn một chút. Bài được tính <b>hoàn thành</b> khi bạn đã
            học ít nhất 80% số từ.
          </p>
          <div className="setup-row ld-direction">
            <span className="setup-row-label">Chiều hỏi</span>
            <div className="chip-group">
              {(
                [
                  ['jp-vi', 'Nhật → Việt'],
                  ['vi-jp', 'Việt → Nhật'],
                  ['mixed', 'Trộn lẫn'],
                ] as const
              ).map(([id, label]) => (
                <button key={id} className={`chip ${direction === id ? 'active' : ''}`} onClick={() => setDirection(id)}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="practice-grid">
            {PRACTICE.map((m) => (
              <button key={m.mode} className="practice-card" onClick={() => onPractice(m.mode, direction)}>
                <span className="pc-label">{m.label}</span>
                <span className="pc-desc">{m.desc}</span>
                <ArrowRight size={18} className="pc-arrow" />
              </button>
            ))}
          </div>
          <div className="ld-footer">
            <Button variant="outline" icon={<ArrowLeft size={16} />} onClick={() => go('learn')}>
              Xem lại từ
            </Button>
            <Button size="lg" icon={<FileText size={18} />} onClick={() => go('read')}>
              Sang bài đọc
            </Button>
          </div>
        </>
      )}

      {step === 'read' && (
        <>
          {reading ? (
            <ReadingView key={lesson.id} lessonId={lesson.id} reading={reading} words={words} />
          ) : (
            <p className="ld-hint">{content ? 'Bài này chưa có bài đọc.' : 'Đang tải bài đọc…'}</p>
          )}
          <div className="ld-footer">
            <Button variant="outline" icon={<ArrowLeft size={16} />} onClick={() => go('practice')}>
              Luyện tập thêm
            </Button>
            {onNext && (
              <>
                <Button variant="secondary" icon={<BookOpen size={16} />} onClick={() => onNext('learn')}>
                  Học bài tiếp theo
                </Button>
                <Button size="lg" icon={<ArrowRight size={18} />} onClick={() => onNext('read')}>
                  Bài đọc tiếp theo
                </Button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}
