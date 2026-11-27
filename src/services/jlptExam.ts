// Ghép đề theo cấu trúc đề thi JLPT N5 thật:
//   言語知識（文字・語彙）  問題1 漢字読み · 問題2 表記 · 問題3 文脈規定 · 問題4 言い換え類義
//   言語知識（文法）・読解  問題1 文法形式 · 問題2 文の組み立て · 問題3 文章の文法 · 問題4–6 読解
//   聴解                    問題1 課題理解 · 問題2 ポイント理解 · 問題3 発話表現 · 問題4 即時応答
// 漢字読み / 表記 được sinh từ câu ví dụ của từ; các dạng khác lấy ngẫu nhiên từ ngân hàng câu hỏi (src/data/jlpt.json).
// Mỗi lần ghép là một đề mới: ưu tiên câu chưa gặp ở các lần trước, xáo thứ tự phương án.
import { wordForms } from '@/services/conjugate'
import { LESSONS, UNITS, lessonWords, parseRuby, rubyPlain } from '@/services/lessons'
import { shuffle } from '@/services/vocabularyService'
import type { StudyContent, VocabularyItem } from '@/types'

// ---------------------------------------------------------------------------
// Ngân hàng câu hỏi (src/data/jlpt.json)
// ---------------------------------------------------------------------------
type Speaker = 'M' | 'F'
interface Choice {
  q: string
  options: string[]
  answer: number
  vi: string
}
export interface LessonBank {
  context: Choice[]
  paraphrase: Choice[]
  grammar: Choice[]
  order: { before: string; after: string; parts: string[]; star: number; vi: string }[]
  short: (Choice & { text: string })[]
  task: (Choice & { intro: string; dialogue: { s: Speaker; t: string }[] })[]
  point: (Choice & { intro: string; dialogue: { s: Speaker; t: string }[] })[]
  utter: { situation: string; options: string[]; answer: number; vi: string }[]
  quick: { s: Speaker; prompt: string; options: string[]; answer: number; vi: string }[]
}
export interface UnitBank {
  textGrammar: { title: string; text: string; blanks: { options: string[]; answer: number }[]; vi: string }[]
  midRead: { text: string; questions: { q: string; options: string[]; answer: number }[]; vi: string }[]
  info: (Choice & { text: string })[]
}
export interface JlptBank {
  lessons: Record<string, LessonBank>
  units: Record<string, UnitBank>
}

let bankPromise: Promise<JlptBank> | null = null
export const loadJlptBank = () =>
  (bankPromise ??= import('@/data/jlpt.json').then((m) => m.default as unknown as JlptBank))

// ---------------------------------------------------------------------------
// Đề thi
// ---------------------------------------------------------------------------
/** Một lượt nói trong phần nghe; N = người dẫn */
export interface AudioLine {
  s: Speaker | 'N'
  t: string
}

export interface ExamQuestion {
  key: string
  /** Số thứ tự câu trong cả đề */
  num: number
  /** Đề (furigana {漢字|かな}; [[…]] = gạch chân; (chỗ trống) hoặc ★ = chỗ trống) */
  stem?: string
  options: string[]
  answer: number
  /** Phương án chỉ nghe, không in ra (発話表現, 即時応答) */
  hiddenOptions?: boolean
  audio?: AudioLine[]
  /** Dịch / giải thích tiếng Việt (hiện sau khi làm) */
  vi?: string
  /** Lời thoại (hiện sau khi làm, phần nghe) */
  script?: AudioLine[]
}

export interface ExamGroup {
  /** vd. "もんだい1" */
  label: string
  /** Hướng dẫn tiếng Nhật kiểu đề thật */
  instruction: string
  /** Hướng dẫn tiếng Việt ngắn */
  hint: string
  /** Đoạn văn chung của nhóm (文章の文法, 中文, 情報検索) */
  passage?: { title?: string; text: string; vi?: string }
  /** Đoạn văn riêng từng câu (短文) */
  passages?: Record<number, { text: string }>
  questions: ExamQuestion[]
}

export type PartId = 'moji' | 'bunpou' | 'choukai'

