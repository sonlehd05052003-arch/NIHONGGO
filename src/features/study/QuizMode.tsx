import React, { useCallback, useEffect, useRef, useState } from 'react'
import { CheckCircle2, XCircle, Volume2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useProgress } from '@/hooks/useProgress'
import { pickDistractors, shuffle, speak } from '@/services/vocabularyService'
import type { QuizDirection, VocabularyItem } from '@/types'
import { ResultView, SessionHeader, type ModeProps } from './shared'

type QType = 'jp-vi' | 'vi-jp' | 'reading'

interface Question {
  word: VocabularyItem
  type: QType
  options: VocabularyItem[]
}

const PROMPTS: Record<QType, string> = {
  'jp-vi': 'Nghĩa của từ này là gì?',
  'vi-jp': 'Từ tiếng Nhật nào có nghĩa này?',
  reading: 'Cách đọc đúng của từ này là gì?',
}

const kanaOf = (w: VocabularyItem) => w.kana.split('、')[0]

function makeQuestions(deck: VocabularyItem[], direction: QuizDirection): Question[] {
  return deck.map((word) => {
    let type: QType = direction === 'mixed' ? (['jp-vi', 'vi-jp'] as const)[Math.floor(Math.random() * 2)] : direction
    if (direction === 'mixed' && word.kanji && Math.random() < 0.3) type = 'reading'
    const valueOf =
      type === 'jp-vi' ? (w: VocabularyItem) => w.meaningVi : type === 'reading' ? kanaOf : (w: VocabularyItem) => w.kanji || w.kana
    return { word, type, options: shuffle([word, ...pickDistractors(word, 3, valueOf)]) }
  })
}

export const QuizMode: React.FC<ModeProps & { direction: QuizDirection }> = ({
  deck,
  direction,
  onExit,
  onRestart,
}) => {
  const { recordAnswer } = useProgress()
  const [questions] = useState(() => makeQuestions(deck, direction))
  const [idx, setIdx] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [wrong, setWrong] = useState<VocabularyItem[]>([])
  const timer = useRef<number | undefined>(undefined)

  const done = idx >= questions.length
  const q = questions[idx]

  const next = useCallback(() => {
    window.clearTimeout(timer.current)
    setSelected(null)
    setIdx((i) => i + 1)
  }, [])

  const choose = useCallback(
    (i: number) => {
      if (selected !== null || !q) return
      setSelected(i)
      const ok = q.options[i].id === q.word.id
      recordAnswer(q.word.id, ok)
      if (ok) timer.current = window.setTimeout(next, 700)
      else setWrong((w) => [...w, q.word])
    },
    [q, selected, recordAnswer, next],
  )

  useEffect(() => () => window.clearTimeout(timer.current), [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') return onExit()
      if (done) return
      const n = Number(e.key)
      if (n >= 1 && n <= 4) choose(n - 1)
      else if (e.key === 'Enter' && selected !== null) next()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [choose, next, selected, done, onExit])

  if (done) {
    const score = questions.length - wrong.length
    return (
      <ResultView
        title={score === questions.length ? 'Xuất sắc! 🎉' : 'Hoàn thành bài trắc nghiệm'}
        scoreText={
          <>
            Đúng <b className="hl">{score}</b> / {questions.length} câu ({Math.round((score / questions.length) * 100)}%)
          </>
        }
        deck={deck}
        wrong={wrong}
        onExit={onExit}
        onRestart={onRestart}
      />
    )
  }

  const { word, type, options } = q
  const label = (w: VocabularyItem) =>
    type === 'jp-vi' ? w.meaningVi : type === 'reading' ? kanaOf(w) : w.kanji ? `${w.kanji}（${kanaOf(w)}）` : w.kana

  return (
    <>
      <SessionHeader title="Trắc nghiệm" current={idx} total={questions.length} onExit={onExit} right={`${idx + 1} / ${questions.length}`} />

      <div className="q-box">
        <p className="q-prompt">{PROMPTS[type]}</p>
        {type === 'vi-jp' ? (
          <div className="q-main vi">{word.meaningVi}</div>
        ) : (
          <div className="q-main jp">
            {word.kanji || word.kana}
            <button className="icon-btn" onClick={() => speak(word.kana)} title="Nghe phát âm">
              <Volume2 size={20} />
            </button>
          </div>
        )}
        {type === 'jp-vi' && word.kanji && <div className="q-sub">{word.kana}</div>}
      </div>

      <div className="q-options">
        {options.map((o, i) => {
          let cls = ''
          if (selected !== null) {
            if (o.id === word.id) cls = 'correct'
            else if (i === selected) cls = 'incorrect'
            else cls = 'dim'
          }
          return (
            <button key={o.id} className={`q-option ${cls}`} onClick={() => choose(i)} disabled={selected !== null}>
              <span className="q-key">{i + 1}</span>
              <span className={`q-text ${type === 'jp-vi' ? '' : 'jp'}`}>{label(o)}</span>
              {cls === 'correct' && <CheckCircle2 size={20} />}
              {cls === 'incorrect' && <XCircle size={20} />}
            </button>
          )
        })}
      </div>

      {selected !== null && options[selected].id !== word.id && (
        <div className="q-feedback">
          <div>
            <b>{word.kanji || word.kana}</b> {word.kanji && `(${word.kana})`} · {word.romaji} — {word.meaningVi}
          </div>
          <Button onClick={next}>Tiếp tục (Enter)</Button>
        </div>
      )}
    </>
  )
}
