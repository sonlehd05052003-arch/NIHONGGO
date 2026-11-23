import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Volume2, Turtle, CheckCircle2, XCircle, Lightbulb, RotateCcw, ArrowRight, Headphones } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Ruby } from '@/components/ui/Ruby'
import { useKanjiReadings } from '@/hooks/useKanjiReadings'
import { useProgress } from '@/hooks/useProgress'
import { rubyKana, rubySpeech } from '@/services/lessons'
import { checkJapanese, kanaDiff, normJa } from '@/services/sentenceCheck'
import { sfx } from '@/services/sound'
import { speakSentence } from '@/services/vocabularyService'
import type { Reading } from '@/types'

interface Sentence {
  jp: string
  vi: string
}

/** Bỏ tên người nói ở đầu câu thoại: "リン：…", "{田中|たなか}：…" */
const stripSpeaker = (s: string) => s.replace(/^(?:\{[^}]*\}|[^：:{}。]){1,10}[：:]\s*/, '')

/** Tách hội thoại thành từng câu ngắn để nghe chép */
function dictationSentences(reading: Reading): Sentence[] {
  const out: Sentence[] = []
  for (const l of reading.lines) {
    const body = stripSpeaker(l.jp)
    const parts = body.match(/[^。！？!?]+[。！？!?]*/g) ?? [body]
    for (const p of parts) {
      const jp = p.trim()
      if (normJa(rubyKana(jp)).length >= 3) out.push({ jp, vi: l.vi })
    }
  }
  return out
}

interface Answer {
  input: string
  ok: boolean
  overridden?: boolean
}

