// Chia động từ / tính từ い (dạng thường gặp ở N5) để chấp nhận khi người học gõ dạng đã chia,
// vd. hỏi "đi bộ" mà gõ "aruite" (歩いて) hay "arukimasu" (歩きます) vẫn tính đúng.
import { romajiToHira } from '@/services/sentenceCheck'
import type { VocabularyItem } from '@/types'

export interface Form {
  /** Dạng đã chia (kana hoặc kanji + kana) */
  text: string
  /** Tên dạng, vd. "thể ます" */
  label: string
}

/** Động từ đuôi -iru/-eru nhưng thuộc nhóm I (chia như う-verb) */
const GODAN_RU = new Set(['帰る', '切る', '知る', '入る', '走る', '要る', '減る', '喋る', '滑る', '握る', '蹴る', '参る', '限る', '照る'])

const ROW: Record<string, [i: string, a: string, te: string, ta: string]> = {
  う: ['い', 'わ', 'って', 'った'],
  つ: ['ち', 'た', 'って', 'った'],
  る: ['り', 'ら', 'って', 'った'],
  む: ['み', 'ま', 'んで', 'んだ'],
  ぶ: ['び', 'ば', 'んで', 'んだ'],
  ぬ: ['に', 'な', 'んで', 'んだ'],
  く: ['き', 'か', 'いて', 'いた'],
  ぐ: ['ぎ', 'が', 'いで', 'いだ'],
  す: ['し', 'さ', 'して', 'した'],
}

const I_E = /[いきぎしじちぢにひびぴみりえけげせぜてでねへべぺめれ]る$/

/** Các đuôi chia từ "gốc" của từng nhóm */
function verbSuffixes(masuStem: string, te: string, ta: string, nai: string): [string, string][] {
  return [
    [`${masuStem}ます`, 'thể ます'],
    [`${masuStem}ました`, 'quá khứ ～ました'],
    [`${masuStem}ません`, 'phủ định ～ません'],
    [`${masuStem}ませんでした`, 'phủ định quá khứ ～ませんでした'],
    [`${masuStem}ましょう`, 'rủ rê ～ましょう'],
    [`${masuStem}たい`, 'muốn ～たい'],
    [te, 'thể て'],
    [`${te}ください`, 'nhờ ～てください'],
    [`${te}います`, 'đang ～ています'],
    [ta, 'thể た'],
    [nai, 'thể ない'],
    [`${nai.slice(0, -1)}かった`, 'phủ định quá khứ ～なかった'],
  ]
}

/**
 * Chia một dạng từ điển (kana) thành các dạng; `kanji` (nếu có) được chia song song
 * bằng cách thay phần đuôi kana tương ứng.
 */
function conjugateVerb(kana: string, kanji: string | undefined): Form[] {
  const out: Form[] = []
  const push = (stemKana: string, stemKanji: string | undefined, list: [string, string][]) => {
    for (const [suffix, label] of list) {
      out.push({ text: stemKana + suffix, label })
      if (stemKanji !== undefined) out.push({ text: stemKanji + suffix, label })
    }
  }

  // Danh từ ghi là động từ nhưng thiếu する (練習 / れんしゅう) → 練習する
  if (kanji && !/[ぁ-ゖ]$/.test(kanji) && !kana.endsWith('する')) return conjugateVerb(`${kana}する`, `${kanji}する`)
  // ～する (勉強する, 散歩する…)
  if (kana.endsWith('する')) {
    const k = kana.slice(0, -2)
    const kj = kanji ? kanji.replace(/する$/, '') : undefined
    push(k, kj, verbSuffixes('し', 'して', 'した', 'しない'))
    return out
  }
  // 来る
  if (kana === 'くる') {
    for (const [t, label] of verbSuffixes('き', 'きて', 'きた', 'こない')) {
      out.push({ text: t, label })
      out.push({ text: `来${t.slice(1)}`, label })
    }
    return out
  }
  const last = kana.slice(-1)
  const kjStem = kanji && kanji.endsWith(last) ? kanji.slice(0, -1) : undefined
  // Nhóm II (～iru/～eru, trừ ngoại lệ)
  if (last === 'る' && I_E.test(kana) && !(kanji && GODAN_RU.has(kanji)) && !(!kanji && ['かえる', 'はいる', 'はしる', 'しる'].includes(kana))) {
    push(kana.slice(0, -1), kjStem, verbSuffixes('', 'て', 'た', 'ない'))
    return out
  }
  // Nhóm I
  const row = ROW[last]
  if (!row) return out
  const [i, a, te, ta] = row
  const isIku = kana === 'いく' // 行く: 行って / 行った
  push(kana.slice(0, -1), kjStem, verbSuffixes(i, isIku ? 'って' : te, isIku ? 'った' : ta, `${a}ない`))
  // ある: phủ định là ない / なかった (không phải "あらない")
  if (kana === 'ある')
    for (const f of out) {
      if (f.label === 'thể ない') f.text = 'ない'
      if (f.label === 'phủ định quá khứ ～なかった') f.text = 'なかった'
    }
  return out
}

function conjugateIAdj(kana: string, kanji: string | undefined): Form[] {
  // いい → よく…
  const base = kana === 'いい' ? 'よい' : kana
  const stemKana = base.slice(0, -1)
  const stemKanji = kanji && kanji.endsWith('い') ? kanji.slice(0, -1) : undefined
  const list: [string, string][] = [
    ['いです', 'lịch sự ～です'],
    ['くない', 'phủ định ～くない'],
    ['くないです', 'phủ định ～くないです'],
    ['くありません', 'phủ định ～くありません'],
    ['かった', 'quá khứ ～かった'],
    ['かったです', 'quá khứ ～かったです'],
    ['くなかった', 'phủ định quá khứ ～くなかった'],
    ['くて', 'thể て'],
    ['く', 'trạng từ ～く'],
  ]
  const out: Form[] = []
  for (const [s, label] of list) {
    out.push({ text: stemKana + s, label })
    if (stemKanji) out.push({ text: stemKanji + s, label })
  }
  if (kana === 'いい') out.push({ text: 'いいです', label: 'lịch sự ～です' })
  return out
}

/** Mọi dạng chia của một từ (rỗng nếu không phải động từ / tính từ い) */
export function wordForms(w: VocabularyItem): Form[] {
  const kanas = w.kana.split('、').map((k) => k.trim())
  if (w.category === 'Động từ') return kanas.flatMap((k) => conjugateVerb(k, w.kanji || undefined))
  if (w.category === 'Tính từ い') return kanas.flatMap((k) => conjugateIAdj(k, w.kanji || undefined))
  return []
}

const toHira = (s: string) => s.replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60))
const norm = (s: string) => {
  const t = s.normalize('NFKC').toLowerCase().replace(/[\s'’\-・.~〜()（）。、]/g, '')
  return toHira(/[a-z]/.test(t) ? romajiToHira(t) : t)
}

/** Người học gõ một dạng đã chia của từ → trả về dạng đó (để báo "đúng, nhưng dạng từ điển là…") */
export function matchConjugated(input: string, w: VocabularyItem): Form | null {
  const n = norm(input)
  if (!n) return null
  return wordForms(w).find((f) => norm(f.text) === n) ?? null
}
