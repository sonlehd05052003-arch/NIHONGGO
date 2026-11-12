// Lấy ảnh minh hoạ thật từ Wikipedia / Wikimedia Commons cho từ vựng N5.
// Chạy: node scripts/fetch-images.mjs [--force]
// Kết quả: scripts/n5-images.cache.json (đầy đủ) và src/data/n5-images.json (bản gọn cho app)
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { IMAGE_KEYWORDS } from './image-keywords.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const CACHE = resolve(ROOT, 'scripts/n5-images.cache.json')
const OUT = resolve(ROOT, 'src/data/n5-images.json')
const WORDS = JSON.parse(readFileSync(resolve(ROOT, 'src/data/n5.json'), 'utf8'))
const UA = 'NihonGoVocabApp/1.0 (educational flashcard app; https://github.com/sonlehd05052003-arch/NIHONGGO)'
const WIDTH = 500 // một trong các cỡ thumbnail chuẩn của Wikimedia

const force = process.argv.includes('--force')
const prev = existsSync(CACHE) && !force ? JSON.parse(readFileSync(CACHE, 'utf8')) : {}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
async function api(host, params) {
  const url = `https://${host}/w/api.php?` + new URLSearchParams({ format: 'json', formatversion: '2', origin: '*', ...params })
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(url, { headers: { 'User-Agent': UA } })
    if (res.ok) { await sleep(250); return res.json() }
    await sleep(3000 * (attempt + 1))
  }
  throw new Error(`HTTP lỗi: ${url}`)
}

const strip = (html = '') => html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()

/** Lấy thông tin ảnh (thumbnail + tác giả + giấy phép) từ tên file trên Commons */
async function fileInfo(fileTitle) {
  const data = await api('commons.wikimedia.org', {
    action: 'query',
    titles: fileTitle.startsWith('File:') ? fileTitle : `File:${fileTitle}`,
    prop: 'imageinfo',
    iiprop: 'url|extmetadata|mime',
    iiurlwidth: String(WIDTH),
  })
  const page = data.query?.pages?.[0]
  const ii = page?.imageinfo?.[0]
  if (!ii?.thumburl) return null
  const meta = ii.extmetadata ?? {}
  return {
    src: ii.thumburl,
    page: ii.descriptionurl,
    credit: strip(meta.Artist?.value).slice(0, 80) || 'Wikimedia Commons',
    license: strip(meta.LicenseShortName?.value) || '',
  }
}

async function fromWikipedia(title) {
  const data = await api('en.wikipedia.org', {
    action: 'query',
    titles: title,
    redirects: '1',
    prop: 'pageimages',
    piprop: 'name',
    pilicense: 'free',
  })
  const name = data.query?.pages?.[0]?.pageimage
  return name ? fileInfo(name) : null
}

async function fromCommons(query) {
  const data = await api('commons.wikimedia.org', {
    action: 'query',
    list: 'search',
    srsearch: `${query} filetype:bitmap`,
    srnamespace: '6',
    srlimit: '5',
  })
  for (const hit of data.query?.search ?? []) {
    if (/\.(svg|gif|tiff?|pdf|djvu)$/i.test(hit.title)) continue
    const info = await fileInfo(hit.title)
    if (info) return info
  }
  return null
}

async function lookup(keyword) {
  if (keyword.startsWith('c:')) return fromCommons(keyword.slice(2))
  return (await fromWikipedia(keyword)) ?? (await fromCommons(keyword))
}

// ---------- chạy ----------
const keys = [...new Set(WORDS.map((w) => w.kanji || w.kana))]
// Bỏ ảnh của từ đã bị gỡ từ khoá, lấy lại ảnh khi từ khoá thay đổi
for (const k of Object.keys(prev)) if (!IMAGE_KEYWORDS[k]) delete prev[k]
const todo = keys.filter((k) => IMAGE_KEYWORDS[k] && prev[k]?.keyword !== IMAGE_KEYWORDS[k])
const cache = new Map()
const result = { ...prev }
for (const k of todo) delete result[k]
let done = 0
let miss = []

async function worker() {
  while (todo.length) {
    const k = todo.shift()
    const kw = IMAGE_KEYWORDS[k]
    try {
      if (!cache.has(kw)) cache.set(kw, lookup(kw))
      const info = await cache.get(kw)
      if (info) result[k] = { ...info, keyword: kw }
      else miss.push(`${k} (${kw})`)
    } catch (e) {
      miss.push(`${k} (${kw}) lỗi: ${e.message}`)
    }
    if (++done % 25 === 0) console.log(`  ${done} từ...`)
  }
}

console.log(`Cần lấy ${todo.length} ảnh (${keys.length - Object.keys(IMAGE_KEYWORDS).length > 0 ? 'một số từ trừu tượng sẽ không có ảnh' : ''})`)
await Promise.all(Array.from({ length: 1 }, worker))

// Giữ thứ tự ổn định cho diff gọn
const sorted = Object.fromEntries(keys.filter((k) => result[k]).map((k) => [k, result[k]]))
writeFileSync(CACHE, JSON.stringify(sorted, null, 1) + '\n')

// Bản gọn cho app: [đường dẫn sau "wikipedia/commons/", tác giả, giấy phép].
// App ghép lại với https://upload.wikimedia.org/wikipedia/commons/ và suy ra trang mô tả từ tên file.
const lines = Object.entries(sorted).map(([k, v]) => {
  const path = new URL(v.src).pathname.replace(/^\/wikipedia\/commons\//, '')
  return `${JSON.stringify(k)}:${JSON.stringify([path, v.credit, v.license])}`
})
writeFileSync(OUT, `{\n${lines.join(',\n')}\n}\n`)
console.log(`Xong: ${Object.keys(sorted).length}/${keys.length} từ có ảnh. Không tìm thấy: ${miss.length}`)
if (miss.length) console.log(miss.join('\n'))
