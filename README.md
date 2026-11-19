# NihonGo — Học từ vựng JLPT N5

Ứng dụng học từ vựng tiếng Nhật kiểu Quizlet. Không cần đăng nhập vẫn học được — tiến độ (đã thuộc, gắn sao, đúng/sai,
lịch ôn, XP, chuỗi ngày học) lưu trong `localStorage` của trình duyệt. **Đăng nhập bằng Google** thì tiến độ được
lưu lên Firebase Firestore và đồng bộ giữa các thiết bị. Ngoài ra có **Tải file sao lưu / Khôi phục từ file** trong
hộp thoại tài khoản.

## Bật đăng nhập & đồng bộ (Firebase)

1. Tạo project tại https://console.firebase.google.com (gói Spark miễn phí là đủ).
2. **Authentication → Get started → Sign-in method**, bật **Google** (đổi Public-facing name thành NihonGo).
3. **Firestore → Create database** (chọn vùng gần, vd. `asia-southeast1`).
   Sang tab **Rules**, dán nội dung file [`firestore.rules`](firestore.rules) rồi **Publish**.
4. **Project settings → Your apps → Web (`</>`)**, đăng ký app, chép cấu hình vào file `.env.local`
   (theo mẫu [`.env.example`](.env.example)), rồi chạy lại `npm run dev`.
5. Khi đưa app lên tên miền thật, thêm tên miền đó vào **Authentication → Settings → Authorized domains**.

Dữ liệu mỗi người nằm ở `users/{uid}` và chỉ chính người đó đọc/ghi được. Khi đăng nhập, tiến độ trên máy được gộp với
tiến độ trên cloud (không mất phần đã học ở bên nào); sau đó mọi thay đổi tự đồng bộ, mất mạng vẫn học bình thường.
Đăng xuất sẽ xoá dữ liệu trên máy đó (vẫn còn trong tài khoản).

## Chạy

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # bản production trong dist/
```

## Dữ liệu

`src/data/n5.json` — 604 từ N5 (danh từ, động từ, tính từ い/な, từ khác) lấy từ
https://riki.edu.vn/goc-chia-se/tu-vung-n5/. Romaji được sinh tự động từ kana.

Cập nhật lại dữ liệu: `node scripts/scrape-n5.mjs`

**Ảnh minh hoạ:** ~394 từ có ảnh thật từ Wikipedia / Wikimedia Commons (giấy phép tự do, bấm ⓘ trên ảnh để xem tác giả).
Từ trừu tượng (đại từ, số đếm, ngày, phó từ...) hiển thị thẻ chữ. Từ khoá tìm ảnh nằm ở `scripts/image-keywords.mjs`;
sửa từ khoá rồi chạy `node scripts/fetch-images.mjs` để lấy lại ảnh cho những từ đã đổi.

**Cho học thú vị hơn:** XP & cấp độ, combo trả lời đúng liên tiếp, hiệu ứng âm thanh (tắt được), pháo giấy và 1–3 sao khi hoàn thành, mục tiêu ôn tập mỗi ngày.

## Lộ trình bài học

Tab **Bài học** chia 604 từ thành 48 bài theo chủ đề (`src/data/lessons.json`, nguồn ở `scripts/lessons-src.mjs`).
Mỗi bài có 5 bước:

1. **Học từ** — ảnh, câu ví dụ có furigana (nghe được), mẹo nhớ (âm Hán Việt, từ dễ nhầm, cách dùng)
2. **Ngữ pháp** — 2 mẫu câu N5 mỗi bài (tổng 96 mẫu, tương đương Minna no Nihongo bài 1–25): cấu trúc, giải thích, lưu ý, 3 ví dụ nghe được
3. **Luyện tập** — 4 chế độ từ dễ đến khó, chỉ với từ của bài
4. **Viết câu** — 6 câu mỗi bài: 3 câu Nhật → Việt, 3 câu Việt → Nhật. Việt → Nhật gõ được bằng kana, kanji hoặc romaji
   (mỗi chỗ có furigana gõ kanji hay kana đều đúng; trợ từ は/へ/を gõ わ/え/お cũng được). Nhật → Việt chấm gần đúng
   (bỏ qua dấu, từ đệm như "cái/là/thì", tha lỗi gõ nhầm 1 chữ ở câu dài) và có nút "Tôi đúng mà"
5. **Bài đọc** — đoạn văn/hội thoại ngắn dùng từ của bài, trình phát có thanh tua, bật/tắt bản dịch từng câu, 3 câu hỏi đọc hiểu.
   Chế độ **Chỉ nghe** ẩn chữ để luyện nghe hiểu rồi mới hiện chữ đối chiếu

**Ôn tập ngắt quãng (SRS):** trả lời đúng thì từ được hẹn ôn lại sau 1 → 3 → 7 → 14 → 30 → 60 ngày, sai thì ôn lại
ngay trong ngày. Mục *Ôn tập hôm nay* gom các từ đến hạn.

Nội dung câu ví dụ / mẹo nhớ / bài đọc viết trong `scripts/content/part-*.json`; ngữ pháp & bài tập viết câu trong
`scripts/grammar/part-*.json` (lộ trình mẫu: `scripts/grammar-plan.mjs`, quy cách: `scripts/grammar/SPEC.md`).
Gộp lại bằng `node scripts/build-content.mjs` (kiểm tra furigana, đủ từ, đáp án hợp lệ) → `src/data/content.json` (tải lười).
Kiểm tra riêng phần ngữ pháp: `node scripts/check-grammar.mjs`.
Furigana viết dạng `{漢字|かんじ}`.

## Chế độ học

- **Thẻ ghi nhớ** — Space lật thẻ, ← chưa thuộc, → đã thuộc, S gắn sao, P phát âm
- **Trắc nghiệm** — phím 1–4 chọn đáp án, Nhật→Việt / Việt→Nhật / trộn (có cả câu hỏi cách đọc kanji)
- **Gõ đáp án** — Nhật→Việt (gõ nghĩa, có/không dấu đều được) hoặc Việt→Nhật (gõ kana, romaji, kanji), hoặc trộn
- **Ghép thẻ** — ghép từ với nghĩa, tính giờ
