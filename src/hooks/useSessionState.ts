import { useEffect, useState } from 'react'

/**
 * Giống useState nhưng giữ giá trị trong sessionStorage: chuyển qua bước khác rồi quay lại
 * (component bị gỡ rồi dựng lại) hay tải lại trang vẫn làm tiếp được; đóng tab thì mất.
 * `valid` dùng để bỏ giá trị cũ không còn hợp lệ (vd. nội dung bài đã thay đổi).
 */
export function useSessionState<T>(
  key: string,
  initial: T | (() => T),
  valid?: (v: T) => boolean,
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = window.sessionStorage.getItem(key)
      if (raw !== null) {
        const v = JSON.parse(raw) as T
        if (!valid || valid(v)) return v
      }
    } catch {
      /* sessionStorage bị chặn → dùng giá trị mặc định */
    }
    return initial instanceof Function ? initial() : initial
  })

  useEffect(() => {
    try {
      window.sessionStorage.setItem(key, JSON.stringify(value))
    } catch {
      /* bỏ qua */
    }
  }, [key, value])

  return [value, setValue]
}
