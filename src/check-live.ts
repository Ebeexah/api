import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getSubs, getCache, setCache } from "./cache.js";
import { fetchTikTokLiveStatus } from "./fetchTikTok.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const key = req.query.key;
  if (process.env.CRON_KEY && key !== process.env.CRON_KEY)
    return res.status(403).json({ error: "Unauthorized" });

  const subs = getSubs();
  const results: any[] = [];

  for (const username of subs) {
    try {
      const prev = getCache(username);
      const info = await fetchTikTokLiveStatus(username);
      const was = prev?.is_live;
      const now = info.is_live;

      if (now && !was) console.log(`🔥 ${username} vừa bắt đầu live!`);

      setCache(username, info);
      results.push({ username, live: now });
    } catch (err: any) {
      results.push({ username, error: err.message });
    }
  }

  res.json({ ok: true, total: subs.length, results });
}
