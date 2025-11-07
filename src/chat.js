import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {
  // ====== CORS FIX ======
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  // =======================

  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  try {
    const { message, history = [], username = "Saiky" } = req.body;

    const systemInstruction = `
You are zSaiky (Kzyko), a chill Vietnamese AI study buddy.
Tone: GenZ nhẹ nhàng, tinh tế, xưng "tớ", gọi bạn: **${username}**.
---

${history.map(h => `${h.role === "user" ? "User" : "Bot"}: ${h.text}`).join("\n")}
User: ${message}
Bot:
`;

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const result = await model.generateContent([{ text: systemInstruction }]);
    const reply = result.response.text();

    res.status(200).json({ reply });
  } catch (err) {
    console.error("Gemini API Error:", err);
    res.status(500).json({ error: "AI request failed" });
  }
}
