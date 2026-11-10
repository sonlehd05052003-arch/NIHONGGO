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

## Chế độ học

- **Thẻ ghi nhớ** — Space lật thẻ, ← chưa thuộc, → đã thuộc, S gắn sao, P phát âm
- **Trắc nghiệm** — phím 1–4 chọn đáp án, Nhật→Việt / Việt→Nhật / trộn (có cả câu hỏi cách đọc kanji)
- **Gõ đáp án** — Nhật→Việt (gõ nghĩa, có/không dấu đều được) hoặc Việt→Nhật (gõ kana, romaji, kanji), hoặc trộn
- **Ghép thẻ** — ghép từ với nghĩa, tính giờ
