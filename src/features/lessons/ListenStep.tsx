import React from 'react'
import { ExternalLink } from 'lucide-react'
import type { Reading } from '@/types'
import { DictationView } from './DictationView'

/** Nguồn luyện nghe bên ngoài (mở trang của họ) */
const MORE_SOURCES: { name: string; url: string; desc: string }[] = [
  { name: 'Akaiwa', url: 'https://akaiwa.tv', desc: 'Video có phụ đề song ngữ Nhật–Việt và bài luyện' },
  { name: 'NHK World – Easy Japanese', url: 'https://www3.nhk.or.jp/nhkworld/vi/learnjapanese/', desc: 'Bài học hội thoại miễn phí của NHK (tiếng Việt)' },
  { name: 'NHK News Web Easy', url: 'https://www3.nhk.or.jp/news/easy/', desc: 'Tin tức tiếng Nhật đơn giản, có furigana và đọc to' },
  { name: 'Erin’s Challenge (Japan Foundation)', url: 'https://www.erin.jpf.go.jp/', desc: 'Video hội thoại đời thường cho người mới học' },
]

export const ListenStep: React.FC<{ lessonId: string; reading?: Reading }> = ({ lessonId, reading }) => (
  <div className="listen">
    {reading ? (
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
