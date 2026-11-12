import React from 'react'
import { Sun, Moon, Flame, BookOpen, Layers, Award, Map } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useProgress } from '@/hooks/useProgress'
import { levelInfo } from '@/services/level'
import './Navbar.css'

export type TabId = 'home' | 'lessons' | 'vocab' | 'study'

interface NavbarProps {
  theme: 'light' | 'dark'
  onToggleTheme: () => void
  currentTab: TabId
  onSelectTab: (tab: TabId) => void
}

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'home', label: 'Tổng quan', icon: <BookOpen size={18} /> },
  { id: 'lessons', label: 'Bài học', icon: <Map size={18} /> },
  { id: 'vocab', label: 'Từ vựng N5', icon: <Layers size={18} /> },
  { id: 'study', label: 'Luyện tập', icon: <Award size={18} /> },
]

export const Navbar: React.FC<NavbarProps> = ({ theme, onToggleTheme, currentTab, onSelectTab }) => {
  const { streak, xp } = useProgress()
  const lv = levelInfo(xp)

  const links = TABS.map((t) => (
    <button
      key={t.id}
      className={`nav-link ${currentTab === t.id ? 'active' : ''}`}
      onClick={() => onSelectTab(t.id)}
    >
      {t.icon}
      <span>{t.label}</span>
    </button>
  ))

  return (
    <>
      <header className="navbar-container">
        <div className="navbar-inner">
          <div className="navbar-brand" onClick={() => onSelectTab('home')}>
            <div className="logo-icon">日</div>
            <div className="brand-text">
              <span className="brand-title">
                Nihon<span className="brand-highlight">Go</span>
              </span>
              <span className="brand-sub">日本語マスター</span>
            </div>
          </div>

          <nav className="navbar-menu">{links}</nav>

          <div className="navbar-actions">
            <div className="nav-level" title={`Cấp ${lv.level} · ${lv.current}/${lv.needed} XP tới cấp tiếp theo`}>
              <span className="nav-level-num">Lv {lv.level}</span>
              <span className="nav-level-bar">
                <span style={{ width: `${(lv.current / lv.needed) * 100}%` }} />
              </span>
            </div>
            <div className="streak-badge" title="Chuỗi ngày học liên tục">
              <Flame size={18} className="streak-icon" />
              <span className="streak-count">{streak} ngày</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleTheme}
              aria-label="Đổi giao diện sáng/tối"
              className="theme-btn"
            >
              {theme === 'dark' ? <Sun size={19} /> : <Moon size={19} />}
            </Button>
          </div>
        </div>
      </header>
      <nav className="bottom-nav">{links}</nav>
    </>
  )
}
