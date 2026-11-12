import type { DeckFilter, ProgressState, VocabularyItem, WordCategory, WordImage } from '@/types'
import n5Data from '@/data/n5.json'
import n5Images from '@/data/n5-images.json'

// Ảnh từ Wikimedia Commons, lưu gọn: [đường dẫn sau "wikipedia/commons/", tác giả, giấy phép]
const COMMONS = 'https://upload.wikimedia.org/wikipedia/commons/'
const IMAGES = n5Images as unknown as Record<string, [string, string, string]>

function toImage([path, credit, license]: [string, string, string]): WordImage {
  // thumb/a/ab/<tên>/500px-<tên>  hoặc  a/ab/<tên>
  const parts = path.split('/')
  const file = parts[0] === 'thumb' ? parts[3] : parts[2]
  return { src: COMMONS + path, page: `https://commons.wikimedia.org/wiki/File:${file}`, credit, license }
}

export const N5_VOCABULARY: VocabularyItem[] = (n5Data as VocabularyItem[]).map((w) => {
  const img = IMAGES[w.kanji || w.kana]
  return img ? { ...w, image: toImage(img) } : w
})

/** Tải trước ảnh để lúc chuyển thẻ hiện ngay */
export function preloadImage(w?: VocabularyItem) {
  if (w?.image) new Image().src = w.image.src
}

export const CATEGORIES: WordCategory[] = ['Danh từ', 'Động từ', 'Tính từ い', 'Tính từ な', 'Từ khác']

/** Chữ hiển thị chính: Kanji nếu có, ngược lại là kana */
export const displayText = (w: VocabularyItem) => w.kanji || w.kana

export function shuffle<T>(arr: readonly T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function buildDeck(
  categories: WordCategory[],
  filter: DeckFilter,
  progress: ProgressState,
): VocabularyItem[] {
  const cats = new Set(categories.length ? categories : CATEGORIES)
  return N5_VOCABULARY.filter((w) => {
    if (!cats.has(w.category)) return false
    const p = progress.words[w.id]
    switch (filter) {
      case 'unknown':
        return !p?.known
      case 'starred':
        return !!p?.starred
      case 'hard':
        return (p?.wrong ?? 0) > (p?.correct ?? 0) / 2 && (p?.wrong ?? 0) > 0
      default:
        return true
    }
  })
}

/** Chọn n phương án nhiễu, ưu tiên cùng loại từ, không trùng giá trị hiển thị */
export function pickDistractors(
  word: VocabularyItem,
  n: number,
  valueOf: (w: VocabularyItem) => string,
): VocabularyItem[] {
  const used = new Set([valueOf(word)])
  const result: VocabularyItem[] = []
  const pools = [
    shuffle(N5_VOCABULARY.filter((w) => w.category === word.category && w.id !== word.id)),
    shuffle(N5_VOCABULARY.filter((w) => w.category !== word.category)),
  ]
  for (const pool of pools) {
    for (const w of pool) {
      if (result.length >= n) return result
      const v = valueOf(w)
      if (!v || used.has(v)) continue
      used.add(v)
      result.push(w)
    }
  }
  return result
}

const toHiragana = (s: string) =>
  s.replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60))