export interface ExamPart {
  id: PartId
  title: string
  titleVi: string
  /** Thời gian làm (phút) */
  minutes: number
  groups: ExamGroup[]
}

export interface Exam {
  kind: 'unit' | 'mock'
  scope: string
  parts: ExamPart[]
}

/** Thang điểm JLPT N5: 言語知識（文字・語彙・文法）・読解 0–120, 聴解 0–60; đỗ khi tổng ≥ 80 và không phần nào dưới điểm liệt */
export const JLPT_SCALE = { language: 120, listening: 60, pass: 80, minLanguage: 38, minListening: 19 }

// ---------------------------------------------------------------------------
// Tránh lặp câu giữa các lần làm
// ---------------------------------------------------------------------------
const SEEN_KEY = 'nihongo_jlpt_seen'
const SEEN_MAX = 400

function loadSeen(scope: string): Set<string> {
  try {
    return new Set((JSON.parse(localStorage.getItem(SEEN_KEY) ?? '{}') as Record<string, string[]>)[scope] ?? [])
  } catch {
    return new Set()
  }
}

export function rememberSeen(exam: Exam) {
  const keys = [...new Set(exam.parts.flatMap((p) => p.groups.flatMap((g) => g.questions.map((q) => q.key))))]
  try {
    const all = JSON.parse(localStorage.getItem(SEEN_KEY) ?? '{}') as Record<string, string[]>
    all[exam.scope] = [...(all[exam.scope] ?? []).filter((k) => !keys.includes(k)), ...keys].slice(-SEEN_MAX)
    localStorage.setItem(SEEN_KEY, JSON.stringify(all))
  } catch {
    /* chỉ là ưu tiên câu mới */
  }
}

/** Chọn n mục ngẫu nhiên, ưu tiên mục chưa gặp */
function pick<T>(items: T[], n: number, keyOf: (t: T) => string, seen: Set<string>): T[] {
  const s = shuffle(items)
  return [...s.filter((t) => !seen.has(keyOf(t))), ...s.filter((t) => seen.has(keyOf(t)))].slice(0, n)
}

/** Xáo phương án, giữ đúng chỉ số đáp án */
function shuffled(options: string[], answer: number) {
  const order = shuffle(options.map((_, i) => i))
  return { options: order.map((i) => options[i]), answer: order.indexOf(answer) }
}

// ---------------------------------------------------------------------------
// 漢字読み / 表記: sinh từ câu ví dụ
// ---------------------------------------------------------------------------
const HIRA = /^[ぁ-ゖー]+$/
const KANJI = /[一-鿿々]/

interface Target {
  /** Dạng xuất hiện trong câu, vd. 食べます */
  text: string
  /** Cách đọc, vd. たべます */
  kana: string
  /** Số ký tự kana của phần chữ Hán (để chỉ biến đổi phần này) */
  head: number
}

/** Tìm dạng của từ (có chữ Hán) xuất hiện trong câu */
function findTarget(w: VocabularyItem, plain: string): Target | null {
  if (!w.kanji) return null
  const kana = w.kana.split('、')[0]
  const cands: { text: string; kana: string }[] = [{ text: w.kanji, kana }]
  const forms = wordForms(w)
  for (let i = 0; i + 1 < forms.length; i++)
    if (HIRA.test(forms[i].text) && forms[i + 1].label === forms[i].label && !HIRA.test(forms[i + 1].text))
      cands.push({ text: forms[i + 1].text, kana: forms[i].text })
  const hit = cands.filter((c) => plain.includes(c.text)).sort((a, b) => b.text.length - a.text.length)[0]
  if (!hit) return null
  // chữ Hán + đuôi kana (không có kana xen giữa chữ Hán)
  const m = hit.text.match(/^([一-鿿々]+)([ぁ-ゖ]*)$/)
  if (!m || !hit.kana.endsWith(m[2])) return null
  return { ...hit, head: hit.kana.length - m[2].length }
}

/**
 * Thay `target` trong câu có furigana bằng `insert`; null nếu không thay gọn được.
 * `kana` (nếu có): furigana của đoạn bị thay phải đọc đúng như vậy (lấy furigana của câu làm chuẩn).
 */
