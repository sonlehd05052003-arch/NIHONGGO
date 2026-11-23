# Bổ sung cho bài đọc: từ mới trong đoạn văn + câu hỏi đọc hiểu bằng tiếng Nhật

Người học: người Việt trình độ N5. Mỗi bài (48 bài, `L1`…`L48`) có một bài đọc ngắn trong
`scripts/content/part-*.json` → `readings.<id>` (title, lines[].jp có furigana `{漢字|かな}`, questions tiếng Việt).
Từ vựng của bài: `src/data/lessons.json` (mảng `words` là id) + `src/data/n5.json` (id → kanji, kana, meaningVi).

## Đầu ra: `scripts/reading-extra/part-N.json`

```json
{
  "L13": {
    "glossary": [
      { "jp": "いっしょに", "vi": "cùng nhau" },
      { "jp": "{映画|えいが}", "vi": "phim" },
      { "jp": "{見|み}る", "vi": "xem, nhìn" },
      { "jp": "アルバイト", "vi": "việc làm thêm" },
      { "jp": "おもしろい", "vi": "thú vị, hay" },
      { "jp": "ゆっくり", "vi": "thong thả, chậm rãi" },
      { "jp": "{休|やす}む", "vi": "nghỉ ngơi" }
    ],
    "questions": [
      {
        "jp": "Aさんは Bさんと {何|なに}を したいですか。",
        "options": ["{映画|えいが}を {見|み}たい", "アルバイトを したい", "{晩|ばん}ご{飯|はん}を {食|た}べたい"]
      }
    ]
  }
}
```

## glossary — "Từ mới trong đoạn văn"

- Liệt kê **mọi từ có nghĩa** xuất hiện trong title + lines mà **KHÔNG nằm trong danh sách từ của bài đó**
  (so với `words` của bài trong lessons.json). Mục đích: người học đọc đoạn văn, không biết nghĩa từ nào thì tra ở đây.
- Gồm: danh từ, động từ, tính từ, phó từ, từ katakana, cụm cố định / câu chào (すみません, そうですか, いっしょに…).
- KHÔNG gồm: trợ từ (は, を, に, で…), です/ます, đuôi ngữ pháp (～ませんか, ～ましょう, ～たい), tên người, "A", "B".
  Đại từ quá cơ bản (私, あなた) chỉ ghi ở L1–L3.
- Động từ / tính từ ghi **dạng từ điển** (見ました → `{見|み}る`; 忙しかった → `{忙|いそが}しい`; きれいな → きれい).
- `jp`: furigana `{漢字|かな}` cho MỌI chữ Hán, furigana là hiragana, đúng cách đọc trong ngữ cảnh. Viết kanji/kana đúng như
  bài đọc dùng (bài viết おもしろい thì ghi おもしろい, không đổi thành 面白い).
- `vi`: nghĩa tiếng Việt ngắn, đúng nghĩa trong ngữ cảnh bài đọc (1–4 từ; có thể 2 nghĩa ngăn bởi dấu phẩy).
- Không lặp. Thứ tự: theo lần xuất hiện đầu tiên trong bài đọc. Thường 5–15 mục mỗi bài.

## questions — câu hỏi đọc hiểu tiếng Nhật

- Dịch **từng câu hỏi tiếng Việt đã có** (`readings.<id>.questions`) sang tiếng Nhật: **cùng số câu, cùng thứ tự, cùng số
  phương án và cùng thứ tự phương án** (đáp án đúng giữ nguyên chỉ số `answer` cũ — không cần ghi `answer`).
- Tiếng Nhật trình độ N5, ngắn, tự nhiên; ưu tiên dùng từ có trong bài đọc. Câu hỏi kết thúc bằng か。
  Phương án là cụm ngắn (không cần 。). Có thể cách khoảng trắng giữa các cụm như sách N5 (không bắt buộc).
- Mọi chữ Hán đều có furigana `{漢字|かな}`.
- Ý của câu hỏi / phương án phải giống bản tiếng Việt (đáp án đúng vẫn đúng, phương án sai vẫn sai).

## Kiểm tra

`node scripts/check-reading-extra.mjs scripts/reading-extra/part-N.json` — phải không còn lỗi.
Dòng "Gợi ý" (từ N5 ngoài bài có trong đoạn văn nhưng chưa có trong glossary) chỉ là gợi ý: xem lại và thêm nếu đúng.
