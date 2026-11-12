/** Cấp n cần tổng 50·n·(n-1) XP: cấp 2 = 100, cấp 3 = 300, cấp 4 = 600... */
export function levelInfo(xp: number) {
  let level = 1
  while (xp >= 50 * (level + 1) * level) level++
  const base = 50 * level * (level - 1)
  const next = 50 * (level + 1) * level
  return { level, current: xp - base, needed: next - base }
}
