import { foldVi } from '@/services/vocabularyService'
import type { WritingExercise } from '@/types'

/* =========================================================================
 * Chấm câu Việt → Nhật
 * - Mỗi chỗ có furigana {漢字|かな} gõ kanji hay kana đều đúng
 * - Gõ romaji được (tự đổi sang hiragana)
 * - Trợ từ gõ theo cách đọc cũng được: は = わ, へ = え, を = お
 * - Bỏ qua khoảng trắng, dấu câu, khác biệt katakana / hiragana
 * ========================================================================= */

const toHira = (s: string) => s.replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60))
const PUNCT = /[\s。、．，,.!！?？「」『』（）()・…〜~"'“”：:]/g

/** Nguyên âm của từng kana, để đổi trường âm ー thành nguyên âm (コーヒー = こおひい) */
const VOWEL: Record<string, string> = {}
for (const [v, chars] of Object.entries({
  あ: 'あかさたなはまやらわがざだばぱぁゃゎ',
  い: 'いきしちにひみりぎじぢびぴぃ',
  う: 'うくすつぬふむゆるぐずづぶぷぅゅゔ',
  え: 'えけせてねへめれげぜでべぺぇ',
  お: 'おこそとのほもよろをごぞどぼぽぉょ',
}))
  for (const c of chars) VOWEL[c] = v

export const normJa = (s: string) =>
  toHira(s.normalize('NFKC'))
    .replace(PUNCT, '')
    .replace(/(.)ー/g, (m, prev: string) => (VOWEL[prev] ? prev + VOWEL[prev] : m))

const ROMAJI: Record<string, string> = {
  a: 'あ', i: 'い', u: 'う', e: 'え', o: 'お',
  ka: 'か', ki: 'き', ku: 'く', ke: 'け', ko: 'こ', ga: 'が', gi: 'ぎ', gu: 'ぐ', ge: 'げ', go: 'ご',
  sa: 'さ', si: 'し', shi: 'し', su: 'す', se: 'せ', so: 'そ', za: 'ざ', zi: 'じ', ji: 'じ', zu: 'ず', ze: 'ぜ', zo: 'ぞ',
  ta: 'た', ti: 'ち', chi: 'ち', tu: 'つ', tsu: 'つ', te: 'て', to: 'と', da: 'だ', di: 'ぢ', du: 'づ', de: 'で', do: 'ど',
  na: 'な', ni: 'に', nu: 'ぬ', ne: 'ね', no: 'の',
  ha: 'は', hi: 'ひ', fu: 'ふ', hu: 'ふ', he: 'へ', ho: 'ほ', ba: 'ば', bi: 'び', bu: 'ぶ', be: 'べ', bo: 'ぼ',
  pa: 'ぱ', pi: 'ぴ', pu: 'ぷ', pe: 'ぺ', po: 'ぽ',
  ma: 'ま', mi: 'み', mu: 'む', me: 'め', mo: 'も', ya: 'や', yu: 'ゆ', yo: 'よ',
  ra: 'ら', ri: 'り', ru: 'る', re: 'れ', ro: 'ろ', wa: 'わ', wo: 'を', n: 'ん', nn: 'ん', "n'": 'ん',
  kya: 'きゃ', kyu: 'きゅ', kyo: 'きょ', gya: 'ぎゃ', gyu: 'ぎゅ', gyo: 'ぎょ',
  sha: 'しゃ', shu: 'しゅ', sho: 'しょ', sya: 'しゃ', syu: 'しゅ', syo: 'しょ', she: 'しぇ',
  ja: 'じゃ', ju: 'じゅ', jo: 'じょ', jya: 'じゃ', jyu: 'じゅ', jyo: 'じょ', zya: 'じゃ', zyu: 'じゅ', zyo: 'じょ',
  cha: 'ちゃ', chu: 'ちゅ', cho: 'ちょ', tya: 'ちゃ', tyu: 'ちゅ', tyo: 'ちょ', che: 'ちぇ',
  nya: 'にゃ', nyu: 'にゅ', nyo: 'にょ', hya: 'ひゃ', hyu: 'ひゅ', hyo: 'ひょ', bya: 'びゃ', byu: 'びゅ', byo: 'びょ',
  pya: 'ぴゃ', pyu: 'ぴゅ', pyo: 'ぴょ', mya: 'みゃ', myu: 'みゅ', myo: 'みょ', rya: 'りゃ', ryu: 'りゅ', ryo: 'りょ',
  fa: 'ふぁ', fi: 'ふぃ', fe: 'ふぇ', fo: 'ふぉ', thi: 'てぃ', dhi: 'でぃ', we: 'うぇ', wi: 'うぃ', va: 'ゔぁ', vu: 'ゔ',
  '-': 'ー',
}

/** Đổi romaji (kiểu bộ gõ) sang hiragana; phần không đổi được giữ nguyên */
export function romajiToHira(input: string): string {
  const s = input.toLowerCase()
  let out = ''
  let i = 0
  while (i < s.length) {
    const c = s[i]
    // phụ âm đôi → っ (kk, tt, ss, pp, tch…)
    if (/[bcdfghjkmpqrstvwxyz]/.test(c) && s[i + 1] === c && c !== 'n') {
      out += 'っ'
      i++
      continue
    }
    if (c === 't' && s.startsWith('tch', i)) {
      out += 'っ'
      i++
      continue
    }
    // "nn" + y → ん + や行 (honnya = ほんや), như bộ gõ tiếng Nhật
    if (c === 'n' && s[i + 1] === 'n' && s[i + 2] === 'y') {
      out += 'ん'
      i += 2
      continue
    }
    // "nn" + nguyên âm → ん + な行 (konnichiha = こんにちは, sanno = さんの)
    if (c === 'n' && s[i + 1] === 'n' && /[aiueo]/.test(s[i + 2] ?? '')) {
      out += 'ん'
      i++
      continue
    }
    // n + phụ âm (không phải y) → ん
    if (c === 'n' && s[i + 1] !== undefined && !/[aiueoy'n]/.test(s[i + 1])) {
      out += 'ん'
      i++
      continue
    }
    let hit = false
    for (const len of [3, 2, 1]) {
      const k = s.slice(i, i + len)
      if (ROMAJI[k]) {
        out += ROMAJI[k]
        i += len
        hit = true
        break
      }
    }
    if (!hit) {
      out += c
      i++
    }
  }
  return out
}

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** Một ký tự kana của đáp án → regex (trợ từ は/へ/を chấp nhận cách gõ theo phát âm) */
const kanaRe = (ch: string) => (ch === 'は' ? '[はわ]' : ch === 'へ' ? '[へえ]' : ch === 'を' ? '[をお]' : esc(ch))
const kanaSeqRe = (s: string) => [...normJa(s)].map(kanaRe).join('')

const KANJI_RUN = /[一-鿿々]+/g

/** Từ điển kanji → cách đọc lấy từ các chỗ có furigana, dùng cho đáp án viết không furigana */
export type Readings = Map<string, Set<string>>

export function collectReadings(texts: string[], into: Readings = new Map()): Readings {
  for (const t of texts)
    for (const m of t.matchAll(/\{([^|{}]+)\|([^{}]+)\}/g)) {
      if (!into.has(m[1])) into.set(m[1], new Set())
      into.get(m[1])!.add(m[2])
    }
  return into
}

/** Chuỗi kanji không có furigana → regex chấp nhận kanji hoặc cách đọc đã biết (khớp dài nhất trước) */
function kanjiRunRe(run: string, readings: Readings): string {
  let out = ''
  let i = 0
  while (i < run.length) {
    let matched = false
    for (let len = run.length - i; len >= 1; len--) {
      const k = run.slice(i, i + len)
      const r = readings.get(k)
      if (r) {
        out += `(?:${[esc(k), ...[...r].map(kanaSeqRe)].join('|')})`
        i += len
        matched = true
        break
      }
    }
    if (!matched) {
      out += esc(run[i])
      i++
    }
  }
  return out
}

/** Đáp án (có hoặc không furigana) → regex khớp toàn câu */
function answerRegex(answer: string, readings: Readings): RegExp {
  let re = ''
  let last = 0
  const plainPart = (s: string) =>
    s
      .split(KANJI_RUN)
      .map((kana, idx, arr) => {
        const runs = s.match(KANJI_RUN) ?? []
        return kanaSeqRe(kana) + (idx < arr.length - 1 ? kanjiRunRe(runs[idx], readings) : '')
      })
      .join('')
  for (const m of answer.matchAll(/\{([^|{}]+)\|([^{}]+)\}/g)) {
    re += plainPart(answer.slice(last, m.index))
    re += `(?:${esc(m[1])}|${kanaSeqRe(m[2])})`
    last = m.index! + m[0].length
  }
  re += plainPart(answer.slice(last))
  return new RegExp(`^${re}$`, 'u')
}

export function checkJapanese(input: string, ex: WritingExercise, readings: Readings = new Map()): boolean {
  const raw = input.trim()
  if (!raw) return false
  const all = collectReadings([ex.jp], new Map(readings))
  const candidates = [ex.jp, ...(ex.acceptJp ?? [])].map((a) => answerRegex(a, all))
  const tries = [normJa(raw)]
  // Gõ bằng romaji (có thể lẫn khoảng trắng / dấu câu)
  // (đổi từng cụm theo khoảng trắng: "konban isshoni" → こんばん いっしょに, không thành こんばにっしょに)
  if (/[a-z]/i.test(raw)) tries.push(normJa(raw.split(/\s+/).map(romajiToHira).join('')))
  return tries.some((t) => candidates.some((re) => re.test(t)))
}

/* =========================================================================
 * Chấm câu Nhật → Việt (dịch tự do → chấm gần đúng)
 * So từng tiếng (không phân biệt dấu), bỏ qua các từ ít ý nghĩa (cái, là, thì, ạ…).
 * Câu ngắn phải khớp hẳn một cách dịch mẫu; câu dài được sai 1–2 tiếng.
 * ========================================================================= */

/** Từ đệm / loại từ: có hay không cũng không đổi nghĩa câu */
const FILLER = new Set(['cái', 'chiếc', 'quyển', 'cuốn', 'tờ', 'bức', 'là', 'thì', 'ạ', 'nhé', 'nhỉ', 'ơi', 'à'])
/** Khi gõ không dấu: chỉ coi là từ đệm những từ ít bị nhầm với từ có nghĩa khác */
const FILLER_NO_ACCENT = new Set(['cai', 'chiec', 'quyen', 'cuon', 'buc', 'la'])
/** Đại từ tương đương khi dịch */
const VI_SAME: Record<string, string> = { mình: 'tôi', tớ: 'tôi' }

/** "v.v." / "vv" = "vân vân" */
const expandVi = (s: string) => s.normalize('NFC').replace(/(^|\s)v\.?\s*v\.?(?=\s|$|[,;])/gi, '$1vân vân')

const viTokens = (s: string) =>
  expandVi(s)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => {
      const f = foldVi(VI_SAME[w] ?? w)
      return f === w ? (FILLER_NO_ACCENT.has(f) ? '' : f) : FILLER.has(w) ? '' : f
    })
    .filter(Boolean)

/** Giữ mọi từ, chỉ bỏ dấu — dùng khi người học gõ không dấu */
const viTokensAll = (s: string) =>
  foldVi(expandVi(s))
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean)

