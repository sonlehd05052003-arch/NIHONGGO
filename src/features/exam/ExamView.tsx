import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Dumbbell,
  Eye,
  EyeOff,
  Headphones,
  Play,
  RotateCcw,
  Square,
  Trophy,
  X,
  XCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Confetti } from '@/components/ui/Confetti'
import { Ruby } from '@/components/ui/Ruby'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import { useSessionState } from '@/hooks/useSessionState'
import { useProgress } from '@/hooks/useProgress'
import { playScript } from '@/services/examAudio'
import {
  JLPT_SCALE,
  answerId,
  buildExam,
  loadJlptBank,
  rememberSeen,
  scoreExam,
  type Exam,
  type ExamGroup,
  type ExamQuestion,
} from '@/services/jlptExam'
import { LESSONS, UNITS, loadContent } from '@/services/lessons'
import { sfx } from '@/services/sound'
import './Exam.css'

type Mode = 'practice' | 'test'
type Phase = 'intro' | 'run' | 'result'

/** Chữ tiếng Nhật có furigana; [[…]] = gạch chân */
const JText: React.FC<{ text: string; className?: string }> = ({ text, className }) => {
  const parts = text.split(/(\[\[[^\]]*\]\])/)
  return (
    <span className={className} lang="ja">
      {parts.map((p, i) =>
        p.startsWith('[[') ? (
          <u key={i} className="ex-u">
            <Ruby text={p.slice(2, -2)} />
          </u>
        ) : (
          <Ruby key={i} text={p} />
        ),
      )}
    </span>
  )
}

/** Đoạn văn: giữ xuống dòng; tô chỗ trống 【n】 đang hỏi */
const Passage: React.FC<{ text: string; title?: string; active?: string }> = ({ text, title, active }) => (
  <div className="ex-passage" lang="ja">
    {title && (
      <p className="ex-passage-title">
        <JText text={title} />
      </p>
    )}
    {text.split('\n').map((line, i) => (
      <p key={i}>
        {line.split(/(【[0-9０-９]+】)/).map((seg, j) =>
          /^【/.test(seg) ? (
            <span key={j} className={`ex-blank ${seg === active ? 'active' : ''}`}>
              {seg}
            </span>
          ) : (
            <JText key={j} text={seg} />
          ),
        )}
      </p>
    ))}
  </div>
)

interface Flat {
  part: number
  group: ExamGroup
  gi: number
  qi: number
  q: ExamQuestion
}

