// Kiểm tra file nội dung ngữ pháp: node scripts/check-grammar.mjs [scripts/grammar/part-1.json ...]
// Không truyền file → kiểm tra tất cả scripts/grammar/part-*.json
import { readFileSync, readdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { GRAMMAR_PLAN } from './grammar-plan.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const DIR = resolve(ROOT, 'scripts/grammar')
const PLAN = Object.fromEntries(GRAMMAR_PLAN)
const KANJI = /[一-鿿々]/

export function checkRuby(where, s, errors) {
  if (typeof s !== 'string' || !s.trim()) return errors.push(`${where}: rỗng`)
  const outside = s.replace(/\{[^|{}]+\|[^{}]+\}/g, '')
  if (/[{}|]/.test(outside)) errors.push(`${where}: furigana lỗi cú pháp → ${s}`)
  if (KANJI.test(outside)) errors.push(`${where}: kanji thiếu furigana → ${s}`)
  for (const m of s.matchAll(/\{([^|{}]+)\|([^{}]+)\}/g)) {
    if (!/^[ぁ-ゟー]+$/.test(m[2])) errors.push(`${where}: furigana phải là hiragana "${m[2]}"`)
    if (!KANJI.test(m[1])) errors.push(`${where}: phần có furigana không chứa kanji "${m[1]}"`)
  }
}

export function checkLesson(id, g, errors) {
  const plan = PLAN[id]
  if (!plan) return errors.push(`${id}: không có trong lộ trình`)
  if (!Array.isArray(g.points) || g.points.length !== plan.length) errors.push(`${id}: cần ${plan.length} mẫu ngữ pháp`)
  g.points?.forEach((p, i) => {
    const w = `${id}.points[${i}]`
    if (plan[i] && p.pattern !== plan[i][0]) errors.push(`${w}: pattern phải đúng "${plan[i][0]}" (đang là "${p.pattern}")`)
    for (const k of ['meaning', 'explain']) if (!p[k]?.trim()) errors.push(`${w}: thiếu ${k}`)
    if (!(p.examples?.length >= 3)) errors.push(`${w}: cần ít nhất 3 ví dụ`)
    p.examples?.forEach((e, j) => {
      checkRuby(`${w}.ex${j}`, e.jp, errors)
      if (!e.vi?.trim()) errors.push(`${w}.ex${j}: thiếu nghĩa`)
    })
  })
  const ex = g.exercises ?? []
  const jv = ex.filter((e) => e.dir === 'jv').length
  const vj = ex.filter((e) => e.dir === 'vj').length
  if (jv < 3 || vj < 3) errors.push(`${id}: cần ≥3 bài Nhật→Việt và ≥3 bài Việt→Nhật (đang ${jv}/${vj})`)
  ex.forEach((e, j) => {
    const w = `${id}.ex${j}`
    if (e.dir !== 'jv' && e.dir !== 'vj') errors.push(`${w}: dir phải là "jv" hoặc "vj"`)
    checkRuby(`${w}.jp`, e.jp, errors)
    if (!e.vi?.trim()) errors.push(`${w}: thiếu vi`)
    for (const a of e.acceptVi ?? []) if (typeof a !== 'string' || !a.trim()) errors.push(`${w}: acceptVi rỗng`)
    for (const a of e.acceptJp ?? [])
      if (typeof a !== 'string' || /[{}|]/.test(a)) errors.push(`${w}: acceptJp là chữ thường, không có furigana`)
    if (e.dir === 'jv' && !(e.acceptVi?.length >= 2)) errors.push(`${w}: Nhật→Việt cần ≥2 cách dịch khác trong acceptVi`)
  })
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) {
  const files = process.argv.slice(2).length
    ? process.argv.slice(2).map((f) => resolve(ROOT, f))
    : readdirSync(DIR)
        .filter((f) => /^part-\d+\.json$/.test(f))
        .map((f) => resolve(DIR, f))
  const errors = []
  let n = 0
  for (const f of files) {
    let data
    try {
      data = JSON.parse(readFileSync(f, 'utf8'))
    } catch (e) {
      errors.push(`${f}: JSON lỗi — ${e.message}`)
      continue
    }
    for (const [id, g] of Object.entries(data)) {
      checkLesson(id, g, errors)
      n++
    }
  }
  console.log(`Đã kiểm tra ${n} bài.`)
  if (errors.length) {
    console.log(`${errors.length} lỗi:\n` + errors.slice(0, 100).join('\n'))
    process.exitCode = 1
  } else console.log('Không có lỗi.')
}
