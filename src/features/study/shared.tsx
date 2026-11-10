import React from 'react'
import { X, Award, RotateCcw, Repeat, ArrowLeft, Volume2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { speak } from '@/services/vocabularyService'
import type { VocabularyItem } from '@/types'

export interface ModeProps {
  deck: VocabularyItem[]
  onExit: () => void
  onRestart: (deck: VocabularyItem[]) => void
}

export const SessionHeader: React.FC<{
  title: string
  current: number
  total: number
  onExit: () => void
  right?: React.ReactNode
}> = ({ title, current, total, onExit, right }) => (
  <div className="session-header">
    <div className="session-top">
      <button className="icon-btn" onClick={onExit} title="Thoát (Esc)">
        <X size={20} />
      </button>
      <span className="session-title">{title}</span>
      <span className="session-count">{right ?? `${Math.min(current, total)} / ${total}`}</span>
    </div>
    <div className="progress-track">
      <div className="progress-fill" style={{ width: `${total ? (current / total) * 100 : 0}%` }} />
    </div>
  </div>
)

export const WordRow: React.FC<{ word: VocabularyItem; extra?: React.ReactNode }> = ({ word, extra }) => (
  <div className="word-row">
    <button className="icon-btn sm" onClick={() => speak(word.kana)} title="Nghe phát âm">
      <Volume2 size={16} />
    </button>
    <div className="word-row-jp">
      <span className="jp">{word.kanji || word.kana}</span>
      {word.kanji && <span className="kana">{word.kana}</span>}
    </div>
    <div className="word-row-vi">{word.meaningVi}</div>
    {extra}
  </div>
)

export const ResultView: React.FC<{
  title: string
  scoreText: React.ReactNode
  deck: VocabularyItem[]
  wrong: VocabularyItem[]
  wrongLabel?: string
  onExit: () => void
  onRestart: (deck: VocabularyItem[]) => void
}> = ({ title, scoreText, deck, wrong, wrongLabel = 'Từ cần ôn lại', onExit, onRestart }) => (
  <Card glass hoverEffect={false} className="result-card">
    <div className="result-icon">
      <Award size={40} />
    </div>
    <h2 className="result-title">{title}</h2>
    <p className="result-score">{scoreText}</p>
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
