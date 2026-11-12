import React, { useMemo, useState } from 'react'
import { Volume2, Languages, CheckCircle2, XCircle, RotateCcw, Square } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Ruby } from '@/components/ui/Ruby'
import { useProgress } from '@/hooks/useProgress'
import { rubyKana, rubyPlain } from '@/services/lessons'
import { sfx } from '@/services/sound'
import { speakSentence } from '@/services/vocabularyService'
import type { Reading, VocabularyItem } from '@/types'

export const ReadingView: React.FC<{
  lessonId: string
  reading: Reading
  words: VocabularyItem[]
}> = ({ lessonId, reading, words }) => {
  const { progress, setReadingScore } = useProgress()
  const [showAllVi, setShowAllVi] = useState(false)
  const [openVi, setOpenVi] = useState<Set<number>>(new Set())
  const [answers, setAnswers] = useState<(number | null)[]>(() => reading.questions.map(() => null))
  const [playing, setPlaying] = useState(false)

  const best = progress.readings?.[lessonId]

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

  const toggleLine = (i: number) =>
    setOpenVi((s) => {
      const n = new Set(s)
      if (n.has(i)) n.delete(i)
      else n.add(i)
      return n
    })

  const playAll = () => {
    if (playing) {
      window.speechSynthesis?.cancel()
      setPlaying(false)
      return
    }
    if (!('speechSynthesis' in window)) return
    const u = new SpeechSynthesisUtterance(reading.lines.map((l) => rubyKana(l.jp)).join('。'))
    u.lang = 'ja-JP'
    u.rate = 0.85
    u.onend = u.onerror = () => setPlaying(false)
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(u)
    setPlaying(true)
  }

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
          <Button variant="outline" size="sm" icon={playing ? <Square size={15} /> : <Volume2 size={15} />} onClick={playAll}>
            {playing ? 'Dừng' : 'Nghe cả bài'}
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

      <p className="reading-help">Đọc từng câu trước, nhấn vào câu để xem nghĩa, nhấn 🔊 để nghe.</p>

      <div className="reading-lines">
        {reading.lines.map((l, i) => (
          <div key={i} className="reading-line">
            <button
              className="icon-btn sm"
              onClick={() => speakSentence(rubyKana(l.jp), 0.85)}
              title="Nghe câu này"
            >
              <Volume2 size={16} />
            </button>
            <div className="reading-line-body">
              <button className="reading-jp" onClick={() => toggleLine(i)} title="Xem nghĩa">
                <Ruby text={l.jp} />
              </button>
              {(showAllVi || openVi.has(i)) && <p className="reading-vi">{l.vi}</p>}
            </div>
          </div>
        ))}
      </div>

      {glossary.length > 0 && (
        <div className="reading-glossary">
          <h3>Từ của bài trong đoạn văn</h3>
          <div className="glossary-grid">
            {glossary.map((w) => (
              <button key={w.id} className="glossary-item" onClick={() => speakSentence(w.kana.split('、')[0])}>
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
                  const state =
                    picked === null ? '' : oi === q.answer ? 'ok' : oi === picked ? 'bad' : 'dim'
                  return (
                    <button key={oi} className={`rq-opt ${state}`} onClick={() => choose(qi, oi)} disabled={picked !== null}>
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
