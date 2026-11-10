import React from 'react'
import { Heart } from 'lucide-react'
import './Footer.css'

const CURRENT_YEAR = new Date().getFullYear()

export const Footer: React.FC = () => {
  return (
    <footer className="footer-container">
      <div className="footer-inner">
        <p className="footer-copy">
          © {CURRENT_YEAR} NihonGo. Xây dựng bằng React & TypeScript với{' '}
          <Heart size={14} className="heart-icon" />
        </p>
        <div className="footer-tags">
          <span className="footer-pill">Vite</span>
          <span className="footer-pill">React 19</span>
          <span className="footer-pill">TypeScript</span>
        </div>
      </div>
    </footer>
  )
}
