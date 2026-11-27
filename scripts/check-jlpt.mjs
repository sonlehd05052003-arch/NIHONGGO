// Kiểm tra ngân hàng câu hỏi dạng đề JLPT N5.
//   node scripts/check-jlpt.mjs                      → kiểm tra tất cả scripts/jlpt/*.json
//   node scripts/check-jlpt.mjs scripts/jlpt/lessons-1.json
import { readFileSync, readdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { checkRuby } from './check-grammar.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
export const JLPT_DIR = resolve(ROOT, 'scripts/jlpt')
const lessons = JSON.parse(readFileSync(resolve(ROOT, 'src/data/lessons.json'), 'utf8'))
export const UNIT_IDS = [...new Set(lessons.map((l) => l.unit))].map((_, i) => `u${i + 1}`)

/** Số mục mỗi bài / mỗi chủ đề */
export const LESSON_COUNTS = { context: 3, paraphrase: 2, grammar: 4, order: 2, short: 1, task: 1, point: 1, utter: 1, quick: 2 }
export const UNIT_COUNTS = { textGrammar: 2, midRead: 2, info: 2 }

const BLANK = '（　）'
const HAS_KANJI = /[一-鿿々]/

function text(where, s, errors) {
  if (typeof s !== 'string' || !s.trim()) return errors.push(`${where}: rỗng`)
  const stripped = s.replace(/\[\[|\]\]/g, '')
  if (HAS_KANJI.test(stripped) || /[{}|]/.test(stripped)) checkRuby(where, stripped, errors)
  if (/[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(s))
    errors.push(`${where}: có tiếng Việt trong phần tiếng Nhật → ${s}`)
}

function options(where, opts, n, errors) {
  if (!Array.isArray(opts) || opts.length !== n) return errors.push(`${where}: cần đúng ${n} phương án`)
  opts.forEach((o, i) => text(`${where}.options[${i}]`, o, errors))
  if (new Set(opts).size !== opts.length) errors.push(`${where}: phương án bị trùng`)
}

function answer(where, a, n, errors) {
  if (!Number.isInteger(a) || a < 0 || a >= n) errors.push(`${where}: answer phải là số 0..${n - 1}`)
}

function vi(where, s, errors) {
  if (typeof s !== 'string' || s.trim().length < 4) errors.push(`${where}: thiếu "vi" (dịch / giải thích tiếng Việt)`)
}

function dialogue(where, lines, errors) {
  if (!Array.isArray(lines) || lines.length < 2) return errors.push(`${where}: hội thoại cần ít nhất 2 lượt`)
  lines.forEach((l, i) => {
    if (!['M', 'F'].includes(l.s)) errors.push(`${where}[${i}]: s phải là "M" (nam) hoặc "F" (nữ)`)
    text(`${where}[${i}].t`, l.t, errors)
  })
}

const count = (where, arr, n, errors) => {
  if (!Array.isArray(arr) || arr.length !== n) errors.push(`${where}: cần đúng ${n} mục (đang ${arr?.length ?? 0})`)
  return Array.isArray(arr) ? arr : []
}

export function checkLessonBank(id, b, errors) {
  if (!lessons.some((l) => l.id === id)) return errors.push(`${id}: không có bài này`)
  const C = LESSON_COUNTS
  count(`${id}.context`, b.context, C.context, errors).forEach((q, i) => {
    const w = `${id}.context[${i}]`
    text(w, q.q, errors)
    if (q.q?.split(BLANK).length !== 2) errors.push(`${w}: câu phải có đúng một chỗ trống ${BLANK}`)
    options(w, q.options, 4, errors)
    answer(w, q.answer, 4, errors)
    vi(w, q.vi, errors)
  })
  count(`${id}.paraphrase`, b.paraphrase, C.paraphrase, errors).forEach((q, i) => {
    const w = `${id}.paraphrase[${i}]`
    text(w, q.q, errors)
    if (!/\[\[[^\]]+\]\]/.test(q.q ?? '')) errors.push(`${w}: câu phải có phần gạch chân [[...]]`)
    options(w, q.options, 4, errors)
    answer(w, q.answer, 4, errors)
    vi(w, q.vi, errors)
  })
  count(`${id}.grammar`, b.grammar, C.grammar, errors).forEach((q, i) => {
    const w = `${id}.grammar[${i}]`
    text(w, q.q, errors)
    if (q.q?.split(BLANK).length !== 2) errors.push(`${w}: câu phải có đúng một chỗ trống ${BLANK}`)
    options(w, q.options, 4, errors)
    answer(w, q.answer, 4, errors)
    vi(w, q.vi, errors)
  })
  count(`${id}.order`, b.order, C.order, errors).forEach((q, i) => {
    const w = `${id}.order[${i}]`
    if (typeof q.before !== 'string' || typeof q.after !== 'string') errors.push(`${w}: cần "before" và "after" (có thể rỗng)`)
    if (q.before) text(`${w}.before`, q.before, errors)
    if (q.after) text(`${w}.after`, q.after, errors)
    options(w, q.parts, 4, errors)
    answer(`${w}.star`, q.star, 4, errors)
    vi(w, q.vi, errors)
  })
  count(`${id}.short`, b.short, C.short, errors).forEach((q, i) => {
    const w = `${id}.short[${i}]`
    text(`${w}.text`, q.text, errors)
    text(`${w}.q`, q.q, errors)
    options(w, q.options, 4, errors)
    answer(w, q.answer, 4, errors)
    vi(w, q.vi, errors)
  })
  for (const k of ['task', 'point']) {
    count(`${id}.${k}`, b[k], C[k], errors).forEach((q, i) => {
      const w = `${id}.${k}[${i}]`
      text(`${w}.intro`, q.intro, errors)
      dialogue(`${w}.dialogue`, q.dialogue, errors)
      text(`${w}.q`, q.q, errors)
      options(w, q.options, 4, errors)
      answer(w, q.answer, 4, errors)
      vi(w, q.vi, errors)
    })
  }
  count(`${id}.utter`, b.utter, C.utter, errors).forEach((q, i) => {
    const w = `${id}.utter[${i}]`
    text(`${w}.situation`, q.situation, errors)
    options(w, q.options, 3, errors)
    answer(w, q.answer, 3, errors)
    vi(w, q.vi, errors)
  })
  count(`${id}.quick`, b.quick, C.quick, errors).forEach((q, i) => {
    const w = `${id}.quick[${i}]`
    if (!['M', 'F'].includes(q.s)) errors.push(`${w}: s phải là "M" hoặc "F"`)
    text(`${w}.prompt`, q.prompt, errors)
    options(w, q.options, 3, errors)
    answer(w, q.answer, 3, errors)
    vi(w, q.vi, errors)
  })
}

export function checkUnitBank(id, b, errors) {
  if (!UNIT_IDS.includes(id)) return errors.push(`${id}: không có chủ đề này`)
  const C = UNIT_COUNTS
  count(`${id}.textGrammar`, b.textGrammar, C.textGrammar, errors).forEach((p, i) => {
    const w = `${id}.textGrammar[${i}]`
    text(`${w}.title`, p.title, errors)
    text(`${w}.text`, p.text, errors)
    const n = p.blanks?.length ?? 0
    if (n < 3 || n > 5) errors.push(`${w}: cần 3–5 chỗ trống`)
    for (let k = 1; k <= n; k++) if ((p.text ?? '').split(`【${k}】`).length !== 2) errors.push(`${w}: thiếu / lặp 【${k}】 trong text`)
    p.blanks?.forEach((bl, k) => {
      options(`${w}.blanks[${k}]`, bl.options, 4, errors)
      answer(`${w}.blanks[${k}]`, bl.answer, 4, errors)
    })
    vi(w, p.vi, errors)
  })
  count(`${id}.midRead`, b.midRead, C.midRead, errors).forEach((p, i) => {
    const w = `${id}.midRead[${i}]`
    text(`${w}.text`, p.text, errors)
    if (!Array.isArray(p.questions) || p.questions.length !== 2) errors.push(`${w}: cần đúng 2 câu hỏi`)
    p.questions?.forEach((q, k) => {
      text(`${w}.q[${k}]`, q.q, errors)
      options(`${w}.q[${k}]`, q.options, 4, errors)
      answer(`${w}.q[${k}]`, q.answer, 4, errors)
    })
    vi(w, p.vi, errors)
  })
  count(`${id}.info`, b.info, C.info, errors).forEach((p, i) => {
    const w = `${id}.info[${i}]`
    text(`${w}.text`, p.text, errors)
    text(`${w}.q`, p.q, errors)
    options(w, p.options, 4, errors)
    answer(w, p.answer, 4, errors)
    vi(w, p.vi, errors)
  })
}

/** Đọc toàn bộ ngân hàng: { lessons: {L1: …}, units: {u1: …} } */
export function loadJlpt(files) {
  const all = { lessons: {}, units: {} }
  const list = files ?? readdirSync(JLPT_DIR).filter((f) => f.endsWith('.json')).map((f) => resolve(JLPT_DIR, f))
  for (const f of list) {
    const data = JSON.parse(readFileSync(f, 'utf8'))
    for (const [k, v] of Object.entries(data)) (k.startsWith('u') ? all.units : all.lessons)[k] = v
  }
  return all
}

export function checkJlpt(all, errors) {
  for (const [id, b] of Object.entries(all.lessons)) checkLessonBank(id, b, errors)
  for (const [id, b] of Object.entries(all.units)) checkUnitBank(id, b, errors)
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const args = process.argv.slice(2).map((f) => resolve(f))
  const all = loadJlpt(args.length ? args : undefined)
  const errors = []
  checkJlpt(all, errors)
  for (const e of errors.slice(0, 200)) console.log('✗', e)
  console.log(`${Object.keys(all.lessons).length} bài · ${Object.keys(all.units).length} chủ đề · ${errors.length} lỗi`)
  process.exit(errors.length ? 1 : 0)
}
