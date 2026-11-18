/**
 * Kết nối Firebase (Auth + Firestore), chỉ tải khi cần để không làm chậm lần mở app đầu tiên.
 * Cấu hình đọc từ biến môi trường VITE_FIREBASE_* (xem .env.example).
 * Chưa cấu hình thì app vẫn chạy bình thường, chỉ lưu trên máy.
 */
const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string | undefined,
}

export const isFirebaseConfigured = !!(config.apiKey && config.authDomain && config.projectId && config.appId)

async function init() {
  const [{ initializeApp }, authMod, fsMod] = await Promise.all([
    import('firebase/app'),
    import('firebase/auth'),
    import('firebase/firestore'),
  ])
  const app = initializeApp(config)
  const auth = authMod.getAuth(app)
  auth.languageCode = 'vi'
  // Bỏ qua các trường undefined thay vì báo lỗi khi ghi
  const db = fsMod.initializeFirestore(app, { ignoreUndefinedProperties: true })
  return { auth, db, ...authMod, ...fsMod }
}

export type Firebase = Awaited<ReturnType<typeof init>>

let loading: Promise<Firebase> | null = null
export function loadFirebase(): Promise<Firebase> {
  if (!isFirebaseConfigured) return Promise.reject(new Error('Firebase chưa được cấu hình'))
  return (loading ??= init())
}

/** Thông báo lỗi Firebase bằng tiếng Việt */
export function authErrorMessage(e: unknown): string {
  const code = (e as { code?: string })?.code ?? ''
  const map: Record<string, string> = {
    'auth/too-many-requests': 'Thử quá nhiều lần, vui lòng đợi một lát rồi thử lại.',
    'auth/network-request-failed': 'Không có kết nối mạng.',
    'auth/popup-blocked': 'Trình duyệt đã chặn cửa sổ đăng nhập, hãy cho phép popup rồi thử lại.',
    'auth/popup-closed-by-user': 'Bạn đã đóng cửa sổ đăng nhập.',
    'auth/cancelled-popup-request': 'Bạn đã đóng cửa sổ đăng nhập.',
    'auth/unauthorized-domain': 'Tên miền này chưa được phép đăng nhập (thêm vào Authorized domains trong Firebase).',
    'auth/operation-not-allowed': 'Cách đăng nhập này chưa được bật trong Firebase.',
    'permission-denied': 'Không có quyền ghi dữ liệu (kiểm tra Firestore rules).',
  }
  if (map[code]) return map[code]
  if (code.startsWith('auth/api-key') || code === 'auth/invalid-api-key')
    return 'Cấu hình Firebase không đúng (API key) — kiểm tra lại file .env.local.'
  return e instanceof Error ? e.message : 'Đã có lỗi xảy ra, vui lòng thử lại.'
}
