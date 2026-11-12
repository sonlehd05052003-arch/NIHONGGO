import React, { useMemo } from 'react'
import { parseRuby } from '@/services/lessons'

/** Hiển thị câu tiếng Nhật có furigana từ chuỗi dạng {漢字|かな} */
export const Ruby: React.FC<{ text: string; className?: string }> = ({ text, className }) => {
  const parts = useMemo(() => parseRuby(text), [text])
  return (
    <span className={`ruby-text ${className ?? ''}`} lang="ja">
      {parts.map((p, i) =>
        typeof p === 'string' ? (
          <React.Fragment key={i}>{p}</React.Fragment>
        ) : (
          <ruby key={i}>
            {p.base}
            <rt>{p.rt}</rt>
          </ruby>
        ),
      )}
    </span>
  )
}
