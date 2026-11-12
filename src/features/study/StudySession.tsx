import React from 'react'
import type { QuizDirection, StudyMode, VocabularyItem } from '@/types'
import { FlashcardMode } from './FlashcardMode'
import { QuizMode } from './QuizMode'
import { TypingMode } from './TypingMode'
import { MatchMode } from './MatchMode'
import type { ModeProps } from './shared'
import './StudyPage.css'

export interface Session {
  mode: StudyMode
  deck: VocabularyItem[]
  key: number
}

/** Chạy một lượt học với chế độ + bộ thẻ cho trước (dùng chung cho Luyện tập, Bài học và Ôn tập) */
export const StudySession: React.FC<{
  session: Session
  direction: QuizDirection
  onExit: () => void
  onRestart: (deck: VocabularyItem[]) => void
}> = ({ session, direction, onExit, onRestart }) => {
  const common: ModeProps = { deck: session.deck, onExit, onRestart }
  const k = session.key
  return (
    <div className="study-container">
      {session.mode === 'flashcard' && <FlashcardMode key={k} {...common} />}
      {session.mode === 'quiz' && <QuizMode key={k} {...common} direction={direction} />}
      {session.mode === 'typing' && <TypingMode key={k} {...common} direction={direction} />}
      {session.mode === 'match' && <MatchMode key={k} {...common} />}
    </div>
  )
}