/** Chuẩn hoá để so khớp lỏng: bỏ khoảng trắng/dấu, kana -> hiragana, gộp nguyên âm dài romaji */
function normalize(s: string) {
  let t = toHiragana(s.toLowerCase().normalize('NFKC')).replace(/[\s'’\-・.~〜()（）]/g, '')
  if (/^[a-z]+$/.test(t)) t = t.replace(/ou/g, 'o').replace(/([aiueo])\1/g, '$1').replace(/m(?=[bmp])/g, 'n')
  return t
}

export function checkTypedAnswer(input: string, w: VocabularyItem): boolean {
  const n = normalize(input)
  if (!n) return false
  const accepted = [
    ...w.kana.split('、'),
    ...w.romaji.split(','),
    ...(w.kanji ? [w.kanji] : []),
  ].map(normalize)
  return accepted.includes(n)
}

/** Bỏ dấu tiếng Việt, chữ thường */
export const foldVi = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd')

const cleanVi = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFC')
    .replace(/[.!?…"“”]/g, '')
    .replace(/\s+/g, ' ')
    .trim()

/** Các nghĩa chấp nhận được: cả câu, từng ý ngăn bởi , ; /, có và không có phần trong ngoặc */
export function meaningAlternatives(meaning: string): string[] {
  const withoutParens = meaning.replace(/\([^)]*\)/g, ' ')
  const parts = [meaning, withoutParens, ...withoutParens.split(/[,;/]/)]
  return [...new Set(parts.map(cleanVi).filter(Boolean))]
}

// ---------------------------------------------------------------------------
// Chuẩn hoá nghĩa tiếng Việt: từ đồng nghĩa / Bắc–Nam và số chữ ↔ chữ số
// ---------------------------------------------------------------------------

/** Mỗi nhóm: từ đầu tiên là dạng chuẩn, các từ sau được quy về nó */
const VI_SYNONYMS: string[][] = [
  ['mùa hạ', 'mùa hè'],
  ['nghỉ hè', 'nghỉ hạ'],
  ['bố', 'cha', 'tía'],
  ['mẹ', 'má'],
  ['tivi', 'ti vi', 'ti-vi', 'tv', 'vô tuyến'],
  ['ô tô', 'ôtô', 'oto', 'xe ô tô', 'xe hơi'],
  ['xe máy', 'xe gắn máy'],
  ['cốc', 'ly'],
  ['bát', 'chén'],
  ['thìa', 'muỗng'],
  ['xà phòng', 'xà bông'],
  ['nghìn', 'ngàn'],
  ['máy ảnh', 'máy chụp ảnh', 'máy chụp hình', 'máy hình'],
  ['nhà vệ sinh', 'toilet', 'wc'],
  ['lạc', 'đậu phộng'],
  ['béo', 'mập'],
  ['nhanh', 'lẹ'],
  ['mũ', 'nón'],
  ['kính', 'mắt kính', 'kính mắt'],
  ['sân bay', 'phi trường'],
  ['máy bay', 'phi cơ'],
  ['cảnh sát', 'công an'],
  ['rạp chiếu phim', 'rạp phim', 'rạp chiếu bóng'],
  ['bao giờ', 'khi nào', 'lúc nào'],
  ['như thế nào', 'thế nào', 'ra sao'],
  ['tại sao', 'vì sao'],
  ['vâng', 'dạ'],
  ['chủ nhật', 'cn'],
  ['mồng', 'mùng'],
  ['năm ngoái', 'năm trước', 'năm rồi'],
  ['tháng trước', 'tháng rồi'],
  ['tuần trước', 'tuần rồi'],
  ['hôm nay', 'bữa nay'],
  ['hôm qua', 'bữa qua'],
  ['ngày mai', 'mai'],
]

/** Số đếm viết bằng chữ → chữ số (áp dụng cho cả đáp án và câu trả lời nên luôn nhất quán) */
const VI_NUMBERS: Record<string, string> = {
  một: '1', hai: '2', ba: '3', bốn: '4', tư: '4', năm: '5', sáu: '6',
  bảy: '7', bẩy: '7', tám: '8', chín: '9', mười: '10', trăm: '100', vạn: '10000',
}

const BOUND_L = '(?<![\\p{L}\\p{N}])'
const BOUND_R = '(?![\\p{L}\\p{N}])'
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** Tạo hàm thay thế theo từ, ưu tiên cụm dài trước để "ô tô" không bị cắt thành "ô" */
function makeReplacer(map: Map<string, string>) {
  const keys = [...map.keys()].sort((a, b) => b.length - a.length).map(escapeRe)
  const re = new RegExp(`${BOUND_L}(${keys.join('|')})${BOUND_R}`, 'gu')
  return (s: string) => s.replace(re, (m) => map.get(m) ?? m)
}

function buildCanon(fold: (s: string) => string) {
  const syn = new Map<string, string>()
  for (const [canon, ...rest] of VI_SYNONYMS) for (const v of [canon, ...rest]) syn.set(fold(v), fold(canon))
  const num = new Map(Object.entries(VI_NUMBERS).map(([k, v]) => [fold(k), v]))
  const r1 = makeReplacer(syn)
  const r2 = makeReplacer(num)
  // Bỏ loại từ đứng đầu: "cái bàn" = "bàn", "bức tranh" = "tranh"
  const lead = new RegExp(`^(${['cái', 'chiếc', 'con', 'quả', 'bức', 'cuốn', 'quyển', 'tờ'].map(fold).join('|')}) (?=\\S)`, 'u')
  // "ngày mồng 4" = "mồng 4" = "ngày 4"
  const ngay = fold('ngày')
  const mong = new RegExp(`(?:${ngay} )?${fold('mồng')} (\\d+)`, 'gu')
  return (s: string) =>
    r2(r1(fold(s)))
      .replace(lead, '')
      .replace(mong, `${ngay} $1`)
      .replace(/\s+/g, ' ')
      .trim()
}

const canonExact = buildCanon((s) => s)
const canonFolded = buildCanon(foldVi)

/**
 * Gõ thiếu dấu thì bỏ qua, nhưng dấu đã gõ phải khớp:
 * "ban" khớp "bàn"; "bẩn" thì không khớp "bàn".
 */
function accentCompatible(input: string, target: string): boolean {
  const a = [...input]
  const b = [...target]
  if (a.length !== b.length) return false
  return a.every((c, i) => c === b[i] || (foldVi(c) === c && foldVi(b[i]) === c))
}

/** So nghĩa tiếng Việt: đúng một ý là được; chấp nhận gõ thiếu dấu, số dạng chữ số và từ đồng nghĩa */
export function checkMeaningAnswer(input: string, w: VocabularyItem): boolean {
  const n = cleanVi(input.replace(/\([^)]*\)/g, ' '))
  if (!n) return false
  const alts = meaningAlternatives(w.meaningVi)
  if (alts.some((a) => accentCompatible(n, a))) return true
  const ce = canonExact(n)
  if (alts.some((a) => accentCompatible(ce, canonExact(a)))) return true
  // Gõ hoàn toàn không dấu: so trên bản đã bỏ dấu (để "mua he" vẫn khớp "mùa hạ")
  const folded = foldVi(n)
  if (folded !== n) return false
  const cf = canonFolded(folded)
  return alts.some((a) => canonFolded(foldVi(a)) === cf)
}

/** Đọc một từ (lấy cách đọc đầu tiên nếu có nhiều cách ngăn bởi "、") */
export function speak(text: string) {
  speakSentence(text.split('、')[0])
}

/** Đọc nguyên một câu/đoạn tiếng Nhật */
export function speakSentence(text: string, rate = 0.9) {
  if (!('speechSynthesis' in window)) return
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = 'ja-JP'
  u.rate = rate
  window.speechSynthesis.speak(u)
}
