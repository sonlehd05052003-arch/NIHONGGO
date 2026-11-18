import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { authErrorMessage, isFirebaseConfigured, loadFirebase, type Firebase } from '@/services/firebase'
import { EMPTY_PROGRESS, mergeProgress } from '@/services/progressMerge'
import type { ProgressState } from '@/types'

/**
 * Đồng bộ tiến độ học lên Firestore (users/{uid}).
 * - Chưa đăng nhập: chỉ lưu trên máy (localStorage) như trước.
 * - Đăng nhập: gộp dữ liệu máy này với cloud, rồi mỗi thay đổi được ghi lên cloud
 *   và thay đổi từ thiết bị khác được kéo về ngay.
 */

export type SyncStatus = 'local' | 'syncing' | 'synced' | 'offline' | 'error'

export interface CloudUser {
  uid: string
  email: string | null
  name: string | null
  photo: string | null
}

interface CloudValue {
  configured: boolean
  /** Đã biết trạng thái đăng nhập (tránh nháy nút "Đăng nhập" lúc mới mở) */
  authReady: boolean
  user: CloudUser | null
  status: SyncStatus
  lastSync: number | null
  error: string | null
  signInGoogle: () => Promise<void>
  signOut: () => Promise<void>
}

const CloudContext = createContext<CloudValue | null>(null)

/** Mã của tab này, để bỏ qua bản cập nhật do chính mình ghi */
const CLIENT_ID = Math.random().toString(36).slice(2) + Date.now().toString(36)
const SAVE_DELAY = 1200

