import React, { useEffect, useRef, useState } from 'react'
import { CheckCircle2, XCircle, Lightbulb, Volume2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useProgress } from '@/hooks/useProgress'
import { WordImage } from '@/components/ui/WordImage'
import { checkMeaningAnswer, checkTypedAnswer, meaningAlternatives, preloadImage, speak } from '@/services/vocabularyService'
import { isSoundOn } from '@/services/sound'
import type { QuizDirection, VocabularyItem } from '@/types'
import { ResultView, SessionHeader, type ModeProps } from './shared'
import { useSessionGame } from './useSessionGame'

type Status = 'idle' | 'correct' | 'wrong'
/** jp-vi: nhìn tiếng Nhật, gõ nghĩa tiếng Việt · vi-jp: nhìn nghĩa, gõ tiếng Nhật */
type Dir = 'jp-vi' | 'vi-jp'

export const TypingMode: React.FC<ModeProps & { direction: QuizDirection }> = ({
  deck,
  direction,
  onExit,
  onRestart,
}) => {
  const { recordAnswer } = useProgress()
  const game = useSessionGame()
  const [dirs] = useState<Dir[]>(() =>
    deck.map(() => (direction === 'mixed' ? (Math.random() < 0.5 ? 'jp-vi' : 'vi-jp') : direction)),
  )
  const [idx, setIdx] = useState(0)
  const [input, setInput] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [hint, setHint] = useState(0)
  const [wrong, setWrong] = useState<VocabularyItem[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const nextRef = useRef<HTMLButtonElement>(null)

  const done = idx >= deck.length
  const word = deck[idx]
  const dir = dirs[idx]

  useEffect(() => {
    preloadImage(deck[idx + 1])
    if (dirs[idx] === 'jp-vi' && deck[idx] && isSoundOn()) speak(deck[idx].kana)
  }, [deck, dirs, idx])

  useEffect(() => {
    if (status === 'idle') inputRef.current?.focus()
    else nextRef.current?.focus()
  }, [status, idx])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onExit()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onExit])

  if (done) {
    const score = deck.length - wrong.length
    return (
      <ResultView
        title="Hoàn thành phần gõ đáp án"
        accuracy={score / deck.length}
        game={game}
        scoreText={
          <>
            Đúng <b className="hl">{score}</b> / {deck.length} từ
          </>
        }
        deck={deck}
        wrong={wrong}
        onExit={onExit}
        onRestart={onRestart}
      />
    )
  }

  const markWrong = () => {
    game.miss()
    recordAnswer(word.id, false)
    setWrong((w) => [...w, word])
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (status !== 'idle') return next()
    if (!input.trim()) return
    const ok = dir === 'vi-jp' ? checkTypedAnswer(input, word) : checkMeaningAnswer(input, word)
    setStatus(ok ? 'correct' : 'wrong')
    if (ok) {
      recordAnswer(word.id, true)
      game.hit(12)
    } else markWrong()
    if (dir === 'vi-jp' && isSoundOn()) speak(word.kana)
  }

  const override = () => {
    recordAnswer(word.id, true)
    game.hit(12)
    setWrong((w) => w.filter((x) => x.id !== word.id))
    next()
  }

  const next = () => {
    setInput('')
    setStatus('idle')
    setHint(0)
    setIdx((i) => i + 1)
  }

  // Gợi ý: vi-jp gợi ý kana, jp-vi gợi ý nghĩa ngắn nhất
  const hintTarget =
    dir === 'vi-jp'
      ? word.kana.split('、')[0]
      : meaningAlternatives(word.meaningVi).reduce((a, b) => (b.length < a.length ? b : a))
  const hintText = [...hintTarget]
    .map((ch, i) => (i < hint || ch === ' ' ? ch : dir === 'vi-jp' ? '＿' : '_'))
    .join(dir === 'vi-jp' ? '' : ' ')

  return (
    <>
      <SessionHeader
        title={dir === 'vi-jp' ? 'Gõ đáp án · Việt → Nhật' : 'Gõ đáp án · Nhật → Việt'}
        current={idx}
        total={deck.length}
        onExit={onExit}
        right={`${idx + 1} / ${deck.length}`}
        game={game}
      />

      <div key={idx} className={`q-box enter ${status === 'correct' ? 'ok' : status === 'wrong' ? 'bad' : ''}`}>
        {(dir === 'vi-jp' || status !== 'idle') && word.image && <WordImage word={word} credit className="q-img" />}
        {dir === 'vi-jp' ? (
          <>
            <p className="q-prompt">Gõ từ tiếng Nhật (kana, romaji hoặc kanji) có nghĩa:</p>
            <div className="q-main vi">{word.meaningVi}</div>
          </>
        ) : (
          <>
            <p className="q-prompt">Gõ nghĩa tiếng Việt của từ:</p>
            <div className="q-main jp">
              {word.kanji || word.kana}
              <button type="button" className="icon-btn" onClick={() => speak(word.kana)} title="Nghe phát âm">
                <Volume2 size={20} />
              </button>
            </div>
            {word.kanji && <div className="q-sub">{word.kana}</div>}
          </>
        )}
        <span className="tag">{word.category}</span>
        {hint > 0 && status === 'idle' && <div className="q-hint">Gợi ý: {hintText}</div>}
      </div>

      <form className="type-form" onSubmit={submit}>
        <input
          ref={inputRef}
          className={`type-input ${status}`}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          readOnly={status !== 'idle'}
          placeholder={dir === 'vi-jp' ? 'vd: taberu hoặc たべる' : 'vd: buổi sáng (có thể gõ không dấu)'}
          lang={dir === 'vi-jp' ? 'ja' : 'vi'}
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
        />
        {status === 'idle' ? (
          <div className="type-actions">
            <Button
              type="button"
              variant="ghost"
              icon={<Lightbulb size={16} />}
              onClick={() => setHint((h) => Math.min(h + 1, hintTarget.length))}
            >
              Gợi ý
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setInput('')
                setStatus('wrong')
                markWrong()
              }}
            >
              Không biết
            </Button>
            <Button type="submit">Kiểm tra</Button>
          </div>
        ) : (
          <div className={`type-result ${status}`}>
            <div className="type-result-head">
              {status === 'correct' ? <CheckCircle2 size={22} /> : <XCircle size={22} />}
              <span>{status === 'correct' ? 'Chính xác!' : 'Chưa đúng, đáp án là:'}</span>
            </div>
            <div className="type-answer">
              <span className="jp">{word.kanji || word.kana}</span>
              {word.kanji && <span className="kana">{word.kana}</span>}
              <span className="romaji">{word.romaji}</span>
            </div>
            <div className="type-meaning">{word.meaningVi}</div>
            <div className="type-actions">
              {status === 'wrong' && input && (
                <Button type="button" variant="ghost" onClick={override}>
                  Tôi đúng mà
                </Button>
              )}
              <Button ref={nextRef} type="submit">
                Tiếp tục (Enter)
              </Button>
            </div>
          </div>
        )}
      </form>
    </>
  )
}
