# NihonGo — Học từ vựng JLPT N5

Ứng dụng học từ vựng tiếng Nhật kiểu Quizlet, không cần đăng nhập. Tiến độ (đã thuộc, gắn sao, đúng/sai, chuỗi ngày học) lưu trong `localStorage` của trình duyệt.

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
Mỗi bài có 3 bước:

1. **Học từ** — ảnh, câu ví dụ có furigana (nghe được), mẹo nhớ (âm Hán Việt, từ dễ nhầm, cách dùng)
2. **Luyện tập** — 4 chế độ từ dễ đến khó, chỉ với từ của bài
3. **Bài đọc** — đoạn văn/hội thoại ngắn dùng từ của bài, bật/tắt bản dịch từng câu, nghe cả bài, 3 câu hỏi đọc hiểu

**Ôn tập ngắt quãng (SRS):** trả lời đúng thì từ được hẹn ôn lại sau 1 → 3 → 7 → 14 → 30 → 60 ngày, sai thì ôn lại
ngay trong ngày. Mục *Ôn tập hôm nay* gom các từ đến hạn.

Nội dung câu ví dụ / mẹo nhớ / bài đọc viết trong `scripts/content/part-*.json`, gộp lại bằng
`node scripts/build-content.mjs` (kiểm tra furigana, đủ từ, đáp án hợp lệ) → `src/data/content.json` (tải lười).
Furigana viết dạng `{漢字|かんじ}`.

## Chế độ học

- **Thẻ ghi nhớ** — Space lật thẻ, ← chưa thuộc, → đã thuộc, S gắn sao, P phát âm
- **Trắc nghiệm** — phím 1–4 chọn đáp án, Nhật→Việt / Việt→Nhật / trộn (có cả câu hỏi cách đọc kanji)
- **Gõ đáp án** — Nhật→Việt (gõ nghĩa, có/không dấu đều được) hoặc Việt→Nhật (gõ kana, romaji, kanji), hoặc trộn
- **Ghép thẻ** — ghép từ với nghĩa, tính giờ
