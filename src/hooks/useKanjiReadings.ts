import { useMemo } from 'react'
import { useContent } from '@/hooks/useContent'
import { collectReadings, type Readings } from '@/services/sentenceCheck'

/**
 * Từ điển kanji → cách đọc, lấy từ mọi câu có furigana trong nội dung bài học.
 * Dùng để chấp nhận đáp án gõ bằng kana cho các đáp án viết bằng kanji.
 */
export function useKanjiReadings(): Readings {
  const content = useContent()
  return useMemo(() => {
    if (!content) return new Map()
    const texts: string[] = []
    for (const g of Object.values(content.grammar ?? {})) {
      for (const p of g.points) for (const e of p.examples) texts.push(e.jp)
      for (const e of g.exercises) texts.push(e.jp)
    }
    for (const r of Object.values(content.readings)) for (const l of r.lines) texts.push(l.jp)
    for (const e of Object.values(content.examples)) texts.push(e.jp)
    return collectReadings(texts)
  }, [content])
}
