# Ngân hàng câu hỏi dạng đề JLPT N5

App học tiếng Nhật N5 cho người Việt. Ngân hàng này dùng để sinh **bài kiểm tra theo chủ đề** và **bài thi thử N5**
theo đúng cấu trúc đề thi thật. Đề được ghép ngẫu nhiên từ ngân hàng, nên mỗi câu phải **tự đứng một mình** và có
**đúng một đáp án đúng**.

Nội dung **tự biên soạn** — không chép đề thi thật, sách hay website nào.

Dữ liệu tham khảo:
- `src/data/lessons.json`: 48 bài (`L1`…`L48`), mỗi bài có `unit` (chủ đề), `title`, `words` (id từ).
- `src/data/n5.json`: id → `kanji`, `kana`, `meaningVi`, `category`.
- `scripts/grammar-plan.mjs`: mẫu ngữ pháp của từng bài (bài sau được dùng ngữ pháp của các bài trước).
- `scripts/content/part-*.json` → `examples`, `readings`: câu ví dụ và bài đọc sẵn có (để biết văn phong; KHÔNG chép lại nguyên câu).

## Quy tắc chung

- **Toàn bộ phần đề / phương án bằng tiếng Nhật**, trình độ N5. Chỉ trường `vi` là tiếng Việt.
- **Mọi chữ Hán có furigana** dạng `{漢字|かな}` (furigana là hiragana, đúng cách đọc trong ngữ cảnh). Có thể dùng chữ Hán
  N5; từ ngoài N5 thì viết hiragana/katakana. Có thể cách khoảng trắng giữa các cụm như đề N5 thật.
- Mỗi bài tập trung vào **từ vựng và ngữ pháp của bài đó** (dùng thêm từ/ngữ pháp N5 cơ bản của các bài trước).
  Với bài đầu (L1–L8) chưa học thể ます nhiều: vẫn có thể dùng です/ます đơn giản.
- **Đúng một đáp án**: phương án sai phải sai rõ ràng (sai nghĩa, sai ngữ pháp hoặc không hợp ngữ cảnh) — kiểm tra kỹ
  không có phương án sai nào "cũng có thể đúng". Phương án đều cùng loại, cùng độ dài tương đương (không để lộ đáp án).
- **Xáo vị trí đáp án đúng** (answer không phải lúc nào cũng 0).
- `vi`: bản dịch tiếng Việt của câu/đoạn + một câu giải thích ngắn vì sao đáp án đúng (người học đọc sau khi làm).
- Tên người: dùng tên Nhật / Việt thông dụng (田中さん, リンさん…), "A", "B" cũng được.

## Đầu ra

### Theo bài — `scripts/jlpt/lessons-N.json`

```json
{ "L13": { "context": [...3], "paraphrase": [...2], "grammar": [...4], "order": [...2], "short": [...1],
           "task": [...1], "point": [...1], "utter": [...1], "quick": [...2] } }
```

**context** — 文字・語彙 問題3 文脈規定: câu có một chỗ trống `（　）` (ngoặc toàn góc + một dấu cách toàn góc), chọn
**từ vựng** hợp ngữ cảnh. Đáp án là từ của bài; phương án sai cùng loại từ (cùng dạng chia), sai nghĩa trong ngữ cảnh.
```json
{ "q": "きのうは {雨|あめ}でしたから、{家|いえ}で テレビを （　） 。",
  "options": ["{見|み}ました", "{行|い}きました", "{書|か}きました", "{立|た}ちました"], "answer": 0,
  "vi": "Hôm qua trời mưa nên tôi đã xem tivi ở nhà. Xem (見る) tivi." }
```

**paraphrase** — 問題4 言い換え類義: câu có một phần gạch chân `[[...]]`; chọn câu **gần nghĩa nhất** với câu đó.
Bốn phương án là bốn câu hoàn chỉnh.
```json
{ "q": "この {部屋|へや}は [[せまくないです]]。",
  "options": ["この {部屋|へや}は ひろいです。", "この {部屋|へや}は せまいです。", "この {部屋|へや}は くらいです。", "この {部屋|へや}は あかるいです。"],
  "answer": 0, "vi": "Căn phòng này không chật = rộng." }
```

**grammar** — 文法 問題1 文法形式の判断: câu có một chỗ trống `（　）`, chọn **trợ từ / dạng ngữ pháp / từ để hỏi /
cách nói** đúng. Ưu tiên mẫu ngữ pháp của bài. Câu hội thoại A/B được (viết `A「…」B「…」` trong `q`).
```json
{ "q": "{毎朝|まいあさ} {六時|ろくじ}（　）{起|お}きます。", "options": ["に", "で", "を", "が"], "answer": 0,
  "vi": "Mỗi sáng tôi dậy lúc 6 giờ. Thời điểm cụ thể dùng に." }
```