/** Hai tiếng chỉ lệch 1 chữ cái (gõ nhầm) */
function isTypo(x: string, y: string): boolean {
  if (Math.abs(x.length - y.length) > 1 || Math.min(x.length, y.length) < 2) return false
  let i = 0
  while (i < x.length && x[i] === y[i]) i++
  return x.slice(i + 1) === y.slice(i + 1) || x.slice(i) === y.slice(i + 1) || x.slice(i + 1) === y.slice(i)
}

/**
 * Khoảng cách chỉnh sửa theo từ. Gõ nhầm 1 chữ cái trong một tiếng chỉ tính 0.5;
 * thay / thêm / bớt cả tiếng tính 1.
 */
function wordDistance(a: string[], b: string[]): number {
  const dp = Array.from({ length: b.length + 1 }, (_, j) => j)
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0]
    dp[0] = i
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j]
      const sub = a[i - 1] === b[j - 1] ? 0 : isTypo(a[i - 1], b[j - 1]) ? 0.5 : 1
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + sub)
      prev = tmp
    }
  }
  return dp[b.length]
}

/** Câu ngắn phải khớp hẳn; câu từ 7 tiếng được gõ nhầm 1 chữ cái */
const allowedEdits = (len: number) => (len <= 6 ? 0 : 0.5)

