import React, { useEffect } from 'react'
import { Navbar, type TabId } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { HomePage } from '@/features/home/HomePage'
import { VocabularyPage } from '@/features/vocabulary/VocabularyPage'
import { StudyPage } from '@/features/study/StudyPage'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import { ProgressProvider } from '@/hooks/useProgress'
import type { ThemeMode } from '@/types'
import './App.css'

const prefersDark = () => window.matchMedia?.('(prefers-color-scheme: dark)').matches

export const App: React.FC = () => {
  const [theme, setTheme] = useLocalStorage<ThemeMode>('nihongo_theme', prefersDark() ? 'dark' : 'light')
  const [currentTab, setCurrentTab] = useLocalStorage<TabId>('nihongo_tab', 'home')

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  const selectTab = (tab: TabId) => {
    setCurrentTab(tab)
    window.scrollTo({ top: 0 })
  }

  return (
    <ProgressProvider>
      <div className="app-layout">
        <Navbar
          theme={theme}
          onToggleTheme={() => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))}
          currentTab={currentTab}
          onSelectTab={selectTab}
        />

        <main className="main-content">
          {currentTab === 'home' && (
            <HomePage onNavigateToVocab={() => selectTab('vocab')} onNavigateToQuiz={() => selectTab('study')} />
          )}
          {currentTab === 'vocab' && <VocabularyPage />}
          {currentTab === 'study' && <StudyPage />}
        </main>

        <Footer />
      </div>
    </ProgressProvider>
  )
}

export default App
