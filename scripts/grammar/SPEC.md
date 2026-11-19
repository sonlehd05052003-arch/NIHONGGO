# Nội dung ngữ pháp & bài tập viết câu — quy cách

Người học: người Việt mới học tiếng Nhật, trình độ N5. Ứng dụng hiển thị nội dung này trong từng bài học (48 bài).

## Đầu vào
- Lộ trình mẫu ngữ pháp từng bài: `scripts/grammar-plan.mjs` (mỗi bài 2 mẫu, đúng thứ tự).
- Từ vựng từng bài: `src/data/lessons.json` (mảng `words` là id) + `src/data/n5.json` (id → kanji, kana, nghĩa).
- Ví dụ về văn phong/furigana đã có: `scripts/content/part-1.json` (câu ví dụ & bài đọc).

## Đầu ra: một file JSON `scripts/grammar/part-N.json`
```json
{
  "L1": {
    "points": [
      {
        "pattern": "これ／それ／あれ は N です",
        "meaning": "Cái này / cái đó / cái kia là N",
        "structure": "これ／それ／あれ ＋ は ＋ N ＋ です",
        "explain": "2–4 câu tiếng Việt giải thích khi nào dùng, khác nhau thế nào. Tự viết, dễ hiểu.",
        "note": "(không bắt buộc) lỗi hay gặp / mẹo nhớ, 1 câu",
        "examples": [
          { "jp": "これは{本|ほん}です。", "vi": "Đây là quyển sách." },
          { "jp": "…", "vi": "…" },
          { "jp": "…", "vi": "…" }
        ]
      },
      { "pattern": "この／その／あの N", "...": "..." }
    ],
    "exercises": [
      { "dir": "jv", "jp": "それは{私|わたし}の{傘|かさ}です。", "vi": "Đó là cái ô của tôi.",
        "acceptVi": ["Cái đó là ô của tôi", "Đó là ô của tôi", "Cái đó là cái ô của mình"] },
      { "dir": "vj", "vi": "Cái kia là gì?", "jp": "あれは{何|なん}ですか。",
        "acceptJp": [], "hint": "あれ ＋ は ＋ なん ＋ ですか" }
    ]
  }
}
```

## Yêu cầu
1. **`pattern` phải giống hệt** chuỗi trong `grammar-plan.mjs`, đúng thứ tự. `meaning` có thể giữ hoặc viết rõ hơn.
2. **Mỗi mẫu 3 ví dụ** (`examples`), ngắn (≤ 25 ký tự), tự nhiên, đúng ngữ pháp, minh hoạ đúng mẫu đó.
3. **Mỗi bài 6 bài tập viết câu** (`exercises`), xen kẽ: 3 câu `jv` (Nhật→Việt) và 3 câu `vj` (Việt→Nhật).
   - Dùng mẫu ngữ pháp của bài (và có thể của các bài trước), ưu tiên từ vựng của bài.
   - Câu ngắn, rõ ràng, chỉ có một cách hiểu chính. Thể lịch sự です／ます (trừ bài thể thông thường L39).
   - `jv`: `acceptVi` = 2–4 cách dịch tiếng Việt khác cũng đúng (đổi đại từ tôi/mình, đây/cái này, bỏ/thêm loại từ…). Không cần chấm câu.
   - `vj`: câu tiếng Việt phải đủ rõ để đoán được thì (hiện tại/quá khứ), khẳng định/phủ định, lịch sự.
     `jp` là đáp án chuẩn. `acceptJp` = các đáp án đúng KHÁC về cấu trúc/từ ngữ (vd. bỏ `わたしは`, dùng `では` thay `じゃ`), viết chữ thường không furigana.
     KHÔNG cần liệt kê bản viết toàn kana hay kanji — ứng dụng tự chấp nhận cả kana lẫn kanji cho mỗi chỗ có furigana.
     `hint` = gợi ý ngắn cấu trúc cần dùng (có thể ghi từ khó kèm nghĩa).
4. **Furigana**: mọi kanji trong `jp` (ví dụ, bài tập) đều phải viết dạng `{漢字|かな}`; phần đọc chỉ dùng hiragana; katakana và hiragana thì không bọc. Một cụm `{}` có thể chứa nhiều kanji liền nhau (`{日本語|にほんご}`), nhưng không bọc trợ từ/okurigana (`{食|た}べます`). Dấu câu tiếng Nhật `。、？`.
   Trường `pattern`/`structure` viết bằng kana/ký hiệu, không dùng furigana.
5. Nội dung **tự viết**, không chép từ website/giáo trình. Tiếng Việt tự nhiên, đúng chính tả; tiếng Nhật chuẩn, tránh từ vượt quá N5 (nếu buộc phải dùng thì viết kana và giải thích trong `hint`/`note`).
6. Chỉ ghi các bài được giao. Sau khi viết xong, chạy `node scripts/check-grammar.mjs scripts/grammar/part-N.json` và sửa đến khi **Không có lỗi**. Tự đọc lại một lượt để soát nghĩa và ngữ pháp (lỗi phổ biến: sai trợ từ, sai cách chia, furigana sai cách đọc như 何 trước です đọc là なん, 一日 ngày mồng 1 đọc là ついたち).
