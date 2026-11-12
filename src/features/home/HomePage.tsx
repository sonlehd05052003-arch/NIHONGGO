import React, { useState } from 'react'
import { Sparkles, Trophy, ArrowRight, Volume2, RotateCcw, Flame, CheckCircle2, Target } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { WordImage } from '@/components/ui/WordImage'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import { N5_VOCABULARY, shuffle, speak } from '@/services/vocabularyService'
import { useProgress } from '@/hooks/useProgress'
import { LESSONS } from '@/services/lessons'
import './HomePage.css'

interface HomePageProps {
  onNavigateToVocab: () => void
  onNavigateToQuiz: () => void
  onNavigateToLessons: () => void
}

export const HomePage: React.FC<HomePageProps> = ({
  onNavigateToVocab,
  onNavigateToQuiz,
  onNavigateToLessons,
}) => {
  const { knownCount, streak, todayCount, dueIds } = useProgress()
  const [goal, setGoal] = useLocalStorage<number>('nihongo_daily_goal', 20)
  const [previewCards] = useState(() => shuffle(N5_VOCABULARY.filter((w) => w.image)).slice(0, 12))
  const goalPct = Math.min(1, todayCount / goal)
  const [currentCardIndex, setCurrentCardIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)

  const activeCard = previewCards[currentCardIndex]

  const handleNextCard = () => {
    setIsFlipped(false)
    setCurrentCardIndex((prev) => (prev + 1) % previewCards.length)
  }

  const handlePrevCard = () => {
    setIsFlipped(false)
    setCurrentCardIndex((prev) => (prev - 1 + previewCards.length) % previewCards.length)
  }

  const handleSpeak = (text: string, e: React.MouseEvent) => {
    e.stopPropagation()
    speak(text)
  }

  return (
    <div className="home-container">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <div className="hero-tag">
            <Sparkles size={16} />
            <span>Nền tảng học tiếng Nhật thông minh</span>
          </div>
          <h1 className="hero-heading">
            Chinh phục <br />
            <span className="text-gradient">{N5_VOCABULARY.length} từ vựng JLPT N5</span>
          </h1>
          <p className="hero-description">
            {LESSONS.length} bài nhỏ theo chủ đề, có ảnh, câu ví dụ, mẹo nhớ và bài đọc. Ôn tập ngắt quãng giúp nhớ lâu.
            Không cần đăng ký — tiến độ được lưu ngay trên trình duyệt của bạn.
          </p>
          <div className="hero-cta">
            <Button size="lg" icon={<ArrowRight size={18} />} onClick={onNavigateToLessons}>
              {dueIds.length > 0 ? `Ôn ${dueIds.length} từ đến hạn` : 'Học theo lộ trình'}
            </Button>
            <Button size="lg" variant="outline" icon={<Trophy size={18} />} onClick={onNavigateToQuiz}>
              Luyện tập tự do
            </Button>
            <Button size="lg" variant="ghost" onClick={onNavigateToVocab}>
              Danh sách từ
            </Button>
          </div>
        </div>

        {/* Interactive Flashcard Preview */}
        <div className="hero-visual">
          <div className="flashcard-wrapper">
            <div
              className={`flashcard-card ${isFlipped ? 'flipped' : ''}`}
              onClick={() => setIsFlipped(!isFlipped)}
            >
              <div className="card-face card-front">
                <div className="card-header-badge">
                  <span className="level-badge">{activeCard.level}</span>
                  <span className="category-badge">{activeCard.category}</span>
                </div>
                <div className="card-kanji">{activeCard.kanji || activeCard.kana}</div>
                {activeCard.kanji && <div className="card-kana">{activeCard.kana}</div>}
                <div className="card-hint">
                  <RotateCcw size={14} /> Nhấn để lật thẻ
                </div>
                <button
                  className="speech-btn"
                  onClick={(e) => handleSpeak(activeCard.kana, e)}
                  title="Nghe phát âm"
                >
                  <Volume2 size={20} />
                </button>
              </div>

              <div className="card-face card-back">
                <div className="card-header-badge">
                  <span className="romaji-badge">Romaji: {activeCard.romaji}</span>
                </div>
                <WordImage word={activeCard} credit className="card-photo" />
                <div className="card-meaning">{activeCard.meaningVi}</div>
                {activeCard.example && (
                  <div className="card-example">
                    <p className="jp-ex">{activeCard.example.japanese}</p>
                    <p className="vi-ex">{activeCard.example.vietnamese}</p>
                  </div>
                )}
                <div className="card-hint">
                  <RotateCcw size={14} /> Nhấn để xem chữ Hán
                </div>
              </div>
            </div>

            <div className="card-controls">
              <Button variant="ghost" size="sm" onClick={handlePrevCard}>
                Thẻ trước
              </Button>
              <span className="card-indicator">
                {currentCardIndex + 1} / {previewCards.length}
              </span>
              <Button variant="ghost" size="sm" onClick={handleNextCard}>
                Thẻ tiếp theo
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="stats-section">
        <Card glass className="stat-card goal-card">
          <div className="goal-ring" style={{ '--pct': goalPct } as React.CSSProperties}>
            {goalPct >= 1 ? <CheckCircle2 size={26} /> : <Target size={24} />}
          </div>
          <div>
            <div className="stat-value">
              {Math.min(todayCount, goal)} / {goal}
            </div>
            <div className="stat-label">
              {goalPct >= 1 ? 'Đã đạt mục tiêu hôm nay 🎉' : 'Lượt ôn hôm nay · mục tiêu:'}
            </div>
            <div className="goal-chips">
              {[10, 20, 50].map((g) => (
                <button key={g} className={`goal-chip ${goal === g ? 'active' : ''}`} onClick={() => setGoal(g)}>
                  {g}
                </button>
              ))}
            </div>
          </div>
        </Card>

        <Card glass className="stat-card">
          <div className="stat-icon-box accent">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <div className="stat-value">{knownCount} / {N5_VOCABULARY.length}</div>
            <div className="stat-label">Từ đã thuộc ({Math.round((knownCount / N5_VOCABULARY.length) * 100)}%)</div>
          </div>
        </Card>

        <Card glass className="stat-card">
          <div className="stat-icon-box orange">
            <Flame size={24} />
          </div>
          <div>
            <div className="stat-value">{streak} ngày</div>
            <div className="stat-label">Chuỗi ngày học liên tục</div>
          </div>
        </Card>
      </section>
    </div>
  )
}