export interface ViResult {
  ok: boolean
  /** Độ giống với cách dịch gần nhất (0..1) */
  similarity: number
}

export function checkVietnamese(input: string, ex: WritingExercise): ViResult {
  const t = viTokens(input)
  if (!t.length) return { ok: false, similarity: 0 }
  let best = 0
  let ok = false
  // Gõ không dấu → so thêm bản giữ nguyên mọi từ (vì "oi", "nhe" có thể là ơi, nhé hay từ khác)
  const noAccent = foldVi(input) === input.toLowerCase()
  const tAll = noAccent ? viTokensAll(input) : null
  for (const ans of [ex.vi, ...(ex.acceptVi ?? [])]) {
    const pairs: [string[], string[]][] = [[t, viTokens(ans)]]
    if (tAll) pairs.push([tAll, viTokensAll(ans)])
    for (const [x, a] of pairs) {
      const d = wordDistance(x, a)
      best = Math.max(best, 1 - d / Math.max(x.length, a.length, 1))
      if (d <= allowedEdits(a.length)) ok = true
    }
  }
  return { ok, similarity: best }
}

/* =========================================================================
 * So từng chữ (kana) để tô chỗ nghe sai trong bài nghe chép
 * ========================================================================= */

const SAME_SOUND: Record<string, string> = { は: 'わ', へ: 'え', を: 'お' }
const sameKana = (x: string, y: string) => x === y || SAME_SOUND[x] === y || SAME_SOUND[y] === x

