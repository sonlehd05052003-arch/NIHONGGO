// Gộp các file scripts/content/part-*.json thành src/data/content.json và kiểm tra lỗi.
// Chạy: node scripts/build-content.mjs
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const DIR = resolve(ROOT, 'scripts/content')
const lessons = JSON.parse(readFileSync(resolve(ROOT, 'src/data/lessons.json'), 'utf8'))

const examples = {}
const readings = {}
for (const f of readdirSync(DIR).filter((f) => /^part-\d+\.json$/.test(f)).sort()) {
  const part = JSON.parse(readFileSync(resolve(DIR, f), 'utf8'))
  Object.assign(examples, part.examples)
  Object.assign(readings, part.readings)
}

const errors = []
const KANJI = /[一-鿿々]/
function checkRuby(where, s) {
  if (typeof s !== 'string' || !s.trim()) return errors.push(`${where}: rỗng`)
  const outside = s.replace(/\{[^|{}]+\|[^{}]+\}/g, '')
  if (/[{}|]/.test(outside)) errors.push(`${where}: furigana lỗi cú pháp → ${s}`)
  if (KANJI.test(outside)) errors.push(`${where}: kanji thiếu furigana → ${s}`)
  for (const m of s.matchAll(/\{[^|{}]+\|([^{}]+)\}/g))
    if (!/^[ぁ-ゟー]+$/.test(m[1])) errors.push(`${where}: furigana không phải hiragana "${m[1]}"`)
}

for (const l of lessons) {
  for (const id of l.words) {
    const e = examples[id]
    if (!e) { errors.push(`${l.id} ${id}: thiếu câu ví dụ`); continue }
    checkRuby(`${id}.jp`, e.jp)
    if (!e.vi?.trim()) errors.push(`${id}: thiếu bản dịch`)
    if (!e.tip?.trim()) errors.push(`${id}: thiếu mẹo nhớ`)
  }
  const r = readings[l.id]
  if (!r) { errors.push(`${l.id}: thiếu bài đọc`); continue }
  checkRuby(`${l.id}.title`, r.title)
  r.lines?.forEach((x, i) => { checkRuby(`${l.id}.line${i}`, x.jp); if (!x.vi?.trim()) errors.push(`${l.id}.line${i}: thiếu dịch`) })
  if (!(r.lines?.length >= 3)) errors.push(`${l.id}: bài đọc quá ngắn`)
  r.questions?.forEach((q, i) => {
    if (!(q.options?.length >= 2) || !(q.answer >= 0 && q.answer < q.options.length)) errors.push(`${l.id}.q${i}: đáp án sai chỉ số`)
  })
}

// Chỉ giữ dữ liệu của từ/bài có thật
const ids = new Set(lessons.flatMap((l) => l.words))
const out = {
  examples: Object.fromEntries(Object.entries(examples).filter(([k]) => ids.has(k))),
  readings: Object.fromEntries(lessons.filter((l) => readings[l.id]).map((l) => [l.id, readings[l.id]])),
}
writeFileSync(resolve(ROOT, 'src/data/content.json'), JSON.stringify(out) + '\n')
console.log(`Câu ví dụ: ${Object.keys(out.examples).length}/${ids.size} · Bài đọc: ${Object.keys(out.readings).length}/${lessons.length}`)
if (errors.length) {
  console.log(`\n${errors.length} lỗi:`)
  console.log(errors.slice(0, 80).join('\n'))
  process.exitCode = 1
}
