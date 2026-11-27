// Đọc kịch bản phần nghe (người dẫn + hội thoại nam/nữ) bằng giọng máy của trình duyệt.
import { rubySpeech } from '@/services/lessons'
import type { AudioLine } from '@/services/jlptExam'

const MALE = /ichiro|keita|otoya|daichi|naoki|male|男/i

function jaVoices() {
  if (!('speechSynthesis' in window)) return { female: undefined, male: undefined }
  const ja = window.speechSynthesis.getVoices().filter((v) => v.lang.replace('_', '-').startsWith('ja'))
  const male = ja.find((v) => MALE.test(v.name))
  const female = ja.find((v) => !MALE.test(v.name)) ?? ja[0]
  return { female, male }
}

const NUM = ['いち', 'に', 'さん', 'よん']

/** Phát lần lượt các lượt nói; trả về hàm dừng */
export function playScript(lines: AudioLine[], opts: { rate?: number; onEnd?: () => void } = {}): () => void {
  if (!('speechSynthesis' in window)) {
    opts.onEnd?.()
    return () => {}
  }
  const synth = window.speechSynthesis
  synth.cancel()
  const { female, male } = jaVoices()
  let stopped = false
  let timer: number | undefined
  const say = (i: number) => {
    if (stopped) return
    if (i >= lines.length) return opts.onEnd?.()
    const l = lines[i]
    const text = rubySpeech(l.t.replace(/^(\d)\.\s*/, (_, d: string) => `${NUM[Number(d) - 1] ?? d}、`)).replace(/\[\[|\]\]/g, '')
    const u = new SpeechSynthesisUtterance(text)
    u.lang = 'ja-JP'
    u.rate = opts.rate ?? 0.9
    // Có giọng nam riêng thì dùng; không thì đổi cao độ để phân biệt người nói
    if (l.s === 'M') {
      if (male) u.voice = male
      else {
        if (female) u.voice = female
        u.pitch = 0.6
      }
    } else {
      if (female) u.voice = female
      u.pitch = l.s === 'F' ? 1.25 : 1
    }
    u.onend = () => {
      timer = window.setTimeout(() => say(i + 1), l.s === 'N' ? 700 : 450)
    }
    u.onerror = u.onend
    synth.speak(u)
  }
  say(0)
  return () => {
    stopped = true
    window.clearTimeout(timer)
    synth.cancel()
  }
}