/** Nghe từng câu của hội thoại trong bài rồi gõ lại — chấm tự động */
export const DictationView: React.FC<{ lessonId: string; reading: Reading }> = ({ lessonId, reading }) => {
  const { progress, setDictationScore, addXp } = useProgress()
  const readings = useKanjiReadings()
  const sentences = useMemo(() => dictationSentences(reading), [reading])
  const [queue, setQueue] = useState<number[]>(() => sentences.map((_, i) => i))
  const [pos, setPos] = useState(0)
  const [input, setInput] = useState('')
  const [answers, setAnswers] = useState<Record<number, Answer>>({})
  const [plays, setPlays] = useState(0)
  const [hint, setHint] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const best = progress.dictation?.[lessonId]

  const done = pos >= queue.length
  const idx = queue[pos]
  const s = sentences[idx]
  const answer = idx !== undefined ? answers[idx] : undefined
  const kana = s ? rubyKana(s.jp) : ''

  const play = (rate: number) => {
    if (!s) return
    speakSentence(rubySpeech(s.jp), rate)
    setPlays((n) => n + 1)
    if (!answer) inputRef.current?.focus()
  }

  // Câu mới: tự đọc một lần
  useEffect(() => {
    if (done || !s) return
    const t = window.setTimeout(() => speakSentence(rubySpeech(s.jp), 0.85), 250)
    return () => window.clearTimeout(t)
  }, [pos, done, s])

  const start = (only?: number[]) => {
    setQueue(only ?? sentences.map((_, i) => i))
    setPos(0)
    setInput('')
    setAnswers({})
    setPlays(0)
    setHint(false)
  }

  const check = () => {
    if (!s || answer || !input.trim()) return
    const ok = checkJapanese(input, { dir: 'vj', jp: s.jp, vi: s.vi }, readings)
    setAnswers((a) => ({ ...a, [idx]: { input, ok } }))
    if (ok) {
      sfx.correct(1)
      addXp(3)
    } else sfx.wrong()
  }

  const next = () => {
    const nextPos = pos + 1
    setPos(nextPos)
    setInput('')
    setPlays(0)
    setHint(false)
    if (nextPos >= queue.length && queue.length === sentences.length) {
      const correct = queue.filter((i) => answers[i]?.ok).length
      setDictationScore(lessonId, correct / queue.length)
      if (correct === queue.length) window.setTimeout(() => sfx.complete(), 250)
    }
    window.setTimeout(() => inputRef.current?.focus(), 0)
  }

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (answer) next()
    else check()
  }

  if (!sentences.length) return <p className="ld-hint">Bài này chưa có hội thoại để nghe chép.</p>

  if (done) {
    const correct = queue.filter((i) => answers[i]?.ok).length
    const wrong = queue.filter((i) => !answers[i]?.ok)
    return (
      <div className="writing">
        <div className={`wr-result ${correct === queue.length ? 'perfect' : ''}`}>
          <Headphones size={28} />
          <h3>
            Nghe đúng {correct}/{queue.length} câu{correct === queue.length ? ' — tai bạn tốt lắm! 🎉' : ''}
          </h3>
          <div className="wr-result-actions">
            {wrong.length > 0 && (
              <Button icon={<RotateCcw size={16} />} onClick={() => start(wrong)}>
                Nghe lại {wrong.length} câu sai
              </Button>
            )}
            <Button variant="outline" icon={<RotateCcw size={16} />} onClick={() => start()}>
              Làm lại từ đầu
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const diff = answer && !answer.ok ? kanaDiff(answer.input, kana) : null

  return (
    <div className="writing">
      <div className="wr-top">
        <span className="vs-muted">Nghe từng câu trong hội thoại của bài rồi gõ lại bằng tiếng Nhật.</span>
        {best !== undefined && <span className="reading-best">Tốt nhất: {Math.round(best * 100)}%</span>}
      </div>

      <div className="wr-progress">
        <span>
          Câu {pos + 1}/{queue.length}
        </span>
        <span className="wr-bar">
          <span style={{ width: `${(pos / queue.length) * 100}%` }} />
        </span>
      </div>

      <div className="wr-card">
        <div className="dict-play">
          <button className="rp-play" onClick={() => play(0.85)} aria-label="Nghe câu" title="Nghe (tốc độ thường)">
            <Volume2 size={22} />
          </button>
          <Button variant="secondary" size="sm" icon={<Turtle size={16} />} onClick={() => play(0.55)}>
            Nghe chậm
          </Button>
          <span className="vs-muted">{plays > 0 ? `Đã nghe ${plays + 1} lần` : 'Tự phát khi sang câu mới'}</span>
        </div>

        {!answer && (
          <div className="wr-hint">
            {hint ? (
              <p>
                <Lightbulb size={14} /> Câu có {normJa(kana).length} chữ kana, bắt đầu bằng 「{normJa(kana).slice(0, 2)}…」 · Nghĩa: {s.vi}
              </p>
            ) : (
              <button type="button" className="ad-link" onClick={() => setHint(true)}>
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
            lang="ja"
            placeholder="Gõ câu vừa nghe (hiragana, kanji hoặc romaji)…"
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            aria-label="Câu vừa nghe"
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
              {answer.ok ? (answer.overridden ? 'Đã tính là đúng' : 'Nghe chính xác!') : 'Chưa đúng — xem chỗ khác nhau bên dưới'}
            </p>
            {diff && (
              <div className="dict-diff" lang="ja" aria-label="So sánh từng chữ">
                {diff.answer.map((c, i) => (
                  <span key={i} className={c.ok ? 'ok' : 'miss'}>
                    {c.ch}
                  </span>
                ))}
                <span className="dict-legend">
                  Chữ <b className="miss">đỏ</b> là chỗ bạn nghe sót / sai
                  {diff.extra > 0 ? ` · thừa hoặc sai ${diff.extra} chữ` : ''}
                </span>
              </div>
            )}
            <div className="wr-answer">
              <span className="wr-label">Câu đúng</span>
              <div className="wr-answer-jp" lang="ja">
                <Ruby text={s.jp} />
                <button type="button" className="icon-btn sm" onClick={() => play(0.85)} title="Nghe lại">
                  <Volume2 size={16} />
                </button>
              </div>
              <p className="wr-answer-sub">{s.vi}</p>
            </div>
            <div className="wr-actions">
              {!answer.ok && (
                <button
                  type="button"
                  className="ad-link"
                  onClick={() => {
                    setAnswers((a) => ({ ...a, [idx]: { ...a[idx], ok: true, overridden: true } }))
                    addXp(3)
                  }}
                >
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
        Gõ được bằng hiragana, kanji hoặc romaji; không cần dấu câu. Trợ từ は/へ/を gõ theo cách đọc (wa/e/o) cũng được.
      </p>
    </div>
  )
}
