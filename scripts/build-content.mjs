// Gộp các file scripts/content/part-*.json thành src/data/content.json và kiểm tra lỗi.
// Chạy: node scripts/build-content.mjs
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { checkLesson } from './check-grammar.mjs'

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

// Ngữ pháp & bài tập viết câu: scripts/grammar/part-*.json
const GDIR = resolve(ROOT, 'scripts/grammar')
const grammar = {}
for (const f of readdirSync(GDIR).filter((f) => /^part-\d+\.json$/.test(f)).sort())
  Object.assign(grammar, JSON.parse(readFileSync(resolve(GDIR, f), 'utf8')))
for (const l of lessons) {
  if (!grammar[l.id]) errors.push(`${l.id}: thiếu ngữ pháp`)
  else checkLesson(l.id, grammar[l.id], errors)
}

// Video YouTube gợi ý: scripts/videos/part-*.json
const VDIR = resolve(ROOT, 'scripts/videos')
const videos = {}
for (const f of readdirSync(VDIR).filter((f) => /^part-\d+\.json$/.test(f)).sort())
  Object.assign(videos, JSON.parse(readFileSync(resolve(VDIR, f), 'utf8')))
for (const l of lessons) {
  const list = videos[l.id]
  if (!list?.length) { errors.push(`${l.id}: thiếu video`); continue }
  const seen = new Set()
  for (const v of list) {
    if (!/^[\w-]{11}$/.test(v.id ?? '')) errors.push(`${l.id}: mã video sai "${v.id}"`)
    if (!v.title?.trim()) errors.push(`${l.id} ${v.id}: thiếu tiêu đề`)
    if (seen.has(v.id)) errors.push(`${l.id}: video lặp ${v.id}`)
    seen.add(v.id)
  }
}

// Chỉ giữ dữ liệu của từ/bài có thật
const ids = new Set(lessons.flatMap((l) => l.words))
const out = {
  examples: Object.fromEntries(Object.entries(examples).filter(([k]) => ids.has(k))),
  readings: Object.fromEntries(lessons.filter((l) => readings[l.id]).map((l) => [l.id, readings[l.id]])),
  grammar: Object.fromEntries(lessons.filter((l) => grammar[l.id]).map((l) => [l.id, grammar[l.id]])),
  videos: Object.fromEntries(
    lessons
      .filter((l) => videos[l.id])
      .map((l) => [l.id, videos[l.id].map(({ id, title, channel, why, level, start }) => ({ id, title, channel, why, level, start: start || 0 }))]),
  ),
}
writeFileSync(resolve(ROOT, 'src/data/content.json'), JSON.stringify(out) + '\n')
console.log(
  `Câu ví dụ: ${Object.keys(out.examples).length}/${ids.size} · Bài đọc: ${Object.keys(out.readings).length}/${lessons.length}` +
    ` · Ngữ pháp: ${Object.keys(out.grammar).length}/${lessons.length}` +
    ` · Video: ${Object.values(out.videos).flat().length} (${Object.keys(out.videos).length}/${lessons.length} bài)`,
)
if (errors.length) {
  console.log(`\n${errors.length} lỗi:`)
  console.log(errors.slice(0, 80).join('\n'))
  process.exitCode = 1
}