function replaceIn(jp: string, target: string, insert: string, kana?: string): string | null {
  let plain = ''
  const spans: { start: number; end: number; ruby: boolean; src: string }[] = []
  for (const p of parseRuby(jp)) {
    const text = typeof p === 'string' ? p : p.base
    spans.push({ start: plain.length, end: plain.length + text.length, ruby: typeof p !== 'string', src: typeof p === 'string' ? p : `{${p.base}|${p.rt}}` })
    plain += text
  }
  const s = plain.indexOf(target)
  if (s < 0) return null
  const e = s + target.length
  let out = ''
  let placed = false
  let reading = ''
  for (const sp of spans) {
    if (sp.end <= s || sp.start >= e) {
      out += sp.src
      continue
    }
    if (sp.ruby && (sp.start < s || sp.end > e)) return null
    reading += sp.ruby ? sp.src.replace(/^\{[^|]+\|([^}]+)\}$/, '$1') : sp.src.slice(Math.max(0, s - sp.start), e - sp.start)
    const before = sp.ruby ? '' : sp.src.slice(0, Math.max(0, s - sp.start))
    const after = sp.ruby ? '' : sp.src.slice(Math.min(sp.src.length, e - sp.start))
    out += before + (placed ? '' : insert) + after
    placed = true
  }
  if (kana !== undefined && reading !== kana) return null
  return out
}

// Biến đổi cách đọc thành các "bẫy" giống đề thật: trường âm, âm ngắt, dakuten, âm ghép
const DAKU: Record<string, string> = {}
for (const [a, b] of ['かが', 'きぎ', 'くぐ', 'けげ', 'こご', 'さざ', 'しじ', 'すず', 'せぜ', 'そぞ', 'ただ', 'ちぢ', 'つづ', 'てで', 'とど', 'はば', 'ひび', 'ふぶ', 'へべ', 'ほぼ'].map((x) => [x[0], x[1]])) {
  DAKU[a] = b
  DAKU[b] = a
}
const SMALL: Record<string, string> = { ゃ: 'や', ゅ: 'ゆ', ょ: 'よ', や: 'ゃ', ゆ: 'ゅ', よ: 'ょ' }
const O_ROW = 'おこごそぞとどのほぼぽもよょろ'
const E_ROW = 'えけげせぜてでねへべぺめれ'

function nearMisses(t: Target): string[] {
  const head = t.kana.slice(0, t.head)
  const tail = t.kana.slice(t.head)
  const out = new Set<string>()
  for (let i = 0; i < head.length; i++) {
    const c = head[i]
    const pre = head.slice(0, i)
    const post = head.slice(i + 1)
    if (DAKU[c]) out.add(pre + DAKU[c] + post)
    if (SMALL[c] && i > 0) out.add(pre + SMALL[c] + post)
    if (c === 'う' && i > 0 && O_ROW.includes(head[i - 1])) out.add(pre + post) // こう → こ
    if (c === 'い' && i > 0 && E_ROW.includes(head[i - 1])) out.add(pre + post) // せい → せ
    if (c === 'っ') out.add(pre + post)
    if (O_ROW.includes(c) && post[0] !== 'う') out.add(pre + c + 'う' + post) // こ → こう
    if (i < head.length - 1 && /[かきくけこさしすせそたちつてとぱぴぷぺぽ]/.test(post[0] ?? '') && c !== 'っ' && c !== 'ん' && head[i + 1] !== 'っ')
      out.add(pre + c + 'っ' + post) // がこう → がっこう
    if (c === 'ん') out.add(pre + post)
  }
  return shuffle([...out].filter((h) => h !== head && h.length > 0)).map((h) => h + tail)
}

