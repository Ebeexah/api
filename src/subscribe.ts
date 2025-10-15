import type { VercelRequest, VercelResponse } from "@vercel/node";
import { addSub, removeSub, getSubs } from "./cache.js";

export default function handler(req: VercelRequest, res: VercelResponse) {
  const { action, user } = req.query;
  if (!action) return res.status(400).json({ error: "Missing ?action" });

  if (action === "list") return res.json({ users: getSubs() });

  if (!user) return res.status(400).json({ error: "Missing ?user=@username" });
  const username = (user as string).replace(/^@/, "");

  if (action === "add") {
    addSub(username);
    return res.json({ ok: true, message: `Subscribed to @${username}` });
  }

  if (action === "remove") {
    removeSub(username);
    return res.json({ ok: true, message: `Unsubscribed from @${username}` });
  }

  res.status(400).json({ error: "Invalid action" });
}