const fmtTime = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export const ExamView: React.FC<{ kind: 'unit' | 'mock'; unitIndex?: number; onExit: () => void }> = ({
  kind,
  unitIndex = 0,
  onExit,
}) => {
  const { progress, recordAnswer, setTestScore } = useProgress()
  const scope = kind === 'mock' ? 'mock' : `u${unitIndex + 1}`
  const unit = kind === 'unit' ? UNITS[unitIndex] : null
  const best = progress.tests?.[scope]
  const k = `nihongo_exam_${scope}`

  const [exam, setExam] = useSessionState<Exam | null>(`${k}_exam`, null)
  const [answers, setAnswers] = useSessionState<Record<string, number | null>>(`${k}_answers`, {})
  const [phase, setPhase] = useSessionState<Phase>(`${k}_phase`, 'intro')
  const [mode, setMode] = useSessionState<Mode>(`${k}_mode`, 'test')
  const [part, setPart] = useSessionState(`${k}_part`, 0)
  const [idx, setIdx] = useSessionState(`${k}_idx`, 0)
  const [deadline, setDeadline] = useSessionState<number | null>(`${k}_deadline`, null)
  /** Câu nghe đã phát (thi thử chỉ được nghe một lần như thi thật) */
  const [played, setPlayed] = useSessionState<string[]>(`${k}_played`, [])
  const [furigana, setFurigana] = useLocalStorage(`nihongo_exam_furigana_${kind}`, kind === 'unit')
  const [loading, setLoading] = useState(false)
  const [now, setNow] = useState(() => Date.now())
  const [playing, setPlaying] = useState(false)
  const stopAudio = useRef<() => void>(() => {})

  const strict = mode === 'test' && kind === 'mock'
  const timed = mode === 'test'

  const flat = useMemo<Flat[][]>(
    () =>
      (exam?.parts ?? []).map((p, pi) =>
        p.groups.flatMap((group, gi) => group.questions.map((q, qi) => ({ part: pi, group, gi, qi, q }))),
      ),
    [exam],
  )
  const cur = flat[part]?.[idx]
  const curPart = exam?.parts[part]
  const aid = cur && curPart ? answerId(curPart.id, cur.q) : ''
  const picked = aid ? (answers[aid] ?? null) : null
  const reveal = phase === 'result' || (mode === 'practice' && picked !== null)

  // ------------------------------------------------------------ bắt đầu / nộp
  const start = async (m: Mode) => {
    setLoading(true)
    const [bank, content] = await Promise.all([loadJlptBank(), loadContent()])
    setLoading(false)
    const e = buildExam(kind, bank, content, unitIndex)
    setExam(e)
    setAnswers({})
    setPlayed([])
    setMode(m)
    setPart(0)
    setIdx(0)
    setDeadline(m === 'test' ? Date.now() + e.parts[0].minutes * 60_000 : null)
    setPhase('run')
    window.scrollTo({ top: 0 })
  }

  const finish = useCallback(() => {
    if (!exam) return
    stopAudio.current()
    const s = scoreExam(exam, answers)
    if (mode === 'test') {
      setTestScore(scope, s.total / (JLPT_SCALE.language + JLPT_SCALE.listening))
      // Câu từ vựng 漢字読み / 表記 gắn với từ → cập nhật lịch ôn
      for (const p of exam.parts)
        for (const g of p.groups)
          for (const q of g.questions) {
            const m = q.key.match(/^(?:read|write):(.+)$/)
            if (m) recordAnswer(m[1], answers[answerId(p.id, q)] === q.answer)
          }
    }
    rememberSeen(exam)
    setDeadline(null)
    setPhase('result')
    window.scrollTo({ top: 0 })
  }, [exam, answers, mode, scope, setTestScore, recordAnswer, setDeadline, setPhase])

  const nextPart = useCallback(() => {
    if (!exam) return
    stopAudio.current()
    if (part + 1 >= exam.parts.length) return finish()
    setPart(part + 1)
    setIdx(0)
    if (timed) setDeadline(Date.now() + exam.parts[part + 1].minutes * 60_000)
    window.scrollTo({ top: 0 })
  }, [exam, part, timed, finish, setPart, setIdx, setDeadline])

  // ------------------------------------------------------------ đồng hồ
  useEffect(() => {
    if (phase !== 'run' || !deadline) return
    const t = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(t)
  }, [phase, deadline])
  useEffect(() => {
    if (phase === 'run' && deadline && now >= deadline) nextPart()
  }, [now, deadline, phase, nextPart])

  // ------------------------------------------------------------ phần nghe
  const play = useCallback(
    (q: ExamQuestion, rate = 0.9) => {
      if (!q.audio) return
      stopAudio.current()
      setPlaying(true)
      const lines = kind === 'mock' ? [{ s: 'N' as const, t: `${q.num}ばん` }, ...q.audio] : q.audio
      stopAudio.current = playScript(lines, { rate, onEnd: () => setPlaying(false) })
      setPlayed((p) => (p.includes(aid) ? p : [...p, aid]))
    },
    [kind, aid, setPlayed],
  )
  // Vào câu nghe: tự phát (thi thử: chỉ lần đầu)
  useEffect(() => {
    if (phase !== 'run' || !cur?.q.audio) return
    if (strict && played.includes(aid)) return
    const t = window.setTimeout(() => play(cur.q), 400)
    return () => {
      window.clearTimeout(t)
      stopAudio.current()
      setPlaying(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aid, phase])
  useEffect(() => () => stopAudio.current(), [])

  const choose = (i: number) => {
    if (!cur || reveal) return
    if (mode === 'practice' && picked !== null) return
    setAnswers((a) => ({ ...a, [aid]: i }))
    if (mode === 'practice') (i === cur.q.answer ? sfx.correct : sfx.wrong)()
    else sfx.tap()
  }

  // phím 1–4 chọn đáp án, Enter sang câu
  useEffect(() => {
    if (phase !== 'run') return
    const onKey = (e: KeyboardEvent) => {
      if (!cur) return
      const n = Number(e.key)
      if (n >= 1 && n <= cur.q.options.length) choose(n - 1)
      else if (e.key === 'Enter' && idx < flat[part].length - 1 && picked !== null) setIdx(idx + 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const result = useMemo(() => (exam && phase === 'result' ? scoreExam(exam, answers) : null), [exam, phase, answers])

  const title = kind === 'mock' ? 'Thi thử JLPT N5' : `Kiểm tra chủ đề: ${unit?.unit}`
  const range = unit ? `Bài ${LESSONS.indexOf(unit.lessons[0]) + 1}–${LESSONS.indexOf(unit.lessons[unit.lessons.length - 1]) + 1}` : ''
  const fClass = furigana ? '' : 'no-furigana'

  // ============================================================ Màn mở đầu
  if (phase === 'intro' || !exam) {
    const mins = kind === 'mock' ? [20, 40, 30] : [12, 20, 15]
    return (
      <div className="ex">
        <div className="ex-top">
          <button className="icon-btn" onClick={onExit} title="Quay lại">
            <ArrowLeft size={20} />
          </button>
          <div>
            <span className="ex-kicker">{kind === 'mock' ? 'Toàn bộ 48 bài · cấu trúc đề thật' : `Chủ đề · ${range}`}</span>
            <h1 className="ex-title">{title}</h1>
          </div>
        </div>
        <div className="ex-intro">
          <p>
            Đề theo đúng cấu trúc kỳ thi JLPT N5: ba phần thi, mỗi phần có giờ riêng, câu hỏi và đáp án hoàn toàn bằng tiếng
            Nhật. Mỗi lần làm là một <b>đề mới</b>: câu hỏi được chọn ngẫu nhiên, ưu tiên những câu bạn chưa gặp.
          </p>
          <table className="ex-table">
            <thead>
              <tr>
                <th>Phần thi</th>
                <th>Thời gian</th>
                <th>Dạng câu hỏi</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <b lang="ja">言語知識（文字・語彙）</b>
                </td>
                <td>{mins[0]} phút</td>
                <td>漢字読み · 表記 · 文脈規定 · 言い換え類義</td>
              </tr>
              <tr>
                <td>
                  <b lang="ja">言語知識（文法）・読解</b>
                </td>
                <td>{mins[1]} phút</td>
                <td>文法形式 · 文の組み立て（★）· 文章の文法 · 読解（短文・中文・情報検索）</td>
              </tr>
              <tr>
                <td>
                  <b lang="ja">聴解</b>
                </td>
                <td>{mins[2]} phút</td>
                <td>課題理解 · ポイント理解 · 発話表現 · 即時応答</td>
              </tr>
            </tbody>
          </table>
          <p className="ex-muted">
            Chấm theo thang điểm JLPT: 言語知識・読解 {JLPT_SCALE.language} điểm, 聴解 {JLPT_SCALE.listening} điểm. Đỗ khi tổng ≥{' '}
            {JLPT_SCALE.pass}/180, đồng thời 言語知識・読解 ≥ {JLPT_SCALE.minLanguage} và 聴解 ≥ {JLPT_SCALE.minListening} (điểm liệt).
            {kind === 'mock' && ' Như thi thật: hết giờ tự chuyển phần, không quay lại phần đã qua, mỗi câu nghe chỉ phát một lần.'}
          </p>
          {best !== undefined && (
            <p className="ex-best">
              <Trophy size={16} /> Điểm cao nhất: <b>{Math.round(best * 180)}/180</b>
            </p>
          )}
          <div className="ex-modes">
            {kind === 'unit' && (
              <button className="ex-mode" onClick={() => start('practice')} disabled={loading}>
                <Dumbbell size={22} />
                <b>Luyện tập</b>
                <span>Không giới hạn giờ, biết đúng/sai và lời giải ngay sau mỗi câu. Không tính điểm.</span>
              </button>
            )}
            <button className="ex-mode primary" onClick={() => start('test')} disabled={loading}>
              <ClipboardCheck size={22} />
              <b>{kind === 'mock' ? 'Bắt đầu thi thử' : 'Làm bài kiểm tra'}</b>
              <span>Tính giờ từng phần, làm xong mới xem đáp án. Lưu điểm cao nhất.</span>
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ============================================================ Kết quả
  if (phase === 'result' && result) {
    const wrong = flat.flat().filter((f) => answers[answerId(exam.parts[f.part].id, f.q)] !== f.q.answer)
    return (
      <div className={`ex ${fClass}`}>
        {mode === 'test' && result.pass && <Confetti />}
        <div className="ex-result">
          <span className="ex-kicker">{title}</span>
          <div className={`ex-total ${result.pass ? 'pass' : ''}`}>
            {result.total}
            <small>/180</small>
          </div>
          <h2>{result.pass ? 'ĐỖ (合格) 🎉' : 'Chưa đỗ (不合格)'}</h2>
          <div className="ex-scores">
            <div className={result.language >= JLPT_SCALE.minLanguage ? 'ok' : 'bad'}>
              <span lang="ja">言語知識・読解</span>
              <b>
                {result.language}/{JLPT_SCALE.language}
              </b>
              <small>
                Đúng {result.lang.ok}/{result.lang.total} câu · điểm liệt {JLPT_SCALE.minLanguage}
              </small>
            </div>
            <div className={result.listening >= JLPT_SCALE.minListening ? 'ok' : 'bad'}>
              <span lang="ja">聴解</span>
              <b>
                {result.listening}/{JLPT_SCALE.listening}
              </b>
              <small>
                Đúng {result.listen.ok}/{result.listen.total} câu · điểm liệt {JLPT_SCALE.minListening}
              </small>
            </div>
          </div>
          <div className="ex-bars">
            {exam.parts.map((p) =>
              p.groups.map((g) => {
                const ok = g.questions.filter((q) => answers[answerId(p.id, q)] === q.answer).length
                return (
                  <div key={`${p.id}${g.label}`} className="ex-bar">
                    <span lang="ja">
                      {p.id === 'moji' ? '文字・語彙' : p.id === 'bunpou' ? '文法・読解' : '聴解'} {g.label}
                    </span>
                    <span className="ex-bar-track">
                      <span style={{ width: `${(ok / g.questions.length) * 100}%` }} />
                    </span>
                    <b>
                      {ok}/{g.questions.length}
                    </b>
                  </div>
                )
              }),
            )}
          </div>
          <p className="ex-muted">Điểm quy đổi theo tỉ lệ câu đúng, gần đúng với cách tính của kỳ thi thật.</p>
          <div className="ex-actions">
            <Button variant="outline" icon={<ArrowLeft size={16} />} onClick={onExit}>
              Quay lại
            </Button>
            <Button variant="outline" onClick={() => setFurigana(!furigana)} icon={furigana ? <EyeOff size={16} /> : <Eye size={16} />}>
              Furigana
            </Button>
            <Button icon={<RotateCcw size={16} />} onClick={() => start('test')}>
              Làm đề mới
            </Button>
          </div>
        </div>

        {wrong.length > 0 && (
          <section className="ex-review">
            <h3>Xem lại các câu sai / bỏ trống ({wrong.length})</h3>
            {wrong.map((f) => {
              const p = exam.parts[f.part]
              const mine = answers[answerId(p.id, f.q)]
              return (
                <div key={`${p.id}${f.q.num}`} className="ex-review-item">
                  <div className="ex-review-head" lang="ja">
                    {p.id === 'moji' ? '文字・語彙' : p.id === 'bunpou' ? '文法・読解' : '聴解'} · {f.group.label} · {f.q.num}
                  </div>
                  {f.group.passage && f.qi === 0 && (
                    <Passage text={f.group.passage.text} title={f.group.passage.title} />
                  )}
                  {f.group.passages?.[f.qi] && <Passage text={f.group.passages[f.qi].text} />}
                  {f.q.stem && <JText className="ex-review-stem" text={f.q.stem} />}
                  {f.q.script && (
                    <div className="ex-script">
                      {f.q.script.map((l, i) => (
                        <p key={i}>
                          <b>{l.s === 'N' ? '' : l.s === 'M' ? '男：' : '女：'}</b>
                          <JText text={l.t} />
                        </p>
                      ))}
                    </div>
                  )}
                  <div className="ex-review-ans">
                    <CheckCircle2 size={15} /> <JText text={f.q.options[f.q.answer]} />
                  </div>
                  {mine !== null && mine !== undefined && (
                    <div className="ex-review-bad">
                      <XCircle size={15} /> <JText text={f.q.options[mine]} />
                    </div>
                  )}
                  {(f.q.vi || (f.group.passage?.vi && f.qi === 0)) && (
                    <p className="ex-review-vi">{f.q.vi ?? f.group.passage?.vi}</p>
                  )}
                </div>
              )
            })}
          </section>
        )}
      </div>
    )
  }

  if (!cur || !curPart) return null
  const partQs = flat[part]
  const answered = partQs.filter((f) => answers[answerId(curPart.id, f.q)] !== undefined && answers[answerId(curPart.id, f.q)] !== null).length
  const g = cur.group
  const isListen = !!cur.q.audio
  const canReplay = !strict || !played.includes(aid)
  const lastPart = part === exam.parts.length - 1

  // ============================================================ Làm bài
  return (
    <div className={`ex ${fClass}`}>
      <div className="ex-bar-top">
        <button
          className="icon-btn"
          onClick={() => window.confirm('Thoát bài thi? Bài đang làm sẽ không được chấm.') && (setPhase('intro'), onExit())}
          title="Thoát"
        >
          <X size={20} />
        </button>
        <div className="ex-bar-title">
          <span lang="ja">{curPart.title}</span>
          <small>
            Phần {part + 1}/{exam.parts.length} · {curPart.titleVi}
          </small>
        </div>
        <button className={`chip ${furigana ? 'active' : ''}`} onClick={() => setFurigana(!furigana)} title="Bật/tắt furigana">
          {furigana ? <Eye size={14} /> : <EyeOff size={14} />} Furigana
        </button>
        {deadline && (
          <span className={`ex-timer ${deadline - now < 60_000 ? 'low' : ''}`}>
            <Clock size={15} /> {fmtTime(deadline - now)}
          </span>
        )}
      </div>

      <div className="ex-palette">
        {partQs.map((f, i) => {
          const a = answers[answerId(curPart.id, f.q)]
          const done = a !== undefined && a !== null
          const res = mode === 'practice' && done ? (a === f.q.answer ? 'right' : 'wrong') : ''
          return (
            <button
              key={i}
              className={`ex-pal ${i === idx ? 'cur' : ''} ${done ? 'done' : ''} ${res}`}
              onClick={() => setIdx(i)}
              title={f.group.label}
            >
              {f.q.num}
            </button>
          )
        })}
      </div>

      <div className="ex-group">
        <span className="ex-mondai" lang="ja">
          {g.label}
        </span>
        <p className="ex-instr" lang="ja">
          {g.instruction}
        </p>
        <p className="ex-hint">{g.hint}</p>
      </div>

      {g.passage && <Passage text={g.passage.text} title={g.passage.title} active={cur.q.stem?.startsWith('【') ? cur.q.stem : undefined} />}
      {g.passages?.[cur.qi] && <Passage text={g.passages[cur.qi].text} />}

      <div className={`ex-q ${reveal ? (picked === cur.q.answer ? 'ok' : 'bad') : ''}`}>
        <span className="ex-num">{cur.q.num}</span>
        <div className="ex-q-body">
          {isListen && (
            <div className="ex-audio">
              <button
                className={`ex-play ${playing ? 'on' : ''}`}
                onClick={() => (playing ? (stopAudio.current(), setPlaying(false)) : play(cur.q))}
                disabled={!playing && !canReplay}
                title={playing ? 'Dừng' : 'Nghe'}
              >
                {playing ? <Square size={20} /> : <Play size={22} />}
              </button>
              <span className="ex-audio-note">
                <Headphones size={15} />{' '}
                {playing
                  ? 'Đang phát…'
                  : canReplay
                    ? 'Bấm để nghe'
                    : 'Đã nghe (thi thật chỉ phát một lần)'}
              </span>
              {!strict && !playing && (
                <button className="chip" onClick={() => play(cur.q, 0.7)}>
                  Nghe chậm
                </button>
              )}
            </div>
          )}
          {cur.q.stem && !cur.q.stem.startsWith('【') && <JText className="ex-stem" text={cur.q.stem} />}
        </div>
      </div>

      <div className={`ex-options ${cur.q.hiddenOptions && !reveal ? 'numbers' : ''}`}>
        {cur.q.options.map((o, i) => {
          let cls = picked === i ? 'selected' : ''
          if (reveal) cls = i === cur.q.answer ? 'correct' : i === picked ? 'incorrect' : 'dim'
          return (
            <button key={i} className={`ex-opt ${cls}`} onClick={() => choose(i)} disabled={reveal}>
              <span className="ex-opt-num">{i + 1}</span>
              {(!cur.q.hiddenOptions || reveal) && <JText text={o} />}
              {cls === 'correct' && <CheckCircle2 size={18} />}
              {cls === 'incorrect' && <XCircle size={18} />}
            </button>
          )
        })}
      </div>

      {reveal && (
        <div className="ex-explain">
          {cur.q.script && (
            <div className="ex-script">
              {cur.q.script.map((l, i) => (
                <p key={i}>
                  <b>{l.s === 'N' ? '' : l.s === 'M' ? '男：' : '女：'}</b>
                  <JText text={l.t} />
                </p>
              ))}
            </div>
          )}
          {(cur.q.vi || g.passage?.vi) && <p>{cur.q.vi ?? g.passage?.vi}</p>}
        </div>
      )}

      <div className="ex-nav">
        <Button variant="outline" icon={<ArrowLeft size={16} />} onClick={() => setIdx(idx - 1)} disabled={idx === 0}>
          Câu trước
        </Button>
        <span className="ex-gap" />
        <span className="ex-count">
          Đã làm {answered}/{partQs.length}
        </span>
        {idx < partQs.length - 1 ? (
          <Button icon={<ArrowRight size={16} />} onClick={() => setIdx(idx + 1)}>
            Câu tiếp
          </Button>
        ) : (
          <Button
            icon={<ArrowRight size={16} />}
            onClick={() => {
              const left = partQs.length - answered
              const msg = lastPart ? 'Nộp bài?' : 'Kết thúc phần này và sang phần tiếp? Không quay lại được phần này.'
              if (window.confirm(left > 0 ? `Còn ${left} câu chưa làm. ${msg}` : msg)) nextPart()
            }}
          >
            {lastPart ? 'Nộp bài' : 'Sang phần tiếp'}
          </Button>
        )}
      </div>
    </div>
  )
}
