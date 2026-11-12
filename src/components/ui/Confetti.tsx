import React, { useEffect, useRef } from 'react'

const COLORS = ['#e63946', '#6366f1', '#f59e0b', '#22c55e', '#ec4899', '#06b6d4']

/** Pháo giấy bắn một lần khi được gắn vào trang */
export const Confetti: React.FC<{ amount?: number }> = ({ amount = 140 }) => {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    const canvas = ref.current
    const c = canvas?.getContext('2d')
    if (!canvas || !c) return
    const dpr = window.devicePixelRatio || 1
    const resize = () => {
      canvas.width = window.innerWidth * dpr
      canvas.height = window.innerHeight * dpr
    }
    resize()
    const W = () => canvas.width
    const H = () => canvas.height
    const parts = Array.from({ length: amount }, (_, i) => {
      const fromLeft = i % 2 === 0
      return {
        x: fromLeft ? 0 : W(),
        y: H() * 0.7,
        vx: (fromLeft ? 1 : -1) * (6 + Math.random() * 10) * dpr,
        vy: -(12 + Math.random() * 12) * dpr,
        size: (6 + Math.random() * 6) * dpr,
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.3,
        color: COLORS[i % COLORS.length],
      }
    })
    let frame = 0
    let raf = 0
    const tick = () => {
      c.clearRect(0, 0, W(), H())
      for (const p of parts) {
        p.vy += 0.35 * dpr
        p.vx *= 0.985
        p.x += p.vx
        p.y += p.vy
        p.rot += p.vr
        c.save()
        c.translate(p.x, p.y)
        c.rotate(p.rot)
        c.fillStyle = p.color
        c.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2)
        c.restore()
      }
      if (++frame < 200) raf = requestAnimationFrame(tick)
      else c.clearRect(0, 0, W(), H())
    }
    raf = requestAnimationFrame(tick)
    window.addEventListener('resize', resize)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [amount])

  return <canvas ref={ref} className="confetti-canvas" aria-hidden="true" />
}
