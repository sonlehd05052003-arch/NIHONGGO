import React from 'react'
import { Lightbulb, Volume2 } from 'lucide-react'
import { Ruby } from '@/components/ui/Ruby'
import { rubyKana } from '@/services/lessons'
import { speakSentence } from '@/services/vocabularyService'
import type { GrammarPoint } from '@/types'

/** Bước "Ngữ pháp": các mẫu câu của bài, giải thích và ví dụ */
export const GrammarView: React.FC<{ points: GrammarPoint[] }> = ({ points }) => (
  <div className="grammar-list">
    {points.map((p, i) => (
      <article key={i} className="grammar-card">
        <header className="gc-head">
          <span className="gc-num">{i + 1}</span>
          <div>
            <h3 className="gc-pattern" lang="ja">
              {p.pattern}
            </h3>
            <p className="gc-meaning">{p.meaning}</p>
          </div>
        </header>

        {p.structure && (
          <div className="gc-structure" lang="ja">
            <span className="gc-label">Cấu trúc</span>
            {p.structure}
          </div>
        )}

        <p className="gc-explain">{p.explain}</p>

        {p.note && (
          <p className="gc-note">
            <Lightbulb size={15} /> {p.note}
          </p>
        )}

        <ul className="gc-examples">
          {p.examples.map((e, j) => (
            <li key={j}>
              <button className="gc-ex" onClick={() => speakSentence(rubyKana(e.jp), 0.85)} title="Nghe câu này">
                <Volume2 size={15} className="gc-ex-icon" />
                <span className="gc-ex-jp" lang="ja">
                  <Ruby text={e.jp} />
                </span>
              </button>
              <span className="gc-ex-vi">{e.vi}</span>
            </li>
          ))}
        </ul>
      </article>
    ))}
  </div>
)
