// Kiểm tra phần bổ sung bài đọc: node scripts/check-reading-extra.mjs [scripts/reading-extra/part-1.json ...]
// Không truyền file → kiểm tra tất cả scripts/reading-extra/part-*.json
import { readFileSync, readdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { checkRuby } from './check-grammar.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const DIR = resolve(ROOT, 'scripts/reading-extra')
const lessons = JSON.parse(readFileSync(resolve(ROOT, 'src/data/lessons.json'), 'utf8'))
const n5 = JSON.parse(readFileSync(resolve(ROOT, 'src/data/n5.json'), 'utf8'))
const n5ById = new Map(n5.map((w) => [w.id, w]))

const plain = (s) => s.replace(/\{([^|{}]+)\|[^{}]+\}/g, '$1')
const kana = (s) => s.replace(/\{[^|{}]+\|([^{}]+)\}/g, '$1')
const forms = (w) =>
  [w.kanji, ...w.kana.split('、')].filter(Boolean).map((f) => f.replace(/[（(].*?[)）]/g, '').trim())
const HAS_KANJI = /[一-鿿々]/

/** Đọc bài đọc gốc từ scripts/content/part-*.json */
export function loadReadings() {
  const CDIR = resolve(ROOT, 'scripts/content')
  const out = {}
  for (const f of readdirSync(CDIR).filter((f) => /^part-\d+\.json$/.test(f)))
    Object.assign(out, JSON.parse(readFileSync(resolve(CDIR, f), 'utf8')).readings)
  return out
}

function checkText(where, s, errors) {
  if (typeof s !== 'string' || !s.trim()) return errors.push(`${where}: rỗng`)
  if (HAS_KANJI.test(s) || /[{}|]/.test(s)) checkRuby(where, s, errors)
}

export function checkExtra(id, x, reading, errors, hints = []) {
  const lesson = lessons.find((l) => l.id === id)
  if (!lesson) return errors.push(`${id}: không có bài này`)
  if (!reading) return errors.push(`${id}: không có bài đọc`)
  const src = [reading.title, ...reading.lines.map((l) => l.jp)]
  const textPlain = src.map(plain).join('\n')
  const textKana = src.map(kana).join('\n')
  const lessonForms = new Set(lesson.words.flatMap((wid) => forms(n5ById.get(wid))))

  // --- glossary
  if (!Array.isArray(x.glossary) || x.glossary.length < 2) errors.push(`${id}: glossary quá ít`)
  const stems = (s) => [s, s.length >= 2 ? s.slice(0, -1) : s, s.length >= 3 ? s.slice(0, -2) : s]
  const inText = (p, k) => stems(p).some((s) => s && textPlain.includes(s)) || stems(k).some((s) => s && textKana.includes(s))
  const seen = new Set()
  x.glossary?.forEach((g, i) => {
    const w = `${id}.glossary[${i}]`
    checkText(w, g.jp, errors)
    if (!g.vi?.trim()) errors.push(`${w}: thiếu nghĩa`)
    const p = plain(g.jp ?? '')
    const k = kana(g.jp ?? '')
    if (seen.has(p)) errors.push(`${w}: lặp "${p}"`)
    seen.add(p)
    if (lessonForms.has(p) || lessonForms.has(k)) errors.push(`${w}: "${p}" là từ của bài này — bỏ ra`)
    if (!inText(p, k)) errors.push(`${w}: "${p}" không thấy trong bài đọc`)
  })
  // Gợi ý: từ N5 (ngoài bài) có chữ Hán xuất hiện trong bài đọc nhưng chưa có trong glossary
  const gl = new Set((x.glossary ?? []).flatMap((g) => [plain(g.jp ?? ''), kana(g.jp ?? '')]))
  for (const w of n5) {
    if (lesson.words.includes(w.id) || forms(w).some((f) => gl.has(f))) continue
    if (w.kanji && w.kanji.length >= 2 && textPlain.includes(w.kanji)) hints.push(`${id}: có "${w.kanji}" (${w.meaningVi})`)
  }

  // --- questions
  const qs = reading.questions
  if (!Array.isArray(x.questions) || x.questions.length !== qs.length) errors.push(`${id}: cần đúng ${qs.length} câu hỏi`)
  x.questions?.forEach((q, i) => {
    const w = `${id}.questions[${i}]`
    checkText(w, q.jp, errors)
    if (!qs[i] || q.options?.length !== qs[i].options.length) errors.push(`${w}: cần ${qs[i]?.options.length} phương án`)
    q.options?.forEach((o, j) => checkText(`${w}.options[${j}]`, o, errors))
  })
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const args = process.argv.slice(2)
  const files = args.length
    ? args
    : readdirSync(DIR)
        .filter((f) => /^part-\d+\.json$/.test(f))
        .map((f) => resolve(DIR, f))
  const readings = loadReadings()
  const errors = []
  const hints = []
  let n = 0
  for (const f of files) {
    const data = JSON.parse(readFileSync(resolve(f), 'utf8'))
    for (const [id, x] of Object.entries(data)) {
      n++
      checkExtra(id, x, readings[id], errors, hints)
    }
  }
  console.log(`${n} bài · ${errors.length} lỗi`)
  if (errors.length) console.log(errors.join('\n'))
  if (hints.length) console.log(`\nGợi ý (${hints.length}):\n` + hints.join('\n'))
  if (errors.length) process.exitCode = 1
}
