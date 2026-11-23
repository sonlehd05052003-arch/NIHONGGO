import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  Volume2,
  Languages,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Eye,
  EyeOff,
  EarOff,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Ruby } from '@/components/ui/Ruby'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import { useProgress } from '@/hooks/useProgress'
import { rubySpeech, rubyPlain } from '@/services/lessons'
import { sfx } from '@/services/sound'
import { speakSentence } from '@/services/vocabularyService'
import type { Reading, VocabularyItem } from '@/types'
import { useReadingPlayer } from './useReadingPlayer'

type RateId = 'slow' | 'normal' | 'fast'
const RATES: Record<RateId, number> = { slow: 0.65, normal: 0.85, fast: 1.05 }
const RATE_LABELS: [RateId, string][] = [
  ['slow', 'Chậm'],
  ['normal', 'Vừa'],
  ['fast', 'Nhanh'],
]

const fmt = (s: number) => {
  const t = Math.max(0, Math.round(s))
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`
}

export const ReadingView: React.FC<{
  lessonId: string
  reading: Reading
  words: VocabularyItem[]
}> = ({ lessonId, reading, words }) => {
  const { progress, setReadingScore } = useProgress()
  const [showAllVi, setShowAllVi] = useState(false)
  const [openVi, setOpenVi] = useState<Set<number>>(new Set())
  const [answers, setAnswers] = useState<(number | null)[]>(() => reading.questions.map(() => null))
  const [rate, setRate] = useLocalStorage<RateId>('nihongo_reading_rate', 'normal')
  /** Chế độ luyện nghe hiểu: ẩn chữ, nghe rồi trả lời câu hỏi */
  const [listenOnly, setListenOnly] = useState(false)
  const [revealed, setRevealed] = useState(false)
  const hideText = listenOnly && !revealed

  const best = progress.readings?.[lessonId]
  const spoken = useMemo(() => reading.lines.map((l) => rubySpeech(l.jp)), [reading])
  const player = useReadingPlayer(spoken, RATES[rate])
  const lineRefs = useRef<(HTMLDivElement | null)[]>([])
  const active = player.state !== 'idle'

  // Câu đang đọc luôn nằm trong màn hình
  useEffect(() => {
    if (player.state === 'playing')
      lineRefs.current[player.curLine]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [player.curLine, player.state])

  // Các từ của bài xuất hiện trong bài đọc → hiện bảng từ ngay bên dưới
  const glossary = useMemo(() => {
    const plain = reading.lines.map((l) => rubyPlain(l.jp)).join('') + rubyPlain(reading.title)
    return words.filter((w) => {
      const forms = [w.kanji, ...w.kana.split('、')].filter(Boolean)
      // động từ / tính từ い: so phần gốc (bỏ đuôi cuối) để bắt cả dạng chia, nhưng gốc phải đủ đặc trưng
      const conj = w.category === 'Động từ' || w.category === 'Tính từ い'
      return forms.some((f) => {
        const stem = f.slice(0, -1)
        const useStem = conj && (/[一-鿿]/.test(stem) || stem.length >= 2)
        return plain.includes(useStem ? stem : f)
      })
    })
  }, [reading, words])

  const toggleVi = (i: number) =>
    setOpenVi((s) => {
      const n = new Set(s)
      if (n.has(i)) n.delete(i)
      else n.add(i)
      return n
    })

  const answered = answers.filter((a) => a !== null).length
  const correct = answers.filter((a, i) => a === reading.questions[i].answer).length
  const finished = answered === reading.questions.length

  const choose = (qi: number, oi: number) => {
    if (answers[qi] !== null) return
    const next = answers.map((a, i) => (i === qi ? oi : a))
    setAnswers(next)
    const ok = oi === reading.questions[qi].answer
    if (ok) sfx.correct(1)
    else sfx.wrong()
    if (next.every((a) => a !== null)) {
      const score = next.filter((a, i) => a === reading.questions[i].answer).length / next.length
      setReadingScore(lessonId, score)
      if (score === 1) window.setTimeout(() => sfx.complete(), 300)
    }
  }

  const playing = player.state === 'playing'
  const nowSpeaking = (i: number) => playing && player.curLine === i
  const pct = player.total ? (player.pos / player.total) * 100 : 0

  return (
    <div className="reading">
      <div className="reading-head">
        <div>
          <h2 className="reading-title">
            <Ruby text={reading.title} />
          </h2>
          <p className="reading-title-vi">{reading.titleVi}</p>
        </div>
        <div className="reading-tools">
          <Button
            variant={listenOnly ? 'primary' : 'outline'}
            size="sm"
            icon={listenOnly ? <Eye size={15} /> : <EarOff size={15} />}
            onClick={() => {
              setListenOnly((v) => !v)
              setRevealed(false)
            }}
            title="Ẩn chữ để luyện nghe hiểu"
          >
            {listenOnly ? 'Đang chỉ nghe' : 'Chỉ nghe'}
          </Button>
          <Button
            variant={showAllVi ? 'primary' : 'outline'}
            size="sm"
            icon={<Languages size={15} />}
            onClick={() => setShowAllVi((v) => !v)}
          >
            {showAllVi ? 'Ẩn bản dịch' : 'Hiện bản dịch'}
          </Button>
        </div>
      </div>

      {player.canSpeak && (
        <div className="reading-player" role="group" aria-label="Trình phát bài đọc">
          <div className="rp-controls">
            <button
              className="icon-btn"
              onClick={() => player.goLine(player.pos > player.starts[player.curLine] + 2 ? player.curLine : player.curLine - 1)}
              aria-label="Câu trước"
              title="Câu trước"
            >
              <SkipBack size={18} />
            </button>
            <button
              className="rp-play"
              onClick={playing ? player.pause : player.play}
              aria-label={playing ? 'Tạm dừng' : 'Phát'}
              title={playing ? 'Tạm dừng' : player.state === 'paused' ? 'Nghe tiếp' : 'Nghe cả bài'}
            >
              {playing ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
            </button>
            <button
              className="icon-btn"
              onClick={() => player.goLine(player.curLine + 1)}
              disabled={player.curLine >= reading.lines.length - 1}
              aria-label="Câu sau"
              title="Câu sau"
            >
              <SkipForward size={18} />
            </button>
          </div>

          <div className="rp-track">
            <span className="rp-time">{fmt(player.elapsed)}</span>
            <div className="rp-bar" style={{ '--pct': `${pct}%` } as React.CSSProperties}>
              {player.starts.slice(1, -1).map((s, i) => (
                <span key={i} className="rp-tick" style={{ left: `${(s / player.total) * 100}%` }} />
              ))}
              <input
                type="range"
                min={0}
                max={player.total}
                step={1}
                value={player.pos}
                onChange={(e) => player.seek(Number(e.target.value))}
                aria-label="Vị trí nghe"
                aria-valuetext={`Câu ${player.curLine + 1} trên ${reading.lines.length}, ${fmt(player.elapsed)}`}
              />
            </div>
            <span className="rp-time">{fmt(player.duration)}</span>
          </div>

          <div className="rp-foot">
            <span className="rp-pos" aria-live="polite">
              {active
                ? `${player.single ? 'Đang đọc câu' : 'Câu'} ${player.curLine + 1}/${reading.lines.length}${player.state === 'paused' ? ' · đã tạm dừng' : ''}`
                : `${reading.lines.length} câu · kéo thanh để chọn đoạn nghe`}
            </span>
            <div className="chip-group rp-rate" role="radiogroup" aria-label="Tốc độ đọc">
              {RATE_LABELS.map(([id, label]) => (
                <button
                  key={id}
                  role="radio"
                  aria-checked={rate === id}
                  className={`chip ${rate === id ? 'active' : ''}`}
                  onClick={() => setRate(id)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {listenOnly && (
        <div className="listen-only-banner" role="status">
          <span>
            🎧 <b>Chế độ chỉ nghe:</b> bấm ▶ nghe cả bài (có thể nghe nhiều lần, chậm lại), rồi trả lời câu hỏi bên dưới mà không
            nhìn chữ.
          </span>
          {!revealed ? (
            <Button size="sm" variant="secondary" icon={<Eye size={15} />} onClick={() => setRevealed(true)}>
              Hiện chữ để đối chiếu
            </Button>
          ) : (
            <Button size="sm" variant="secondary" icon={<EyeOff size={15} />} onClick={() => setRevealed(false)}>
              Ẩn chữ
            </Button>
          )}
        </div>
      )}

      <p className="reading-help">
        Nhấn vào câu để xem nghĩa, nhấn 🔊 để nghe riêng câu đó (nhấn lần nữa để dừng). Kéo thanh phía trên để nghe từ
        đoạn bất kỳ.
      </p>

      <div className="reading-lines">
        {reading.lines.map((l, i) => (
          <div
            key={i}
            ref={(el) => {
              lineRefs.current[i] = el
            }}
            className={`reading-line ${active && player.curLine === i ? (playing ? 'speaking' : 'paused-at') : ''}`}
          >
            <button
              className={`icon-btn sm ${nowSpeaking(i) ? 'is-speaking' : ''}`}
              onClick={() => player.toggleLine(i)}
              title={nowSpeaking(i) ? 'Tạm dừng' : playing && !player.single ? 'Đọc tiếp từ câu này' : 'Nghe câu này'}
              aria-label={nowSpeaking(i) ? 'Tạm dừng' : 'Nghe câu này'}
            >
              {nowSpeaking(i) ? <Pause size={14} fill="currentColor" /> : <Volume2 size={16} />}
            </button>
            <div className="reading-line-body">
              {hideText ? (
                <span className="reading-hidden" aria-label={`Câu ${i + 1} (đang ẩn)`}>
                  Câu {i + 1}
                  <span className="reading-hidden-bar" style={{ width: `${Math.min(100, 20 + spoken[i].length * 3)}%` }} />
                </span>
              ) : (
                <>
                  <button className="reading-jp" onClick={() => toggleVi(i)} title="Xem nghĩa">
                    <Ruby text={l.jp} />
                  </button>
                  {(showAllVi || openVi.has(i)) && <p className="reading-vi">{l.vi}</p>}
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {glossary.length > 0 && !hideText && (
        <div className="reading-glossary">
          <h3>Từ của bài trong đoạn văn</h3>
          <div className="glossary-grid">
            {glossary.map((w) => (
              <button
                key={w.id}
                className="glossary-item"
                onClick={() => {
                  if (playing) player.pause()
                  speakSentence(w.kana.split('、')[0])
                }}
              >
                <span className="g-jp" lang="ja">
                  {w.kanji || w.kana}
                </span>
                {w.kanji && <span className="g-kana">{w.kana}</span>}
                <span className="g-vi">{w.meaningVi}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="reading-quiz">
        <h3>
          Câu hỏi đọc hiểu
          {best !== undefined && <span className="reading-best">Tốt nhất: {Math.round(best * 100)}%</span>}
        </h3>
        {reading.questions.map((q, qi) => {
          const picked = answers[qi]
          return (
            <div key={qi} className="rq">
              <p className="rq-q">
                {qi + 1}. {q.q}
              </p>
              <div className="rq-options">
                {q.options.map((o, oi) => {
                  const state = picked === null ? '' : oi === q.answer ? 'ok' : oi === picked ? 'bad' : 'dim'
                  return (
                    <button
                      key={oi}
                      className={`rq-opt ${state}`}
                      onClick={() => choose(qi, oi)}
                      disabled={picked !== null}
                    >
                      {state === 'ok' && <CheckCircle2 size={16} />}
                      {state === 'bad' && <XCircle size={16} />}
                      {o}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
        {finished && (
          <div className={`rq-result ${correct === reading.questions.length ? 'perfect' : ''}`}>
            <span>
              Bạn trả lời đúng <b>{correct}</b>/{reading.questions.length} câu
              {correct === reading.questions.length ? ' — xuất sắc! 🎉' : ''}
            </span>
            <Button
              variant="ghost"
              size="sm"
              icon={<RotateCcw size={15} />}
              onClick={() => setAnswers(reading.questions.map(() => null))}
            >
              Làm lại
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