// Chữ Hán trông giống nhau (dùng làm phương án nhiễu cho 表記)
const LOOKALIKE_GROUPS = [
  '人入八', '大犬太天夫', '木本休体', '日目白百自', '田由町男', '右左石', '上土士工', '千干午牛年',
  '王玉主住', '見貝買', '先生', '母毎海', '東車', '西四', '水氷永', '金今会全', '子字学', '小少',
  '円同', '外夕多名', '万方', '時待持寺', '間聞問門開閉', '語話読', '書昼', '来米', '雨両', '電雷',
  '気汽', '花化', '飲飯食', '売買', '友有', '新親', '早草', '晴青', '明暗', '道近遠', '店広',
  '室屋', '校交', '京高', '北比', '半羊', '分今', '長', '下不', '口回', '中申', '耳取', '手毛',
  '足走', '雪電', '肉内', '魚漁', '牛半', '正止', '出山', '川州', '火灯', '早旱', '朝明', '夜液',
  '週調', '曜躍', '国園', '家安', '病痛', '院完', '駅験', '社祖', '教数', '室空', '弟第', '妹姉',
  '兄児', '父交', '歌欲', '洗流', '起超', '帰婦', '寝浸', '借措', '貸賃', '作昨', '使便', '住注',
  '泳永', '待特', '紙級', '絵給', '細組', '強弱', '短知', '低底', '重動', '軽転', '楽薬', '暑署',
  '寒塞', '暖緩', '冷令', '古苦', '若苦', '多夕',
]
const LOOKALIKE = new Map<string, string[]>()
for (const g of LOOKALIKE_GROUPS)
  for (const c of g) LOOKALIKE.set(c, [...new Set([...(LOOKALIKE.get(c) ?? []), ...[...g].filter((x) => x !== c)])])

function lookalikeSpellings(text: string): string[] {
  const chars = [...text]
  const out = new Set<string>()
  chars.forEach((c, i) => {
    for (const alt of LOOKALIKE.get(c) ?? []) out.add([...chars.slice(0, i), alt, ...chars.slice(i + 1)].join(''))
  })
  // đổi cả hai chữ của từ ghép
  if (chars.length >= 2) {
    const a = LOOKALIKE.get(chars[0]) ?? []
    const b = LOOKALIKE.get(chars[1]) ?? []
    if (a.length && b.length) out.add(a[0] + b[0] + chars.slice(2).join(''))
  }
  return shuffle([...out].filter((x) => x !== text))
}

function kanjiQuestions(
  kind: 'read' | 'write',
  words: VocabularyItem[],
  content: StudyContent,
  n: number,
  seen: Set<string>,
): ExamQuestion[] {
  const out: ExamQuestion[] = []
  for (const w of pick(words, words.length, (w) => `${kind}:${w.id}`, seen)) {
    if (out.length >= n) break
    const ex = content.examples[w.id]
    if (!ex) continue
    const jp = ex.jp.replace(/^[^：]{1,8}：/, '')
    const t = findTarget(w, rubyPlain(jp))
    if (!t) continue
    if (kind === 'read') {
      const wrong = nearMisses(t).filter((k) => !w.kana.split('、').includes(k)).slice(0, 3)
      const stem = replaceIn(jp, t.text, `[[${t.text}]]`, t.kana)
      if (wrong.length < 3 || !stem) continue
      out.push({ key: `read:${w.id}`, num: 0, stem, ...shuffled([t.kana, ...wrong], 0), vi: `${t.text}（${t.kana}）: ${w.meaningVi}. ${ex.vi}` })
    } else {
      const kanjiPart = t.text.slice(0, t.text.length - (t.kana.length - t.head))
      const okuri = t.text.slice(kanjiPart.length)
      const wrong = lookalikeSpellings(kanjiPart)
        .map((k) => k + okuri)
        .slice(0, 3)
      const stem = replaceIn(jp, t.text, `[[${t.kana}]]`, t.kana)
      if (wrong.length < 3 || !stem || !KANJI.test(kanjiPart)) continue
      out.push({ key: `write:${w.id}`, num: 0, stem, ...shuffled([t.text, ...wrong], 0), vi: `${t.kana} = ${t.text}: ${w.meaningVi}. ${ex.vi}` })
    }
  }
  return out
}

