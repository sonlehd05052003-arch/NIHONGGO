import React from 'react'
import { Clapperboard, Headphones, ExternalLink } from 'lucide-react'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import type { LessonVideo, Reading } from '@/types'
import { DictationView } from './DictationView'
import { VideoStudio } from './VideoStudio'

type Tab = 'video' | 'dictation'

/** Nguồn luyện nghe bên ngoài (mở trang của họ) */
const MORE_SOURCES: { name: string; url: string; desc: string }[] = [
  { name: 'Akaiwa', url: 'https://akaiwa.tv', desc: 'Video có phụ đề song ngữ Nhật–Việt và bài luyện' },
  { name: 'NHK World – Easy Japanese', url: 'https://www3.nhk.or.jp/nhkworld/vi/learnjapanese/', desc: 'Bài học hội thoại miễn phí của NHK (tiếng Việt)' },
  { name: 'NHK News Web Easy', url: 'https://www3.nhk.or.jp/news/easy/', desc: 'Tin tức tiếng Nhật đơn giản, có furigana và đọc to' },
  { name: 'Erin’s Challenge (Japan Foundation)', url: 'https://www.erin.jpf.go.jp/', desc: 'Video hội thoại đời thường cho người mới học' },
]

export const ListenStep: React.FC<{ lessonId: string; videos: LessonVideo[]; reading?: Reading }> = ({
  lessonId,
  videos,
  reading,
}) => {
  const [tab, setTab] = useLocalStorage<Tab>('nihongo_listen_tab', 'video')

  return (
    <div className="listen">
      <div className="chip-group listen-tabs" role="tablist" aria-label="Kiểu luyện nghe">
        <button role="tab" aria-selected={tab === 'video'} className={`chip ${tab === 'video' ? 'active' : ''}`} onClick={() => setTab('video')}>
          <Clapperboard size={15} /> Xem video
        </button>
        <button
          role="tab"
          aria-selected={tab === 'dictation'}
          className={`chip ${tab === 'dictation' ? 'active' : ''}`}
          onClick={() => setTab('dictation')}
        >
          <Headphones size={15} /> Nghe chép chính tả
        </button>
      </div>

      {tab === 'video' ? (
        <VideoStudio key={lessonId} lessonId={lessonId} suggested={videos} />
      ) : reading ? (
        <DictationView key={lessonId} lessonId={lessonId} reading={reading} />
      ) : (
        <p className="ld-hint">Đang tải hội thoại…</p>
      )}

      <section className="vs-card listen-more">
        <h3>Nguồn luyện nghe khác</h3>
        <ul>
          {MORE_SOURCES.map((s) => (
            <li key={s.url}>
              <a href={s.url} target="_blank" rel="noreferrer">
                {s.name} <ExternalLink size={13} />
              </a>
              <span>{s.desc}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
