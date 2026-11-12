import { useEffect, useState } from 'react'
import { loadContent } from '@/services/lessons'
import type { StudyContent } from '@/types'

let cached: StudyContent | null = null

/** Tải (lười) câu ví dụ, mẹo nhớ và bài đọc; trả về null khi đang tải */
export function useContent(): StudyContent | null {
  const [content, setContent] = useState<StudyContent | null>(cached)
  useEffect(() => {
    if (cached) return
    let alive = true
    loadContent()
      .then((c) => {
        cached = c
        if (alive) setContent(c)
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])
  return content
}
