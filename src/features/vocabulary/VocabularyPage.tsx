import React, { useDeferredValue, useMemo, useState } from 'react'
import { Search, Volume2, BookOpen, Star, Check } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { WordImage } from '@/components/ui/WordImage'
import { useProgress } from '@/hooks/useProgress'
import { CATEGORIES, N5_VOCABULARY, speak } from '@/services/vocabularyService'
import type { WordCategory } from '@/types'
import './VocabularyPage.css'

const PAGE = 60

type StatusFilter = 'all' | 'known' | 'unknown' | 'starred'
const STATUS: { id: StatusFilter; label: string }[] = [
  { id: 'all', label: 'Tất cả' },
  { id: 'unknown', label: 'Chưa thuộc' },
  { id: 'known', label: 'Đã thuộc' },
  { id: 'starred', label: '★ Gắn sao' },
]

/** Bỏ dấu tiếng Việt để tìm "buoi sang" vẫn ra "buổi sáng" */
const fold = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd')

const INDEX = N5_VOCABULARY.map((w) => ({
  word: w,
  haystack: fold(`${w.kanji} ${w.kana} ${w.romaji} ${w.romaji.replace(/\s/g, '')} ${w.meaningVi}`),
}))

export const VocabularyPage: React.FC = () => {
  const { get, setKnown, toggleStar, knownCount } = useProgress()
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<WordCategory | 'ALL'>('ALL')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [limit, setLimit] = useState(PAGE)
  const query = useDeferredValue(fold(search.trim()))

  const filtered = useMemo(
    () =>
      INDEX.filter(({ word, haystack }) => {
        if (category !== 'ALL' && word.category !== category) return false
        if (query && !haystack.includes(query)) return false
        const p = get(word.id)
        if (status === 'known') return !!p.known
        if (status === 'unknown') return !p.known
        if (status === 'starred') return !!p.starred
        return true
      }).map((x) => x.word),
    [category, query, status, get],
  )

  const counts = useMemo(() => {
    const c: Record<string, number> = { ALL: N5_VOCABULARY.length }
    for (const w of N5_VOCABULARY) c[w.category] = (c[w.category] ?? 0) + 1
    return c
  }, [])

  const resetLimit = () => setLimit(PAGE)

  return (
    <div className="vocab-container">
      <div className="vocab-header">
        <div>
          <h1 className="vocab-title">Từ vựng JLPT N5</h1>
          <p className="vocab-sub">
            {N5_VOCABULARY.length} từ · đã thuộc{' '}
            <b>
              {knownCount} ({Math.round((knownCount / N5_VOCABULARY.length) * 100)}%)
            </b>
          </p>
        </div>
        <div className="level-filter-bar">
          {STATUS.map((s) => (
            <button
              key={s.id}
              className={`filter-btn ${status === s.id ? 'active' : ''}`}
              onClick={() => {
                setStatus(s.id)
                resetLimit()
              }}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="cat-tabs">
        {(['ALL', ...CATEGORIES] as const).map((c) => (
          <button
            key={c}
            className={`cat-tab ${category === c ? 'active' : ''}`}
            onClick={() => {
              setCategory(c)
              resetLimit()
            }}
          >
            {c === 'ALL' ? 'Tất cả' : c}
            <span className="cat-count">{counts[c]}</span>
          </button>
        ))}
      </div>

      <div className="search-bar-wrapper">
        <Search size={18} className="search-icon" />
        <input
          type="search"
          placeholder="Tìm theo kanji, hiragana, romaji hoặc nghĩa (có/không dấu)..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            resetLimit()
          }}
          className="search-input"
        />
      </div>

      {filtered.length > 0 ? (
        <>
          <p className="result-count">{filtered.length} từ</p>
          <div className="vocab-list">
            {filtered.slice(0, limit).map((w) => {
              const p = get(w.id)
              return (
                <div key={w.id} className={`vocab-row ${p.known ? 'known' : ''}`}>
                  <button className="row-btn" onClick={() => speak(w.kana)} title="Nghe phát âm">
                    <Volume2 size={18} />
                  </button>
                  <button className="row-img" onClick={() => speak(w.kana)} title="Nghe phát âm">
                    <WordImage word={w} size="thumb" />
                  </button>
                  <div className="row-jp">
                    <span className="row-kanji">{w.kanji || w.kana}</span>
                    {w.kanji && <span className="row-kana">{w.kana}</span>}
                    <span className="row-romaji">{w.romaji}</span>
                  </div>
                  <div className="row-meaning">
                    {w.meaningVi}
                    <span className="row-cat">{w.category}</span>
                  </div>
                  <div className="row-actions">
                    <button
                      className={`row-btn ${p.starred ? 'starred' : ''}`}
                      onClick={() => toggleStar(w.id)}
                      title="Gắn sao"
                    >
                      <Star size={18} fill={p.starred ? 'currentColor' : 'none'} />
                    </button>
                    <button
                      className={`row-btn known-btn ${p.known ? 'on' : ''}`}
                      onClick={() => setKnown(w.id, !p.known)}
                      title={p.known ? 'Bỏ đánh dấu đã thuộc' : 'Đánh dấu đã thuộc'}
                    >
                      <Check size={18} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
          {limit < filtered.length && (
            <div className="load-more">
              <Button variant="outline" onClick={() => setLimit((l) => l + PAGE * 2)}>
                Xem thêm ({filtered.length - limit} từ)
              </Button>
            </div>
          )}
        </>
      ) : (
        <div className="empty-state">
          <BookOpen size={48} className="empty-icon" />
          <p className="empty-title">Không tìm thấy từ vựng phù hợp</p>
          <p className="empty-desc">Thử từ khóa hoặc bộ lọc khác nhé!</p>
        </div>
      )}
    </div>
  )
}
