import fetch from "node-fetch";

export async function fetchTikTokLiveStatus(username) {
  const url = `https://www.tiktok.com/@${username}`;
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125 Safari/537.36",
      "Referer": "https://www.tiktok.com/",
      "Accept-Language": "en-US,en;q=0.9",
    },
  });

  if (!res.ok) throw new Error(`TikTok fetch failed (${res.status})`);
  const html = await res.text();

  // --- check 1: badge "LIVE" xuất hiện ---
  const hasLiveBadge = /<span[^>]*LiveBadge[^>]*>LIVE<\/span>/i.test(html);

  // --- check 2: có link tới /@user/live? ---
  const hasLiveLink = new RegExp(
    `href="/@${username}/live\\?`,
    "i"
  ).test(html);

  // --- check 3: JSON data (SIGI_STATE) ---
  const jsonMatch = html.match(/<script id="SIGI_STATE"[^>]*>(.*?)<\/script>/);
  let json = {};
  if (jsonMatch) {
    try {
      json = JSON.parse(jsonMatch[1]);
    } catch {
      json = {};
    }
  }

  const hasLiveRoom =
    (json.LiveRoom && Object.keys(json.LiveRoom).length > 0) ||
    html.includes('"liveRoomId"');

  const isLive = hasLiveBadge || hasLiveLink || hasLiveRoom;

  // --- lấy title và cover nếu có ---
  const title =
    json?.LiveRoom?.title ||
    json?.LiveRoom?.liveRoom?.title ||
    (html.match(/"liveTitle":"(.*?)"/)?.[1] ?? null);

  const cover =
    json?.LiveRoom?.coverUrl ||
    (html.match(/"coverUrl":"(.*?)"/)?.[1]?.replace(/\\u0026/g, "&") ?? null);

  return {
    user: username,
    is_live: !!isLive,
    title: title ? decodeURIComponent(title) : null,
    cover: cover || null,
    url: `https://www.tiktok.com/@${username}/live`,
    checked_at: new Date().toISOString(),
  };
}