// ---------------------------------------------------------------------------
// Ghép đề
// ---------------------------------------------------------------------------
const INSTR = {
  read: ['＿＿＿の ことばは ひらがなで どう かきますか。１・２・３・４から いちばん いい ものを ひとつ えらんで ください。', 'Từ gạch chân đọc thế nào?'],
  write: ['＿＿＿の ことばは どう かきますか。１・２・３・４から いちばん いい ものを ひとつ えらんで ください。', 'Từ gạch chân viết bằng chữ Hán thế nào?'],
  context: ['（　）に なにを いれますか。１・２・３・４から いちばん いい ものを ひとつ えらんで ください。', 'Chọn từ điền vào chỗ trống.'],
  paraphrase: ['＿＿＿の ぶんと だいたい おなじ いみの ぶんが あります。１・２・３・４から いちばん いい ものを ひとつ えらんで ください。', 'Chọn câu có nghĩa gần nhất với câu có phần gạch chân.'],
  grammar: ['（　）に 何を 入れますか。１・２・３・４から いちばん いい ものを 一つ えらんで ください。', 'Chọn trợ từ / dạng ngữ pháp điền vào chỗ trống.'],
  order: ['★に 入る ものは どれですか。１・２・３・４から いちばん いい ものを 一つ えらんで ください。', 'Sắp xếp 4 mảnh thành câu đúng, chọn mảnh ở vị trí ★.'],
  textGrammar: ['【１】から【４】に 何を 入れますか。ぶんしょうの いみを かんがえて、１・２・３・４から いちばん いい ものを 一つ えらんで ください。', 'Điền vào các chỗ trống trong đoạn văn.'],
  short: ['つぎの ぶんを 読んで、しつもんに こたえて ください。こたえは、１・２・３・４から いちばん いい ものを 一つ えらんで ください。', 'Đọc đoạn văn ngắn rồi trả lời.'],
  mid: ['つぎの ぶんを 読んで、しつもんに こたえて ください。こたえは、１・２・３・４から いちばん いい ものを 一つ えらんで ください。', 'Đọc đoạn văn rồi trả lời.'],
  info: ['右の ページを 見て、下の しつもんに こたえて ください。こたえは、１・２・３・４から いちばん いい ものを 一つ えらんで ください。', 'Tìm thông tin trong thông báo / bảng.'],
  task: ['もんだい１では、はじめに しつもんを 聞いて ください。それから 話を 聞いて、もんだいようしの １から４の 中から、いちばん いい ものを 一つ えらんで ください。', 'Nghe hội thoại, chọn việc người đó sẽ làm.'],
  point: ['もんだい２では、はじめに しつもんを 聞いて ください。それから 話を 聞いて、もんだいようしの １から４の 中から、いちばん いい ものを 一つ えらんで ください。', 'Nghe hội thoại, chọn thông tin được hỏi.'],
  utter: ['もんだい３では、えを 見ながら しつもんを 聞いて ください。→（やじるし）の 人は 何と 言いますか。１から３の 中から、いちばん いい ものを 一つ えらんで ください。', 'Nghe tình huống, chọn câu nói phù hợp (phương án chỉ nghe).'],
  quick: ['もんだい４は、えなどが ありません。ぶんを 聞いて、１から３の 中から、いちばん いい ものを 一つ えらんで ください。', 'Nghe câu nói, chọn câu đáp phù hợp (phương án chỉ nghe).'],
}

/** Số câu mỗi dạng */
const MOCK = { read: 7, write: 5, context: 6, paraphrase: 3, grammar: 9, order: 4, short: 2, mid: 1, info: 1, task: 7, point: 6, utter: 5, quick: 6 }
const UNIT = { read: 4, write: 3, context: 3, paraphrase: 2, grammar: 4, order: 2, short: 1, mid: 1, info: 1, task: 2, point: 2, utter: 2, quick: 3 }

const group = (k: keyof typeof INSTR, n: number, questions: ExamQuestion[], extra: Partial<ExamGroup> = {}): ExamGroup => ({
  label: `もんだい${n}`,
  instruction: INSTR[k][0],
  hint: INSTR[k][1],
  questions,
  ...extra,
})

const numbered = (opts: string[]) => opts.map((o, i) => `${i + 1}. ${o}`)

