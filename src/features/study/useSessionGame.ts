import { useCallback, useEffect, useRef, useState } from 'react'
import { useProgress } from '@/hooks/useProgress'
import { levelInfo } from '@/services/level'
import { sfx } from '@/services/sound'

// ---------------------------------------------------------------------------
// Trạng thái "trò chơi" của một lượt học: combo, XP, hiệu ứng nổi
// ---------------------------------------------------------------------------
interface Pop {
  id: number
  text: string
  kind: 'xp' | 'combo' | 'level'
}

const COMBO_TEXT: Record<number, string> = { 3: 'Tuyệt!', 5: 'Xuất sắc!', 8: 'Không thể cản!', 12: 'Huyền thoại!' }

export function useSessionGame() {
  const { addXp, xp } = useProgress()
  const comboRef = useRef(0)
  const xpRef = useRef(xp)
  const [combo, setCombo] = useState(0)
  const [bestCombo, setBestCombo] = useState(0)
  const [earned, setEarned] = useState(0)
  const [pops, setPops] = useState<Pop[]>([])
  const popId = useRef(0)

  useEffect(() => {
    xpRef.current = xp
  }, [xp])

  const pop = useCallback((text: string, kind: Pop['kind']) => {
    const id = ++popId.current
    setPops((p) => [...p, { id, text, kind }])
    window.setTimeout(() => setPops((p) => p.filter((x) => x.id !== id)), 1100)
  }, [])

  /** Trả lời đúng: cộng XP (thưởng theo combo) */
  const hit = useCallback(
    (base = 10) => {
      const c = ++comboRef.current
      const gain = base + Math.min(c - 1, 5) * 2
      const before = levelInfo(xpRef.current).level
      xpRef.current += gain
      addXp(gain)
      setCombo(c)
      setBestCombo((b) => Math.max(b, c))
      setEarned((e) => e + gain)
      pop(`+${gain} XP`, 'xp')
      if (COMBO_TEXT[c]) pop(`${COMBO_TEXT[c]} 🔥${c}`, 'combo')
      if (levelInfo(xpRef.current).level > before) {
        sfx.levelUp()
        pop(`⭐ Lên cấp ${levelInfo(xpRef.current).level}!`, 'level')
      } else sfx.correct(c)
    },
    [addXp, pop],
  )

  /** Trả lời sai: mất combo */
  const miss = useCallback((silent = false) => {
    comboRef.current = 0
    setCombo(0)
    if (!silent) sfx.wrong()
  }, [])

  return { combo, bestCombo, earned, pops, hit, miss }
}

export type SessionGame = ReturnType<typeof useSessionGame>