**order** — 文法 問題2 文の組み立て (câu ★): câu có 4 chỗ trống liên tiếp, một chỗ là ★. `parts` là 4 mảnh **theo
đúng thứ tự** trong câu; `star` là vị trí (0–3) của chỗ ★. App sẽ xáo mảnh và hỏi "mảnh nào ở chỗ ★". Phải chỉ có
**một cách sắp xếp đúng** — mảnh nên kết thúc bằng trợ từ để thứ tự là duy nhất.
```json
{ "before": "わたしは", "after": "{行|い}きます。", "parts": ["{日曜日|にちようび}に", "{友|とも}だち", "と", "{公園|こうえん}へ"],
  "star": 2, "vi": "Chủ nhật tôi đi công viên với bạn. Thứ tự: 日曜日に 友だち と ★ 公園へ → mảnh ở ★ là と." }
```

**short** — 読解 問題4 内容理解（短文）: đoạn văn ngắn 80–150 chữ (thư, ghi chú, nhật ký…) + 1 câu hỏi 4 phương án.
```json
{ "text": "…", "q": "…ですか。", "options": ["…", "…", "…", "…"], "answer": 2, "vi": "Dịch đoạn văn… Đáp án vì…" }
```

**task** — 聴解 問題1 課題理解 và **point** — 問題2 ポイント理解: hội thoại 4–8 lượt giữa nam (`M`) và nữ (`F`).
`intro` là câu dẫn người dẫn đọc trước hội thoại, có kèm câu hỏi, ví dụ
`"{男|おとこ}の {人|ひと}と {女|おんな}の {人|ひと}が {話|はな}しています。{女|おんな}の {人|ひと}は このあと {何|なに}を しますか。"`.
`q` là câu hỏi (đọc lại sau hội thoại). 4 phương án ngắn bằng tiếng Nhật (in trên đề).
- task: hỏi người đó **sẽ làm gì / mua gì / đi đâu tiếp theo** (cần nghe hết, có thay đổi ý giữa chừng).
- point: hỏi **một điểm cụ thể** (lý do, thời gian, ai, cái nào…), trong hội thoại có nhắc cả phương án sai để gây nhiễu.
```json
{ "intro": "…", "dialogue": [{ "s": "F", "t": "…" }, { "s": "M", "t": "…" }], "q": "…", "options": ["…","…","…","…"],
  "answer": 1, "vi": "Dịch hội thoại tóm tắt + vì sao." }
```

**utter** — 聴解 問題3 発話表現: `situation` là câu mô tả tình huống (người dẫn đọc) kết thúc bằng
`{何|なん}と {言|い}いますか。`; `options` là 3 câu nói (chỉ nghe, không in) — chỉ một câu hợp tình huống.
```json
{ "situation": "{友|とも}だちに プレゼントを もらいました。{何|なん}と {言|い}いますか。",
  "options": ["ありがとう。", "どういたしまして。", "いただきます。"], "answer": 0, "vi": "…" }
```

**quick** — 聴解 問題4 即時応答: `prompt` là một câu nói ngắn (người nói `s`), `options` là 3 câu đáp (chỉ nghe) —
chỉ một câu đáp tự nhiên.
```json
{ "s": "M", "prompt": "お{国|くに}は どちらですか。", "options": ["ベトナムです。", "{日本語|にほんご}です。", "あちらです。"],
  "answer": 0, "vi": "…" }
```

### Theo chủ đề — `scripts/jlpt/units.json`

Chủ đề `u1`…`u11` theo thứ tự xuất hiện của `unit` trong lessons.json. Dùng từ/ngữ pháp của các bài trong chủ đề.

```json
{ "u1": { "textGrammar": [...2], "midRead": [...2], "info": [...2] } }
```

**textGrammar** — 文法 問題3 文章の文法: một bài văn ngắn (~150–250 chữ, vd. bài giới thiệu "わたしの…" của du học
sinh) có 3–5 chỗ trống đánh số `【1】`…`【n】` trong `text`; `blanks[k]` là 4 phương án cho `【k+1】`
(trợ từ, từ nối それから/でも, dạng động từ, cụm ngữ pháp…). `title` là tiêu đề bài.

**midRead** — 読解 問題5 内容理解（中文）: đoạn văn 250–400 chữ + đúng 2 câu hỏi (`questions[].q/options/answer`).

**info** — 読解 問題6 情報検索: một thông báo / lịch / bảng giá / tờ rơi (dùng xuống dòng `\n` và ・ để trình bày)
+ 1 câu hỏi tìm thông tin (vd. "…は いつ どこへ {行|い}けば いいですか。").

## Kiểm tra

`node scripts/check-jlpt.mjs scripts/jlpt/<file>.json` — phải ra 0 lỗi. Script chỉ kiểm tra cấu trúc và furigana;
phần **đúng một đáp án** phải tự soát kỹ từng câu.