export function buildExam(kind: 'unit' | 'mock', bank: JlptBank, content: StudyContent, unitIndex = 0): Exam {
  const scope = kind === 'mock' ? 'mock' : `u${unitIndex + 1}`
  const seen = loadSeen(scope)
  const N = kind === 'mock' ? MOCK : UNIT
  const lessons = kind === 'mock' ? LESSONS : (UNITS[unitIndex]?.lessons ?? [])
  const unitIds = kind === 'mock' ? Object.keys(bank.units) : [scope]
  const words = lessons.flatMap(lessonWords)

  /** Lấy các mục của một dạng từ ngân hàng của các bài, gắn khoá */
  function fromLessons<K extends keyof LessonBank>(k: K, n: number) {
    const all = lessons.flatMap((l) => (bank.lessons[l.id]?.[k] ?? []).map((item, i) => ({ item: item as LessonBank[K][number], key: `${k}:${l.id}.${i}` })))
    return pick(all, n, (x) => x.key, seen)
  }
  function fromUnits<K extends keyof UnitBank>(k: K, n: number) {
    const all = unitIds.flatMap((u) => (bank.units[u]?.[k] ?? []).map((item, i) => ({ item: item as UnitBank[K][number], key: `${k}:${u}.${i}` })))
    return pick(all, n, (x) => x.key, seen)
  }
  const choice = (x: { item: Choice; key: string }): ExamQuestion => ({
    key: x.key,
    num: 0,
    stem: x.item.q,
    vi: x.item.vi,
    ...shuffled(x.item.options, x.item.answer),
  })

  // ---- 言語知識（文字・語彙）
  const moji: ExamPart = {
    id: 'moji',
    title: 'げんごちしき（もじ・ごい）',
    titleVi: 'Kiến thức ngôn ngữ: chữ & từ vựng',
    minutes: kind === 'mock' ? 20 : 12,
    groups: [
      group('read', 1, kanjiQuestions('read', words, content, N.read, seen)),
      group('write', 2, kanjiQuestions('write', words, content, N.write, seen)),
      group('context', 3, fromLessons('context', N.context).map(choice)),
      group('paraphrase', 4, fromLessons('paraphrase', N.paraphrase).map(choice)),
    ],
  }

  // ---- 言語知識（文法）・読解
  const orderQs = fromLessons('order', N.order).map(({ item, key }): ExamQuestion => {
    const slots = item.parts.map((_, i) => (i === item.star ? '＿★＿' : '＿＿＿')).join(' ')
    const sh = shuffled(item.parts, item.star)
    return {
      key,
      num: 0,
      stem: `${item.before} ${slots} ${item.after}`.trim(),
      ...sh,
      vi: `${item.before}${item.parts.join('')}${item.after} — ${item.vi}`,
    }
  })
  const tg = fromUnits('textGrammar', 1)[0]
  const tgGroup = tg
    ? group(
        'textGrammar',
        3,
        tg.item.blanks.map((b, i) => ({ key: tg.key, num: 0, stem: `【${i + 1}】`, ...shuffled(b.options, b.answer) })),
        { passage: { title: tg.item.title, text: tg.item.text, vi: tg.item.vi } },
      )
    : null
  const shorts = fromLessons('short', N.short)
  const shortGroup = group(
    'short',
    4,
    shorts.map(({ item, key }) => ({ key, num: 0, stem: item.q, vi: item.vi, ...shuffled(item.options, item.answer) })),
  )
  shortGroup.passages = Object.fromEntries(shorts.map(({ item }, i) => [i, { text: item.text }]))
  const mid = fromUnits('midRead', N.mid)[0]
  const midGroup = mid
    ? group(
        'mid',
        5,
        mid.item.questions.map((q) => ({ key: mid.key, num: 0, stem: q.q, ...shuffled(q.options, q.answer) })),
        { passage: { text: mid.item.text, vi: mid.item.vi } },
      )
    : null
  const info = fromUnits('info', N.info)[0]
  const infoGroup = info
    ? group('info', 6, [{ key: info.key, num: 0, stem: info.item.q, vi: info.item.vi, ...shuffled(info.item.options, info.item.answer) }], {
        passage: { text: info.item.text },
      })
    : null
  const bunpou: ExamPart = {
    id: 'bunpou',
    title: 'げんごちしき（ぶんぽう）・どっかい',
    titleVi: 'Kiến thức ngôn ngữ: ngữ pháp & đọc hiểu',
    minutes: kind === 'mock' ? 40 : 20,
    groups: [
      group('grammar', 1, fromLessons('grammar', N.grammar).map(choice)),
      group('order', 2, orderQs),
      ...[tgGroup, shortGroup, midGroup, infoGroup].filter((g): g is ExamGroup => !!g),
    ],
  }

  // ---- 聴解
  const dialogueQ = ({ item, key }: { item: LessonBank['task'][number]; key: string }): ExamQuestion => {
    const sh = shuffled(item.options, item.answer)
    const script: AudioLine[] = [{ s: 'N', t: item.intro }, ...item.dialogue, { s: 'N', t: item.q }]
    return { key, num: 0, stem: item.q, ...sh, audio: script, script, vi: item.vi }
  }
  const utterQs = fromLessons('utter', N.utter).map(({ item, key }): ExamQuestion => {
    const sh = shuffled(item.options, item.answer)
    const script: AudioLine[] = [{ s: 'N', t: item.situation }, ...numbered(sh.options).map((t) => ({ s: 'F' as const, t }))]
    return { key, num: 0, ...sh, hiddenOptions: true, audio: script, script, vi: item.vi }
  })
  const quickQs = fromLessons('quick', N.quick).map(({ item, key }): ExamQuestion => {
    const sh = shuffled(item.options, item.answer)
    const other: Speaker = item.s === 'M' ? 'F' : 'M'
    const script: AudioLine[] = [{ s: item.s, t: item.prompt }, ...numbered(sh.options).map((t) => ({ s: other, t }))]
    return { key, num: 0, ...sh, hiddenOptions: true, audio: script, script, vi: item.vi }
  })
  const choukai: ExamPart = {
    id: 'choukai',
    title: 'ちょうかい',
    titleVi: 'Nghe hiểu',
    minutes: kind === 'mock' ? 30 : 15,
    groups: [
      group('task', 1, fromLessons('task', N.task).map(dialogueQ)),
      group('point', 2, fromLessons('point', N.point).map(dialogueQ)),
      group('utter', 3, utterQs),
      group('quick', 4, quickQs),
    ],
  }

  const exam: Exam = { kind, scope, parts: [moji, bunpou, choukai] }
  // Bỏ nhóm rỗng, đánh số câu
  for (const p of exam.parts) {
    p.groups = p.groups.filter((g) => g.questions.length)
    let n = 0
    for (const g of p.groups) for (const q of g.questions) q.num = ++n
  }
  return exam
}

