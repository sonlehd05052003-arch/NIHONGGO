/**
 * Nhúng video YouTube bằng IFrame Player API (chỉ tải khi mở bước Video).
 * https://developers.google.com/youtube/iframe_api_reference
 */

export interface YTPlayer {
  playVideo(): void
  pauseVideo(): void
  seekTo(seconds: number, allowSeekAhead: boolean): void
  getCurrentTime(): number
  getDuration(): number
  getPlayerState(): number
  setPlaybackRate(rate: number): void
  getPlaybackRate(): number
  loadVideoById(opts: { videoId: string; startSeconds?: number }): void
  cueVideoById(opts: { videoId: string; startSeconds?: number }): void
  destroy(): void
  /** Phụ đề — API không chính thức nhưng vẫn hoạt động */
  loadModule?(name: string): void
  unloadModule?(name: string): void
  setOption?(module: string, option: string, value: unknown): void
}

interface YTNamespace {
  Player: new (
    el: HTMLElement,
    opts: {
      videoId: string
      width?: string
      height?: string
      playerVars?: Record<string, string | number>
      events?: {
        onReady?: (e: { target: YTPlayer }) => void
        onStateChange?: (e: { data: number; target: YTPlayer }) => void
        onError?: (e: { data: number }) => void
        onPlaybackRateChange?: (e: { data: number }) => void
      }
    },
  ) => YTPlayer
}

declare global {
  interface Window {
    YT?: YTNamespace
    onYouTubeIframeAPIReady?: () => void
  }
}

/** Trạng thái phát (YT.PlayerState) */
export const YT_STATE = { ENDED: 0, PLAYING: 1, PAUSED: 2, BUFFERING: 3, CUED: 5 } as const

let loading: Promise<YTNamespace> | null = null

export function loadYouTubeApi(): Promise<YTNamespace> {
  if (window.YT?.Player) return Promise.resolve(window.YT)
  return (loading ??= new Promise<YTNamespace>((resolve, reject) => {
    const prev = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      prev?.()
      if (window.YT) resolve(window.YT)
    }
    const s = document.createElement('script')
    s.src = 'https://www.youtube.com/iframe_api'
    s.async = true
    s.onerror = () => {
      loading = null
      reject(new Error('Không tải được YouTube — kiểm tra kết nối mạng.'))
    }
    document.head.appendChild(s)
  }))
}

/** Lấy mã video từ link YouTube (watch?v=, youtu.be/, shorts/, embed/, live/) hoặc chính mã 11 ký tự */
export function parseYouTubeId(input: string): string | null {
  const s = input.trim()
  if (/^[\w-]{11}$/.test(s)) return s
  const m = s.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([\w-]{11})/)
  return m ? m[1] : null
}

/** Lấy giây bắt đầu từ link (?t=90 / &t=1m30s / ?start=90) */
export function parseYouTubeStart(input: string): number {
  const m = input.match(/[?&](?:t|start)=(\d+h)?(\d+m)?(\d+)s?/)
  if (!m) return 0
  return (parseInt(m[1] ?? '0') * 3600 || 0) + (parseInt(m[2] ?? '0') * 60 || 0) + parseInt(m[3])
}

/** Tiêu đề video qua oEmbed (không cần khoá API); lỗi thì trả null */
export async function fetchYouTubeTitle(id: string): Promise<{ title: string; channel: string } | null> {
  try {
    const r = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${id}&format=json`)
    if (!r.ok) return null
    const j = await r.json()
    return { title: j.title, channel: j.author_name }
  } catch {
    return null
  }
}

/** Thông báo lỗi trình phát YouTube */
export function ytErrorMessage(code: number): string {
  if (code === 101 || code === 150 || code === 153)
    return 'Chủ video không cho phép phát nhúng trên trang khác. Hãy mở video trên YouTube.'
  if (code === 100) return 'Video không tồn tại hoặc đã bị xoá / để riêng tư.'
  if (code === 2) return 'Mã video không hợp lệ.'
  return 'Không phát được video này.'
}

export const fmtTime = (s: number) => {
  const t = Math.max(0, Math.floor(s))
  const h = Math.floor(t / 3600)
  const m = Math.floor((t % 3600) / 60)
  const sec = String(t % 60).padStart(2, '0')
  return h ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`
}