export interface KanaDiff {
  /** Từng chữ của đáp án (kana): ok = người học đã nghe đúng chữ này */
  answer: { ch: string; ok: boolean }[]
  /** Số chữ người học viết thừa / sai */
  extra: number
}

/** So câu người học gõ (kana / romaji; kanji thì không so được từng chữ) với cách đọc đáp án */
export function kanaDiff(input: string, answerKana: string): KanaDiff {
  const raw = input.trim()
  const a = [...normJa(/[a-z]/i.test(raw) ? raw.split(/\s+/).map(romajiToHira).join('') : raw)]
  const b = [...normJa(answerKana)]
  // LCS
  const dp = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0))
  for (let i = a.length - 1; i >= 0; i--)
    for (let j = b.length - 1; j >= 0; j--)
      dp[i][j] = sameKana(a[i], b[j]) ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1])
  const ok = new Array<boolean>(b.length).fill(false)
  let i = 0
  let j = 0
  while (i < a.length && j < b.length) {
    if (sameKana(a[i], b[j])) {
      ok[j] = true
      i++
      j++
    } else if (dp[i + 1][j] >= dp[i][j + 1]) i++
    else j++
  }
  const matched = ok.filter(Boolean).length
  return { answer: b.map((ch, k) => ({ ch, ok: ok[k] })), extra: a.length - matched }
}
