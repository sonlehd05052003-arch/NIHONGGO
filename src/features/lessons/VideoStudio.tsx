import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Repeat,
  Subtitles,
  StickyNote,
  Trash2,
  Plus,
  ExternalLink,
  Star,
  PenLine,
  Link2,
  X,
  CheckCircle2,
  Keyboard,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useProgress } from '@/hooks/useProgress'
import { N5_VOCABULARY } from '@/services/vocabularyService'
import {
  fetchYouTubeTitle,
  fmtTime,
  loadYouTubeApi,
  parseYouTubeId,
  parseYouTubeStart,
  ytErrorMessage,
  YT_STATE,
  type YTPlayer,
} from '@/services/youtube'
import type { LessonVideo, VocabularyItem } from '@/types'

const RATES = [0.5, 0.75, 1, 1.25]
const WATCHED = 0.8

/** Các từ N5 xuất hiện trong ghi chú (để gắn sao đưa vào ôn tập) */
function wordsInText(text: string): VocabularyItem[] {
  const found: VocabularyItem[] = []
  for (const w of N5_VOCABULARY) {
    const forms = [w.kanji, ...w.kana.split('、')].filter((f) => f && f.length >= 2)
    if (forms.some((f) => text.includes(f))) found.push(w)
    if (found.length >= 6) break
  }
  return found
}

const isTyping = (e: KeyboardEvent) =>
  e.target instanceof HTMLElement && !!e.target.closest('input, textarea, select, [contenteditable="true"]')

