import React, { useEffect, useRef } from 'react'
import { CheckCircle2, XCircle, Lightbulb, Volume2, RotateCcw, ArrowRight, PenLine } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Ruby } from '@/components/ui/Ruby'
import { useSessionState } from '@/hooks/useSessionState'
import { useKanjiReadings } from '@/hooks/useKanjiReadings'
import { useProgress } from '@/hooks/useProgress'
import { rubyKana, rubySpeech, rubyPlain } from '@/services/lessons'
import { checkJapanese, checkVietnamese } from '@/services/sentenceCheck'
import { sfx } from '@/services/sound'
import { speakSentence } from '@/services/vocabularyService'
import type { WritingExercise } from '@/types'

type Filter = 'all' | 'jv' | 'vj'
const FILTERS: [Filter, string][] = [
  ['all', 'Tất cả'],
  ['jv', 'Nhật → Việt'],
  ['vj', 'Việt → Nhật'],
]

interface Answer {
  input: string
  ok: boolean
  /** Người học tự xác nhận là đúng */
  overridden?: boolean
  close?: boolean
}

/** Bước "Viết câu": dịch cả câu Nhật → Việt và Việt → Nhật */
export const WritingView: React.FC<{ lessonId: string; exercises: WritingExercise[] }> = ({ lessonId, exercises }) => {
  const { progress, setWritingScore, addXp } = useProgress()
  // Lưu tạm theo bài để chuyển sang bước khác rồi quay lại vẫn làm tiếp được
  const k = `nihongo_wr_${lessonId}_${exercises.length}`
  const [filter, setFilter] = useSessionState<Filter>(`${k}_filter`, 'all')
  /** Danh sách chỉ số câu của lượt hiện tại */
  const [queue, setQueue] = useSessionState<number[]>(
    `${k}_queue`,
    () => exercises.map((_, i) => i),
    (q) => Array.isArray(q) && q.every((i) => i >= 0 && i < exercises.length),
  )
  const [pos, setPos] = useSessionState(`${k}_pos`, 0)
  const [input, setInput] = useSessionState(`${k}_input`, '')
  const [answers, setAnswers] = useSessionState<Record<number, Answer>>(`${k}_answers`, {})
  const [showHint, setShowHint] = useSessionState(`${k}_hint`, false)
  const inputRef = useRef<HTMLInputElement>(null)
  const best = progress.writing?.[lessonId]

  const readings = useKanjiReadings()

  const done = pos >= queue.length
  const idx = queue[pos]
  const ex = exercises[idx]
  const answer = idx !== undefined ? answers[idx] : undefined

  useEffect(() => {
    if (!done && !answer) inputRef.current?.focus()
  }, [pos, done, answer])

  const start = (f: Filter, only?: number[]) => {
    setFilter(f)
    setQueue(only ?? exercises.map((_, i) => i).filter((i) => f === 'all' || exercises[i].dir === f))
    setPos(0)
    setInput('')
    setAnswers({})
    setShowHint(false)
  }

  const check = () => {
    if (!ex || answer || !input.trim()) return
    let ok: boolean
    let close = false
    if (ex.dir === 'vj') ok = checkJapanese(input, ex, readings)
    else {
      const r = checkVietnamese(input, ex)
      ok = r.ok
      close = !ok && r.similarity >= 0.5
    }
    setAnswers((a) => ({ ...a, [idx]: { input, ok, close } }))
    if (ok) {
      sfx.correct(1)
      addXp(4)
    } else sfx.wrong()
  }

  const override = () => {
    setAnswers((a) => ({ ...a, [idx]: { ...a[idx], ok: true, overridden: true } }))
    addXp(4)
    sfx.correct(1)
  }

  const next = () => {
    const nextPos = pos + 1
    setPos(nextPos)
    setInput('')
    setShowHint(false)
    if (nextPos >= queue.length) {
      const correct = queue.filter((i) => answers[i]?.ok).length
      // Chỉ lưu điểm khi làm trọn bộ câu của bài
      if (filter === 'all' && queue.length === exercises.length) setWritingScore(lessonId, correct / queue.length)
      if (correct === queue.length) window.setTimeout(() => sfx.complete(), 250)
    }
  }

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (answer) next()
    else check()
  }

  // Enter ở bất kỳ đâu khi đã chấm → câu tiếp theo
  useEffect(() => {
    if (!answer) return
    const onKey = (e: KeyboardEvent) => {
      // Trong ô nhập thì form tự xử lý; trên nút thì để nút tự bấm
      if (e.key === 'Enter' && !(e.target instanceof HTMLButtonElement) && !(e.target instanceof HTMLInputElement)) {
        e.preventDefault()
        next()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const filterBar = (
    <div className="wr-top">
      <div className="chip-group" role="radiogroup" aria-label="Chiều dịch">
        {FILTERS.map(([f, label]) => (
          <button
            key={f}
            role="radio"
            aria-checked={filter === f}
            className={`chip ${filter === f ? 'active' : ''}`}
            onClick={() => start(f)}
          >
            {label}
          </button>
        ))}
      </div>
      {best !== undefined && <span className="reading-best">Tốt nhất: {Math.round(best * 100)}%</span>}
    </div>
  )

  if (done) {
    const correct = queue.filter((i) => answers[i]?.ok).length
    const wrong = queue.filter((i) => !answers[i]?.ok)
    return (
      <div className="writing">
        {filterBar}
        <div className={`wr-result ${correct === queue.length ? 'perfect' : ''}`}>
          <PenLine size={28} />
          <h3>
            Đúng {correct}/{queue.length} câu{correct === queue.length ? ' — xuất sắc! 🎉' : ''}
          </h3>
          <div className="wr-result-actions">
            {wrong.length > 0 && (
              <Button icon={<RotateCcw size={16} />} onClick={() => start(filter, wrong)}>
                Làm lại {wrong.length} câu sai
              </Button>
            )}
            <Button variant="outline" icon={<RotateCcw size={16} />} onClick={() => start(filter)}>
              Làm lại từ đầu
            </Button>
          </div>
        </div>
        {wrong.length > 0 && (
          <div className="wr-review">
            <h4>Xem lại câu sai</h4>
            {wrong.map((i) => (
              <div key={i} className="wr-review-item">
                <p className="wr-q">{exercises[i].dir === 'vj' ? exercises[i].vi : <Ruby text={exercises[i].jp} />}</p>
                <p className="wr-yours">Bạn viết: {answers[i]?.input || '—'}</p>
                <p className="wr-ans">
                  Đáp án: {exercises[i].dir === 'vj' ? <Ruby text={exercises[i].jp} /> : exercises[i].vi}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  const isVJ = ex.dir === 'vj'

  return (
    <div className="writing">
      {filterBar}

      <div className="wr-progress">
        <span>
          Câu {pos + 1}/{queue.length}
        </span>
        <span className="wr-bar">
          <span style={{ width: `${(pos / queue.length) * 100}%` }} />
        </span>
      </div>

      <div className="wr-card">
        <span className={`wr-dir ${ex.dir}`}>{isVJ ? 'Dịch sang tiếng Nhật' : 'Dịch sang tiếng Việt'}</span>
        {isVJ ? (
          <p className="wr-prompt">{ex.vi}</p>
        ) : (
          <div className="wr-prompt jp" lang="ja">
            <Ruby text={ex.jp} />
            <button
              type="button"
              className="icon-btn sm"
              onClick={() => speakSentence(rubySpeech(ex.jp), 0.85)}
              title="Nghe câu"
            >
              <Volume2 size={16} />
            </button>
          </div>
        )}

        {ex.hint && !answer && (
          <div className="wr-hint">
            {showHint ? (
              <p>
                <Lightbulb size={14} /> {ex.hint}
              </p>
            ) : (
              <button type="button" className="ad-link" onClick={() => setShowHint(true)}>
                <Lightbulb size={14} /> Xem gợi ý
              </button>
            )}
          </div>
        )}

        <form onSubmit={onSubmit} className="wr-form">
          <input
            ref={inputRef}
            className={`type-input ${answer ? (answer.ok ? 'correct' : 'wrong') : ''}`}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            readOnly={!!answer}
            lang={isVJ ? 'ja' : 'vi'}
            placeholder={isVJ ? 'Gõ tiếng Nhật (kana, kanji hoặc romaji)…' : 'Gõ câu tiếng Việt…'}
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            aria-label="Câu trả lời"
          />
          {!answer && (
            <Button type="submit" disabled={!input.trim()}>
              Kiểm tra
            </Button>
          )}
        </form>

        {answer && (
          <div className={`wr-feedback ${answer.ok ? 'ok' : 'bad'}`} role="status">
            <p className="wr-verdict">
              {answer.ok ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
              {answer.ok
                ? answer.overridden
                  ? 'Đã tính là đúng'
                  : 'Chính xác!'
                : answer.close
                  ? 'Gần đúng rồi — so sánh với đáp án nhé'
                  : 'Chưa đúng'}
            </p>
            <div className="wr-answer">
              <span className="wr-label">{answer.ok ? 'Đáp án mẫu' : 'Đáp án'}</span>
              {isVJ ? (
                <div className="wr-answer-jp" lang="ja">
                  <Ruby text={ex.jp} />
                  <button
                    type="button"
                    className="icon-btn sm"
                    onClick={() => speakSentence(rubySpeech(ex.jp), 0.85)}
                    title="Nghe đáp án"
                  >
                    <Volume2 size={16} />
                  </button>
                </div>
              ) : (
                <p className="wr-answer-vi">{ex.vi}</p>
              )}
              {isVJ && <p className="wr-answer-sub">{rubyKana(ex.jp) !== rubyPlain(ex.jp) ? rubyKana(ex.jp) : ''}</p>}
              {!isVJ && ex.acceptVi && ex.acceptVi.length > 0 && (
                <p className="wr-answer-sub">Cách dịch khác: {ex.acceptVi.join(' · ')}</p>
              )}
              {isVJ && ex.acceptJp && ex.acceptJp.length > 0 && (
                <p className="wr-answer-sub" lang="ja">
                  Cũng đúng: {ex.acceptJp.join('　')}
                </p>
              )}
            </div>
            <div className="wr-actions">
              {!answer.ok && (
                <button type="button" className="ad-link" onClick={override}>
                  Tôi đúng mà
                </button>
              )}
              <Button icon={<ArrowRight size={16} />} onClick={next}>
                {pos + 1 >= queue.length ? 'Xem kết quả' : 'Câu tiếp (Enter)'}
              </Button>
            </div>
          </div>
        )}
      </div>

      <p className="reading-help">
        {isVJ
          ? 'Gõ được bằng hiragana, kanji hoặc romaji (vd. "kore wa hon desu"). Không cần dấu câu.'
          : 'Câu dịch được chấm gần đúng — nếu ý bạn đúng mà máy chấm sai, bấm "Tôi đúng mà".'}
      </p>
    </div>
  )
}
