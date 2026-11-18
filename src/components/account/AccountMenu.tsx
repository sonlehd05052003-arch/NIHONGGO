import React, { useEffect, useRef, useState } from 'react'
import {
  Cloud,
  CloudOff,
  RefreshCw,
  AlertTriangle,
  LogIn,
  LogOut,
  X,
  Download,
  Upload,
  HardDrive,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useCloud, type SyncStatus } from '@/hooks/useCloud'
import { useProgress } from '@/hooks/useProgress'
import './AccountMenu.css'

const STATUS: Record<SyncStatus, { label: string; icon: React.ReactNode }> = {
  local: { label: 'Chỉ lưu trên máy này', icon: <HardDrive size={14} /> },
  syncing: { label: 'Đang đồng bộ…', icon: <RefreshCw size={14} className="spin" /> },
  synced: { label: 'Đã đồng bộ', icon: <Cloud size={14} /> },
  offline: { label: 'Mất mạng · sẽ đồng bộ khi có mạng lại', icon: <CloudOff size={14} /> },
  error: { label: 'Lỗi đồng bộ', icon: <AlertTriangle size={14} /> },
}

/** Nút tài khoản trên thanh điều hướng */
export const AccountButton: React.FC = () => {
  const { user, status, authReady } = useCloud()
  const [open, setOpen] = useState(false)
  const initial = (user?.name || user?.email || '?').trim().charAt(0).toUpperCase()

  return (
    <>
      <button
        className={`account-btn ${user ? 'signed-in' : ''}`}
        onClick={() => setOpen(true)}
        title={user ? `${user.name || user.email} · ${STATUS[status].label}` : 'Đăng nhập để lưu tiến độ lên cloud'}
        aria-label={user ? 'Tài khoản' : 'Đăng nhập'}
        disabled={!authReady}
      >
        {user ? (
          <>
            {user.photo ? (
              <img src={user.photo} alt="" referrerPolicy="no-referrer" />
            ) : (
              <span className="account-initial">{initial}</span>
            )}
            <span className={`account-dot ${status}`} />
          </>
        ) : (
          <>
            <LogIn size={17} />
            <span className="account-btn-text">Đăng nhập</span>
          </>
        )}
      </button>
      {open && <AccountDialog onClose={() => setOpen(false)} />}
    </>
  )
}

const AccountDialog: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const ref = useRef<HTMLDialogElement>(null)
  const cloud = useCloud()

  useEffect(() => {
    const d = ref.current
    if (d && !d.open) d.showModal()
  }, [])

  return (
    <dialog
      ref={ref}
      className="account-dialog"
      onClose={onClose}
      onClick={(e) => e.target === ref.current && ref.current?.close()}
      aria-labelledby="account-title"
    >
      <div className="ad-body">
        <div className="ad-head">
          <h2 id="account-title">{cloud.user ? 'Tài khoản' : 'Lưu tiến độ học'}</h2>
          <button className="icon-btn" onClick={() => ref.current?.close()} aria-label="Đóng">
            <X size={18} />
          </button>
        </div>

        {!cloud.configured ? (
          <p className="ad-note warn">
            Chưa cấu hình Firebase nên chưa đăng nhập được. Tiến độ đang được lưu trên trình duyệt này — dùng{' '}
            <b>Sao lưu</b> bên dưới để chuyển sang máy khác.
          </p>
        ) : cloud.user ? (
          <SignedIn onDone={() => ref.current?.close()} />
        ) : (
          <SignInForm onDone={() => ref.current?.close()} />
        )}

        <BackupSection />
      </div>
    </dialog>
  )
}

const SignedIn: React.FC<{ onDone: () => void }> = ({ onDone }) => {
  const { user, status, lastSync, error, signOut } = useCloud()
  const [busy, setBusy] = useState(false)
  if (!user) return null
  const s = STATUS[status]

  const doSignOut = async () => {
    if (!confirm('Đăng xuất? Dữ liệu trên máy này sẽ được xoá, tiến độ vẫn lưu an toàn trong tài khoản.')) return
    setBusy(true)
    try {
      await signOut()
      onDone()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="ad-user">
      <div className="ad-profile">
        {user.photo ? (
          <img src={user.photo} alt="" referrerPolicy="no-referrer" />
        ) : (
          <span className="account-initial big">{(user.name || user.email || '?').charAt(0).toUpperCase()}</span>
        )}
        <div>
          {user.name && <div className="ad-name">{user.name}</div>}
          <div className="ad-email">{user.email}</div>
        </div>
      </div>
      <div className={`ad-status ${status}`} role="status">
        {s.icon} {s.label}
        {status === 'synced' && lastSync && (
          <span className="ad-faint"> · {new Date(lastSync).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
        )}
      </div>
      {error && status === 'error' && <p className="ad-error">{error}</p>}
      <p className="ad-note">Tiến độ tự đồng bộ giữa các thiết bị đăng nhập cùng tài khoản. Vẫn học được khi mất mạng.</p>
      <Button variant="outline" icon={<LogOut size={16} />} onClick={doSignOut} disabled={busy} fullWidth>
        Đăng xuất
      </Button>
    </div>
  )
}

const SignInForm: React.FC<{ onDone: () => void }> = ({ onDone }) => {
  const { signInGoogle } = useCloud()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const signIn = async () => {
    setBusy(true)
    setError(null)
    try {
      await signInGoogle()
      onDone()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="ad-signin">
      <p className="ad-note">
        Đăng nhập để lưu tiến độ lên cloud và học tiếp trên máy khác. Những gì bạn đã học trên máy này sẽ được gộp vào
        tài khoản.
      </p>
      <button className="google-btn" onClick={signIn} disabled={busy}>
        <GoogleIcon /> {busy ? 'Đang đăng nhập…' : 'Đăng nhập với Google'}
      </button>
      {error && (
        <p className="ad-error" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

/** Xuất / nhập file sao lưu — dùng được cả khi không đăng nhập */
const BackupSection: React.FC = () => {
  const { progress, replaceProgress } = useProgress()
  const fileRef = useRef<HTMLInputElement>(null)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const exportFile = () => {
    const data = JSON.stringify({ app: 'nihongo', version: 1, exportedAt: new Date().toISOString(), progress }, null, 2)
    const url = URL.createObjectURL(new Blob([data], { type: 'application/json' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `nihongo-sao-luu-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const importFile = async (file: File) => {
    try {
      const json = JSON.parse(await file.text())
      const p = json?.progress
      if (!p || typeof p !== 'object' || typeof p.words !== 'object' || !Array.isArray(p.studyDays))
        throw new Error('bad')
      replaceProgress(p, true)
      setMsg({ ok: true, text: `Đã khôi phục ${Object.keys(p.words).length} từ (gộp với tiến độ hiện có).` })
    } catch {
      setMsg({ ok: false, text: 'File không hợp lệ — hãy chọn file sao lưu .json được tải từ NihonGo.' })
    }
  }

  return (
    <div className="ad-backup">
      <h3>Sao lưu</h3>
      <div className="ad-backup-actions">
        <Button variant="secondary" size="sm" icon={<Download size={15} />} onClick={exportFile}>
          Tải file sao lưu
        </Button>
        <Button variant="secondary" size="sm" icon={<Upload size={15} />} onClick={() => fileRef.current?.click()}>
          Khôi phục từ file
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) importFile(f)
            e.target.value = ''
          }}
        />
      </div>
      {msg && <p className={msg.ok ? 'ad-info' : 'ad-error'}>{msg.text}</p>}
    </div>
  )
}

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
    <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
    <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
  </svg>
)
