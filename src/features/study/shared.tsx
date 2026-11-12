import React, { useEffect, useState } from 'react'
import { X, RotateCcw, Repeat, ArrowLeft, Volume2, VolumeX, Flame, Zap, Star, Trophy } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Confetti } from '@/components/ui/Confetti'
import { WordImage } from '@/components/ui/WordImage'
import { useProgress } from '@/hooks/useProgress'
import { levelInfo } from '@/services/level'
import type { SessionGame } from './useSessionGame'
import { speak } from '@/services/vocabularyService'
import { isSoundOn, setSoundOn, sfx } from '@/services/sound'
import type { VocabularyItem } from '@/types'

export interface ModeProps {
  deck: VocabularyItem[]
  onExit: () => void
  onRestart: (deck: VocabularyItem[]) => void
}


// ---------------------------------------------------------------------------
// Thanh trên cùng của lượt học
// ---------------------------------------------------------------------------
export const SessionHeader: React.FC<{
  title: string
  current: number
  total: number
  onExit: () => void
  game?: SessionGame
  right?: React.ReactNode
}> = ({ title, current, total, onExit, game, right }) => {
  const [sound, setSound] = useState(isSoundOn)
  return (
    <div className="session-header">
      <div className="session-top">
        <button className="icon-btn" onClick={onExit} title="Thoát (Esc)">
          <X size={20} />
        </button>
        <span className="session-title">{title}</span>
        {game && game.combo >= 2 && (
          <span key={game.combo} className="combo-badge">
            <Flame size={15} /> x{game.combo}
          </span>
        )}
        {game && (
          <span className="xp-badge" title="XP kiếm được trong lượt này">
            <Zap size={14} /> {game.earned}
          </span>
        )}
        <span className="session-count">{right ?? `${Math.min(current, total)} / ${total}`}</span>
        <button
          className="icon-btn"
          onClick={() => {
            setSoundOn(!sound)
            setSound(!sound)
          }}
          title={sound ? 'Tắt âm thanh' : 'Bật âm thanh'}
        >
          {sound ? <Volume2 size={18} /> : <VolumeX size={18} />}
        </button>
      </div>
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${total ? (current / total) * 100 : 0}%` }} />
      </div>
      {game && (
        <div className="pop-layer" aria-live="polite">
          {game.pops.map((p) => (
            <span key={p.id} className={`pop pop-${p.kind}`}>
              {p.text}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

export const WordRow: React.FC<{ word: VocabularyItem; extra?: React.ReactNode }> = ({ word, extra }) => (
  <div className="word-row">
    <WordImage word={word} size="thumb" />
    <div className="word-row-jp">
      <span className="jp">{word.kanji || word.kana}</span>
      {word.kanji && <span className="kana">{word.kana}</span>}
    </div>
    <div className="word-row-vi">{word.meaningVi}</div>
    <button className="icon-btn sm" onClick={() => speak(word.kana)} title="Nghe phát âm">
      <Volume2 size={16} />
    </button>
    {extra}
  </div>
)

// ---------------------------------------------------------------------------
// Màn hình kết quả
// ---------------------------------------------------------------------------
const FEEDBACK = [
  'Đừng nản, ôn lại những từ sai rồi thử lần nữa nhé 💪',
  'Khá lắm! Thêm một lượt nữa là nhớ chắc hơn 👍',
  'Rất tốt! Bạn đang tiến bộ nhanh đấy 🚀',
  'Hoàn hảo! Không sai một từ nào 🎉',
]

export const ResultView: React.FC<{
  title: string
  scoreText: React.ReactNode
  /** Tỉ lệ đúng 0..1 để tính số sao */
  accuracy: number
  game?: SessionGame
  deck: VocabularyItem[]
  wrong: VocabularyItem[]
  wrongLabel?: string
  onExit: () => void
  onRestart: (deck: VocabularyItem[]) => void
}> = ({ title, scoreText, accuracy, game, deck, wrong, wrongLabel = 'Từ cần ôn lại', onExit, onRestart }) => {
  const { xp } = useProgress()
  const stars = accuracy >= 1 ? 3 : accuracy >= 0.8 ? 2 : accuracy >= 0.5 ? 1 : 0
  const lv = levelInfo(xp)

  useEffect(() => {
    if (stars > 0) sfx.complete()
  }, [stars])

  return (
    <Card glass hoverEffect={false} className="result-card">
      {stars >= 2 && <Confetti />}
      <div className="result-stars">
        {[0, 1, 2].map((i) => (
          <Star
            key={i}
            size={i === 1 ? 54 : 42}
            className={`result-star ${i < stars ? 'on' : ''}`}
            style={{ animationDelay: `${0.15 + i * 0.18}s` }}
            fill="currentColor"
          />
        ))}
      </div>
      <h2 className="result-title">{title}</h2>
      <p className="result-score">{scoreText}</p>
      <p className="result-feedback">{FEEDBACK[stars]}</p>

      {game && (
        <div className="result-stats">
          <div className="result-stat">
            <Zap size={18} />
            <b>+{game.earned}</b>
            <span>XP</span>
          </div>
          <div className="result-stat">
            <Flame size={18} />
            <b>{game.bestCombo}</b>
            <span>Combo cao nhất</span>
          </div>
          <div className="result-stat">
            <Trophy size={18} />
            <b>Cấp {lv.level}</b>
            <span>
              {lv.current}/{lv.needed} XP
            </span>
          </div>
        </div>
      )}

      <div className="result-actions">
        {wrong.length > 0 && (
          <Button icon={<Repeat size={16} />} onClick={() => onRestart(wrong)}>
            Học lại {wrong.length} từ sai
          </Button>
        )}
        <Button variant="outline" icon={<RotateCcw size={16} />} onClick={() => onRestart(deck)}>
          Làm lại cả bộ
        </Button>
        <Button variant="ghost" icon={<ArrowLeft size={16} />} onClick={onExit}>
          Chọn bộ khác
        </Button>
      </div>
      {wrong.length > 0 && (
        <div className="result-list">
          <h3 className="result-list-title">{wrongLabel}</h3>
          {wrong.map((w) => (
            <WordRow key={w.id} word={w} />
          ))}
        </div>
      )}
    </Card>
  )
}
