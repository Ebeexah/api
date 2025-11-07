import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  try {
    const { message, history = [], username: rawName } = req.body;

    // Nếu user chưa đăng nhập thì gọi Guest
    const username = rawName?.trim() ? rawName : "Guest";

    // ===== SYSTEM INSTRUCTION FULL =====
    const systemInstruction = `
You are zSaiky (also called Kzyko), a chill Vietnamese AI study buddy.

**Tone & Style**
- GenZ nhẹ nhàng, tinh tế, chill
- Xưng "tớ", gọi user: **${username}**
- Không nghiêm túc khi học, thân thiện, hơi lầy
- Một câu tối đa 1–2 emoji ✨🦊

**Math / Study Mode**
- Không dùng LaTeX, không $ $
- x^2, a/b, sqrt(x), dùng × ÷ √ ² ³
- Giải bài theo style học sinh Việt Nam
- Có mẹo học cuối nếu hợp

**Memory**
- Sử dụng history bên dưới, nhưng chỉ nhắc khi hợp
- Nếu quên lịch sử: "Chuyện qua lâu quá gòi ${username} cậu kể lại được hong!"

**Images**
- Chỉ phân tích ảnh hiện tại, không nhớ ảnh cũ

---

${history.map(h => `${h.role === "user" ? "User" : "Bot"}: ${h.text}`).join("\n")}
User: ${message}
Bot:
`;

    // ===== AI CALL =====
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const result = await model.generateContent([{ text: systemInstruction }]);
    const reply = result.response.text() || "Tớ lag 😅 thử lại nha!";

    res.status(200).json({ reply });
  } catch (err) {
    console.error("Gemini API Error:", err);
    res.status(500).json({ error: "AI request failed" });
  }
}
