import React, { useState } from 'react'
import type { VocabularyItem } from '@/types'
import './WordImage.css'

const CATEGORY_HUE: Record<string, number> = {
  'Danh từ': 350,
  'Động từ': 230,
  'Tính từ い': 30,
  'Tính từ な': 160,
  'Từ khác': 280,
}

interface Props {
  word: VocabularyItem
  size?: 'thumb' | 'card' | 'tile'
  /** Hiện dòng ghi công tác giả ảnh (bắt buộc với giấy phép CC) */
  credit?: boolean
  className?: string
}

/** Ảnh minh hoạ thật; nếu từ không có ảnh thì hiện thẻ chữ màu theo loại từ */
export const WordImage: React.FC<Props> = ({ word, size = 'card', credit = false, className = '' }) => {
  const [failed, setFailed] = useState(false)
  const img = word.image

  if (!img || failed) {
    return (
      <div
        className={`word-img word-img-${size} word-img-fallback ${className}`}
        style={{ '--hue': CATEGORY_HUE[word.category] ?? 350 } as React.CSSProperties}
        aria-hidden="true"
      >
        <span>{word.kanji || word.kana}</span>
      </div>
    )
  }

  return (
    <figure className={`word-img word-img-${size} ${className}`}>
      <img
        src={img.src}
        alt={word.meaningVi}
        loading={size === 'thumb' ? 'lazy' : 'eager'}
        decoding="async"
        draggable={false}
        onError={() => setFailed(true)}
      />
      {credit && (
        <a
          className="word-img-credit"
          href={img.page}
          target="_blank"
          rel="noreferrer"
          onClick={(e) => e.stopPropagation()}
          title={`Ảnh: ${img.credit}${img.license ? ` · ${img.license}` : ''} — Wikimedia Commons`}
        >
          ⓘ
        </a>
      )}
    </figure>
  )
}