export const CloudProvider: React.FC<{
  progress: ProgressState
  setProgress: (p: ProgressState) => void
  children: React.ReactNode
}> = ({ progress, setProgress, children }) => {
  const [user, setUser] = useState<CloudUser | null>(null)
  const [authReady, setAuthReady] = useState(!isFirebaseConfigured)
  const [linked, setLinked] = useState(false)
  const [status, setStatus] = useState<SyncStatus>('local')
  const [lastSync, setLastSync] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [online, setOnline] = useState(() => navigator.onLine)
  const [attempt, setAttempt] = useState(0)

  const fbRef = useRef<Firebase | null>(null)
  const progressRef = useRef(progress)
  /** JSON của bản đang có trên cloud — giống thì không cần ghi lại */
  const syncedJson = useRef<string | null>(null)

  useEffect(() => {
    progressRef.current = progress
  }, [progress])

  // Theo dõi trạng thái đăng nhập
  useEffect(() => {
    if (!isFirebaseConfigured) return
    let unsub: (() => void) | undefined
    let cancelled = false
    loadFirebase()
      .then((fb) => {
        if (cancelled) return
        fbRef.current = fb
        let currentUid: string | null = null
        unsub = fb.onAuthStateChanged(fb.auth, (u) => {
          // Đổi tài khoản → phải gộp lại từ đầu trước khi được ghi lên cloud
          if ((u?.uid ?? null) !== currentUid) {
            currentUid = u?.uid ?? null
            syncedJson.current = null
            setLinked(false)
          }
          setUser(u ? { uid: u.uid, email: u.email, name: u.displayName, photo: u.photoURL } : null)
          setAuthReady(true)
        })
      })
      .catch((e) => {
        setError(authErrorMessage(e))
        setAuthReady(true)
      })
    return () => {
      cancelled = true
      unsub?.()
    }
  }, [])

  const linkedRef = useRef(false)
  useEffect(() => {
    linkedRef.current = linked
  }, [linked])

  // Mất mạng / có mạng lại (lần gộp đầu bị lỗi do mất mạng thì thử lại)
  useEffect(() => {
    const on = () => {
      setOnline(true)
      if (!linkedRef.current) setAttempt((n) => n + 1)
    }
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])

  const uid = user?.uid
  const payload = useCallback(
    (fb: Firebase, p: ProgressState) => ({ progress: p, clientId: CLIENT_ID, updatedAt: fb.serverTimestamp() }),
    [],
  )

  // Đăng nhập: gộp máy + cloud, rồi lắng nghe thay đổi từ thiết bị khác
  useEffect(() => {
    const fb = fbRef.current
    if (!uid || !fb) return
    const ref = fb.doc(fb.db, 'users', uid)
    let cancelled = false
    let unsub: (() => void) | undefined
    setStatus('syncing')
    ;(async () => {
      try {
        const snap = await fb.getDoc(ref)
        if (cancelled) return
        const remote = snap.data()?.progress as ProgressState | undefined
        const merged = remote ? mergeProgress(progressRef.current, remote) : progressRef.current
        const json = JSON.stringify(merged)
        if (!remote || JSON.stringify(remote) !== json) await fb.setDoc(ref, payload(fb, merged))
        if (cancelled) return
        syncedJson.current = json
        setProgress(merged)
        setLinked(true)
        setStatus('synced')
        setLastSync(Date.now())
        setError(null)
        unsub = fb.onSnapshot(
          ref,
          (s) => {
            if (s.metadata.hasPendingWrites) return
            const d = s.data()
            if (!d?.progress || d.clientId === CLIENT_ID) return
            const incoming = JSON.stringify(d.progress)
            if (incoming === syncedJson.current) return
            syncedJson.current = incoming
            setProgress(d.progress as ProgressState)
            setLastSync(Date.now())
          },
          (e) => {
            setStatus('error')
            setError(authErrorMessage(e))
          },
        )
      } catch (e) {
        if (cancelled) return
        setStatus('error')
        setError(authErrorMessage(e))
      }
    })()
    return () => {
      cancelled = true
      unsub?.()
    }
  }, [uid, attempt, payload, setProgress])

  // Mỗi lần tiến độ thay đổi: ghi lên cloud (gom các thay đổi liên tiếp)
  useEffect(() => {
    const fb = fbRef.current
    if (!uid || !linked || !fb) return
    const json = JSON.stringify(progress)
    if (json === syncedJson.current) return
    setStatus('syncing')
    const t = window.setTimeout(() => {
      fb.setDoc(fb.doc(fb.db, 'users', uid), payload(fb, progress))
        .then(() => {
          syncedJson.current = json
          setStatus('synced')
          setLastSync(Date.now())
          setError(null)
        })
        .catch((e) => {
          setStatus('error')
          setError(authErrorMessage(e))
        })
    }, SAVE_DELAY)
    return () => window.clearTimeout(t)
  }, [progress, uid, linked, payload])

  const withFb = useCallback(async <T,>(fn: (fb: Firebase) => Promise<T>): Promise<T> => {
    const fb = fbRef.current ?? (await loadFirebase())
    try {
      return await fn(fb)
    } catch (e) {
      throw new Error(authErrorMessage(e), { cause: e })
    }
  }, [])

  const value = useMemo<CloudValue>(
    () => ({
      configured: isFirebaseConfigured,
      authReady,
      user,
      status: !user ? 'local' : !online ? 'offline' : status,
      lastSync,
      error,
      signInGoogle: () =>
        withFb(async (fb) => {
          await fb.signInWithPopup(fb.auth, new fb.GoogleAuthProvider())
        }),
      signOut: () =>
        withFb(async (fb) => {
          await fb.signOut(fb.auth)
          // Xoá dữ liệu trên máy để người khác dùng chung máy không thấy / không bị gộp nhầm.
          // Tiến độ vẫn còn nguyên trên tài khoản.
          syncedJson.current = null
          setLinked(false)
          setLastSync(null)
          setProgress(EMPTY_PROGRESS)
        }),
    }),
    [authReady, user, online, status, lastSync, error, withFb, setProgress],
  )

  return <CloudContext.Provider value={value}>{children}</CloudContext.Provider>
}

// eslint-disable-next-line react/only-export-components
export function useCloud() {
  const ctx = useContext(CloudContext)
  if (!ctx) throw new Error('useCloud phải được dùng trong CloudProvider')
  return ctx
}
