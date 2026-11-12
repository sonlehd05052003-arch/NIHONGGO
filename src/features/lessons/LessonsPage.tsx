import React, { useMemo, useState } from 'react'
import { Brain, CheckCircle2, Play, Star, Trophy, CalendarClock } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import { useProgress } from '@/hooks/useProgress'
import { LESSONS, UNITS, lessonStats, lessonWords, wordById } from '@/services/lessons'
import { addDays, dayKey } from '@/services/srs'
import { shuffle } from '@/services/vocabularyService'
import type { QuizDirection, StudyMode, VocabularyItem } from '@/types'
import { StudySession, type Session } from '@/features/study/StudySession'
import { LessonDetail, type Step } from './LessonDetail'
import './LessonsPage.css'

const REVIEW_MODES: { mode: StudyMode; label: string }[] = [
  { mode: 'quiz', label: 'Trắc nghiệm' },
  { mode: 'typing', label: 'Gõ đáp án' },
  { mode: 'flashcard', label: 'Thẻ ghi nhớ' },
]
const REVIEW_MAX = 30

export const LessonsPage: React.FC = () => {
  const { get, progress, dueIds } = useProgress()
  const [openId, setOpenId] = useLocalStorage<string | null>('nihongo_open_lesson', null)
  const [reviewMode, setReviewMode] = useLocalStorage<StudyMode>('nihongo_review_mode', 'quiz')
  const [session, setSession] = useState<(Session & { direction: QuizDirection }) | null>(null)
  // Bước mở đầu khi vào một bài (mặc định "Học từ"; "Bài đọc tiếp theo" thì mở thẳng bài đọc)
  const [openStep, setOpenStep] = useState<Step>('learn')
  const openLesson = (id: string | null) => {
    setOpenStep('learn')
    setOpenId(id)
  }

  const stats = useMemo(
    () => new Map(LESSONS.map((l) => [l.id, lessonStats(l, get, progress.readings?.[l.id])])),
    [get, progress.readings],
  )
  const nextLesson = LESSONS.find((l) => !stats.get(l.id)!.done) ?? LESSONS[LESSONS.length - 1]
  const doneCount = LESSONS.filter((l) => stats.get(l.id)!.done).length

  // Số từ đến hạn ngày mai (để người học biết trước khối lượng)
  const tomorrowCount = useMemo(() => {
    const t = dayKey()
    const tm = addDays(1)
    return Object.values(progress.words).filter((p) => p.srs && p.srs.due > t && p.srs.due <= tm).length
  }, [progress.words])

  const start = (mode: StudyMode, deck: VocabularyItem[], direction: QuizDirection = 'jp-vi') => {
    if (deck.length < (mode === 'match' ? 2 : 1)) return
    setSession({ mode, deck, direction, key: Date.now() })
    window.scrollTo({ top: 0 })
  }

  const startReview = () => {
    const deck = shuffle(dueIds.map(wordById).filter((w): w is VocabularyItem => !!w)).slice(0, REVIEW_MAX)
    start(reviewMode, deck, 'mixed')
  }

  const openIdx = LESSONS.findIndex((l) => l.id === openId)
  const open = openIdx >= 0 ? LESSONS[openIdx] : null

  const sessionView = session && (
    <StudySession
      session={session}
      direction={session.direction}
      onExit={() => setSession(null)}
      onRestart={(deck) => start(session.mode, shuffle(deck), session.direction)}
    />
  )

  if (open) {
    return (
      <>
        {sessionView}
        {/* Giữ trang bài học trong DOM để quay lại đúng bước đang làm */}
        <div className="lessons-container" hidden={!!session}>
          <LessonDetail
            key={open.id}
            lesson={open}
            index={openIdx}
            onBack={() => openLesson(null)}
            initialStep={openStep}
            onNext={
              openIdx < LESSONS.length - 1
                ? (step) => {
                    setOpenStep(step)
                    setOpenId(LESSONS[openIdx + 1].id)
                    window.scrollTo({ top: 0 })
                  }
                : undefined
            }
            onPractice={(mode, direction) => start(mode, shuffle(lessonWords(open)), direction)}
          />
        </div>
      </>
    )
  }

  if (sessionView) return sessionView

  return (
    <div className="lessons-container">
      <div className="lessons-header">
        <h1 className="lessons-title">Lộ trình N5</h1>
        <p className="lessons-sub">
          {LESSONS.length} bài nhỏ theo chủ đề · mỗi bài ~12 từ, có câu ví dụ, mẹo nhớ và bài đọc. Đã hoàn thành{' '}
          <b>
            {doneCount}/{LESSONS.length}
          </b>{' '}
          bài.
        </p>
      </div>

      <div className="lessons-top">
        <section className="review-card">
          <div className="review-icon">
            <Brain size={26} />
          </div>
          <div className="review-body">
            <h2>Ôn tập hôm nay</h2>
            {dueIds.length > 0 ? (
              <p>
                Có <b>{dueIds.length}</b> từ sắp quên cần ôn lại
                {dueIds.length > REVIEW_MAX ? ` (mỗi lượt ${REVIEW_MAX} từ)` : ''}.
              </p>
            ) : (
              <p>
                Không có từ nào đến hạn 🎉
                {tomorrowCount > 0 && (
                  <span className="review-muted">
                    {' '}
                    <CalendarClock size={13} /> Ngày mai: {tomorrowCount} từ
                  </span>
                )}
              </p>
            )}
            <div className="chip-group">
              {REVIEW_MODES.map((m) => (
                <button
                  key={m.mode}
                  className={`chip ${reviewMode === m.mode ? 'active' : ''}`}
                  onClick={() => setReviewMode(m.mode)}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
          <Button icon={<Play size={16} />} onClick={startReview} disabled={dueIds.length === 0}>
            Ôn ngay
          </Button>
        </section>

        <section className="continue-card">
          <span className="continue-label">Học tiếp</span>
          <h2>
            Bài {LESSONS.indexOf(nextLesson) + 1}: {nextLesson.title}
          </h2>
          <p>
            {nextLesson.unit} · {nextLesson.words.length} từ
          </p>
          <Button variant="secondary" icon={<Play size={16} />} onClick={() => openLesson(nextLesson.id)}>
            Vào học
          </Button>
        </section>
      </div>

      <p className="srs-explain">
        💡 Mỗi lần bạn trả lời đúng, từ đó sẽ được hẹn ôn lại sau 1 → 3 → 7 → 14 → 30 → 60 ngày. Trả lời sai thì phải
        ôn lại ngay hôm nay. Chỉ cần ôn đều mục <b>Ôn tập hôm nay</b> là nhớ lâu.
      </p>

      {UNITS.map(({ unit, lessons }) => (
        <section key={unit} className="unit">
          <h2 className="unit-title">{unit}</h2>
          <div className="lesson-grid">
            {lessons.map((l) => {
              const s = stats.get(l.id)!
              const n = LESSONS.indexOf(l) + 1
              const isNext = l.id === nextLesson.id
              return (
                <button
                  key={l.id}
                  className={`lesson-card ${s.done ? 'done' : ''} ${isNext ? 'next' : ''}`}
                  onClick={() => openLesson(l.id)}
                >
                  <span className="lc-num">{s.done ? <CheckCircle2 size={20} /> : n}</span>
                  <span className="lc-main">
                    <span className="lc-title">{l.title}</span>
                    <span className="lc-meta">
                      {s.learned}/{s.total} từ
                      {isNext && <span className="lc-badge">Học tiếp</span>}
                    </span>
                    <span className="lc-bar">
                      <span style={{ width: `${s.ratio * 100}%` }} />
                    </span>
                  </span>
                  <span className="lc-stars" title="⭐ học 80% · ⭐ học hết · ⭐ bài đọc đúng hết">
                    {[0, 1, 2].map((i) => (
                      <Star key={i} size={14} className={i < s.stars ? 'on' : ''} fill="currentColor" />
                    ))}
                  </span>
                </button>
              )
            })}
          </div>
        </section>
      ))}

      {doneCount === LESSONS.length && (
        <p className="all-done">
          <Trophy size={18} /> Bạn đã hoàn thành toàn bộ lộ trình N5. Tiếp tục ôn tập hằng ngày để giữ từ nhé!
        </p>
      )}
    </div>
  )
}
