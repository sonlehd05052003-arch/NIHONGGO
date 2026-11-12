import React, { useCallback, useEffect, useState } from 'react'
import { Volume2, Star, Check, X as XIcon, ArrowLeftRight, RotateCcw, Lightbulb } from 'lucide-react'
import { Ruby } from '@/components/ui/Ruby'
import { WordImage } from '@/components/ui/WordImage'
import { useContent } from '@/hooks/useContent'
import { useProgress } from '@/hooks/useProgress'
import { rubyKana } from '@/services/lessons'
import { preloadImage, speak, speakSentence } from '@/services/vocabularyService'
import { isSoundOn, sfx } from '@/services/sound'
import type { VocabularyItem } from '@/types'
import { ResultView, SessionHeader, type ModeProps } from './shared'
import { isFromControl } from './keys'
import { useSessionGame } from './useSessionGame'

export const FlashcardMode: React.FC<ModeProps> = ({ deck, onExit, onRestart }) => {
  const { get, setKnown, toggleStar, recordAnswer } = useProgress()
  const game = useSessionGame()
  const content = useContent()
  const [idx, setIdx] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [frontVi, setFrontVi] = useState(false)
  const [unknown, setUnknown] = useState<VocabularyItem[]>([])
  const [exit, setExit] = useState<'left' | 'right' | null>(null)

  const done = idx >= deck.length
  const word = deck[idx]

  useEffect(() => {
    preloadImage(deck[idx])
    preloadImage(deck[idx + 1])
  }, [deck, idx])

  const flip = useCallback(() => {
    // Lật sang mặt có tiếng Nhật thì tự đọc phát âm
    const showingJpNext = frontVi ? !flipped : false
    if (word && isSoundOn() && (showingJpNext || (!frontVi && !flipped))) speak(word.kana)
    setFlipped(!flipped)
    sfx.flip()
  }, [frontVi, flipped, word])

  const answer = useCallback(
    (known: boolean) => {
      if (!word || exit) return
      setKnown(word.id, known)
      recordAnswer(word.id, known)
      if (known) game.hit(5)
      else {
        game.miss(true)
        setUnknown((u) => [...u, word])
      }
      // Hiệu ứng thẻ bay sang trái/phải rồi mới chuyển thẻ
      setExit(known ? 'right' : 'left')
      window.setTimeout(() => {
        setExit(null)
        setFlipped(false)
        setIdx((i) => i + 1)
      }, 260)
    },
    [word, exit, setKnown, recordAnswer, game],
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') return onExit()
      if (done) return
      if ((e.key === ' ' || e.key === 'Enter') && isFromControl(e)) return
      if (e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault()
        flip()
      } else if (e.key === 'ArrowLeft' || e.key === '1') answer(false)
      else if (e.key === 'ArrowRight' || e.key === '2') answer(true)
      else if (e.key.toLowerCase() === 's') toggleStar(word.id)
      else if (e.key.toLowerCase() === 'p') speak(word.kana)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [answer, flip, done, word, onExit, toggleStar])

  if (done) {
    const knownCount = deck.length - unknown.length
    return (
      <ResultView
        title="Hoàn thành bộ thẻ!"
        scoreText={
          <>
            Đã thuộc <b className="hl">{knownCount}</b> / {deck.length} từ
          </>
        }
        accuracy={knownCount / deck.length}
        game={game}
        deck={deck}
        wrong={unknown}
        wrongLabel="Từ chưa thuộc"
        onExit={onExit}
        onRestart={onRestart}
      />
    )
  }

  const starred = !!get(word.id).starred
  const example = content?.examples[word.id]
  const jpFace = <div className="fc-jp">{word.kanji || word.kana}</div>
  const viFace = (
    <>
      <WordImage word={word} credit />
      <div className="fc-vi">{word.meaningVi}</div>
    </>
  )

  return (
    <>
      <SessionHeader title="Thẻ ghi nhớ" current={idx} total={deck.length} onExit={onExit} game={game} />

      <div className="fc-toolbar">
        <span className="tag">{word.category}</span>
        <button className="icon-btn" onClick={() => setFrontVi((v) => !v)} title="Đổi mặt trước">
          <ArrowLeftRight size={18} />
        </button>
        <button className="icon-btn" onClick={() => speak(word.kana)} title="Nghe phát âm (P)">
          <Volume2 size={18} />
        </button>
        <button
          className={`icon-btn ${starred ? 'starred' : ''}`}
          onClick={() => toggleStar(word.id)}
          title="Gắn sao (S)"
        >
          <Star size={18} fill={starred ? 'currentColor' : 'none'} />
        </button>
      </div>

      <div className="fc-scene" onClick={flip}>
        <div key={word.id} className={`fc-slot ${exit ? `exit-${exit}` : 'enter'}`}>
          <div className={`fc-card ${flipped ? 'flipped' : ''}`}>
            <div className="fc-face fc-front">{frontVi ? viFace : jpFace}</div>
            <div className="fc-face fc-back">
              {frontVi ? (
                <>
                  <div className="fc-jp">{word.kanji || word.kana}</div>
                  {word.kanji && <div className="fc-kana">{word.kana}</div>}
                  <div className="fc-romaji">{word.romaji}</div>
                </>
              ) : (
                <>
                  {viFace}
                  <div className="fc-back-jp">
                    {word.kanji || word.kana}
                    {word.kanji && <span>{word.kana}</span>}
                    <em>{word.romaji}</em>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="fc-hint">
          <RotateCcw size={13} /> Nhấn thẻ hoặc phím Space để lật
        </div>
      </div>

      {flipped && example && (
        <div className="fc-extra">
          <button className="wc-example" onClick={() => speakSentence(rubyKana(example.jp), 0.85)} title="Nghe câu ví dụ">
            <Ruby text={example.jp} />
          </button>
          <p className="wc-example-vi">{example.vi}</p>
          <p className="wc-tip">
            <Lightbulb size={14} /> {example.tip}
          </p>
        </div>
      )}

      <div className="fc-actions">
        <button className="fc-btn bad" onClick={() => answer(false)}>
          <XIcon size={20} /> Chưa thuộc <kbd>←</kbd>
        </button>
        <button className="fc-btn good" onClick={() => answer(true)}>
          <Check size={20} /> Đã thuộc <kbd>→</kbd>
        </button>
      </div>
    </>
  )
}
