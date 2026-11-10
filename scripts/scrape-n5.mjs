// Trích xuất bộ từ vựng N5 từ riki.edu.vn thành src/data/n5.json
// Chạy: node scripts/scrape-n5.mjs [đường-dẫn-html-đã-tải]  (bỏ trống để tự tải)
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const URL = 'https://riki.edu.vn/goc-chia-se/tu-vung-n5/'
const OUT = resolve(dirname(fileURLToPath(import.meta.url)), '../src/data/n5.json')

const CATEGORIES = ['Danh từ', 'Động từ', 'Tính từ い', 'Tính từ な', 'Từ khác']

const html = process.argv[2]
  ? readFileSync(process.argv[2], 'utf8')
  : await (await fetch(URL, { headers: { 'User-Agent': 'Mozilla/5.0' } })).text()

const decode = (s) =>
  s
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;| /g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim()

// ---------- kana -> romaji (Hepburn) ----------
const toHira = (s) => s.replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60))
const BASE = {
  あ:'a',い:'i',う:'u',え:'e',お:'o',か:'ka',き:'ki',く:'ku',け:'ke',こ:'ko',さ:'sa',し:'shi',す:'su',せ:'se',そ:'so',
  た:'ta',ち:'chi',つ:'tsu',て:'te',と:'to',な:'na',に:'ni',ぬ:'nu',ね:'ne',の:'no',は:'ha',ひ:'hi',ふ:'fu',へ:'he',ほ:'ho',
  ま:'ma',み:'mi',む:'mu',め:'me',も:'mo',や:'ya',ゆ:'yu',よ:'yo',ら:'ra',り:'ri',る:'ru',れ:'re',ろ:'ro',わ:'wa',ゐ:'i',ゑ:'e',を:'o',ん:'n',
  が:'ga',ぎ:'gi',ぐ:'gu',げ:'ge',ご:'go',ざ:'za',じ:'ji',ず:'zu',ぜ:'ze',ぞ:'zo',だ:'da',ぢ:'ji',づ:'zu',で:'de',ど:'do',
  ば:'ba',び:'bi',ぶ:'bu',べ:'be',ぼ:'bo',ぱ:'pa',ぴ:'pi',ぷ:'pu',ぺ:'pe',ぽ:'po',ゔ:'vu',
  ぁ:'a',ぃ:'i',ぅ:'u',ぇ:'e',ぉ:'o',ゃ:'ya',ゅ:'yu',ょ:'yo',ゎ:'wa',
}
const SMALL_Y = { ゃ: 'a', ゅ: 'u', ょ: 'o' }
const SMALL_V = { ぁ: 'a', ぃ: 'i', ぅ: 'u', ぇ: 'e', ぉ: 'o' }
function romaji(input) {
  const s = toHira(input)
  let out = ''
  for (let i = 0; i < s.length; i++) {
    const c = s[i], n = s[i + 1]
    if (c === 'っ') {
      const next = romajiSyllable(s, i + 1)
      out += next.r ? (next.r.startsWith('ch') ? 't' : next.r[0]) : ''
      continue
    }
    if (c === 'ー') { out += out.slice(-1); continue }
    const { r, len } = romajiSyllable(s, i)
    if (r === undefined) { out += c; continue }
    if (c === 'ん' && n && /[あいうえおやゆよ]/.test(n)) out += "n'"
    else out += r
    i += len - 1
  }
  return out
}
function romajiSyllable(s, i) {
  const c = s[i], n = s[i + 1]
  const b = BASE[c]
  if (b === undefined) return { r: undefined, len: 1 }
  if (n && SMALL_Y[n] && b.length > 1 && b.endsWith('i')) {
    const stem = b.slice(0, -1)
    return { r: (/^(sh|ch|j)$/.test(stem) ? stem : stem + 'y') + SMALL_Y[n], len: 2 }
  }
  if (n && SMALL_V[n] && b.length > 1) {
    const stem = b === 'fu' ? 'f' : b === 'vu' ? 'v' : b === 'chi' ? 'ch' : b === 'shi' ? 'sh' : b === 'ji' ? 'j' : b === 'te' ? 't' : b === 'de' ? 'd' : b.slice(0, -1)
    const v = SMALL_V[n]
    if (b === 'te' && v === 'i') return { r: 'ti', len: 2 }
    if (b === 'de' && v === 'i') return { r: 'di', len: 2 }
    if (b === 'u' ) return { r: 'w' + v, len: 2 }
    return { r: stem + v, len: 2 }
  }
  return { r: b, len: 1 }
}

// ---------- parse ----------
const tables = html.split('<table>').slice(1).map((t) => t.split('</table>')[0])
if (tables.length < CATEGORIES.length) throw new Error(`Chỉ tìm thấy ${tables.length} bảng`)

const words = []
const seen = new Set()
tables.slice(0, CATEGORIES.length).forEach((table, ti) => {
  const rows = table.match(/<tr>[\s\S]*?<\/tr>/g) ?? []
  for (const row of rows) {
    const cells = (row.match(/<td[^>]*>[\s\S]*?<\/td>/g) ?? []).map(decode)
    if (cells.length < 3) continue
    let [kanji, kana, meaning] = cells
    if (/^kanji$/i.test(kanji) || /^hiragana$/i.test(kana)) continue
    if (!kana && !kanji) continue
    if (!kana) kana = kanji
    kana = kana.replace(/\s*[,、，/／]\s*/g, '、')
    meaning = meaning.replace(/\(\s+/g, '(').replace(/\s+\)/g, ')').replace(/\s*\(/g, ' (').trim()
    meaning = meaning.charAt(0).toLowerCase() === meaning.charAt(0) ? meaning : meaning.charAt(0).toLowerCase() + meaning.slice(1)
    const key = `${kanji}|${kana}|${ti}`
    if (seen.has(key)) continue
    seen.add(key)
    words.push({
      id: `n5-${words.length + 1}`,
      kanji,
      kana,
      romaji: kana.split('、').map(romaji).join(', '),
      meaningVi: meaning,
      level: 'N5',
      category: CATEGORIES[ti],
    })
  }
})

mkdirSync(dirname(OUT), { recursive: true })
writeFileSync(OUT, JSON.stringify(words, null, 0).replace(/},{/g, '},\n{') + '\n')
const byCat = Object.fromEntries(CATEGORIES.map((c) => [c, words.filter((w) => w.category === c).length]))
console.log(`Đã ghi ${words.length} từ vào ${OUT}`, byCat)
