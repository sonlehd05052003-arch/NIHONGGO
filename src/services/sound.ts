// Hiệu ứng âm thanh tổng hợp bằng Web Audio — không cần file âm thanh.
const KEY = 'nihongo_sound'

let ctx: AudioContext | null = null
const audio = () => {
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AC) return null
    ctx = new AC()
  }
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

export const isSoundOn = () => {
  try {
    return localStorage.getItem(KEY) !== 'off'
  } catch {
    return true
  }
}

export const setSoundOn = (on: boolean) => {
  try {
    localStorage.setItem(KEY, on ? 'on' : 'off')
  } catch {
    /* bỏ qua */
  }
}

function tone(freq: number, start: number, dur: number, type: OscillatorType = 'sine', gain = 0.18) {
  const a = audio()
  if (!a) return
  const t = a.currentTime + start
  const osc = a.createOscillator()
  const g = a.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t)
  g.gain.setValueAtTime(0, t)
  g.gain.linearRampToValueAtTime(gain, t + 0.01)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  osc.connect(g).connect(a.destination)
  osc.start(t)
  osc.stop(t + dur + 0.02)
}

export const sfx = {
  /** Đúng — càng combo cao càng lên tông */
  correct(combo = 1) {
    if (!isSoundOn()) return
    const up = Math.min(combo - 1, 6) * 60
    tone(660 + up, 0, 0.12, 'triangle')
    tone(990 + up, 0.08, 0.18, 'triangle')
  },
  wrong() {
    if (!isSoundOn()) return
    tone(220, 0, 0.16, 'square', 0.08)
    tone(160, 0.1, 0.22, 'square', 0.08)
  },
  flip() {
    if (!isSoundOn()) return
    tone(520, 0, 0.05, 'sine', 0.08)
  },
  tap() {
    if (!isSoundOn()) return
    tone(800, 0, 0.04, 'sine', 0.06)
  },
  complete() {
    if (!isSoundOn()) return
    ;[523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.11, 0.3, 'triangle', 0.16))
  },
  levelUp() {
    if (!isSoundOn()) return
    ;[784, 988, 1175, 1568].forEach((f, i) => tone(f, i * 0.09, 0.35, 'sine', 0.16))
  },
}
