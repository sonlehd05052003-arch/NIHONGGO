# Video YouTube gợi ý cho từng bài — quy cách

Người học: người Việt mới học tiếng Nhật trình độ N5. Mỗi bài trong app (48 bài, `src/data/lessons.json`, từ vựng ở
`src/data/n5.json`, ngữ pháp ở `scripts/grammar-plan.mjs`) có một bước "Nghe & Video" nhúng video YouTube để luyện nghe.

## Tiêu chí chọn video (theo thứ tự ưu tiên)
1. **Có thật và nhúng được.** Chỉ dùng mã video (11 ký tự) thấy trong kết quả tìm kiếm / trang đã mở. KHÔNG được đoán hay tự bịa mã.
   Kiểm tra từng video bằng WebFetch tới
   `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=<ID>&format=json`
   → phải trả về JSON có `title` và `author_name`. Lỗi 401/403/404 = không nhúng được / không tồn tại → bỏ.
2. **Hợp chủ đề bài** (vd. bài "Gia đình tôi" → video nói về gia đình; "Số đếm" → video dạy/nghe số đếm; "Mua bán" → hội thoại mua sắm).
   Nếu không có video đúng chủ đề, chọn video có ngữ pháp/tình huống gần nhất của bài.
3. **Hợp trình độ N5**: tiếng Nhật chậm, đơn giản, có người Nhật nói. Ưu tiên video có phụ đề tiếng Nhật.
   Kênh gợi ý (tự tìm thêm): Comprehensible Japanese (Complete Beginner), Nihongo no Mori (N5), JapanesePod101 (từ vựng theo chủ đề),
   NHK World Easy Japanese, Japanese Ammo with Misa, Onomappu, Slow Japanese… Tránh video chủ yếu nói tiếng Anh/Việt mà ít tiếng Nhật,
   tránh anime/phim bị đăng lại trái phép, tránh video dài trên 25 phút (trừ khi chỉ định đoạn `start`).
4. Một video có thể dùng cho nhiều bài nếu thật sự phù hợp, nhưng hạn chế lặp.

## Đầu ra: `scripts/videos/part-N.json`
```json
{
  "L1": [
    {
      "id": "abcdEFGhijk",
      "title": "tiêu đề đúng như oEmbed trả về",
      "channel": "author_name từ oEmbed",
      "why": "1 câu tiếng Việt: vì sao hợp với bài này (nói về gì)",
      "level": "N5" ,
      "start": 0
    }
  ]
}
```
- Mỗi bài **1–2 video** (ưu tiên 2: một video dạy/giải thích, một video nghe hội thoại thuần tiếng Nhật).
- `start` (giây) chỉ ghi khi biết chắc đoạn phù hợp (vd. từ mục lục/chapters trong mô tả); không biết thì `0`.
- `level`: "N5" hoặc "N5-N4".
- Chỉ ghi các bài được giao. Ghi kèm vào cuối báo cáo những bài không tìm được video tốt.