export const allQuestions = (exam: Exam) => exam.parts.flatMap((p) => p.groups.flatMap((g) => g.questions))

/** Điểm theo thang JLPT (ước lượng theo tỉ lệ đúng) */
export function scoreExam(exam: Exam, answers: Record<string, number | null>) {
  const qid = (p: PartId, q: ExamQuestion) => `${p}:${q.num}`
  const tally = (ids: PartId[]) => {
    let ok = 0
    let total = 0
    for (const p of exam.parts.filter((x) => ids.includes(x.id)))
      for (const g of p.groups)
        for (const q of g.questions) {
          total++
          if (answers[qid(p.id, q)] === q.answer) ok++
        }
    return { ok, total }
  }
  const lang = tally(['moji', 'bunpou'])
  const listen = tally(['choukai'])
  const language = lang.total ? Math.round((lang.ok / lang.total) * JLPT_SCALE.language) : 0
  const listening = listen.total ? Math.round((listen.ok / listen.total) * JLPT_SCALE.listening) : 0
  const total = language + listening
  const pass = total >= JLPT_SCALE.pass && language >= JLPT_SCALE.minLanguage && listening >= JLPT_SCALE.minListening
  return { language, listening, total, pass, lang, listen }
}

export const answerId = (part: PartId, q: ExamQuestion) => `${part}:${q.num}`
