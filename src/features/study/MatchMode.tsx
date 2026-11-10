import React, { useEffect, useMemo, useState } from 'react'
import { Timer } from 'lucide-react'
import { useProgress } from '@/hooks/useProgress'
import { shuffle } from '@/services/vocabularyService'
import type { VocabularyItem } from '@/types'
import { ResultView, SessionHeader, type ModeProps } from './shared'

const PAIRS_PER_ROUND = 6

interface Tile {
  key: string
  wordId: string
  text: string
  jp: boolean
}

function makeTiles(words: VocabularyItem[]): Tile[] {
  return shuffle(
    words.flatMap((w) => [
      { key: `${w.id}-jp`, wordId: w.id, text: w.kanji || w.kana, jp: true },
      { key: `${w.id}-vi`, wordId: w.id, text: w.meaningVi, jp: false },
    ]),
  )
}

const fmt = (ms: number) => `${(ms / 1000).toFixed(1)}s`

export const MatchMode: React.FC<ModeProps> = ({ deck, onExit, onRestart }) => {
  const { recordAnswer } = useProgress()
  const rounds = useMemo(() => {
    const r: VocabularyItem[][] = []
    for (let i = 0; i < deck.length; i += PAIRS_PER_ROUND) r.push(deck.slice(i, i + PAIRS_PER_ROUND))
    // Gộp vòng cuối quá ít cặp vào vòng trước
    if (r.length > 1 && r[r.length - 1].length < 3) r[r.length - 2].push(...r.pop()!)
    return r
  }, [deck])

  const [round, setRound] = useState(0)
  const [tiles, setTiles] = useState(() => makeTiles(rounds[0] ?? []))
  const [matched, setMatched] = useState<Set<string>>(new Set())
  const [picked, setPicked] = useState<Tile | null>(null)
  const [flash, setFlash] = useState<{ keys: string[]; ok: boolean } | null>(null)
  const [mistakes, setMistakes] = useState<Map<string, VocabularyItem>>(new Map())
  const [start] = useState(() => Date.now())
  const [now, setNow] = useState(() => Date.now())
  const [endTime, setEndTime] = useState<number | null>(null)

  const done = endTime !== null

  useEffect(() => {
    if (done) return
    const t = window.setInterval(() => setNow(Date.now()), 100)
    return () => window.clearInterval(t)
  }, [done])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onExit()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onExit])

  const byId = useMemo(() => new Map(deck.map((w) => [w.id, w])), [deck])

  const click = (t: Tile) => {
    if (matched.has(t.wordId) || flash) return
    if (!picked) return setPicked(t)
    if (picked.key === t.key) return setPicked(null)
    if (picked.jp === t.jp) return setPicked(t)

    const ok = picked.wordId === t.wordId
    setFlash({ keys: [picked.key, t.key], ok })
    setPicked(null)
    if (!ok) {
      setMistakes((m) => new Map(m).set(picked.wordId, byId.get(picked.wordId)!).set(t.wordId, byId.get(t.wordId)!))
      recordAnswer(picked.wordId, false)
    } else {
      recordAnswer(t.wordId, !mistakes.has(t.wordId))
    }
    window.setTimeout(
      () => {
        setFlash(null)
        if (!ok) return
        const nextMatched = new Set(matched).add(t.wordId)
        if (nextMatched.size < rounds[round].length) return setMatched(nextMatched)
        if (round + 1 < rounds.length) {
          setRound(round + 1)
          setTiles(makeTiles(rounds[round + 1]))
          setMatched(new Set())
        } else {
          setMatched(nextMatched)
          setEndTime(Date.now())
        }
      },
      ok ? 250 : 500,
    )
  }

  if (done) {
    const wrong = [...mistakes.values()]
    return (
      <ResultView
        title="Ghép xong toàn bộ!"
        scoreText={
          <>
            Thời gian <b className="hl">{fmt(endTime - start)}</b> · {wrong.length} từ ghép nhầm
          </>
        }
        deck={deck}
        wrong={wrong}
        onExit={onExit}
        onRestart={onRestart}
      />
    )
  }

  const doneBefore = rounds.slice(0, round).reduce((s, r) => s + r.length, 0)

  return (
    <>
      <SessionHeader
        title={`Ghép thẻ · Vòng ${round + 1}/${rounds.length}`}
        current={doneBefore + matched.size}
        total={deck.length}
        onExit={onExit}
        right={
          <span className="timer">
            <Timer size={15} /> {fmt(now - start)}
          </span>
        }
      />
      <div className="match-grid">
        {tiles.map((t) => {
          const isMatched = matched.has(t.wordId)
          const f = flash?.keys.includes(t.key) ? (flash.ok ? 'ok' : 'bad') : ''
          return (
            <button
              key={t.key}
              className={`match-tile ${t.jp ? 'jp' : ''} ${picked?.key === t.key ? 'picked' : ''} ${f} ${isMatched ? 'gone' : ''}`}
              onClick={() => click(t)}
              disabled={isMatched}
            >
              {t.text}
            </button>
          )
        })}
      </div>
    </>
  )
}
