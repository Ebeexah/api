import type { VercelRequest, VercelResponse } from "@vercel/node";
import { fetchTikTokLiveStatus } from "./fetchTikTok.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const user = (req.query.user as string)?.replace(/^@/, "");
  if (!user) return res.status(400).json({ error: "Missing ?user=@username" });

  try {
    const info = await fetchTikTokLiveStatus(user);
    res.status(200).json(info);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