export const VideoStudio: React.FC<{ lessonId: string; suggested: LessonVideo[] }> = ({ lessonId, suggested }) => {
  const progress = useProgress()
  const { addVideoNote, removeVideoNote, setVideoWatched, addMyVideo, removeMyVideo, toggleStar, get } = progress
  const myList = progress.progress.myVideos?.[lessonId]
  const mine = useMemo(() => myList ?? [], [myList])
  const videos = useMemo(() => [...suggested, ...mine], [suggested, mine])

  const [currentId, setCurrentId] = useState<string | null>(videos[0]?.id ?? null)
  const current = videos.find((v) => v.id === currentId) ?? videos[0]
  const hasVideo = !!current

  const hostRef = useRef<HTMLDivElement>(null)
  const playerRef = useRef<YTPlayer | null>(null)
  const [ready, setReady] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [playing, setPlaying] = useState(false)
  const [time, setTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [rate, setRate] = useState(1)
  const [a, setA] = useState<number | null>(null)
  const [b, setB] = useState<number | null>(null)
  const [loop, setLoop] = useState(false)
  const [captions, setCaptions] = useState(true)
  const [noteText, setNoteText] = useState('')
  const [dictText, setDictText] = useState('')
  const [showKeys, setShowKeys] = useState(false)
  const loopRef = useRef({ a, b, loop })
  const maxSeen = useRef(0)

  useEffect(() => {
    loopRef.current = { a, b, loop }
  }, [a, b, loop])

  // Tạo trình phát một lần
  useEffect(() => {
    if (!current || !hostRef.current) return
    let cancelled = false
    const el = document.createElement('div')
    hostRef.current.appendChild(el)
    loadYouTubeApi()
      .then((YT) => {
        if (cancelled) return
        playerRef.current = new YT.Player(el, {
          videoId: current.id,
          width: '100%',
          height: '100%',
          playerVars: {
            rel: 0,
            modestbranding: 1,
            playsinline: 1,
            cc_load_policy: 1,
            cc_lang_pref: 'ja',
            hl: 'vi',
            start: current.start ?? 0,
          },
          events: {
            onReady: (e) => {
              setReady(true)
              setDuration(e.target.getDuration() || 0)
            },
            onStateChange: (e) => {
              setPlaying(e.data === YT_STATE.PLAYING)
              if (e.data === YT_STATE.PLAYING) {
                setError(null)
                setDuration(e.target.getDuration() || 0)
              }
            },
            onError: (e) => setError(ytErrorMessage(e.data)),
            onPlaybackRateChange: (e) => setRate(e.data),
          },
        })
      })
      .catch((e: Error) => setApiError(e.message))
    return () => {
      cancelled = true
      playerRef.current?.destroy()
      playerRef.current = null
      el.remove()
    }
    // Chỉ tạo khi bắt đầu có video; đổi video dùng cueVideoById
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasVideo])

  // Đổi video
  const switchTo = (v: LessonVideo) => {
    setCurrentId(v.id)
    setA(null)
    setB(null)
    setLoop(false)
    setError(null)
    setTime(v.start ?? 0)
    setDuration(0)
    maxSeen.current = 0
    playerRef.current?.cueVideoById({ videoId: v.id, startSeconds: v.start ?? 0 })
  }

  // Cập nhật thời gian, lặp đoạn A–B, ghi nhận đã xem
  useEffect(() => {
    if (!ready) return
    const t = window.setInterval(() => {
      const p = playerRef.current
      if (!p) return
      const now = p.getCurrentTime() || 0
      setTime(now)
      const { a, b, loop } = loopRef.current
      if (loop && a !== null && b !== null && b > a && now >= b) p.seekTo(a, true)
      const d = p.getDuration() || 0
      if (d > 0 && current && p.getPlayerState() === YT_STATE.PLAYING) {
        const f = now / d
        if (f > maxSeen.current + 0.05 || (f >= WATCHED && maxSeen.current < WATCHED)) {
          maxSeen.current = f
          setVideoWatched(current.id, f)
        }
      }
    }, 200)
    return () => window.clearInterval(t)
  }, [ready, current, setVideoWatched])

  const p = () => playerRef.current
  const toggle = useCallback(() => {
    const pl = playerRef.current
    if (!pl) return
    if (pl.getPlayerState() === YT_STATE.PLAYING) pl.pauseVideo()
    else pl.playVideo()
  }, [])
  const seekBy = useCallback((d: number) => {
    const pl = playerRef.current
    if (!pl) return
    pl.seekTo(Math.max(0, (pl.getCurrentTime() || 0) + d), true)
  }, [])
  const changeRate = useCallback((r: number) => {
    playerRef.current?.setPlaybackRate(r)
    setRate(r)
  }, [])
  const markA = useCallback(() => {
    const now = playerRef.current?.getCurrentTime() ?? 0
    setA(now)
    setB((b) => (b !== null && b <= now ? null : b))
  }, [])
  const markB = useCallback(() => {
    const now = playerRef.current?.getCurrentTime() ?? 0
    setB(now)
    setA((a) => (a === null ? Math.max(0, now - 5) : a))
    setLoop(true)
  }, [])
  const playSegment = () => {
    if (a === null) return
    p()?.seekTo(a, true)
    p()?.playVideo()
    setLoop(true)
  }

  const setCaptionsOn = (on: boolean) => {
    const pl = p()
    setCaptions(on)
    if (!pl) return
    try {
      if (on) {
        pl.loadModule?.('captions')
        pl.setOption?.('captions', 'track', { languageCode: 'ja' })
      } else pl.unloadModule?.('captions')
    } catch {
      /* trình phát không hỗ trợ — người học bấm CC trên video */
    }
  }

  // Phím tắt
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e) || e.ctrlKey || e.metaKey || e.altKey) return
      const k = e.key.toLowerCase()
      const onControl = e.target instanceof HTMLElement && !!e.target.closest('button, a')
      if (k === 'k' || (k === ' ' && !onControl)) {
        e.preventDefault()
        toggle()
      } else if (k === 'j' || k === 'arrowleft') {
        e.preventDefault()
        seekBy(-5)
      } else if (k === 'l' || k === 'arrowright') {
        e.preventDefault()
        seekBy(5)
      } else if (k === 'a') markA()
      else if (k === 'b') markB()
      else if (k === 'r') setLoop((v) => !v)
      else if (k === ',' || k === '.') {
        const i = RATES.indexOf(rate)
        changeRate(RATES[Math.max(0, Math.min(RATES.length - 1, (i < 0 ? 2 : i) + (k === ',' ? -1 : 1)))])
      } else if (k === 'n') {
        e.preventDefault()
        playerRef.current?.pauseVideo()
        document.getElementById('vs-note-input')?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [toggle, seekBy, markA, markB, changeRate, rate])

  const notes = current ? (progress.progress.videoNotes?.[current.id] ?? []) : []
  const watched = current ? (progress.progress.videosWatched?.[current.id] ?? 0) : 0

  const addNote = (kind: 'note' | 'dictation', text: string, at?: number) => {
    if (!current || !text.trim()) return
    // Lùi 2 giây cho kịp phản xạ khi nghe thấy rồi mới bấm
    const t = at ?? Math.max(0, (p()?.getCurrentTime() ?? time) - 2)
    addVideoNote(current.id, { t, text: text.trim(), kind })
  }

  if (!videos.length)
    return (
      <div className="vs">
        <p className="ld-hint">Bài này chưa có video gợi ý. Bạn có thể thêm video YouTube của riêng mình bên dưới.</p>
        <AddVideo
          onAdd={(v) => {
            addMyVideo(lessonId, v)
            setCurrentId(v.id)
          }}
        />
      </div>
    )

  return (
    <div className="vs">
      {/* Danh sách video của bài */}
      <div className="vs-list" role="tablist" aria-label="Video của bài">
        {videos.map((v) => {
          const w = progress.progress.videosWatched?.[v.id] ?? 0
          const own = mine.some((m) => m.id === v.id)
          return (
            <div key={v.id} className={`vs-item ${v.id === current?.id ? 'active' : ''}`}>
              <button role="tab" aria-selected={v.id === current?.id} className="vs-item-btn" onClick={() => switchTo(v)}>
                <img src={`https://i.ytimg.com/vi/${v.id}/mqdefault.jpg`} alt="" loading="lazy" />
                <span className="vs-item-text">
                  <span className="vs-item-title">{v.title}</span>
                  <span className="vs-item-meta">
                    {v.channel}
                    {own && ' · video của bạn'}
                  </span>
                  {w > 0 && (
                    <span className="vs-item-watched">
                      {w >= WATCHED ? (
                        <>
                          <CheckCircle2 size={12} /> Đã xem
                        </>
                      ) : (
                        `Đã xem ${Math.round(w * 100)}%`
                      )}
                    </span>
                  )}
                </span>
              </button>
              {own && (
                <button
                  className="icon-btn sm vs-item-remove"
                  onClick={() => removeMyVideo(lessonId, v.id)}
                  title="Xoá video này khỏi bài"
                  aria-label="Xoá video"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          )
        })}
      </div>

      {current?.why && <p className="vs-why">💡 {current.why}</p>}

      {/* Trình phát */}
      <div className="vs-player">
        <div ref={hostRef} className="vs-frame" />
        {(apiError || error) && (
          <div className="vs-error">
            <p>{apiError || error}</p>
            {current && (
              <a href={`https://www.youtube.com/watch?v=${current.id}`} target="_blank" rel="noreferrer">
                <ExternalLink size={14} /> Mở trên YouTube
              </a>
            )}
          </div>
        )}
      </div>

      {/* Công cụ nghe */}
      <div className="vs-tools">
        <div className="vs-row">
          <button className="icon-btn" onClick={() => seekBy(-5)} title="Lùi 5 giây (←)" aria-label="Lùi 5 giây">
            <RotateCcw size={18} />
          </button>
          <button className="rp-play" onClick={toggle} aria-label={playing ? 'Tạm dừng' : 'Phát'} disabled={!ready}>
            {playing ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
          </button>
          <button className="icon-btn" onClick={() => seekBy(5)} title="Tiến 5 giây (→)" aria-label="Tiến 5 giây">
            <RotateCw size={18} />
          </button>
          <span className="rp-time vs-clock">
            {fmtTime(time)} / {fmtTime(duration)}
          </span>
          <div className="chip-group vs-rates" role="radiogroup" aria-label="Tốc độ">
            {RATES.map((r) => (
              <button
                key={r}
                role="radio"
                aria-checked={rate === r}
                className={`chip ${rate === r ? 'active' : ''}`}
                onClick={() => changeRate(r)}
              >
                {r}x
              </button>
            ))}
          </div>
        </div>

        <div className="vs-row">
          <span className="vs-label">
            <Repeat size={14} /> Lặp đoạn
          </span>
          <button className={`chip ${a !== null ? 'active' : ''}`} onClick={markA} title="Đặt điểm A (phím A)">
            A {a !== null ? fmtTime(a) : '—'}
          </button>
          <button className={`chip ${b !== null ? 'active' : ''}`} onClick={markB} title="Đặt điểm B (phím B)">
            B {b !== null ? fmtTime(b) : '—'}
          </button>
          <button
            className={`chip ${loop ? 'active' : ''}`}
            onClick={() => setLoop((v) => !v)}
            disabled={a === null || b === null}
            title="Bật/tắt lặp (phím R)"
          >
            {loop ? 'Đang lặp' : 'Lặp'}
          </button>
          {a !== null && (
            <button
              className="chip"
              onClick={() => {
                setA(null)
                setB(null)
                setLoop(false)
              }}
            >
              Bỏ
            </button>
          )}
          <span className="vs-spacer" />
          <button className={`chip ${captions ? 'active' : ''}`} onClick={() => setCaptionsOn(!captions)} title="Phụ đề tiếng Nhật">
            <Subtitles size={14} /> Phụ đề
          </button>
          <button className="chip" onClick={() => setShowKeys((v) => !v)} aria-expanded={showKeys}>
            <Keyboard size={14} /> Phím tắt
          </button>
        </div>

        {showKeys && (
          <p className="vs-keys">
            <kbd>Space</kbd>/<kbd>K</kbd> phát–dừng · <kbd>←</kbd>/<kbd>J</kbd> lùi 5s · <kbd>→</kbd>/<kbd>L</kbd> tiến 5s ·{' '}
            <kbd>A</kbd>/<kbd>B</kbd> đặt điểm lặp · <kbd>R</kbd> bật lặp · <kbd>,</kbd>/<kbd>.</kbd> chậm/nhanh ·{' '}
            <kbd>N</kbd> ghi chú
          </p>
        )}
        <p className="vs-tip">
          Mẹo: xem lần 1 có phụ đề để hiểu ý, lần 2 tắt phụ đề và nghe ở 0.75x, đoạn nào khó thì đặt A–B lặp lại cho tới khi nghe
          rõ. Phụ đề tiếng Nhật chỉ có khi video có sẵn (nút CC trên video).
        </p>
        {watched > 0 && (
          <p className="vs-progress-text">
            {watched >= WATCHED ? '✅ Bạn đã xem xong video này.' : `Đã xem ${Math.round(watched * 100)}% video.`}
          </p>
        )}
      </div>

      {/* Nghe chép tự kiểm tra */}
      <section className="vs-card">
        <h3>
          <PenLine size={17} /> Nghe chép đoạn A–B
        </h3>
        <p className="vs-muted">
          Đặt điểm A–B quanh một câu, tắt phụ đề, nghe và chép lại những gì nghe được. Sau đó bật phụ đề và phát lại để tự so.
        </p>
        <textarea
          className="vs-textarea"
          lang="ja"
          rows={2}
          value={dictText}
          onChange={(e) => setDictText(e.target.value)}
          placeholder={a === null ? 'Đặt điểm A và B trước…' : `Chép đoạn ${fmtTime(a)}–${b !== null ? fmtTime(b) : '…'}`}
        />
        <div className="vs-actions">
          <Button size="sm" variant="secondary" icon={<Repeat size={15} />} onClick={playSegment} disabled={a === null}>
            Phát đoạn
          </Button>
          <Button
            size="sm"
            variant="secondary"
            icon={<Subtitles size={15} />}
            onClick={() => {
              setCaptionsOn(true)
              playSegment()
            }}
            disabled={a === null}
          >
            Bật phụ đề để so
          </Button>
          <Button
            size="sm"
            icon={<StickyNote size={15} />}
            onClick={() => {
              addNote('dictation', dictText, a ?? undefined)
              setDictText('')
            }}
            disabled={!dictText.trim()}
          >
            Lưu vào ghi chú
          </Button>
        </div>
      </section>

      {/* Ghi chú */}
      <section className="vs-card">
        <h3>
          <StickyNote size={17} /> Ghi chú từ mới
        </h3>
        <form
          className="vs-note-form"
          onSubmit={(e) => {
            e.preventDefault()
            addNote('note', noteText)
            setNoteText('')
          }}
        >
          <input
            id="vs-note-input"
            className="type-input"
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder={`Ghi chú tại ${fmtTime(Math.max(0, time - 2))} — vd. 「おいしい」= ngon`}
            onFocus={() => p()?.pauseVideo()}
          />
          <Button type="submit" icon={<Plus size={16} />} disabled={!noteText.trim()}>
            Thêm
          </Button>
        </form>
        {notes.length === 0 ? (
          <p className="vs-muted">Chưa có ghi chú. Nghe thấy từ mới thì bấm phím N (video tự dừng), gõ ghi chú rồi Enter.</p>
        ) : (
          <ul className="vs-notes">
            {notes.map((n) => {
              const found = wordsInText(n.text)
              return (
                <li key={n.id} className={n.kind === 'dictation' ? 'dict' : ''}>
                  <button
                    className="vs-note-time"
                    onClick={() => {
                      p()?.seekTo(n.t, true)
                      p()?.playVideo()
                    }}
                    title="Tua tới đây"
                  >
                    {fmtTime(n.t)}
                  </button>
                  <div className="vs-note-body">
                    <p lang="ja">
                      {n.kind === 'dictation' && <span className="vs-badge">Nghe chép</span>}
                      {n.text}
                    </p>
                    {found.length > 0 && (
                      <div className="vs-note-words">
                        {found.map((w) => {
                          const starred = !!get(w.id).starred
                          return (
                            <button
                              key={w.id}
                              className={`chip sm ${starred ? 'active' : ''}`}
                              onClick={() => toggleStar(w.id)}
                              title={starred ? 'Bỏ gắn sao' : 'Gắn sao để ôn trong Luyện tập'}
                            >
                              <Star size={12} fill={starred ? 'currentColor' : 'none'} /> {w.kanji || w.kana} · {w.meaningVi}
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                  <button
                    className="icon-btn sm"
                    onClick={() => current && removeVideoNote(current.id, n.id)}
                    title="Xoá ghi chú"
                    aria-label="Xoá ghi chú"
                  >
                    <Trash2 size={14} />
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <AddVideo
        onAdd={(v) => {
          addMyVideo(lessonId, v)
          switchTo(v)
        }}
      />
    </div>
  )
}

/** Thêm video YouTube của riêng mình vào bài */
const AddVideo: React.FC<{ onAdd: (v: LessonVideo) => void }> = ({ onAdd }) => {
  const [url, setUrl] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const id = parseYouTubeId(url)
    if (!id) return setMsg('Link không hợp lệ — dán link dạng youtube.com/watch?v=… hoặc youtu.be/…')
    setBusy(true)
    const info = await fetchYouTubeTitle(id)
    setBusy(false)
    onAdd({ id, title: info?.title ?? `Video ${id}`, channel: info?.channel, start: parseYouTubeStart(url) })
    setUrl('')
    setMsg(null)
  }

  return (
    <section className="vs-card">
      <h3>
        <Link2 size={17} /> Thêm video của bạn
      </h3>
      <form className="vs-note-form" onSubmit={submit}>
        <input
          className="type-input"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Dán link YouTube (vd. https://youtu.be/…)"
          inputMode="url"
        />
        <Button type="submit" icon={<Plus size={16} />} disabled={!url.trim() || busy}>
          Thêm
        </Button>
      </form>
      {msg && <p className="ad-error">{msg}</p>}
    </section>
  )
}
