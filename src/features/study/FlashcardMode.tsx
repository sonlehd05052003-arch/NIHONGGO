import React, { useCallback, useEffect, useState } from 'react'
import { Volume2, Star, Check, X as XIcon, ArrowLeftRight, RotateCcw } from 'lucide-react'
import { useProgress } from '@/hooks/useProgress'
import { speak } from '@/services/vocabularyService'
import type { VocabularyItem } from '@/types'
import { ResultView, SessionHeader, type ModeProps } from './shared'

export const FlashcardMode: React.FC<ModeProps> = ({ deck, onExit, onRestart }) => {
  const { get, setKnown, toggleStar } = useProgress()
  const [idx, setIdx] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [frontVi, setFrontVi] = useState(false)
  const [unknown, setUnknown] = useState<VocabularyItem[]>([])

  const done = idx >= deck.length
  const word = deck[idx]

  const answer = useCallback(
    (known: boolean) => {
      if (!word) return
      setKnown(word.id, known)
      if (!known) setUnknown((u) => [...u, word])
      setFlipped(false)
      setIdx((i) => i + 1)
    },
    [word, setKnown],
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') return onExit()
      if (done) return
      if (e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault()
        setFlipped((f) => !f)
      } else if (e.key === 'ArrowLeft' || e.key === '1') answer(false)
      else if (e.key === 'ArrowRight' || e.key === '2') answer(true)
      else if (e.key.toLowerCase() === 's') toggleStar(word.id)
      else if (e.key.toLowerCase() === 'p') speak(word.kana)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [answer, done, word, onExit, toggleStar])

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
        deck={deck}
        wrong={unknown}
        wrongLabel="Từ chưa thuộc"
        onExit={onExit}
        onRestart={onRestart}
      />
    )
  }

  const starred = !!get(word.id).starred
  const jpFace = <div className="fc-jp">{word.kanji || word.kana}</div>
  const viFace = <div className="fc-vi">{word.meaningVi}</div>

  return (
    <>
      <SessionHeader title="Thẻ ghi nhớ" current={idx} total={deck.length} onExit={onExit} />

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

      <div className="fc-scene" onClick={() => setFlipped((f) => !f)}>
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
                <div className="fc-romaji">{word.romaji}</div>
              </>
            )}
          </div>
        </div>
        <div className="fc-hint">
          <RotateCcw size={13} /> Nhấn thẻ hoặc phím Space để lật
        </div>
      </div>

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
