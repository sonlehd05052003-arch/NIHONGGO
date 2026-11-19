import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

/**
 * Trình phát bài đọc kiểu podcast cho Web Speech API.
 *
 * Trình duyệt không cho tua trong một câu đang đọc, nên toàn bài được coi là một "dải ký tự":
 * vị trí = số ký tự tính từ đầu bài. Muốn phát từ vị trí nào thì đọc phần còn lại của câu chứa
 * vị trí đó, rồi đọc tiếp các câu sau. Vị trí khi đang đọc lấy từ sự kiện `boundary` (nếu giọng
 * đọc hỗ trợ) hoặc ước lượng theo thời gian; tốc độ đọc được tự hiệu chỉnh sau mỗi câu.
 */

/** Số ký tự kana đọc được mỗi giây ở tốc độ 1.0 (giá trị khởi đầu, sẽ tự hiệu chỉnh) */
const DEFAULT_CPS = 7
const LINE_GAP_MS = 350
const now = () => performance.now()

export type PlayerState = 'idle' | 'playing' | 'paused'

export function useReadingPlayer(lines: string[], rate: number) {
  const canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window

  const starts = useMemo(() => {
    const s: number[] = []
    let acc = 0
    for (const l of lines) {
      s.push(acc)
      acc += l.length
    }
    s.push(acc)
    return s
  }, [lines])
  const total = starts[starts.length - 1]

  const [state, setState] = useState<PlayerState>('idle')
  const [pos, setPos] = useState(0)
  /** Đang đọc một câu lẻ (dừng khi hết câu) */
  const [single, setSingle] = useState(false)
  const [cps, setCps] = useState(DEFAULT_CPS)

  const run = useRef(0)
  const rateRef = useRef(rate)
  const cpsRef = useRef(DEFAULT_CPS)
  const posRef = useRef(0)
  /** Thông tin câu đang đọc, để tính vị trí hiện tại */
  const live = useRef<{ from: number; end: number; t0: number; boundary: number | null } | null>(null)
  const seekTimer = useRef<number | undefined>(undefined)

  useEffect(() => {
    rateRef.current = rate
  }, [rate])

  const lineAt = useCallback(
    (p: number) => {
      for (let i = lines.length - 1; i >= 0; i--) if (p >= starts[i]) return Math.min(i, lines.length - 1)
      return 0
    },
    [lines.length, starts],
  )

  /** Vị trí hiện tại (ký tự) */
  const currentPos = useCallback(() => {
    const l = live.current
    if (!l) return posRef.current
    const est = l.from + ((performance.now() - l.t0) / 1000) * cpsRef.current * rateRef.current
    const p = l.boundary !== null ? Math.max(l.boundary, Math.min(est, l.boundary + 6)) : est
    return Math.min(Math.round(p), l.end)
  }, [])

  const setPosBoth = (p: number) => {
    posRef.current = p
    setPos(p)
  }

  const halt = () => {
    run.current++
    live.current = null
    window.clearTimeout(seekTimer.current)
    if (canSpeak) window.speechSynthesis.cancel()
  }

  // Cập nhật thanh tiến trình khi đang đọc
  useEffect(() => {
    if (state !== 'playing') return
    const t = window.setInterval(() => setPos(currentPos()), 120)
    return () => window.clearInterval(t)
  }, [state, currentPos])

  // Rời trang / đổi bài thì dừng
  useEffect(
    () => () => {
      run.current++
      if (canSpeak) window.speechSynthesis.cancel()
    },
    [canSpeak, lines],
  )

  const speakFrom = (p: number, id: number, onlyLine: number | null) => {
    if (id !== run.current) return
    if (p >= total || (onlyLine !== null && p >= starts[onlyLine + 1])) {
      live.current = null
      setPosBoth(Math.min(p, total))
      setState(p >= total ? 'idle' : 'paused')
      setSingle(false)
      return
    }
    const i = lineAt(p)
    const offset = p - starts[i]
    const text = lines[i].slice(offset)
    const end = starts[i + 1]
    const u = new SpeechSynthesisUtterance(text)
    u.lang = 'ja-JP'
    u.rate = rateRef.current
    const info = { from: p, end, t0: now(), boundary: null as number | null }
    u.onstart = () => {
      info.t0 = now()
    }
    u.onboundary = (e) => {
      if (id === run.current) info.boundary = p + e.charIndex
    }
    u.onend = () => {
      if (id !== run.current) return
      // Hiệu chỉnh tốc độ đọc theo câu vừa đọc xong
      const secs = (performance.now() - info.t0) / 1000
      if (text.length >= 4 && secs > 0.4) {
        const measured = text.length / secs / rateRef.current
        if (measured > 2 && measured < 20) {
          cpsRef.current = cpsRef.current * 0.6 + measured * 0.4
          setCps(cpsRef.current)
        }
      }
      live.current = null
      setPosBoth(end)
      window.setTimeout(() => speakFrom(end, id, onlyLine), onlyLine !== null ? 0 : LINE_GAP_MS)
    }
    u.onerror = (e) => {
      if (id !== run.current) return
      // Bị âm thanh khác ngắt (vd. bấm nghe một từ) → tạm dừng tại chỗ đang đọc
      if (e.error === 'interrupted' || e.error === 'canceled') {
        const at = currentPos()
        live.current = null
        setPosBoth(resumePoint(lines, starts, at))
        setState('paused')
        setSingle(false)
      } else u.onend?.(e as unknown as SpeechSynthesisEvent)
    }
    live.current = info
    setPosBoth(p)
    window.speechSynthesis.speak(u)
  }

  const start = (p: number, onlyLine: number | null) => {
    if (!canSpeak || !lines.length) return
    halt()
    const id = run.current
    const from = p >= total ? 0 : p
    setPosBoth(from)
    setState('playing')
    setSingle(onlyLine !== null)
    // Chrome đôi khi bỏ qua speak() gọi ngay sau cancel()
    window.setTimeout(() => speakFrom(from, id, onlyLine), 60)
  }

  /** Vị trí vừa được kéo tới bằng thanh tua → khi phát thì lùi về đầu cụm cho khỏi đọc từ giữa chữ */
  const draggedTo = useRef<number | null>(null)
  const snapIfDragged = (p: number) => {
    const snap = draggedTo.current === p ? clauseStart(lines, starts, p) : p
    draggedTo.current = null
    return snap
  }

  const play = () => start(snapIfDragged(posRef.current), null)

  const pause = () => {
    const at = currentPos()
    halt()
    setPosBoth(resumePoint(lines, starts, at))
    setState('paused')
    setSingle(false)
  }

  /** Tua tới vị trí p; đang phát thì phát tiếp từ đó (gom các lần kéo liên tiếp) */
  const seek = (p: number) => {
    const to = Math.max(0, Math.min(total, Math.round(p)))
    const wasPlaying = state === 'playing'
    const wasSingle = single
    halt()
    setPosBoth(to)
    draggedTo.current = to
    if (!wasPlaying) {
      if (state === 'idle' && to > 0) setState('paused')
      return
    }
    setState('playing')
    const line = wasSingle ? lineAt(to) : null
    seekTimer.current = window.setTimeout(() => start(snapIfDragged(to), line), 250)
  }

  const goLine = (i: number) => {
    const target = starts[Math.max(0, Math.min(lines.length - 1, i))]
    if (state === 'playing') return start(target, single ? lineAt(target) : null)
    halt()
    setPosBoth(target)
    if (state === 'idle' && target > 0) setState('paused')
  }

  /** Nút ở từng câu: câu đang đọc → tạm dừng; đang nghe cả bài → nhảy tới câu đó; còn lại → đọc riêng câu đó */
  const toggleLine = (i: number) => {
    const playingThis = state === 'playing' && lineAt(pos) === i
    if (playingThis) return pause()
    if (state === 'playing' && !single) return start(starts[i], null)
    start(starts[i], i)
  }

  const curLine = lineAt(Math.min(pos, total - 1))
  const secsPerChar = 1 / (cps * rate)

  return {
    canSpeak,
    state,
    single,
    pos,
    total,
    starts,
    curLine,
    /** Thời gian ước lượng (giây) */
    elapsed: pos * secsPerChar + curLine * (LINE_GAP_MS / 1000),
    duration: total * secsPerChar + (lines.length - 1) * (LINE_GAP_MS / 1000),
    play,
    pause,
    seek,
    goLine,
    toggleLine,
  }
}

const BREAKS = '、。！？!?：:　 '

/** Đầu cụm chứa vị trí p: sau dấu câu gần nhất phía trước (trong cùng câu) */
function clauseStart(lines: string[], starts: number[], p: number): number {
  let i = 0
  while (i < lines.length - 1 && p >= starts[i + 1]) i++
  const text = lines[i]
  for (let k = Math.min(p - starts[i], text.length) - 1; k >= 0; k--) if (BREAKS.includes(text[k])) return starts[i] + k + 1
  return starts[i]
}

/**
 * Điểm nghe tiếp sau khi tạm dừng: lùi về đầu cụm (sau dấu 、。！？ gần nhất) nếu gần,
 * không thì lùi vài ký tự để không bị hụt chữ.
 */
function resumePoint(lines: string[], starts: number[], at: number): number {
  let i = 0
  while (i < lines.length - 1 && at >= starts[i + 1]) i++
  const local = Math.max(0, at - starts[i])
  if (local === 0) return starts[i]
  const text = lines[i]
  for (let k = local - 1; k >= 0 && local - k <= 14; k--) {
    if (BREAKS.includes(text[k])) return starts[i] + k + 1
  }
  return starts[i] + Math.max(0, local - 3)
}
